# JWT Authentication
JWT_SECRET=your_jwt_secret_here

# MongoDB Connection Strings
USER_MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/user-service?retryWrites=true&w=majority
MESSAGE_MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/message-service?retryWrites=true&w=majority

# Cloudinary Configuration
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin123
MINIO_PUBLIC_URL=http://localhost:9000

# Service URLs (for development without Docker)
USER_SERVICE_URL=http://localhost:5001
MESSAGE_SERVICE_URL=http://localhost:5002
FRONTEND_URL=http://localhost:5173
API_GATEWAY_URL=http://api-gateway:5000

# Docker specific configs
COMPOSE_PROJECT_NAME=whatsapp-clone

MONGO_USERNAME=admin
MONGO_PASSWORD=admin123

# Redis Configuration
REDIS_URL=redis://redis:6379