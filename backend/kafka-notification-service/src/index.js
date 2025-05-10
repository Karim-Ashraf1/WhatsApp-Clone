/**
 * Main entry point for the Kafka Notification Service
 * This is a standalone service for handling notifications using Kafka
 */

const express = require('express');
const { createConsumer } = require('./consumer');
const { createProducer } = require('./producer');
const { initLogger, logger } = require('./logger');
require('dotenv').config();

// Initialize the logger
initLogger();

// Configuration constants
const PORT = process.env.PORT || 3000;
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const NOTIFICATION_TOPIC = process.env.NOTIFICATION_TOPIC || 'notifications';
const CONSUMER_GROUP = process.env.CONSUMER_GROUP || 'notification-service-group';

// Create Express app
const app = express();
app.use(express.json());

// Global variables for Kafka connections
let producer = null;
let consumer = null;

// Initialize Kafka producer and consumer
async function initializeKafka() {
  try {
    // Initialize producer
    producer = await createProducer(KAFKA_BROKER);
    logger.info('Kafka producer initialized');

    // Initialize consumer
    consumer = await createConsumer(KAFKA_BROKER, CONSUMER_GROUP, NOTIFICATION_TOPIC, handleNotification);
    logger.info('Kafka consumer initialized');

    return true;
  } catch (error) {
    logger.error('Failed to initialize Kafka:', error);
    return false;
  }
}

// Notification handler
async function handleNotification(message) {
  try {
    const notification = JSON.parse(message.value.toString());
    logger.info(`Processing notification: ${JSON.stringify(notification)}`);
    
    // Here you would typically:
    // 1. Store the notification in a database
    // 2. Send it to appropriate channels (email, push, etc.)
    // 3. Update notification status
    
    logger.info(`Notification processed successfully: ${notification.id}`);
    return true;
  } catch (error) {
    logger.error(`Error processing notification: ${error.message}`);
    return false;
  }
}

// API endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'kafka-notification-service',
    kafka: {
      producer: producer ? 'connected' : 'disconnected',
      consumer: consumer ? 'connected' : 'disconnected'
    }
  });
});

// Endpoint to manually send a notification (for testing)
app.post('/api/notifications', async (req, res) => {
  try {
    const notification = {
      id: `notif_${Date.now()}`,
      userId: req.body.userId,
      message: req.body.message,
      type: req.body.type || 'info',
      timestamp: new Date().toISOString(),
      data: req.body.data || {}
    };

    if (!producer) {
      return res.status(503).json({
        error: 'Kafka producer not available'
      });
    }

    await producer.send({
      topic: NOTIFICATION_TOPIC,
      messages: [
        { 
          key: notification.userId, 
          value: JSON.stringify(notification) 
        }
      ]
    });

    res.status(201).json({
      status: 'success',
      message: 'Notification sent',
      notification
    });
  } catch (error) {
    logger.error('Error sending notification:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      message: error.message
    });
  }
});

// Start the server
async function startServer() {
  try {
    // Initialize Kafka connections
    await initializeKafka();
    
    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`Notification service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  if (producer) {
    await producer.disconnect();
    logger.info('Producer disconnected');
  }
  if (consumer) {
    await consumer.disconnect();
    logger.info('Consumer disconnected');
  }
  process.exit(0);
});

// Start the server
startServer(); 