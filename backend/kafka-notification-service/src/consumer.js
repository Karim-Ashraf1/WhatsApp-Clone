const { Kafka } = require('kafkajs');
const { logger } = require('./logger');


async function createConsumer(brokerUrl, groupId, topic, messageHandler) {
  try {
    const kafka = new Kafka({ // Create a new Kafka client
      clientId: 'notification-consumer', 
      brokers: [brokerUrl],             
      retry: {
        initialRetryTime: 100,          
        retries: 8                       
      }
    });


    const consumer = kafka.consumer({ groupId });

    await consumer.connect();
    logger.info(`Consumer connected to broker: ${brokerUrl}`);
    
    await consumer.subscribe({
      topic,
      fromBeginning: false // Only get new messages, ignore old ones
    });
    logger.info(`Subscribed to topic: ${topic}`);
    
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