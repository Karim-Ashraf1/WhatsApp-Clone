const express = require('express');
const { createConsumer } = require('./consumer');
const { createProducer } = require('./producer');
const { initLogger, logger } = require('./logger');
require('dotenv').config();

initLogger();

const PORT = process.env.PORT || 3000;
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const NOTIFICATION_TOPIC = process.env.NOTIFICATION_TOPIC || 'notifications';
const CONSUMER_GROUP = process.env.CONSUMER_GROUP || 'notification-service-group';

const app = express();
app.use(express.json());


let producer = null;
let consumer = null;

async function initializeKafka() {
  try {
    producer = await createProducer(KAFKA_BROKER);
    logger.info('Kafka producer initialized');

    consumer = await createConsumer(KAFKA_BROKER, CONSUMER_GROUP, NOTIFICATION_TOPIC, handleNotification);
    logger.info('Kafka consumer initialized');

    return true;
  } catch (error) {
    logger.error('Failed to initialize Kafka:', error);
    return false;
  }
}

async function handleNotification(message) {
  try {
    const notification = JSON.parse(message.value.toString());
    logger.info(`Processing notification: ${JSON.stringify(notification)}`);
    logger.info(`Notification processed successfully: ${notification.id}`);
    return true;
  } catch (error) {
    logger.error(`Error processing notification: ${error.message}`);
    return false;
  }
}
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

async function startServer() {
  try {
    await initializeKafka();
    
    app.listen(PORT, () => {
      logger.info(`Notification service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle clean shutdown when the service is stopped
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

startServer(); 