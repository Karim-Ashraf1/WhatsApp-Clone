/**
 * Kafka Consumer Module
 * Handles consuming notification messages from Kafka topics
 */

const { Kafka } = require('kafkajs');
const { logger } = require('./logger');

/**
 * Create a Kafka consumer
 * @param {string} brokerUrl - The Kafka broker URL
 * @param {string} groupId - The consumer group ID
 * @param {string} topic - The topic to consume from
 * @param {Function} messageHandler - Function to handle received messages
 * @returns {Object} - Kafka consumer instance
 */
async function createConsumer(brokerUrl, groupId, topic, messageHandler) {
  try {
    // Create Kafka client
    const kafka = new Kafka({
      clientId: 'notification-consumer',
      brokers: [brokerUrl],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    // Create consumer
    const consumer = kafka.consumer({ groupId });
    
    // Connect consumer
    await consumer.connect();
    logger.info(`Consumer connected to broker: ${brokerUrl}`);
    
    // Subscribe to topic
    await consumer.subscribe({
      topic,
      fromBeginning: false // Only consume new messages by default
    });
    logger.info(`Subscribed to topic: ${topic}`);
    
    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          logger.info(`Received message from topic ${topic} [partition ${partition}]`);
          await messageHandler(message);
        } catch (error) {
          logger.error(`Error processing message: ${error.message}`);
        }
      }
    });
    
    return {
      /**
       * Disconnect the consumer
       * @returns {Promise} - Result of the disconnect operation
       */
      disconnect: async () => {
        try {
          await consumer.disconnect();
          logger.info('Consumer disconnected');
          return true;
        } catch (error) {
          logger.error('Error disconnecting consumer:', error);
          throw error;
        }
      }
    };
  } catch (error) {
    logger.error(`Failed to create Kafka consumer: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createConsumer
}; 