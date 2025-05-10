const { Kafka } = require('kafkajs');           
const { v4: uuidv4 } = require('uuid');         // For creating unique IDs
require('dotenv').config();                     


const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const TOPIC = process.env.NOTIFICATION_TOPIC || 'notifications';
const NUM_MESSAGES = 5;                         

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};


function log(color, prefix, message) {
  console.log(`${colors[color]}${colors.bright}[${prefix}]${colors.reset} ${message}`);
}


const userIds = ['user123', 'user456', 'user789'];

const notificationTypes = ['message', 'friend_request', 'system', 'reminder'];

function generateNotification() {
  const userId = userIds[Math.floor(Math.random() * userIds.length)];
  const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
  const id = uuidv4();
  
  
  const messages = {
    message: `You have a new message from ${userIds[Math.floor(Math.random() * userIds.length)]}`,
    friend_request: `New friend request from ${userIds[Math.floor(Math.random() * userIds.length)]}`,
    system: 'System maintenance scheduled for next week',
    reminder: 'Don\'t forget your appointment tomorrow'
  };
  
  return {
    id,
    userId,
    type,
    message: messages[type],
    timestamp: new Date().toISOString(),
    data: { origin: 'simulation' }
  };
}

async function createProducer() {
  try {
    const kafka = new Kafka({
      clientId: `simulation-producer-${Date.now()}`,
      brokers: [KAFKA_BROKER]
    });
    
    const producer = kafka.producer();
    await producer.connect();
    log('green', 'PRODUCER', `Connected to Kafka broker at ${KAFKA_BROKER}`);
    
    return producer;
  } catch (error) {
    log('red', 'PRODUCER', `Failed to create producer: ${error.message}`);
    throw error;
  }
}


async function createConsumer() {
  try {
    const kafka = new Kafka({
      clientId: `simulation-consumer-${Date.now()}`,
      brokers: [KAFKA_BROKER]
    });
    
    const consumer = kafka.consumer({ 
      groupId: `simulation-group-${Date.now()}` 
    });
    
    await consumer.connect();
    log('blue', 'CONSUMER', `Connected to Kafka broker at ${KAFKA_BROKER}`);
    
    await consumer.subscribe({ 
      topic: TOPIC, 
      fromBeginning: true  // Get all messages, even older ones
    });
    log('blue', 'CONSUMER', `Subscribed to topic: ${TOPIC}`);
    
    return consumer;
  } catch (error) {
    log('red', 'CONSUMER', `Failed to create consumer: ${error.message}`);
    throw error;
  }
}


async function runSimulation() {
  try {
    log('cyan', 'SIMULATION', 'Starting Kafka notification service simulation');
    log('cyan', 'SIMULATION', `Broker: ${KAFKA_BROKER} | Topic: ${TOPIC} | Messages: ${NUM_MESSAGES}`);
    
    const producer = await createProducer();
    const consumer = await createConsumer();
    
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const notification = JSON.parse(message.value.toString());
        log('blue', 'CONSUMER', `Received notification: ${notification.type} for ${notification.userId}`);
        log('blue', 'CONSUMER', `Message: ${notification.message}`);
      }
    });
    
    // Wait a bit to make sure consumer is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    for (let i = 0; i < NUM_MESSAGES; i++) {
      const notification = generateNotification();
      
      await producer.send({
        topic: TOPIC,
        messages: [
          {
            key: notification.userId,
            value: JSON.stringify(notification)
          }
        ]
      });
      
      log('green', 'PRODUCER', `Sent notification ${i+1}/${NUM_MESSAGES}: ${notification.type} for ${notification.userId}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    
    log('cyan', 'SIMULATION', 'Waiting for messages to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await producer.disconnect();
    log('green', 'PRODUCER', 'Disconnected');
    
    await consumer.disconnect();
    log('blue', 'CONSUMER', 'Disconnected');
    
    log('cyan', 'SIMULATION', 'Simulation completed successfully!');
  } catch (error) {
    log('red', 'SIMULATION', `Error: ${error.message}`);
    process.exit(1);
  }
}


runSimulation(); 