package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
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

	"bruinmarket-backend/services"

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
	ID                       string     `json:"id"`
	Email                    string     `json:"email"`
	Name                     string     `json:"name"`
	Year                     string     `json:"year"`
	ProfilePictureURL        string     `json:"profile_picture_url"`
	Password                 string     `json:"-"`
	EmailVerified            bool       `json:"email_verified"`
	VerificationToken        *string    `json:"-"`
	VerificationTokenExpires *time.Time `json:"-"`
	CreatedAt                time.Time  `json:"created_at"`
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
	Condition             string    `json:"condition"`
	Sold                  bool      `json:"sold"`
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
	Year     string `json:"year" binding:"required"`
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
var emailService *services.EmailService

func initDB() error {
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		whoami := os.Getenv("USER")
		if whoami == "" {
			whoami = "postgres"
		}
		connStr = fmt.Sprintf("postgres://%s@localhost/bruinmarket?sslmode=disable", whoami)
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

	// Add condition column if it doesn't exist
	_, err = db.Exec(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS condition VARCHAR(50)`)
	if err != nil {
		return err
	}

	// Add sold column if it doesn't exist
	_, err = db.Exec(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold BOOLEAN DEFAULT FALSE`)
	if err != nil {
		return err
	}

	if _, err := db.Exec(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS location VARCHAR(255)`); err != nil {
		return err
	}

	if _, err := db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500)`); err != nil {
		return err
	}

	// Add year column if it doesn't exist
	if _, err := db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS year VARCHAR(50)`); err != nil {
		return err
	}

	// Add email verification columns
	if _, err := db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`); err != nil {
		return err
	}

	if _, err := db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)`); err != nil {
		return err
	}

	if _, err := db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP`); err != nil {
		return err
	}

	// Create index for verification token
	if _, err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_verification_token ON users(verification_token)`); err != nil {
		return err
	}

	// Initialize email service
	emailService, err = services.NewEmailService()
	if err != nil {
		log.Printf("ERROR: Failed to initialize email service: %v", err)
		log.Printf("Email functionality will be disabled. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables to enable.")
		emailService = nil // Ensure it's nil if initialization failed
		// Continue without email service - registration will still work but emails won't be sent
	} else {
		log.Printf("Email service initialized successfully")
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
		err = db.QueryRow(
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

		if err != nil {
			log.Printf("Error fetching new conversation: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch new conversation"})
			return
		}
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
// Helper function to generate verification token
func generateVerificationToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !strings.HasSuffix(strings.ToLower(req.Email), "@g.ucla.edu") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "must use a @g.ucla.edu email address"})
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

	// Generate verification token
	verificationToken, err := generateVerificationToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate verification token"})
		return
	}

	tokenExpires := time.Now().Add(24 * time.Hour)
	userID := uuid.New().String()

	// Insert user with verification token
	_, err = db.Exec(
		`INSERT INTO users (id, email, name, year, password, email_verified, verification_token, verification_token_expires, created_at) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		userID, req.Email, req.Name, req.Year, string(hashedPassword), false, verificationToken, tokenExpires, time.Now(),
	)
	if err != nil {
		log.Printf("Failed to create user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	// Send verification email asynchronously
	if emailService != nil {
		go func() {
			err := emailService.SendVerificationEmail(req.Email, req.Name, verificationToken)
			if err != nil {
				log.Printf("Failed to send verification email to %s: %v", req.Email, err)
			} else {
				log.Printf("Verification email sent successfully to %s", req.Email)
			}
		}()
	} else {
		log.Printf("ERROR: Email service not initialized. Verification email not sent for %s", req.Email)
		log.Printf("Please check that SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables are set")
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful! Please check your email to verify your account. If email is not in your Inbox, check Spam folder.",
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
	var emailVerified bool
	err := db.QueryRow(
		`SELECT id, email, name, COALESCE(year, ''), COALESCE(profile_picture_url, ''), password, COALESCE(email_verified, false), created_at 
		 FROM users WHERE email = $1`,
		req.Email,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Year, &user.ProfilePictureURL, &hashedPassword, &emailVerified, &user.CreatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}
	if err != nil {
		log.Printf("Database error during login: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	// Check if email is verified
	if !emailVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "Please verify your email address before logging in. Check your inbox for the verification email."})
		return
	}

	user.EmailVerified = emailVerified

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

func verifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "verification token is required"})
		return
	}

	var userID, email, name string
	var tokenExpires time.Time
	err := db.QueryRow(
		`SELECT id, email, name, verification_token_expires 
		 FROM users 
		 WHERE verification_token = $1 AND email_verified = false`,
		token,
	).Scan(&userID, &email, &name, &tokenExpires)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification token"})
		return
	}
	if err != nil {
		log.Printf("Database error during email verification: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Check if token is expired
	if time.Now().After(tokenExpires) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Verification token has expired. Please request a new one."})
		return
	}

	// Update user as verified and clear token
	_, err = db.Exec(
		`UPDATE users 
		 SET email_verified = true, verification_token = NULL, verification_token_expires = NULL 
		 WHERE id = $1`,
		userID,
	)
	if err != nil {
		log.Printf("Failed to update user verification status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify email"})
		return
	}

	// Fetch full user data for response
	var user User
	err = db.QueryRow(
		`SELECT id, email, name, COALESCE(year, ''), COALESCE(profile_picture_url, ''), COALESCE(email_verified, false), created_at 
		 FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Year, &user.ProfilePictureURL, &user.EmailVerified, &user.CreatedAt)

	if err != nil {
		log.Printf("Failed to fetch user data after verification: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user data"})
		return
	}

	// Generate JWT token
	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour * 7)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})

	tokenString, err := jwtToken.SignedString(jwtSecret)
	if err != nil {
		log.Printf("Failed to generate JWT token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	// Send welcome email asynchronously
	if emailService != nil {
		go func() {
			err := emailService.SendWelcomeEmail(email, name)
			if err != nil {
				log.Printf("Failed to send welcome email to %s: %v", email, err)
			} else {
				log.Printf("Welcome email sent successfully to %s", email)
			}
		}()
	} else {
		log.Printf("Warning: Email service not initialized. Welcome email not sent for %s", email)
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token: tokenString,
		User:  user,
	})
}

func resendVerification(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var userID, name string
	var emailVerified bool
	err := db.QueryRow(
		`SELECT id, name, COALESCE(email_verified, false) FROM users WHERE email = $1`,
		req.Email,
	).Scan(&userID, &name, &emailVerified)

	// Don't reveal if email exists or not for security
	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"message": "If that email is registered, a verification email has been sent."})
		return
	}
	if err != nil {
		log.Printf("Database error during resend verification: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// If already verified, don't resend
	if emailVerified {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is already verified. You can log in."})
		return
	}

	// Generate new verification token
	verificationToken, err := generateVerificationToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate verification token"})
		return
	}

	tokenExpires := time.Now().Add(24 * time.Hour)

	// Update user with new token
	_, err = db.Exec(
		`UPDATE users 
		 SET verification_token = $1, verification_token_expires = $2 
		 WHERE id = $3`,
		verificationToken, tokenExpires, userID,
	)
	if err != nil {
		log.Printf("Failed to update verification token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update verification token"})
		return
	}

	// Send verification email asynchronously
	if emailService == nil {
		log.Printf("ERROR: Email service not initialized. Cannot resend verification email to %s", req.Email)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "email service is not configured. Please contact support."})
		return
	}
	go func() {
		err := emailService.SendVerificationEmail(req.Email, name, verificationToken)
		if err != nil {
			log.Printf("Failed to send verification email to %s: %v", req.Email, err)
		} else {
			log.Printf("Verification email resent successfully to %s", req.Email)
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Verification email sent! Please check your inbox."})
}

func getMe(c *gin.Context) {
	userID := c.GetString("user_id")

	var user User
	err := db.QueryRow(
		"SELECT id, email, name, COALESCE(year, ''), COALESCE(profile_picture_url, ''), created_at FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Year, &user.ProfilePictureURL, &user.CreatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func getMyPosts(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := db.Query(
		`SELECT p.id, p.user_id, u.email, u.name, COALESCE(u.profile_picture_url, ''), p.title, p.description, p.price, p.category, p.type, COALESCE(p.location, ''), COALESCE(p.condition, ''), COALESCE(p.sold, false), p.created_at 
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
		err := rows.Scan(&post.ID, &post.UserID, &post.UserEmail, &post.UserName, &post.UserProfilePictureURL, &post.Title, &post.Description, &post.Price, &post.Category, &post.Type, &post.Location, &post.Condition, &post.Sold, &post.CreatedAt)
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

func getUserProfile(c *gin.Context) {
	userID := c.Param("user_id")

	// Get user info
	var user User
	err := db.QueryRow(
		"SELECT id, email, name, COALESCE(year, ''), COALESCE(profile_picture_url, ''), created_at FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Year, &user.ProfilePictureURL, &user.CreatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	// Get user's posts
	rows, err := db.Query(
		`SELECT p.id, p.user_id, u.email, u.name, COALESCE(u.profile_picture_url, ''), p.title, p.description, p.price, p.category, p.type, COALESCE(p.location, ''), COALESCE(p.condition, ''), COALESCE(p.sold, false), p.created_at 
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
		err := rows.Scan(&post.ID, &post.UserID, &post.UserEmail, &post.UserName, &post.UserProfilePictureURL, &post.Title, &post.Description, &post.Price, &post.Category, &post.Type, &post.Location, &post.Condition, &post.Sold, &post.CreatedAt)
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

	c.JSON(http.StatusOK, gin.H{
		"user":  user,
		"posts": posts,
	})
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
		"INSERT INTO posts (id, user_id, title, description, price, category, type, location, condition, sold, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
		post.ID, post.UserID, post.Title, post.Description, post.Price, post.Category, post.Type, post.Location, post.Condition, post.Sold, post.CreatedAt,
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

	query := `SELECT p.id, p.user_id, u.email, u.name, COALESCE(u.profile_picture_url, ''), p.title, p.description, p.price, p.category, p.type, COALESCE(p.location, ''), COALESCE(p.condition, ''), COALESCE(p.sold, false), p.created_at 
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
		err := rows.Scan(&post.ID, &post.UserID, &post.UserEmail, &post.UserName, &post.UserProfilePictureURL, &post.Title, &post.Description, &post.Price, &post.Category, &post.Type, &post.Location, &post.Condition, &post.Sold, &post.CreatedAt)
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
		`SELECT p.id, p.user_id, u.email, u.name, COALESCE(u.profile_picture_url, ''), p.title, p.description, p.price, p.category, p.type, COALESCE(p.location, ''), COALESCE(p.condition, ''), p.created_at 
		FROM posts p 
		JOIN users u ON p.user_id = u.id 
		WHERE p.id = $1`,
		postID,
	).Scan(&post.ID, &post.UserID, &post.UserEmail, &post.UserName, &post.UserProfilePictureURL, &post.Title, &post.Description, &post.Price, &post.Category, &post.Type, &post.Location, &post.Condition, &post.CreatedAt)

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

func markPostAsSold(c *gin.Context) {
	postID := c.Param("id")
	userID := c.GetString("user_id")

	var ownerID string
	err := db.QueryRow("SELECT user_id FROM posts WHERE id = $1", postID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	if err != nil {
		log.Printf("Error fetching post owner: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	if ownerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only update your own posts"})
		return
	}

	// Ensure the sold column exists
	_, err = db.Exec(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold BOOLEAN DEFAULT FALSE`)
	if err != nil {
		log.Printf("Warning: Could not ensure sold column exists: %v", err)
	}

	// Parse request body to get sold status
	var requestBody struct {
		Sold bool `json:"sold"`
	}
	if err := c.ShouldBindJSON(&requestBody); err != nil {
		// If no body provided, default to true (mark as sold)
		requestBody.Sold = true
	}

	_, err = db.Exec("UPDATE posts SET sold = $1 WHERE id = $2", requestBody.Sold, postID)
	if err != nil {
		log.Printf("Error updating post sold status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update post sold status", "details": err.Error()})
		return
	}

	action := "marked as sold"
	if !requestBody.Sold {
		action = "unmarked as sold"
	}
	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("post %s successfully", action)})
}

func updatePost(c *gin.Context) {
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
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only update your own posts"})
		return
	}

	var post Post
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update post fields
	_, err = db.Exec(
		"UPDATE posts SET title = $1, description = $2, price = $3, category = $4, type = $5, location = $6, condition = $7 WHERE id = $8",
		post.Title, post.Description, post.Price, post.Category, post.Type, post.Location, post.Condition, postID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update post"})
		return
	}

	// Delete existing media
	_, err = db.Exec("DELETE FROM media WHERE post_id = $1", postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update media"})
		return
	}

	// Insert new media
	for i, media := range post.Media {
		mediaID := uuid.New().String()
		_, err := db.Exec(
			"INSERT INTO media (id, post_id, url, type, order_index) VALUES ($1, $2, $3, $4, $5)",
			mediaID, postID, media.URL, media.Type, i,
		)
		if err != nil {
			log.Printf("updatePost media insert error: %v", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "post updated successfully"})
}

func uploadMedia(c *gin.Context) {
	c.Request.ParseMultipartForm(10 << 20)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		log.Printf("No file in request: %v", err)
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

	// Use environment variable for Railway volume
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads" // fallback for local
	}

	// Create directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Printf("Error creating upload directory: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create upload directory"})
		return
	}

	filePath := filepath.Join(uploadDir, filename)
	log.Printf("Saving file to: %s", filePath)

	dst, err := os.Create(filePath)
	if err != nil {
		log.Printf("Error creating file %s: %v", filePath, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}
	defer dst.Close()

	if _, err = io.Copy(dst, file); err != nil {
		log.Printf("Error copying file data: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	url := fmt.Sprintf("/uploads/%s", filename)
	log.Printf("File saved successfully: %s", url)

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

	// Use environment variable for Railway volume
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	profileDir := filepath.Join(uploadDir, "profiles")

	if err := os.MkdirAll(profileDir, os.ModePerm); err != nil {
		log.Printf("Error creating profile directory: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create directory"})
		return
	}

	filePath := filepath.Join(profileDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		log.Printf("Error creating profile picture: %v", err)
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

func updateUserYear(c *gin.Context) {
	userID := c.GetString("user_id")

	var requestBody struct {
		Year string `json:"year" binding:"required"`
	}
	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate year value
	validYears := map[string]bool{
		"Freshman":  true,
		"Sophomore": true,
		"Junior":    true,
		"Senior":    true,
		"Graduate":  true,
	}
	if !validYears[requestBody.Year] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid year value"})
		return
	}

	_, err := db.Exec("UPDATE users SET year = $1 WHERE id = $2", requestBody.Year, userID)
	if err != nil {
		log.Printf("Error updating user year: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update year"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "year updated successfully"})
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
		AllowOrigins: []string{
			"http://localhost:3000",
			"http://localhost:5173",
			"https://bruinmarket.com",
			"https://www.bruinmarket.com",
			"https://bruinmarket.vercel.app",   // Your Vercel production URL
			"https://bruinmarket-*.vercel.app", // Vercel preview deployments
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	r.Static("/uploads", uploadDir)

	api := r.Group("/api")
	{
		// Public routes
		api.POST("/auth/register", register)
		api.POST("/auth/login", login)
		api.GET("/auth/verify-email", verifyEmail)
		api.POST("/auth/resend-verification", resendVerification)
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
			protected.GET("/users/:user_id", getUserProfile)
			protected.POST("/posts", createPost)
			protected.DELETE("/posts/:id", deletePost)
			protected.PUT("/posts/:id", updatePost)
			protected.PATCH("/posts/:id/sold", markPostAsSold)
			protected.POST("/upload", uploadMedia)
			protected.POST("/upload-profile-picture", uploadProfilePicture)
			protected.PATCH("/auth/year", updateUserYear)

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
