# RabbitMQ Broker Service

A lightweight message broker service for the WhatsApp Clone application, built with Go and RabbitMQ.

## Overview

This service provides a reliable messaging infrastructure using RabbitMQ to:

- Enable asynchronous communication between microservices
- Handle message queues for reliability and scalability
- Support publish/subscribe patterns for event-driven architecture
- Provide fault tolerance for message delivery

## Features

- Reliable message delivery with acknowledgments
- Durable queues and exchanges for message persistence
- Automatic reconnection handling
- JSON message format support
- Simple producer and consumer APIs

## Architecture

The broker service consists of:

1. **Go-based Broker Library** (`broker/broker.go`):

   - Core connection handling
   - Queue and exchange management
   - Message publishing and consuming

2. **Example Producer** (`cmd/producer/main.go`):

   - Demonstrates how to publish messages to RabbitMQ

3. **Example Consumer** (`cmd/consumer/main.go`):
   - Shows how to consume messages from RabbitMQ queues

## Prerequisites

- Go 1.21+
- RabbitMQ server running (locally or via Docker)

## Configuration

The broker connects to RabbitMQ using the following URL format:

```
amqp://username:password@host:port/
```

Default: `amqp://guest:guest@localhost:5672/`

## Usage

### Building and Running

#### Build the Consumer:

```bash
go build -o consumer ./cmd/consumer/main.go
```

#### Build the Producer:

```bash
go build -o producer ./cmd/producer/main.go
```

#### Run the Consumer:

```bash
./consumer
```

#### Run the Producer:

```bash
./producer
```

### Docker Support

The service can be run as a Docker container:

```bash
docker build -t broker-service .
docker run broker-service
```

### Integration with Node.js Services

The Node.js services (message-service, user-service) connect to this broker using the [amqplib](https://www.npmjs.com/package/amqplib) package.

Example integration:

```javascript
import amqp from "amqplib";

// Connect to RabbitMQ
const connection = await amqp.connect("amqp://guest:guest@localhost:5672/");
const channel = await connection.createChannel();

// Publish a message
const message = { content: "Hello World!" };
channel.publish(
  "exchange_name",
  "routing_key",
  Buffer.from(JSON.stringify(message))
);
```

## Message Formats

All messages use JSON format with the following standard fields:

- `id`: Unique message identifier
- `timestamp`: ISO-8601 formatted date/time
- `type`: Message type
- Additional fields depending on message type

## License

MIT License
