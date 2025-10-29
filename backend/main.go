package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func main() {
	must(os.MkdirAll("uploads/images", 0755))
	must(os.MkdirAll("uploads/videos", 0755))

	mux := http.NewServeMux()

	// Static site (served from ../web)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			// Let other handlers match first; fall back to index
			http.ServeFile(w, r, filepath.Join("..", "web", "index.html"))
			return
		}
		http.ServeFile(w, r, filepath.Join("..", "web", "index.html"))
	})

	// Serve uploads under /uploads/
	uploads := http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads")))
	mux.Handle("/uploads/", uploads)

	// Upload endpoints
	mux.HandleFunc("/api/upload/image", uploadImage)
	mux.HandleFunc("/api/upload/video", uploadVideo)

	// Wrap with CORS + logging
	handler := withCORS(withLogging(mux))

	log.Println("Media server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func uploadImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseMultipartForm(25 << 20); err != nil { // 25MB
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Missing 'image' file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Basic content-type guard
	head := make([]byte, 512)
	n, _ := file.Read(head)
	detected := http.DetectContentType(head[:n])
	if !strings.HasPrefix(detected, "image/") {
		http.Error(w, "File must be an image", http.StatusBadRequest)
		return
	}
	// Reconstruct reader (include peeked bytes)
	reader := io.MultiReader(bytes.NewReader(head[:n]), file)

	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), sanitize(header.Filename))
	dstPath := filepath.Join("uploads", "images", filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "Error creating file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, reader); err != nil {
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]string{"url": "/uploads/images/" + filename})
}

func uploadVideo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseMultipartForm(200 << 20); err != nil { // 200MB
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("video")
	if err != nil {
		http.Error(w, "Missing 'video' file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	head := make([]byte, 512)
	n, _ := file.Read(head)
	detected := http.DetectContentType(head[:n])
	if !strings.HasPrefix(detected, "video/") {
		http.Error(w, "File must be a video", http.StatusBadRequest)
		return
	}
	reader := io.MultiReader(bytes.NewReader(head[:n]), file)

	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), sanitize(header.Filename))
	dstPath := filepath.Join("uploads", "videos", filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "Error creating file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, reader); err != nil {
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]string{"url": "/uploads/videos/" + filename})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func must(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

func sanitize(name string) string {
	// minimal: trim spaces and remove path separators
	name = strings.TrimSpace(name)
	name = strings.ReplaceAll(name, "\\", "_")
	name = strings.ReplaceAll(name, "/", "_")
	return name
}
