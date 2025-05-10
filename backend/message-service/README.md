# Message Service

This service handles sending, receiving, and storing messages in the WhatsApp Clone application.

## Features

- Real-time messaging using Socket.io
- Image handling with compression
- Message storage in MongoDB
- File storage in MinIO

## Integration with Image Compression Service

The Message Service now integrates with the Image Compression Service to optimize image size before storing. When a user sends an image:

1. The Message Service receives the image data
2. The image is sent to the Image Compression Service
3. The compressed image is returned
4. The compressed image is stored in MinIO
5. The image reference is saved in the message record

## Environment Variables

Add these environment variables to your `.env` file:

```
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/whatsapp
MESSAGE_MONGO_URI=mongodb://localhost:27017/whatsapp-messages

# Service URLs
USER_SERVICE_URL=http://localhost:5001
FRONTEND_URL=http://localhost:5173
API_GATEWAY_URL=http://localhost:5000
IMAGE_COMPRESSION_URL=http://localhost:8081  # Required for image compression

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_PUBLIC_URL=http://localhost:9000

# JWT Secret
JWT_SECRET=your_jwt_secret

# Server Port
PORT=5002
```

## Running the Service

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```
