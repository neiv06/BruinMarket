package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("your-secret-key-change-this-in-production")

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// WebSocket client management
type Client struct {
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
}

type Hub struct {
	Clients    map[string]*Client
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
}

var hub = &Hub{
	Clients:    make(map[string]*Client),
	Broadcast:  make(chan []byte),
	Register:   make(chan *Client),
	Unregister: make(chan *Client),
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client.UserID] = client
			h.mu.Unlock()

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client.UserID]; ok {
				delete(h.Clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()

		case message := <-h.Broadcast:
			h.mu.RLock()
			for _, client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.Clients, client.UserID)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Models
type User struct {
	ID                string    `json:"id"`
	Email             string    `json:"email"`
	Name              string    `json:"name"`
	ProfilePictureURL string    `json:"profile_picture_url"`
	Password          string    `json:"-"`
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
	Price                 float64   `json:"price"`
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

type Conversation struct {
	ID              string    `json:"id"`
	User1ID         string    `json:"user1_id"`
	User2ID         string    `json:"user2_id"`
	User1Name       string    `json:"user1_name"`
	User2Name       string    `json:"user2_name"`
	User1PictureURL string    `json:"user1_picture_url"`
	User2PictureURL string    `json:"user2_picture_url"`
	LastMessage     string    `json:"last_message"`
	LastMessageTime time.Time `json:"last_message_time"`
	CreatedAt       time.Time `json:"created_at"`
}

type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	SenderID       string    `json:"sender_id"`
	ReceiverID     string    `json:"receiver_id"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"created_at"`
	Read           bool      `json:"read"`
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

type WSMessage struct {
	Type           string    `json:"type"`
	ConversationID string    `json:"conversation_id"`
	SenderID       string    `json:"sender_id"`
	ReceiverID     string    `json:"receiver_id"`
	Content        string    `json:"content"`
	MessageID      string    `json:"message_id"`
	CreatedAt      time.Time `json:"created_at"`
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

	CREATE TABLE IF NOT EXISTS conversations (
		id VARCHAR(255) PRIMARY KEY,
		user1_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
		user2_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
		last_message TEXT,
		last_message_time TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user1_id, user2_id)
	);

	CREATE TABLE IF NOT EXISTS messages (
		id VARCHAR(255) PRIMARY KEY,
		conversation_id VARCHAR(255) REFERENCES conversations(id) ON DELETE CASCADE,
		sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
		receiver_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
		content TEXT NOT NULL,
		read BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
	CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
	CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
	CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user2_id);
	CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
	CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
	`

	_, err = db.Exec(schema)
	if err != nil {
		return err
	}

	if _, err := db.Exec(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS location VARCHAR(255)`); err != nil {
		return err
	}

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

// WebSocket handler
func handleWebSocket(c *gin.Context) {
	// Get token from query parameter
	tokenString := c.Query("token")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
		return
	}

	// Verify token
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	userID := claims.UserID

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}

	hub.Register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		var wsMsg WSMessage
		if err := json.Unmarshal(message, &wsMsg); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		if wsMsg.Type == "message" {
			// Save message to database
			messageID := uuid.New().String()
			now := time.Now()

			_, err := db.Exec(
				"INSERT INTO messages (id, conversation_id, sender_id, receiver_id, content, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
				messageID, wsMsg.ConversationID, wsMsg.SenderID, wsMsg.ReceiverID, wsMsg.Content, now,
			)
			if err != nil {
				log.Printf("Error saving message: %v", err)
				continue
			}

			// Update conversation last message
			_, err = db.Exec(
				"UPDATE conversations SET last_message = $1, last_message_time = $2 WHERE id = $3",
				wsMsg.Content, now, wsMsg.ConversationID,
			)
			if err != nil {
				log.Printf("Error updating conversation: %v", err)
			}

			wsMsg.MessageID = messageID
			wsMsg.CreatedAt = now

			msgBytes, _ := json.Marshal(wsMsg)

			// Send to receiver
			hub.mu.RLock()
			if receiverClient, ok := hub.Clients[wsMsg.ReceiverID]; ok {
				select {
				case receiverClient.Send <- msgBytes:
				default:
					close(receiverClient.Send)
					delete(hub.Clients, wsMsg.ReceiverID)
				}
			}

			// Send back to sender (confirmation with the message)
			if senderClient, ok := hub.Clients[wsMsg.SenderID]; ok {
				select {
				case senderClient.Send <- msgBytes:
				default:
					close(senderClient.Send)
					delete(hub.Clients, wsMsg.SenderID)
				}
			}
			hub.mu.RUnlock()
		}
	}
}

