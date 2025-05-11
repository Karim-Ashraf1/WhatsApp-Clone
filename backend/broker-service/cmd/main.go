package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	amqp "github.com/rabbitmq/amqp091-go"
)

var (
	// Environment variables with defaults
	port           = getEnv("PORT", "5003")
	frontendURL    = getEnv("FRONTEND_URL", "http://localhost:5173")
	userServiceURL = getEnv("USER_SERVICE_URL", "http://localhost:5001")
	apiGatewayURL  = getEnv("API_GATEWAY_URL", "http://localhost:5000")
	rabbitmqURL    = getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
)

// Message represents a chat message
type Message struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	Sender    string    `json:"sender"`
	Receiver  string    `json:"receiver"`
	Timestamp time.Time `json:"timestamp"`
}

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == frontendURL || origin == userServiceURL || origin == apiGatewayURL
	},
}

// RabbitMQ connection and channel
var (
	conn    *amqp.Connection
	channel *amqp.Channel
)

func main() {
	// Initialize RabbitMQ connection
	var err error
	conn, err = amqp.Dial(rabbitmqURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	channel, err = conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open channel: %v", err)
	}
	defer channel.Close()

	// Declare queues
	_, err = channel.QueueDeclare(
		"messages", // queue name
		true,       // durable
		false,      // delete when unused
		false,      // exclusive
		false,      // no-wait
		nil,        // arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare queue: %v", err)
	}

	// Start consumer in a goroutine
	go startConsumer()

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
	log.Printf("Connected to RabbitMQ at: %s", rabbitmqURL)
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
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		// Process message as producer
		if err := publishMessage(message); err != nil {
			log.Printf("Error publishing message: %v", err)
			continue
		}
	}
}

// publishMessage publishes a message to RabbitMQ
func publishMessage(message []byte) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return channel.PublishWithContext(ctx,
		"",         // exchange
		"messages", // routing key
		false,      // mandatory
		false,      // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        message,
		})
}

// startConsumer starts consuming messages from RabbitMQ
func startConsumer() {
	msgs, err := channel.Consume(
		"messages", // queue
		"",         // consumer
		true,       // auto-ack
		false,      // exclusive
		false,      // no-local
		false,      // no-wait
		nil,        // args
	)
	if err != nil {
		log.Fatalf("Failed to register a consumer: %v", err)
	}

	forever := make(chan bool)

	go func() {
		for d := range msgs {
			// Process received message
			var msg Message
			if err := json.Unmarshal(d.Body, &msg); err != nil {
				log.Printf("Error unmarshaling message: %v", err)
				continue
			}

			// Here you would typically:
			// 1. Store the message in a database
			// 2. Notify relevant users
			// 3. Handle message delivery status
			log.Printf("Received message: %+v", msg)
		}
	}()

	log.Printf(" [*] Waiting for messages. To exit press CTRL+C")
	<-forever
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
