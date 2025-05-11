const { Kafka } = require('kafkajs');
const { logger } = require('./logger');


async function createProducer(brokerUrl) {
  try {
    const kafka = new Kafka({
      clientId: 'notification-producer', 
      brokers: [brokerUrl],           
      retry: {
        initialRetryTime: 100,           
        retries: 8                      
      }
    });

    const producer = kafka.producer();
    
    await producer.connect();
    logger.info(`Producer connected to broker: ${brokerUrl}`);
    
    return {
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

async function sendNotification(producer, topic, notification) {
  if (!notification.userId) {
    throw new Error('Notification must have a userId field');
  }
  
  if (!notification.message) {
    throw new Error('Notification must have a message field');
  }
  
  // Add ID and timestamp if they're missing
  const preparedNotification = {
    id: notification.id || `notif_${Date.now()}`,
    timestamp: notification.timestamp || new Date().toISOString(),
    ...notification
  };

  return producer.send({
    topic,
    messages: [
      {
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