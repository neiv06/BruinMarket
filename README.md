# BruinMarket

A modern marketplace platform exclusively for UCLA students to buy and sell items within their community. Built with React and Go, featuring real-time messaging, email verification, media uploads, and a beautiful, responsive UI.

## 🎯 Features

### Core Functionality
- **User Authentication**: Secure login and registration with JWT tokens
- **Email Verification**: Email verification system using SendGrid for secure account activation
- **Post Management**: Create, edit, and delete posts for buying or selling items
- **Media Support**: Upload multiple images and videos per post
- **Real-time Messaging**: WebSocket-based chat system for buyer-seller communication
- **User Profiles**: View personal and other users' profiles with post history
- **Search & Filtering**: Filter posts by category, type (buying/selling), price range, and search terms
- **Condition Tags**: Specify item condition (New, Used - like New, Used - Good, Used - Poor) for selling posts
- **Mark as Sold**: Mark items as sold with visual indicators

### Security & Privacy
- **Email Verification**: All users must verify their @ucla.edu email address before accessing the platform
- **Password Security**: Passwords are securely hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Data Privacy**: Clear data privacy and ethics policies displayed during verification

### UI/UX Features
- **Landing Page**: Beautiful animated landing page with typing effect
- **Smooth Transitions**: Fade-in and pull-up animations throughout the app
- **Hover Effects**: Interactive hover effects on cards and buttons
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Overlays**: Modal overlays with blurred backgrounds
- **Real-time Updates**: Live updates for messages and post changes
- **Email Templates**: Professional HTML email templates for verification and welcome emails

## 🛠️ Tech Stack

### Frontend
- **React 19.2.0**: Modern React with hooks
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **WebSocket**: Real-time messaging

### Backend
- **Go 1.25.3**: High-performance backend language
- **Gin Framework**: Fast HTTP web framework
- **PostgreSQL**: Relational database
- **JWT**: Authentication tokens
- **WebSocket (Gorilla)**: Real-time communication
- **bcrypt**: Password hashing
- **SendGrid**: Email service for verification and notifications

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Go** (version 1.25.3 or higher)
- **Node.js** (version 14 or higher)
- **npm** or **yarn**
- **PostgreSQL** (version 12 or higher)
- **SendGrid Account** (for email functionality)

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

#### Environment Variables

Create a `.env` file or set the following environment variables:

```bash
# Database
DATABASE_URL=postgres://username:password@localhost/bruinmarket?sslmode=disable

# JWT Secret (change this in production!)
JWT_SECRET=your-secret-key-change-this-in-production

# File Uploads
UPLOAD_DIR=./uploads

# Email Service (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@bruinmarket.com
SENDGRID_FROM_NAME=BruinMarket

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Server Port
PORT=8080
```

