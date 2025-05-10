FROM golang:1.21-alpine3.19

WORKDIR /app

# Copy go mod and sum files
COPY go.mod ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the app
RUN go build -o broker ./cmd/consumer/main.go

# Create non-root user and switch to it
RUN adduser -D -g '' appuser
USER appuser

# Set the entry point
ENTRYPOINT ["./broker"] 