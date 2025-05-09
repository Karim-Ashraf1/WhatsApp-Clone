# Build stage
FROM golang:1.21-alpine AS builder

# Set working directory
WORKDIR /build

# Copy go mod and sum files
COPY go.mod ./

# Initialize go module if not already initialized
RUN go mod init video-compression-service || true

# Download dependencies
RUN go mod tidy

# Copy source code
COPY . .

# Build the application with verbose output
RUN CGO_ENABLED=0 GOOS=linux go build -v -o server server.go

# Final stage
FROM alpine:latest

# Install ffmpeg
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy the binary from builder
COPY --from=builder /build/server .

# Make the binary executable
RUN chmod +x server

# Expose port
EXPOSE 8085

# Run the application
CMD ["./server"] 
