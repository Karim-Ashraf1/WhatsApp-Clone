package main

import (
	"encoding/json"
	"log"
	"os"

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

	msgs, err := b.Consume()
	if err != nil {
		log.Fatalf("Error consuming messages: %v", err)
	}

	log.Println("Waiting for messages")

	for msg := range msgs {
		var payload map[string]interface{}
		if err := json.Unmarshal(msg.Body, &payload); err != nil {
			log.Printf("Failed to decode message: %v", err)
			continue
		}

		log.Printf("Received message: %v", payload)
	}
}
