# Kafka Notification Service

A standalone notification service built with Node.js and Apache Kafka. This service demonstrates how to use Kafka as a message broker for handling notifications in a distributed system.

## Features

- **Kafka Integration**: Uses Kafka for reliable, scalable message processing
- **Producer/Consumer Architecture**: Separates message production and consumption
- **REST API**: Simple API for sending notifications
- **Simulation Tool**: Includes a script to simulate and test the notification flow
- **Docker Support**: Easy setup with Docker and docker-compose

## Architecture

This service follows a simple producer/consumer architecture:

1. **Producers** send notification messages to Kafka topics
2. **Consumers** process these notifications from the topics
3. The service provides an API to send notifications manually

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Docker and docker-compose (for containerized setup)
- Apache Kafka (for local setup)

## Setup Instructions

### Option 1: Using Docker (Recommended)

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd kafka-notification-service
   ```

2. **Start the services**:

   ```bash
   docker-compose up
   ```

   This will start:

   - Zookeeper (required by Kafka)
   - Kafka broker
   - Notification service
   - Kafdrop (Kafka Web UI)

3. **Access the services**:
   - Notification Service: http://localhost:3000
   - Kafdrop (Kafka UI): http://localhost:9000

### Option 2: Local Setup

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd kafka-notification-service
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up Kafka**:

   You'll need a running Kafka instance. You can:

   - Use an existing Kafka cluster
   - Set up Kafka locally (see [Kafka Quickstart](https://kafka.apache.org/quickstart))
   - Use a cloud service like Confluent Cloud

4. **Configure environment variables**:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your Kafka connection details.

5. **Start the service**:
   ```bash
   npm start
   ```

## Testing the Service

### Using the Simulation Script

The easiest way to test is using the built-in simulation script:

```bash
npm run test
```

This will:

1. Create a Kafka producer and consumer
2. Send several test notifications
3. Display both sent and received messages

### Using the API

You can also send notifications using the REST API:

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "message": "This is a test notification",
    "type": "info",
    "data": {
      "additionalInfo": "Some extra information"
    }
  }'
```

### Health Check

Check if the service is running:

```bash
curl http://localhost:3000/health
```

## Understanding the Code

The service is organized into several modules:

- **index.js**: Main entry point, sets up the Express server and Kafka connections
- **producer.js**: Handles creating Kafka producers and sending messages
- **consumer.js**: Handles creating Kafka consumers and processing messages
- **logger.js**: Provides structured logging
- **simulation.js**: Simulates the notification flow for testing

## Expected Output

When running the simulation, you should see output similar to:

```
[SIMULATION] Starting Kafka notification service simulation
[SIMULATION] Broker: localhost:9092 | Topic: notifications | Messages: 5
[PRODUCER] Connected to Kafka broker at localhost:9092
[CONSUMER] Connected to Kafka broker at localhost:9092
[CONSUMER] Subscribed to topic: notifications
[PRODUCER] Sent notification 1/5: message for user456
[CONSUMER] Received notification: message for user456
[CONSUMER] Message: You have a new message from user123
[PRODUCER] Sent notification 2/5: friend_request for user789
[CONSUMER] Received notification: friend_request for user789
[CONSUMER] Message: New friend request from user456
...
[SIMULATION] Waiting for messages to be processed...
[PRODUCER] Disconnected
[CONSUMER] Disconnected
[SIMULATION] Simulation completed successfully!
```

## Integration with Other Services

To integrate this notification service with your existing applications:

1. **Producer Integration**:

   - Import the Kafka library in your service
   - Connect to the same Kafka broker
   - Send messages to the notifications topic

   Example:

   ```javascript
   const { Kafka } = require("kafkajs");

   async function sendNotification(userId, message) {
     const kafka = new Kafka({
       clientId: "your-service",
       brokers: ["kafka:9092"],
     });

     const producer = kafka.producer();
     await producer.connect();

     await producer.send({
       topic: "notifications",
       messages: [
         {
           key: userId,
           value: JSON.stringify({
             userId,
             message,
             timestamp: new Date().toISOString(),
           }),
         },
       ],
     });

     await producer.disconnect();
   }
   ```

2. **Consumer Integration**:
   - For services that need to handle notifications
   - Connect to Kafka and subscribe to the notifications topic
   - Process messages as needed

## Scaling and Production Considerations

For production use, consider:

1. **Multiple Partitions**: Increase the number of partitions for better parallelism
2. **Consumer Groups**: Use multiple consumer instances in the same group for load balancing
3. **Replication**: Configure topic replication for fault tolerance
4. **Monitoring**: Add monitoring for Kafka and the notification service
5. **Error Handling**: Implement dead-letter queues for failed messages
6. **Security**: Enable authentication and encryption

## Troubleshooting

### Common Issues

1. **Connection Refused**:

   - Check if Kafka is running
   - Verify the broker address in your .env file
   - For Docker setup, ensure the service names match

2. **Topic Not Found**:

   - Check if the topic exists (`kafka-topics.sh --list --bootstrap-server localhost:9092`)
   - Verify auto-creation is enabled or create the topic manually

3. **Consumer Not Receiving Messages**:
   - Check consumer group configuration
   - Verify the consumer is subscribed to the correct topic
   - Check if messages are being produced (use Kafdrop)

## License

[MIT License](LICENSE)
