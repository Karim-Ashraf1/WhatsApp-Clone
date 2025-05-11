package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
)

var (
	// Environment variables with defaults
	port           = getEnv("PORT", "5003")
	frontendURL    = getEnv("FRONTEND_URL", "http://localhost:5173")
	userServiceURL = getEnv("USER_SERVICE_URL", "http://localhost:5001")
	apiGatewayURL  = getEnv("API_GATEWAY_URL", "http://localhost:5000")
	redisURL       = getEnv("REDIS_URL", "redis://localhost:6379")
)

// Redis client
var rdb *redis.Client

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from frontend, user service, and API gateway
		origin := r.Header.Get("Origin")
		return origin == frontendURL || origin == userServiceURL || origin == apiGatewayURL
	},
}

func main() {
	// Initialize Redis client
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("Failed to parse Redis URL: %v", err)
	}
	rdb = redis.NewClient(opt)

	// Test Redis connection
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("Connected to Redis successfully")

	// Initialize Gin router
	router := gin.Default()

	// Configure CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL, userServiceURL, apiGatewayURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "broker-service",
		})
	})

	// WebSocket endpoint
	router.GET("/ws", handleWebSocket)

	// Log important configuration
	log.Printf("Broker service running on port: %s", port)
	log.Printf("Connected to Redis at: %s", redisURL)
	log.Printf("Accepting connections from frontend at: %s", frontendURL)
	log.Printf("API Gateway URL: %s", apiGatewayURL)

	// Start server
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// handleWebSocket handles WebSocket connections
func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	// Handle WebSocket connection
	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		// Process message
		if err := processMessage(message); err != nil {
			log.Printf("Error processing message: %v", err)
			continue
		}

		// Echo message back to client
		if err := conn.WriteMessage(messageType, message); err != nil {
			log.Printf("Error writing message: %v", err)
			break
		}
	}
}

// processMessage processes incoming messages
func processMessage(message []byte) error {
	ctx := context.Background()

	// Store message in Redis
	return rdb.Publish(ctx, "messages", message).Err()
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
