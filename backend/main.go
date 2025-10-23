package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

// Post represents a marketplace post
type Post struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	Category    string    `json:"category"`
	Type        string    `json:"type"` // "buy" or "sell"
	Condition   string    `json:"condition"` // "New", "Used - Like New", "Used - Good", "Used - Fair"
	Author      string    `json:"author"`
	Images      []string  `json:"images"` // URLs to uploaded images
	Videos      []string  `json:"videos"` // URLs to uploaded videos
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// In-memory storage for posts (will be replaced with database later)
var posts []Post
var nextID = 1

func main() {
	// Create uploads directory if it doesn't exist
	os.MkdirAll("uploads/images", 0755)
	os.MkdirAll("uploads/videos", 0755)

	r := mux.NewRouter()

	// API routes
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/posts", getPosts).Methods("GET")
	api.HandleFunc("/posts", createPost).Methods("POST")
	api.HandleFunc("/posts/{id}", getPost).Methods("GET")
	api.HandleFunc("/posts/{id}", updatePost).Methods("PUT")
	api.HandleFunc("/posts/{id}", deletePost).Methods("DELETE")
	
	// File upload routes
	api.HandleFunc("/upload/image", uploadImage).Methods("POST")
	api.HandleFunc("/upload/video", uploadVideo).Methods("POST")

	// Serve uploaded files (must be before the catch-all route)
	r.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads/"))))
	
	// Serve static files (must be last to avoid intercepting other routes)
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("../frontend/dist/")))

	// CORS middleware
	r.Use(corsMiddleware)

	fmt.Println("BruinBuy server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Get all posts
func getPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// Ensure we return an empty array instead of null when no posts exist
	if posts == nil {
		posts = []Post{}
	}
	
	json.NewEncoder(w).Encode(posts)
}

// Create a new post
func createPost(w http.ResponseWriter, r *http.Request) {
	var post Post
	if err := json.NewDecoder(r.Body).Decode(&post); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	post.ID = nextID
	nextID++
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()

	posts = append(posts, post)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

// Get a specific post by ID
func getPost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	for _, post := range posts {
		if post.ID == id {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(post)
			return
		}
	}

	http.Error(w, "Post not found", http.StatusNotFound)
}

// Update a post
func updatePost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	var updatedPost Post
	if err := json.NewDecoder(r.Body).Decode(&updatedPost); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	for i, post := range posts {
		if post.ID == id {
			updatedPost.ID = id
			updatedPost.CreatedAt = post.CreatedAt
			updatedPost.UpdatedAt = time.Now()
			posts[i] = updatedPost

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(updatedPost)
			return
		}
	}

	http.Error(w, "Post not found", http.StatusNotFound)
}

// Delete a post
func deletePost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	for i, post := range posts {
		if post.ID == id {
			posts = append(posts[:i], posts[i+1:]...)
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}

	http.Error(w, "Post not found", http.StatusNotFound)
}

// Upload image handler
func uploadImage(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form with 10MB max memory
	err := r.ParseMultipartForm(10 << 20) // 10MB
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Check file type
	contentType := handler.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		http.Error(w, "File must be an image", http.StatusBadRequest)
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), handler.Filename)
	filepath := filepath.Join("uploads/images", filename)

	// Create file
	dst, err := os.Create(filepath)
	if err != nil {
		http.Error(w, "Error creating file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Copy file
	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}

	// Return file URL
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": fmt.Sprintf("/uploads/images/%s", filename),
	})
}

// Upload video handler
func uploadVideo(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form with 100MB max memory
	err := r.ParseMultipartForm(100 << 20) // 100MB
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("video")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Check file type
	contentType := handler.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "video/") {
		http.Error(w, "File must be a video", http.StatusBadRequest)
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), handler.Filename)
	filepath := filepath.Join("uploads/videos", filename)

	// Create file
	dst, err := os.Create(filepath)
	if err != nil {
		http.Error(w, "Error creating file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Copy file
	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}

	// Return file URL
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": fmt.Sprintf("/uploads/videos/%s", filename),
	})
}
