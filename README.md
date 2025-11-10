# BruinMarket (Beta)

A modern marketplace platform for UCLA students to buy and sell items within their community. Built with React and Go, featuring real-time messaging, media uploads, and a beautiful, responsive UI.

## 🎯 Features

### Core Functionality
- **User Authentication**: Secure login and registration with JWT tokens
- **Post Management**: Create, edit, and delete posts for buying or selling items
- **Media Support**: Upload multiple images and videos per post
- **Real-time Messaging**: WebSocket-based chat system for buyer-seller communication
- **User Profiles**: View personal and other users' profiles with post history
- **Search & Filtering**: Filter posts by category, type (buying/selling), price range, and search terms
- **Condition Tags**: Specify item condition (New, Used - like New, Used - Good, Used - Poor) for selling posts
- **Mark as Sold**: Mark items as sold with visual indicators

### UI/UX Features
- **Landing Page**: Beautiful animated landing page with typing effect
- **Smooth Transitions**: Fade-in and pull-up animations throughout the app
- **Hover Effects**: Interactive hover effects on cards and buttons
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Overlays**: Modal overlays with blurred backgrounds
- **Real-time Updates**: Live updates for messages and post changes

## 🛠️ Tech Stack

### Frontend
- **React 19.2.0**: Modern React with hooks
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **WebSocket**: Real-time messaging

### Backend
- **Go 1.25.3**: High-performance backend language
- **Gin Framework**: Fast HTTP web framework
- **PostgreSQL**: Relational database
- **JWT**: Authentication tokens
- **WebSocket**: Real-time communication
- **bcrypt**: Password hashing

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Go** (version 1.25.3 or higher)
- **Node.js** (version 14 or higher)
- **npm** or **yarn**
- **PostgreSQL** (version 12 or higher)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BruinMarket
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE bruinmarket;
```

### 3. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install Go dependencies:

```bash
go mod download
```

Update the database connection string in `main.go` (around line 60):

```go
db, err = sql.Open("postgres", "postgres://username:password@localhost/bruinmarket?sslmode=disable")
```

Replace `username`, `password`, and `bruinmarket` with your PostgreSQL credentials.

**Important**: Change the JWT secret key in `main.go` (line 26) for production:

```go
var jwtSecret = []byte("your-secret-key-change-this-in-production")
```

Run the backend server:

```bash
go run main.go
```

The backend will start on `http://localhost:8080`

### 4. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

The frontend will start on `http://localhost:3000`

## 📁 Project Structure

```
BruinMarket/
├── backend/
│   ├── main.go              # Main backend server file
│   ├── go.mod               # Go dependencies
│   ├── go.sum               # Go dependency checksums
│   └── uploads/             # Uploaded media files
│       └── profiles/        # User profile pictures
├── frontend/
│   ├── public/              # Static assets
│   │   ├── index.html
│   │   └── *.jpg            # Background images
│   ├── src/
│   │   ├── App.js           # Main React component
│   │   ├── App.css          # Global styles
│   │   ├── Chat.js          # Chat component
│   │   └── index.js         # React entry point
│   ├── package.json         # Node dependencies
│   └── tailwind.config.js   # Tailwind configuration
└── README.md                # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/my-posts` - Get current user's posts

### Posts
- `GET /api/posts` - Get all posts (with filters)
- `GET /api/posts/:id` - Get a specific post
- `POST /api/posts` - Create a new post
- `PUT /api/posts/:id` - Update a post
- `DELETE /api/posts/:id` - Delete a post
- `PATCH /api/posts/:id/sold` - Mark/unmark post as sold

### Users
- `GET /api/users/:user_id` - Get user profile

### Media
- `POST /api/upload` - Upload media files
- `POST /api/upload-profile-picture` - Upload profile picture

### Conversations & Messages
- `GET /api/conversations` - Get all conversations
- `GET /api/conversations/:user_id` - Get or create conversation with user
- `GET /api/messages/:conversation_id` - Get messages in a conversation
- `WS /ws` - WebSocket connection for real-time messaging

## 🔐 Environment Variables

### Backend
Set these environment variables or update them in `main.go`:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens (change in production!)
- `UPLOAD_DIR`: Directory for uploaded files (defaults to `./uploads`)

### Frontend
Update `API_URL` in `src/App.js` if your backend runs on a different port:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
```

## 🎨 Key Features Explained

### Post Types
- **Selling**: Users can sell items with condition tags
- **Buying**: Users can post items they're looking to buy

### Categories
- All, Clothing, Sports Equipment, Shoes, Class Supplies, Electronics, Tickets, Parking Spots, Furniture, Decorations, Other

### Media Handling
- Supports multiple images and videos per post
- Maximum file size: 10MB
- Files are stored in the `backend/uploads/` directory

### Real-time Chat
- WebSocket-based messaging system
- Messages are stored in the database
- Supports multiple concurrent conversations

## 🐛 Troubleshooting

### Backend Issues
- **Database connection errors**: Verify PostgreSQL is running and credentials are correct
- **Port already in use**: Change the port in `main.go` (default: 8080)
- **CORS errors**: Update allowed origins in `main.go` CORS configuration

### Frontend Issues
- **API connection errors**: Verify backend is running on the correct port
- **Build errors**: Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- **Styling issues**: Ensure Tailwind CSS is properly configured

## 📝 Notes

- The project is currently in **Beta** status
- Mobile app version coming soon
- Default JWT secret should be changed in production
- File uploads are stored locally (consider cloud storage for production)
- LLMs used to assist development: Claude Sonnet 4.5, ChatGPT 5, Cursor

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


## 👥 Authors

Neiv Gupta

---

