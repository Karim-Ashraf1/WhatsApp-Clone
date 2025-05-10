FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5002
ENV FRONTEND_URL=http://localhost:5173
ENV USER_SERVICE_URL=http://user-service:5001
ENV API_GATEWAY_URL=http://api-gateway:5000
ENV IMAGE_COMPRESSION_URL=http://image-compression-service:8084
ENV MINIO_ENDPOINT=minio
ENV MINIO_PORT=9000
ENV MINIO_ACCESS_KEY=minioadmin
ENV MINIO_SECRET_KEY=minioadmin
ENV MINIO_PUBLIC_URL=http://localhost:9000

# Expose the port and the WebSocket port
EXPOSE 5002

# Run the application
CMD ["npm", "start"] 