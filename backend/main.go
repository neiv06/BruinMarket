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
	Type        string    `json:"type"`      // "buy" or "sell"
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
	if err := os.MkdirAll("uploads/images", 0755); err != nil {
		log.Fatal("Failed to create images directory:", err)
	}
	if err := os.MkdirAll("uploads/videos", 0755); err != nil {
		log.Fatal("Failed to create videos directory:", err)
	}

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
	uploadsHandler := http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads/")))
	r.PathPrefix("/uploads/").Handler(loggingMiddleware(uploadsHandler))

	// Serve static files (must be last to avoid intercepting other routes)
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("../frontend/dist/")))

	// CORS middleware
	r.Use(corsMiddleware)

	fmt.Println("BruinBuy server starting on :8080")
	fmt.Println("Uploads directory: uploads/")
	log.Fatal(http.ListenAndServe(":8080", r))
}

// Logging middleware for debugging file serving
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Serving file: %s", r.URL.Path)
		next.ServeHTTP(w, r)
	})
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

	log.Printf("GET /api/posts - Returning %d posts", len(posts))
	json.NewEncoder(w).Encode(posts)
}

// Create a new post
func createPost(w http.ResponseWriter, r *http.Request) {
	var post Post
	if err := json.NewDecoder(r.Body).Decode(&post); err != nil {
		log.Printf("Error decoding post: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	post.ID = nextID
	nextID++
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()

	posts = append(posts, post)

	log.Printf("POST /api/posts - Created post #%d: %s (images: %d, videos: %d)",
		post.ID, post.Title, len(post.Images), len(post.Videos))

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
			log.Printf("GET /api/posts/%d - Found post: %s", id, post.Title)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(post)
			return
		}
	}

	log.Printf("GET /api/posts/%d - Post not found", id)
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

			log.Printf("PUT /api/posts/%d - Updated post: %s", id, updatedPost.Title)
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
			log.Printf("DELETE /api/posts/%d - Deleted post", id)
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}

	http.Error(w, "Post not found", http.StatusNotFound)
}

// Upload image handler
func uploadImage(w http.ResponseWriter, r *http.Request) {
	log.Println("POST /api/upload/image - Starting image upload")

	// Parse multipart form with 10MB max memory
	err := r.ParseMultipartForm(10 << 20) // 10MB
	if err != nil {
		log.Printf("Error parsing form: %v", err)
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("image")
	if err != nil {
		log.Printf("Error retrieving file: %v", err)
		http.Error(w, "Error retrieving the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Check file type
	contentType := handler.Header.Get("Content-Type")
	log.Printf("Uploading image: %s (type: %s, size: %d bytes)", handler.Filename, contentType, handler.Size)

	if !strings.HasPrefix(contentType, "image/") {
		log.Printf("Invalid content type: %s", contentType)
		http.Error(w, "File must be an image", http.StatusBadRequest)
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), handler.Filename)
	filePath := filepath.Join("uploads/images", filename)

	// Create file
	dst, err := os.Create(filePath)
	if err != nil {
		log.Printf("Error creating file: %v", err)
		http.Error(w, "Error creating file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Copy file
	bytesWritten, err := io.Copy(dst, file)
	if err != nil {
		log.Printf("Error saving file: %v", err)
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}

	imageURL := fmt.Sprintf("/uploads/images/%s", filename)
	log.Printf("Image saved successfully: %s (%d bytes)", imageURL, bytesWritten)

	// Return file URL
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": imageURL,
	})
}

// Upload video handler
func uploadVideo(w http.ResponseWriter, r *http.Request) {
	log.Println("POST /api/upload/video - Starting video upload")

	// Parse multipart form with 100MB max memory
	err := r.ParseMultipartForm(100 << 20) // 100MB
	if err != nil {
		log.Printf("Error parsing form: %v", err)
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("video")
	if err != nil {
		log.Printf("Error retrieving file: %v", err)
		http.Error(w, "Error retrieving the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Check file type
	contentType := handler.Header.Get("Content-Type")
	log.Printf("Uploading video: %s (type: %s, size: %d bytes)", handler.Filename, contentType, handler.Size)

	if !strings.HasPrefix(contentType, "video/") {
		log.Printf("Invalid content type: %s", contentType)
		http.Error(w, "File must be a video", http.StatusBadRequest)
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), handler.Filename)
	filePath := filepath.Join("uploads/videos", filename)

	// Create file
	dst, err := os.Create(filePath)
	if err != nil {
		log.Printf("Error creating file: %v", err)
		http.Error(w, "Error creating file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Copy file
	bytesWritten, err := io.Copy(dst, file)
	if err != nil {
		log.Printf("Error saving file: %v", err)
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}

	videoURL := fmt.Sprintf("/uploads/videos/%s", filename)
	log.Printf("Video saved successfully: %s (%d bytes)", videoURL, bytesWritten)

	// Return file URL
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": videoURL,
	})
}
