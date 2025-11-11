package handlers

import (
	"bruinmarket-backend/models"
	"bruinmarket-backend/services"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type AuthHandler struct {
	db           *sql.DB
	emailService *services.EmailService
	jwtSecret    []byte
}

func NewAuthHandler(db *sql.DB, emailService *services.EmailService, jwtSecret []byte) *AuthHandler {
	return &AuthHandler{
		db:           db,
		emailService: emailService,
		jwtSecret:    jwtSecret,
	}
}

// Generate random token
func generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// Generate JWT token
func (h *AuthHandler) generateJWT(userID int, email string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID: strconv.Itoa(userID),
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour * 7)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})

	tokenString, err := token.SignedString(h.jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		Name     string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check @ucla.edu email
	if !strings.HasSuffix(input.Email, "@ucla.edu") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Must use a @ucla.edu email address"})
		return
	}

	// Check if email already exists
	var exists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", input.Email).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already registered"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Generate verification token
	token, err := generateToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Token expires in 24 hours
	expiresAt := time.Now().Add(24 * time.Hour)

	// Create user
	var userID int
	err = h.db.QueryRow(`
		INSERT INTO users (email, password, name, email_verified, verification_token, verification_token_expires)
		VALUES ($1, $2, $3, FALSE, $4, $5)
		RETURNING id
	`, input.Email, string(hashedPassword), input.Name, token, expiresAt).Scan(&userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Send verification email
	go func() {
		err := h.emailService.SendVerificationEmail(input.Email, input.Name, token)
		if err != nil {
			log.Printf("Failed to send verification email: %v", err)
		}
	}()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful! Please check your email to verify your account.",
		"email":   input.Email,
	})
}

func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Verification token required"})
		return
	}

	// Find user with this token
	var user models.User
	err := h.db.QueryRow(`
		SELECT id, email, name, verification_token_expires
		FROM users
		WHERE verification_token = $1 AND email_verified = FALSE
	`, token).Scan(&user.ID, &user.Email, &user.Name, &user.VerificationTokenExpires)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification token"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Check if token expired
	if user.VerificationTokenExpires.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Verification token has expired"})
		return
	}

	// Mark email as verified
	_, err = h.db.Exec(`
		UPDATE users
		SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL
		WHERE id = $1
	`, user.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify email"})
		return
	}

	// Send welcome email
	go func() {
		err := h.emailService.SendWelcomeEmail(user.Email, user.Name)
		if err != nil {
			log.Printf("Failed to send welcome email: %v", err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "Email verified successfully! You can now log in.",
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user
	var user models.User
	var hashedPassword string
	err := h.db.QueryRow(`
		SELECT id, email, password, name, profile_picture_url, email_verified
		FROM users
		WHERE email = $1
	`, input.Email).Scan(&user.ID, &user.Email, &hashedPassword, &user.Name, &user.ProfilePictureURL, &user.EmailVerified)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Check if email is verified
	if !user.EmailVerified {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Please verify your email before logging in. Check your inbox for the verification link.",
		})
		return
	}

	// Check password
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(input.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate JWT token
	token, err := h.generateJWT(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

func (h *AuthHandler) ResendVerification(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user
	var user models.User
	err := h.db.QueryRow(`
		SELECT id, email, name, email_verified
		FROM users
		WHERE email = $1
	`, input.Email).Scan(&user.ID, &user.Email, &user.Name, &user.EmailVerified)

	if err == sql.ErrNoRows {
		// Don't reveal if email exists
		c.JSON(http.StatusOK, gin.H{"message": "If this email is registered, a verification email has been sent"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if user.EmailVerified {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already verified"})
		return
	}

	// Generate new token
	token, err := generateToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	expiresAt := time.Now().Add(24 * time.Hour)

	// Update token
	_, err = h.db.Exec(`
		UPDATE users
		SET verification_token = $1, verification_token_expires = $2
		WHERE id = $3
	`, token, expiresAt, user.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update token"})
		return
	}

	// Send email
	go func() {
		err := h.emailService.SendVerificationEmail(user.Email, user.Name, token)
		if err != nil {
			log.Printf("Failed to send verification email: %v", err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Verification email sent!"})
}
