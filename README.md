# Node.js TypeScript API

A comprehensive Node.js API built with TypeScript, Express, MongoDB, and modern best practices.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Management**: Complete CRUD operations with 15+ user fields
- **Email System**: Template-based emails with verification and password reset
- **File Uploads**: Cloud storage integration with image processing
- **Analytics & Metrics**: Real-time analytics and performance monitoring
- **Cron Jobs**: Scheduled tasks for maintenance and reporting
- **Rate Limiting**: Advanced rate limiting with multiple strategies
- **Caching**: In-memory caching with TTL support
- **Validation**: Comprehensive input validation with Zod
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Logging**: Structured logging with winston
- **Security**: Helmet, CORS, compression, and security best practices
- **Performance**: Response time monitoring and memory leak detection
- **Events**: Event-driven architecture for user and system events

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, bcrypt
- **Validation**: Zod
- **File Storage**: Cloudinary
- **Email**: Nodemailer
- **Logging**: Winston
- **Testing**: Jest (configured)
- **Code Quality**: ESLint, Prettier

## Project Structure

```
src/
├── config/           # Configuration files
├── constants/        # Application constants
├── controllers/      # Route controllers
├── email/           # Email templates and helpers
├── enums/           # TypeScript enums
├── events/          # Event emitters
├── enhancements/    # Performance and security enhancements
├── jobs/            # Background jobs
├── middlewares/     # Express middlewares
├── models/          # MongoDB models
├── routes/          # API routes
├── serializers/     # Data serializers
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nodejs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your environment**
   Edit `.env` file with your configuration:
   ```env
   # Server
   NODE_ENV=development
   PORT=3000
   HOST=localhost

   # Database
   MONGODB_URI=mongodb://localhost:27017/nodejs-api

   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   JWT_EXPIRE=7d
   JWT_REFRESH_EXPIRE=30d

   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=noreply@yourapp.com
   FROM_NAME=Your App

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start MongoDB**
   Make sure MongoDB is running on your system or update the MONGODB_URI in your .env file.

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the TypeScript code
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### User Endpoints

#### Get Current User Profile
```http
GET /api/users/profile
Authorization: Bearer your-access-token
```

#### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Software Developer"
}
```

#### Upload Avatar
```http
POST /api/users/avatar
Authorization: Bearer your-access-token
Content-Type: multipart/form-data

avatar: [file]
```

### Admin Endpoints

#### Get Dashboard Stats
```http
GET /api/admin/dashboard
Authorization: Bearer your-admin-token
```

#### Get All Users
```http
GET /api/admin/users
Authorization: Bearer your-admin-token
```

#### Suspend User
```http
POST /api/admin/users/:id/suspend
Authorization: Bearer your-admin-token
Content-Type: application/json

{
  "reason": "Violation of terms",
  "duration": "7d"
}
```

## User Model Fields

The User model includes the following fields:

### Basic Information (5 fields)
- `firstName` - User's first name
- `lastName` - User's last name
- `email` - User's email (unique)
- `password` - Hashed password
- `phone` - Optional phone number

### Profile Information (5 fields)
- `avatar` - Profile image URL
- `dateOfBirth` - Date of birth
- `gender` - Gender (male, female, other, prefer_not_to_say)
- `bio` - User biography
- `headline` - Professional headline

### Professional Information (5 fields)
- `company` - Company name
- `jobTitle` - Job title
- `location` - Location
- `website` - Personal website
- `socialLinks` - Social media links (LinkedIn, Twitter, etc.)

### Additional Fields
- `role` - User role (user, admin, moderator)
- `status` - Account status (active, suspended, deleted)
- `emailVerified` - Email verification status
- `twoFactorEnabled` - 2FA status
- `preferences` - User preferences
- `stats` - User statistics
- `addresses` - User addresses
- `loginMethod` - Login method

## Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Access and refresh tokens
- **Rate Limiting**: Multiple rate limiting strategies
- **CORS**: Configurable CORS policies
- **Helmet**: Security headers
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Mongoose ODM
- **XSS Protection**: Input sanitization

## Performance Features

- **Caching**: In-memory caching with TTL
- **Compression**: Gzip compression
- **Response Time Monitoring**: Track API response times
- **Memory Leak Detection**: Automatic memory monitoring
- **Database Indexing**: Optimized queries
- **Connection Pooling**: Efficient database connections

## Monitoring & Analytics

- **Health Checks**: `/health` endpoint
- **Metrics**: `/metrics` endpoint with Prometheus format
- **Request Logging**: Morgan with Winston
- **Error Tracking**: Centralized error handling
- **Performance Metrics**: Response time, memory usage, CPU usage

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 3000 |
| `HOST` | Server host | localhost |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_REFRESH_SECRET` | JWT refresh secret key | - |
| `JWT_EXPIRE` | JWT expiration time | 7d |
| `JWT_REFRESH_EXPIRE` | JWT refresh expiration time | 30d |
| `SMTP_HOST` | SMTP server host | - |
| `SMTP_PORT` | SMTP server port | 587 |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - |
| `FRONTEND_URL` | Frontend application URL | - |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please email support@yourapp.com or create an issue in the repository.

## Roadmap

- [ ] Add WebSocket support for real-time features
- [ ] Implement Redis for distributed caching
- [ ] Add API versioning
- [ ] Implement GraphQL endpoint
- [ ] Add Docker support
- [ ] Add comprehensive test coverage
- [ ] Add API documentation with Swagger
- [ ] Implement microservices architecture
- [ ] Add internationalization support
- [ ] Add audit logging
