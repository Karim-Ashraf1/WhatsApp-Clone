FROM golang:1.21-alpine

# Install ffmpeg
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy go mod and sum files
COPY go.mod ./

# Initialize go module if not already initialized
RUN go mod init video-compression-service || true

# Download dependencies
RUN go mod tidy

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o server server.go

# Expose port
EXPOSE 8083

# Run the application
CMD ["./server"] 
