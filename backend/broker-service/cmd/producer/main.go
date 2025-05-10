package main

import (
	"log"
	"os"
	"time"

	"broker/broker"
)

func main() {
	// Get RABBITMQ_URL from environment variable, default to localhost if not set
	rabbitMQURL := os.Getenv("RABBITMQ_URL")
	if rabbitMQURL == "" {
		rabbitMQURL = "amqp://guest:guest@localhost:5672/"
	}

	b, err := broker.NewBroker(rabbitMQURL, "test_queue", "test_exchange")
	if err != nil {
		log.Fatalf("Error creating broker: %v", err)
	}
	defer b.Close()

	for i := 1; i <= 5; i++ {
		msg := map[string]interface{}{
			"id":      i,
			"message": "Hello from producer",
			"time":    time.Now().Format(time.RFC3339),
		}

		err = b.Publish(msg)
		if err != nil {
			log.Printf("Failed to publish message %d: %v", i, err)
		} else {
			log.Printf("Successfully published message %d", i)
		}

		time.Sleep(1 * time.Second)
	}
}
