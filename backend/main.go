package main

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("your-secret-key-change-this-in-production")

// Models
type User struct {
	ID                string    `json:"id"`
	Email             string    `json:"email"`
	Name              string    `json:"name"`
	ProfilePictureURL string    `json:"profile_picture_url"`
	Password          string    `json:"-"` // Never send password in JSON
	CreatedAt         time.Time `json:"created_at"`
}

type Post struct {
	ID                    string    `json:"id"`
	UserID                string    `json:"user_id"`
	UserEmail             string    `json:"user_email"`
	UserName              string    `json:"user_name"`
	UserProfilePictureURL string    `json:"user_profile_picture_url"`
	Title                 string    `json:"title" binding:"required"`
	Description           string    `json:"description" binding:"required"`
	Price                 float64   `json:"price" binding:"required"`
	Category              string    `json:"category" binding:"required"`
	Type                  string    `json:"type" binding:"required"`
	Location              string    `json:"location"`
	Media                 []Media   `json:"media"`
	CreatedAt             time.Time `json:"created_at"`
}

type Media struct {
	ID     string `json:"id"`
	PostID string `json:"post_id"`
	URL    string `json:"url"`
	Type   string `json:"type"`
	Order  int    `json:"order"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
	Name     string `json:"name" binding:"required"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// Database
var db *sql.DB

func initDB() error {
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		whoami := os.Getenv("USER")
		if whoami == "" {
			whoami = "postgres"
		}
		connStr = fmt.Sprintf("postgres://%s@localhost/bruinbuy?sslmode=disable", whoami)
	}

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		return err
	}

	if err = db.Ping(); err != nil {
		return err
	}

	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(255) PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		name VARCHAR(255) NOT NULL,
		password VARCHAR(255) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS posts (
		id VARCHAR(255) PRIMARY KEY,
		user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
		title VARCHAR(255) NOT NULL,
		description TEXT NOT NULL,
		price DECIMAL(10,2) NOT NULL,
		category VARCHAR(100) NOT NULL,
		type VARCHAR(50) NOT NULL,
		location VARCHAR(255),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS media (
		id VARCHAR(255) PRIMARY KEY,
		post_id VARCHAR(255) REFERENCES posts(id) ON DELETE CASCADE,
		url TEXT NOT NULL,
		type VARCHAR(50) NOT NULL,
		order_index INTEGER NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
	CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
	CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
	CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
	`

	_, err = db.Exec(schema)
	if err != nil {
		return err
	}

	// Ensure columns added in later versions exist on older databases
	if _, err := db.Exec(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS location VARCHAR(255)`); err != nil {
		return err
	}

	// Add profile picture column to users if missing
	if _, err := db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500)`); err != nil {
		return err
	}

	return nil
}

// Auth Middleware
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			c.Abort()
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Next()
	}
}

// Auth Handlers
func register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate UCLA email
	if !strings.HasSuffix(strings.ToLower(req.Email), "@ucla.edu") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "must use a @ucla.edu email address"})
		return
	}

	// Check if user exists
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email already registered"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	// Create user
	userID := uuid.New().String()
	_, err = db.Exec(
		"INSERT INTO users (id, email, name, password, created_at) VALUES ($1, $2, $3, $4, $5)",
		userID, req.Email, req.Name, string(hashedPassword), time.Now(),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID: userID,
		Email:  req.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour * 7)), // 7 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	user := User{
		ID:        userID,
		Email:     req.Email,
		Name:      req.Name,
		CreatedAt: time.Now(),
	}

	c.JSON(http.StatusCreated, AuthResponse{
		Token: tokenString,
		User:  user,
	})
}

func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user
	var user User
	var hashedPassword string
	err := db.QueryRow(
		"SELECT id, email, name, COALESCE(profile_picture_url, ''), password, created_at FROM users WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.Email, &user.Name, &user.ProfilePictureURL, &hashedPassword, &user.CreatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour * 7)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token: tokenString,
		User:  user,
	})
}

func getMe(c *gin.Context) {
	userID := c.GetString("user_id")

	var user User
	err := db.QueryRow(
		"SELECT id, email, name, COALESCE(profile_picture_url, ''), created_at FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.ProfilePictureURL, &user.CreatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func getMyPosts(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := db.Query(
		`SELECT p.id, p.user_id, u.email, u.name, COALESCE(u.profile_picture_url, ''), p.title, p.description, p.price, p.category, p.type, COALESCE(p.location, ''), p.created_at 
		FROM posts p 
		JOIN users u ON p.user_id = u.id 
		WHERE p.user_id = $1 
		ORDER BY p.created_at DESC`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch posts"})
		return
	}
	defer rows.Close()

	posts := []Post{}
	for rows.Next() {
		var post Post
		err := rows.Scan(&post.ID, &post.UserID, &post.UserEmail, &post.UserName, &post.UserProfilePictureURL, &post.Title, &post.Description, &post.Price, &post.Category, &post.Type, &post.Location, &post.CreatedAt)
		if err != nil {
			continue
		}

		// Fetch media
		mediaRows, err := db.Query(
			"SELECT id, url, type, order_index FROM media WHERE post_id = $1 ORDER BY order_index",
			post.ID,
		)
		if err == nil {
			defer mediaRows.Close()
			for mediaRows.Next() {
				var media Media
				var order int
				mediaRows.Scan(&media.ID, &media.URL, &media.Type, &order)
				media.PostID = post.ID
				media.Order = order
				post.Media = append(post.Media, media)
			}
		}

		posts = append(posts, post)
	}

	c.JSON(http.StatusOK, posts)
}

// Post Handlers
func createPost(c *gin.Context) {
	var post Post
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post.ID = uuid.New().String()
	post.CreatedAt = time.Now()
	post.UserID = c.GetString("user_id")

	if post.Type != "selling" && post.Type != "buying" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'selling' or 'buying'"})
		return
	}

	// Get user info
	err := db.QueryRow("SELECT email, name, COALESCE(profile_picture_url, '') FROM users WHERE id = $1", post.UserID).Scan(&post.UserEmail, &post.UserName, &post.UserProfilePictureURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user info"})
		return
	}

	_, err = db.Exec(
		"INSERT INTO posts (id, user_id, title, description, price, category, type, location, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
		post.ID, post.UserID, post.Title, post.Description, post.Price, post.Category, post.Type, post.Location, post.CreatedAt,
	)
	if err != nil {
		log.Printf("createPost insert error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create post"})
		return
	}

	for i, media := range post.Media {
		mediaID := uuid.New().String()
		_, err := db.Exec(
			"INSERT INTO media (id, post_id, url, type, order_index) VALUES ($1, $2, $3, $4, $5)",
			mediaID, post.ID, media.URL, media.Type, i,
		)
		if err != nil {
			log.Printf("Failed to insert media: %v", err)
		}
	}

	c.JSON(http.StatusCreated, post)
}

func getPosts(c *gin.Context) {
	category := c.Query("category")
	postType := c.Query("type")
	search := c.Query("search")
	minPrice := c.Query("min_price")
	maxPrice := c.Query("max_price")

	query := `SELECT p.id, p.user_id, u.email, u.name, COALESCE(u.profile_picture_url, ''), p.title, p.description, p.price, p.category, p.type, COALESCE(p.location, ''), p.created_at 
			  FROM posts p 
			  JOIN users u ON p.user_id = u.id 
			  WHERE 1=1`
	args := []interface{}{}
	argCount := 1

	if category != "" && category != "all" {
		query += fmt.Sprintf(" AND p.category = $%d", argCount)
		args = append(args, category)
		argCount++
	}

	if postType != "" && postType != "all" {
		query += fmt.Sprintf(" AND p.type = $%d", argCount)
		args = append(args, postType)
		argCount++
	}

	if minPrice != "" {
		if val, err := strconv.ParseFloat(minPrice, 64); err == nil {
			query += fmt.Sprintf(" AND p.price >= $%d", argCount)
			args = append(args, val)
			argCount++
		}
	}

	if maxPrice != "" {
		if val, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			query += fmt.Sprintf(" AND p.price <= $%d", argCount)
			args = append(args, val)
			argCount++
		}
	}

	if search != "" {
		query += fmt.Sprintf(" AND (LOWER(p.title) LIKE $%d OR LOWER(p.description) LIKE $%d)", argCount, argCount)
		args = append(args, "%"+strings.ToLower(search)+"%")
		argCount++
	}

	query += " ORDER BY p.created_at DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch posts"})
		return
	}
	defer rows.Close()

	posts := []Post{}
	for rows.Next() {
		var post Post
		err := rows.Scan(&post.ID, &post.UserID, &post.UserEmail, &post.UserName, &post.UserProfilePictureURL, &post.Title, &post.Description, &post.Price, &post.Category, &post.Type, &post.Location, &post.CreatedAt)
		if err != nil {
			continue
		}

		mediaRows, err := db.Query(
			"SELECT id, url, type, order_index FROM media WHERE post_id = $1 ORDER BY order_index",
			post.ID,
		)
		if err == nil {
			defer mediaRows.Close()
			for mediaRows.Next() {
				var media Media
				var order int
				mediaRows.Scan(&media.ID, &media.URL, &media.Type, &order)
				media.PostID = post.ID
				media.Order = order
				post.Media = append(post.Media, media)
			}
		}

		posts = append(posts, post)
	}

	c.JSON(http.StatusOK, posts)
}

func getPost(c *gin.Context) {
	postID := c.Param("id")

	var post Post
	err := db.QueryRow(
		`SELECT p.id, p.user_id, u.email, u.name, COALESCE(u.profile_picture_url, ''), p.title, p.description, p.price, p.category, p.type, COALESCE(p.location, ''), p.created_at 
		FROM posts p 
		JOIN users u ON p.user_id = u.id 
		WHERE p.id = $1`,
		postID,
	).Scan(&post.ID, &post.UserID, &post.UserEmail, &post.UserName, &post.UserProfilePictureURL, &post.Title, &post.Description, &post.Price, &post.Category, &post.Type, &post.Location, &post.CreatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch post"})
		return
	}

	rows, err := db.Query(
		"SELECT id, url, type, order_index FROM media WHERE post_id = $1 ORDER BY order_index",
		postID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var media Media
			var order int
			rows.Scan(&media.ID, &media.URL, &media.Type, &order)
			media.PostID = postID
			media.Order = order
			post.Media = append(post.Media, media)
		}
	}

	c.JSON(http.StatusOK, post)
}

func deletePost(c *gin.Context) {
	postID := c.Param("id")
	userID := c.GetString("user_id")

	// Check ownership
	var ownerID string
	err := db.QueryRow("SELECT user_id FROM posts WHERE id = $1", postID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	if ownerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only delete your own posts"})
		return
	}

	_, err = db.Exec("DELETE FROM posts WHERE id = $1", postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete post"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "post deleted successfully"})
}

func uploadMedia(c *gin.Context) {
	c.Request.ParseMultipartForm(10 << 20)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file uploaded"})
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") && !strings.HasPrefix(contentType, "video/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only images and videos allowed"})
		return
	}

	ext := filepath.Ext(header.Filename)
	filename := uuid.New().String() + ext

	uploadDir := "./uploads"
	os.MkdirAll(uploadDir, os.ModePerm)
	filePath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}
	defer dst.Close()

	if _, err = io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	url := fmt.Sprintf("/uploads/%s", filename)

	c.JSON(http.StatusOK, gin.H{
		"url":  url,
		"type": contentType,
	})
}

func uploadProfilePicture(c *gin.Context) {
	userID := c.GetString("user_id")

	c.Request.ParseMultipartForm(10 << 20)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file uploaded"})
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only images allowed"})
		return
	}

	ext := filepath.Ext(header.Filename)
	filename := "profile_" + userID + "_" + uuid.New().String() + ext

	uploadDir := "./uploads/profiles"
	os.MkdirAll(uploadDir, os.ModePerm)
	filePath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}
	defer dst.Close()

	if _, err = io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	profileURL := fmt.Sprintf("/uploads/profiles/%s", filename)

	// Update user's profile picture in database
	_, err = db.Exec("UPDATE users SET profile_picture_url = $1 WHERE id = $2", profileURL, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile picture"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url": profileURL,
	})
}

func main() {
	if err := initDB(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.Static("/uploads", "./uploads")

	api := r.Group("/api")
	{
		// Public routes
		api.POST("/auth/register", register)
		api.POST("/auth/login", login)
		api.GET("/posts", getPosts)
		api.GET("/posts/:id", getPost)

		// Protected routes
		protected := api.Group("/")
		protected.Use(authMiddleware())
		{
			protected.GET("/auth/me", getMe)
			protected.GET("/auth/my-posts", getMyPosts)
			protected.POST("/posts", createPost)
			protected.DELETE("/posts/:id", deletePost)
			protected.POST("/upload", uploadMedia)
			protected.POST("/upload-profile-picture", uploadProfilePicture)
		}
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}