**Important**: 
- Replace `username`, `password`, and `bruinmarket` with your PostgreSQL credentials
- Get your SendGrid API key from [SendGrid Dashboard](https://app.sendgrid.com/)
- Change the JWT secret key for production
- Verify your sender email in SendGrid

Run the backend server:

```bash
go run main.go
```

The backend will start on `http://localhost:8080` (or the port specified in `PORT`)

### 4. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

#### Environment Variables

Create a `.env` file in the frontend directory:

```bash
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_WS_URL=ws://localhost:8080/api/ws
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
│   ├── handlers/
│   │   └── auth.go          # Authentication handlers
│   ├── models/
│   │   └── user.go          # User model
│   ├── services/
│   │   └── email.go         # Email service (SendGrid)
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
│   │   ├── VerifyEmail.js   # Email verification page
│   │   └── index.js         # React entry point
│   ├── package.json         # Node dependencies
│   └── tailwind.config.js   # Tailwind configuration
└── README.md                # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user (requires @ucla.edu email)
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/my-posts` - Get current user's posts
- `GET /api/auth/verify-email?token=<token>` - Verify email address
- `POST /api/auth/resend-verification` - Resend verification email
- `PATCH /api/auth/year` - Update user's year

### Posts
- `GET /api/posts` - Get all posts (with filters: category, type, price range, search)
- `GET /api/posts/:id` - Get a specific post
- `POST /api/posts` - Create a new post (requires authentication)
- `PUT /api/posts/:id` - Update a post (requires authentication)
- `DELETE /api/posts/:id` - Delete a post (requires authentication)
- `PATCH /api/posts/:id/sold` - Mark/unmark post as sold (requires authentication)

### Users
- `GET /api/users/:user_id` - Get user profile

### Media
- `POST /api/upload` - Upload media files (requires authentication)
- `POST /api/upload-profile-picture` - Upload profile picture (requires authentication)

### Conversations & Messages
- `GET /api/conversations` - Get all conversations (requires authentication)
- `GET /api/conversations/:user_id` - Get or create conversation with user (requires authentication)
- `GET /api/messages/:conversation_id` - Get messages in a conversation (requires authentication)
- `WS /api/ws?token=<jwt_token>` - WebSocket connection for real-time messaging

## 🔐 Environment Variables

### Backend

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgres://user@localhost/bruinmarket?sslmode=disable` |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | Must be set |
| `UPLOAD_DIR` | Directory for uploaded files | No | `./uploads` |
| `SENDGRID_API_KEY` | SendGrid API key for emails | Yes | - |
| `SENDGRID_FROM_EMAIL` | Sender email address | Yes | - |
| `SENDGRID_FROM_NAME` | Sender name | No | `BruinMarket` |
| `FRONTEND_URL` | Frontend URL for email links | No | `http://localhost:3000` |
| `PORT` | Server port | No | `8080` |

### Frontend

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_API_URL` | Backend API URL | No | `http://localhost:8080/api` |
| `REACT_APP_WS_URL` | WebSocket URL | No | `ws://localhost:8080/api/ws` |

## 🎨 Key Features Explained

### Email Verification
- All users must register with a valid @ucla.edu email address
- Verification email is sent automatically upon registration
- Verification link expires after 24 hours
- Users can resend verification emails if needed
- Welcome email is sent after successful verification

### Post Types
- **Selling**: Users can sell items with condition tags
- **Buying**: Users can post items they're looking to buy

### Categories
- All, Clothing, Sports Equipment, Shoes, Class Supplies, Electronics, Tickets, Parking Spots, Furniture, Decorations, Other

### Media Handling
- Supports multiple images and videos per post
- Maximum file size: 10MB
- Files are stored in the `backend/uploads/` directory
- Profile pictures are stored separately in `backend/uploads/profiles/`

### Real-time Chat
- WebSocket-based messaging system
- Messages are stored in the database
- Supports multiple concurrent conversations
- Real-time message delivery

### Data Privacy & Ethics
- Clear data privacy policies displayed during email verification
- User data is used solely for marketplace functionality
- Passwords are securely hashed and never stored in plain text
- Users can request account deletion at any time

## 🐛 Troubleshooting

### Backend Issues
- **Database connection errors**: Verify PostgreSQL is running and credentials are correct
- **Port already in use**: Change the port using the `PORT` environment variable
- **CORS errors**: Update allowed origins in `main.go` CORS configuration
- **Email not sending**: Verify SendGrid API key and sender email are correctly configured
- **Email service initialization failed**: Check that `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` are set

### Frontend Issues
- **API connection errors**: Verify backend is running on the correct port
- **Build errors**: Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- **Styling issues**: Ensure Tailwind CSS is properly configured
- **WebSocket connection fails**: Verify the WebSocket URL is correct and backend is running

### Email Issues
- **Verification emails not received**: Check spam folder, verify SendGrid API key, check SendGrid dashboard for delivery status
- **Email service not initialized**: Ensure environment variables are set correctly

## 📝 Notes

- The project is currently in **Beta** status
- Email verification is required for all users
- Only @ucla.edu email addresses are accepted for registration
- Default JWT secret should be changed in production
- File uploads are stored locally (consider cloud storage for production)
- SendGrid account is required for email functionality
- All emails include data privacy and copyright information

## 🔒 Security Considerations

- Change JWT secret in production
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Consider using cloud storage (S3, Cloudinary) for media files
- Regularly update dependencies
- Use environment variables for all sensitive configuration
- Implement proper CORS policies for production

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

Copyright © 2025 BruinMarket. All rights reserved.

## 👥 Authors

Neiv Gupta

---

**Built with ❤️ for UCLA students**