func (c *Client) writePump() {
	defer func() {
		c.Conn.Close()
	}()

	for message := range c.Send {
		if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}

// Chat Handlers
func getOrCreateConversation(c *gin.Context) {
	userID := c.GetString("user_id")
	otherUserID := c.Param("user_id")

	if userID == otherUserID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot create conversation with yourself"})
		return
	}

	// Ensure consistent ordering
	user1ID, user2ID := userID, otherUserID
	if userID > otherUserID {
		user1ID, user2ID = otherUserID, userID
	}

	var conversation Conversation
	err := db.QueryRow(
		`SELECT c.id, c.user1_id, c.user2_id, u1.name, u2.name, 
		 COALESCE(u1.profile_picture_url, ''), COALESCE(u2.profile_picture_url, ''),
		 COALESCE(c.last_message, ''), COALESCE(c.last_message_time, c.created_at), c.created_at
		 FROM conversations c
		 JOIN users u1 ON c.user1_id = u1.id
		 JOIN users u2 ON c.user2_id = u2.id
		 WHERE (c.user1_id = $1 AND c.user2_id = $2) OR (c.user1_id = $2 AND c.user2_id = $1)`,
		user1ID, user2ID,
	).Scan(&conversation.ID, &conversation.User1ID, &conversation.User2ID,
		&conversation.User1Name, &conversation.User2Name,
		&conversation.User1PictureURL, &conversation.User2PictureURL,
		&conversation.LastMessage, &conversation.LastMessageTime, &conversation.CreatedAt)

	if err == sql.ErrNoRows {
		// Create new conversation
		conversationID := uuid.New().String()
		now := time.Now()

		_, err = db.Exec(
			"INSERT INTO conversations (id, user1_id, user2_id, created_at) VALUES ($1, $2, $3, $4)",
			conversationID, user1ID, user2ID, now,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create conversation"})
			return
		}

		// Fetch the new conversation
		db.QueryRow(
			`SELECT c.id, c.user1_id, c.user2_id, u1.name, u2.name,
			 COALESCE(u1.profile_picture_url, ''), COALESCE(u2.profile_picture_url, ''),
			 COALESCE(c.last_message, ''), COALESCE(c.last_message_time, c.created_at), c.created_at
			 FROM conversations c
			 JOIN users u1 ON c.user1_id = u1.id
			 JOIN users u2 ON c.user2_id = u2.id
			 WHERE c.id = $1`,
			conversationID,
		).Scan(&conversation.ID, &conversation.User1ID, &conversation.User2ID,
			&conversation.User1Name, &conversation.User2Name,
			&conversation.User1PictureURL, &conversation.User2PictureURL,
			&conversation.LastMessage, &conversation.LastMessageTime, &conversation.CreatedAt)
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, conversation)
}

func getConversations(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := db.Query(
		`SELECT c.id, c.user1_id, c.user2_id, u1.name, u2.name,
		 COALESCE(u1.profile_picture_url, ''), COALESCE(u2.profile_picture_url, ''),
		 COALESCE(c.last_message, ''), COALESCE(c.last_message_time, c.created_at), c.created_at
		 FROM conversations c
		 JOIN users u1 ON c.user1_id = u1.id
		 JOIN users u2 ON c.user2_id = u2.id
		 WHERE c.user1_id = $1 OR c.user2_id = $1
		 ORDER BY COALESCE(c.last_message_time, c.created_at) DESC`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch conversations"})
		return
	}
	defer rows.Close()

	conversations := []Conversation{}
	for rows.Next() {
		var conv Conversation
		rows.Scan(&conv.ID, &conv.User1ID, &conv.User2ID,
			&conv.User1Name, &conv.User2Name,
			&conv.User1PictureURL, &conv.User2PictureURL,
			&conv.LastMessage, &conv.LastMessageTime, &conv.CreatedAt)
		conversations = append(conversations, conv)
	}

	c.JSON(http.StatusOK, conversations)
}

func getMessages(c *gin.Context) {
	userID := c.GetString("user_id")
	conversationID := c.Param("conversation_id")

	// Verify user is part of conversation
	var count int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)",
		conversationID, userID,
	).Scan(&count)

	if err != nil || count == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	rows, err := db.Query(
		`SELECT id, conversation_id, sender_id, receiver_id, content, read, created_at
		 FROM messages
		 WHERE conversation_id = $1
		 ORDER BY created_at ASC`,
		conversationID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch messages"})
		return
	}
	defer rows.Close()

	messages := []Message{}
	for rows.Next() {
		var msg Message
		rows.Scan(&msg.ID, &msg.ConversationID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.Read, &msg.CreatedAt)
		messages = append(messages, msg)
	}

	// Mark messages as read
	_, err = db.Exec(
		"UPDATE messages SET read = TRUE WHERE conversation_id = $1 AND receiver_id = $2 AND read = FALSE",
		conversationID, userID,
	)
	if err != nil {
		log.Printf("Error marking messages as read: %v", err)
	}

	c.JSON(http.StatusOK, messages)
}

// Auth Handlers (keeping existing code)
func register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !strings.HasSuffix(strings.ToLower(req.Email), "@ucla.edu") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "must use a @ucla.edu email address"})
		return
	}

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

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	userID := uuid.New().String()
	_, err = db.Exec(
		"INSERT INTO users (id, email, name, password, created_at) VALUES ($1, $2, $3, $4, $5)",
		userID, req.Email, req.Name, string(hashedPassword), time.Now(),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID: userID,
		Email:  req.Email,
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

	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

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

// Post Handlers (existing)
func createPost(c *gin.Context) {
	var post Post
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if post.Price < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "price cannot be negative"})
		return
	}

	post.ID = uuid.New().String()
	post.CreatedAt = time.Now()
	post.UserID = c.GetString("user_id")

	if post.Type != "selling" && post.Type != "buying" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'selling' or 'buying'"})
		return
	}

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

	// Start WebSocket hub
	go hub.Run()

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

		// WebSocket route - handles auth internally
		api.GET("/ws", handleWebSocket)

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

			// Chat routes
			protected.GET("/conversations", getConversations)
			protected.GET("/conversations/:user_id", getOrCreateConversation)
			protected.GET("/messages/:conversation_id", getMessages)
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
