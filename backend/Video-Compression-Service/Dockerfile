FROM golang:1.18-alpine

# Install required dependencies including FFmpeg
RUN apk add --no-cache ffmpeg gcc musl-dev

# Set working directory
WORKDIR /app

# Copy go.mod and source code
COPY . .

# Build the application
RUN go build -o /usr/local/bin/video-compression-service

# Create directories for temporary files
RUN mkdir -p /app/temp

# Expose the port the service runs on
EXPOSE 8080

# Command to run the executable
CMD ["/usr/local/bin/video-compression-service"] 