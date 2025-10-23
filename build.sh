#!/bin/bash

# BruinBuy Build Script

echo "Building BruinBuy..."

# Build backend
echo "Building Go backend..."
cd backend
go mod tidy
go build -o bruinbuy-backend main.go
echo "Backend built successfully!"

# Build frontend
echo "Building Rust frontend..."
cd ../frontend
wasm-pack build --target web --out-dir pkg
echo "Frontend built successfully!"

echo "Build complete!"
echo ""
echo "To run the application:"
echo "1. Start the backend: cd backend && ./bruinbuy-backend"
echo "2. Start the frontend: cd frontend/dist && python -m http.server 8000"
echo "3. Open http://localhost:8000 in your browser"
