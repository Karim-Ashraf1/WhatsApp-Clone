/**
 * Kafka Producer Module
 * Handles creation and management of Kafka producers for sending notifications
 */

const { Kafka } = require('kafkajs');
const { logger } = require('./logger');

/**
 * Create a Kafka producer with the specified broker
 * @param {string} brokerUrl - The Kafka broker URL
 * @returns {Object} - Kafka producer instance
 */
async function createProducer(brokerUrl) {
  try {
    // Create Kafka client
    const kafka = new Kafka({
      clientId: 'notification-producer',
      brokers: [brokerUrl],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    // Create producer
    const producer = kafka.producer();
    
    // Connect producer
    await producer.connect();
    logger.info(`Producer connected to broker: ${brokerUrl}`);
    
    return {
      /**
       * Send a message to a Kafka topic
       * @param {Object} params - Parameters for the message
       * @param {string} params.topic - The Kafka topic to send to
       * @param {Array} params.messages - Array of messages to send
       * @returns {Promise} - Result of the send operation
       */
      send: async ({ topic, messages }) => {
        try {
          const result = await producer.send({
            topic,
            messages
          });
          
          logger.info(`Sent ${messages.length} messages to topic: ${topic}`);
          return result;
        } catch (error) {
          logger.error(`Error sending messages to topic ${topic}:`, error);
          throw error;
        }
      },
      
      /**
       * Disconnect the producer
       * @returns {Promise} - Result of the disconnect operation
       */
      disconnect: async () => {
        try {
          await producer.disconnect();
          logger.info('Producer disconnected');
          return true;
        } catch (error) {
          logger.error('Error disconnecting producer:', error);
          throw error;
        }
      }
    };
  } catch (error) {
    logger.error(`Failed to create Kafka producer: ${error.message}`);
    throw error;
  }
}

/**
 * Send a notification to Kafka
 * @param {Object} producer - Kafka producer instance
 * @param {string} topic - Kafka topic to send to
 * @param {Object} notification - Notification to send
 * @returns {Promise} - Result of the send operation
 */
async function sendNotification(producer, topic, notification) {
  if (!notification.userId) {
    throw new Error('Notification must have a userId field');
  }
  
  if (!notification.message) {
    throw new Error('Notification must have a message field');
  }
  
  // Ensure notification has an ID and timestamp
  const preparedNotification = {
    id: notification.id || `notif_${Date.now()}`,
    timestamp: notification.timestamp || new Date().toISOString(),
    ...notification
  };
  
  return producer.send({
    topic,
    messages: [
      {
        // Using userId as key ensures all notifications for the same user 
        // go to the same partition, maintaining order per user
        key: notification.userId,
        value: JSON.stringify(preparedNotification)
      }
    ]
  });
}

module.exports = {
  createProducer,
  sendNotification
}; 