# BruinBuy - UCLA Student Marketplace

A web application for UCLA students to buy and sell items, built with Go backend and Rust frontend.

## Project Structure

```
BruinBuy/
├── backend/          # Go backend server
│   ├── main.go      # Main server file
│   └── go.mod       # Go dependencies
├── frontend/         # Rust frontend (Yew)
│   ├── src/         # Rust source code
│   ├── dist/        # Built frontend files
│   └── Cargo.toml   # Rust dependencies
└── README.md        # This file
```

## Features

- **Backend (Go)**: RESTful API with endpoints for CRUD operations on marketplace posts
- **Frontend (Rust)**: Modern web interface built with Yew framework
- **Post Management**: Create, read, update, and delete marketplace posts
- **Categories**: Organize posts by category (textbooks, electronics, furniture, etc.)
- **Buy/Sell Types**: Distinguish between items for sale and wanted items

## Prerequisites

- Go 1.21 or later
- Rust 1.70 or later
- wasm-pack (for building Rust frontend)

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   go mod tidy
   ```

3. Run the server:
   ```bash
   go run main.go
   ```

The backend will start on `http://localhost:8080`

### Frontend Setup

1. Install wasm-pack (if not already installed):
   ```bash
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

3. Build the frontend:
   ```bash
   wasm-pack build --target web --out-dir pkg
   ```

4. Serve the frontend (you can use any static file server):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server -p 8000
   ```

The frontend will be available at `http://localhost:8000`

## API Endpoints

- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post
- `GET /api/posts/{id}` - Get a specific post
- `PUT /api/posts/{id}` - Update a post
- `DELETE /api/posts/{id}` - Delete a post

## Development

### Adding New Features

1. **Backend**: Add new endpoints in `main.go`
2. **Frontend**: Add new components in `src/components.rs` or pages in `src/pages.rs`
3. **Models**: Update data structures in `src/models.rs` and `main.go`

### Database Integration

Currently, the backend uses in-memory storage. To add a database:

1. Choose a database (PostgreSQL, MySQL, SQLite)
2. Add database driver to `go.mod`
3. Replace the in-memory storage with database operations
4. Add database connection and migration logic

## Future Enhancements

- User authentication and profiles
- Image upload for posts
- Search and filtering functionality
- Real-time notifications
- Chat system for buyers and sellers
- Payment integration
- Mobile app (React Native/Flutter)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
