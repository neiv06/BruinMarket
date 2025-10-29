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
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// Models
type Post struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Title       string    `json:"title" binding:"required"`
	Description string    `json:"description" binding:"required"`
	Price       float64   `json:"price" binding:"required"`
	Category    string    `json:"category" binding:"required"`
	Type        string    `json:"type" binding:"required"` // "selling" or "buying"
	Media       []Media   `json:"media"`
	CreatedAt   time.Time `json:"created_at"`
}

type Media struct {
	ID     string `json:"id"`
	PostID string `json:"post_id"`
	URL    string `json:"url"`
	Type   string `json:"type"` // "image" or "video"
	Order  int    `json:"order"`
}

type PostFilters struct {
	Category string
	Type     string
	MinPrice float64
	MaxPrice float64
	Search   string
}

// Database setup
var db *sql.DB

func initDB() error {
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:password@localhost/bruinbuy?sslmode=disable"
	}

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		return err
	}

	if err = db.Ping(); err != nil {
		return err
	}

	// Create tables
	schema := `
	CREATE TABLE IF NOT EXISTS posts (
		id VARCHAR(255) PRIMARY KEY,
		user_id VARCHAR(255) NOT NULL,
		title VARCHAR(255) NOT NULL,
		description TEXT NOT NULL,
		price DECIMAL(10,2) NOT NULL,
		category VARCHAR(100) NOT NULL,
		type VARCHAR(50) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS media (
		id VARCHAR(255) PRIMARY KEY,
		post_id VARCHAR(255) REFERENCES posts(id) ON DELETE CASCADE,
		url TEXT NOT NULL,
		type VARCHAR(50) NOT NULL,
		order_index INTEGER NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
	CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
	CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
	`

	_, err = db.Exec(schema)
	return err
}

// Handlers
func createPost(c *gin.Context) {
	var post Post
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate ID
	post.ID = uuid.New().String()
	post.CreatedAt = time.Now()

	// TODO: Get user_id from JWT token
	post.UserID = "temp_user_id"

	// Validate type
	if post.Type != "selling" && post.Type != "buying" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'selling' or 'buying'"})
		return
	}

	// Insert post
	_, err := db.Exec(
		"INSERT INTO posts (id, user_id, title, description, price, category, type, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		post.ID, post.UserID, post.Title, post.Description, post.Price, post.Category, post.Type, post.CreatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create post"})
		return
	}

	// Insert media
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
	filters := PostFilters{
		Category: c.Query("category"),
		Type:     c.Query("type"),
		Search:   c.Query("search"),
	}

	if minPrice := c.Query("min_price"); minPrice != "" {
		if val, err := strconv.ParseFloat(minPrice, 64); err == nil {
			filters.MinPrice = val
		}
	}

	if maxPrice := c.Query("max_price"); maxPrice != "" {
		if val, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			filters.MaxPrice = val
		}
	}

	query := "SELECT id, user_id, title, description, price, category, type, created_at FROM posts WHERE 1=1"
	args := []interface{}{}
	argCount := 1

	if filters.Category != "" && filters.Category != "all" {
		query += fmt.Sprintf(" AND category = $%d", argCount)
		args = append(args, filters.Category)
		argCount++
	}

	if filters.Type != "" && filters.Type != "all" {
		query += fmt.Sprintf(" AND type = $%d", argCount)
		args = append(args, filters.Type)
		argCount++
	}

	if filters.MinPrice > 0 {
		query += fmt.Sprintf(" AND price >= $%d", argCount)
		args = append(args, filters.MinPrice)
		argCount++
	}

	if filters.MaxPrice > 0 {
		query += fmt.Sprintf(" AND price <= $%d", argCount)
		args = append(args, filters.MaxPrice)
		argCount++
	}

	if filters.Search != "" {
		query += fmt.Sprintf(" AND (LOWER(title) LIKE $%d OR LOWER(description) LIKE $%d)", argCount, argCount)
		args = append(args, "%"+strings.ToLower(filters.Search)+"%")
		argCount++
	}

	query += " ORDER BY created_at DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch posts"})
		return
	}
	defer rows.Close()

	posts := []Post{}
	for rows.Next() {
		var post Post
		err := rows.Scan(&post.ID, &post.UserID, &post.Title, &post.Description, &post.Price, &post.Category, &post.Type, &post.CreatedAt)
		if err != nil {
			log.Printf("Error scanning post: %v", err)
			continue
		}

		// Fetch media for this post
		mediaRows, err := db.Query(
			"SELECT id, url, type, order_index FROM media WHERE post_id = $1 ORDER BY order_index",
			post.ID,
		)
		if err == nil {
			for mediaRows.Next() {
				var media Media
				var order int
				mediaRows.Scan(&media.ID, &media.URL, &media.Type, &order)
				media.PostID = post.ID
				media.Order = order
				post.Media = append(post.Media, media)
			}
			mediaRows.Close()
		}

		posts = append(posts, post)
	}

	c.JSON(http.StatusOK, posts)
}

func getPost(c *gin.Context) {
	postID := c.Param("id")

	var post Post
	err := db.QueryRow(
		"SELECT id, user_id, title, description, price, category, type, created_at FROM posts WHERE id = $1",
		postID,
	).Scan(&post.ID, &post.UserID, &post.Title, &post.Description, &post.Price, &post.Category, &post.Type, &post.CreatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch post"})
		return
	}

	// Fetch media
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

	// TODO: Check if user owns this post (using JWT)

	result, err := db.Exec("DELETE FROM posts WHERE id = $1", postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete post"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "post deleted successfully"})
}

func uploadMedia(c *gin.Context) {
	// Parse multipart form (max 10MB per file)
	c.Request.ParseMultipartForm(10 << 20)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file uploaded"})
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") && !strings.HasPrefix(contentType, "video/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only images and videos allowed"})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := uuid.New().String() + ext

	// Save to local storage (in production, upload to S3)
	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create upload directory"})
		return
	}
	uploadPath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(uploadPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}
	defer dst.Close()

	if _, err = io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	// Return URL (in production, return S3 URL)
	url := fmt.Sprintf("/uploads/%s", filename)

	c.JSON(http.StatusOK, gin.H{
		"url":  url,
		"type": contentType,
	})
}

func main() {
	// Initialize database
	if err := initDB(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Setup Gin
	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Serve uploaded files
	r.Static("/uploads", "./uploads")

	// API routes
	api := r.Group("/api")
	{
		// Posts
		api.POST("/posts", createPost)
		api.GET("/posts", getPosts)
		api.GET("/posts/:id", getPost)
		api.DELETE("/posts/:id", deletePost)

		// Media upload
		api.POST("/upload", uploadMedia)
	}

	// Health check
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
