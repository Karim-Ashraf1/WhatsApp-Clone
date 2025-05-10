/**
 * Simulation Script
 * Demonstrates the Kafka notification service by simulating 
 * producers sending notifications and consumers receiving them
 */

const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Configuration
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const TOPIC = process.env.NOTIFICATION_TOPIC || 'notifications';
const NUM_MESSAGES = 5;

// Colors for console output
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

// Log with color
function log(color, prefix, message) {
  console.log(`${colors[color]}${colors.bright}[${prefix}]${colors.reset} ${message}`);
}

// Sample user IDs
const userIds = ['user123', 'user456', 'user789'];

// Sample notification types
const notificationTypes = ['message', 'friend_request', 'system', 'reminder'];

// Generate a random notification
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

// Create a Kafka producer
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

// Create a Kafka consumer
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
      fromBeginning: true 
    });
    log('blue', 'CONSUMER', `Subscribed to topic: ${TOPIC}`);
    
    return consumer;
  } catch (error) {
    log('red', 'CONSUMER', `Failed to create consumer: ${error.message}`);
    throw error;
  }
}

// Main simulation function
async function runSimulation() {
  try {
    log('cyan', 'SIMULATION', 'Starting Kafka notification service simulation');
    log('cyan', 'SIMULATION', `Broker: ${KAFKA_BROKER} | Topic: ${TOPIC} | Messages: ${NUM_MESSAGES}`);
    
    // Create producer and consumer
    const producer = await createProducer();
    const consumer = await createConsumer();
    
    // Start the consumer
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const notification = JSON.parse(message.value.toString());
        log('blue', 'CONSUMER', `Received notification: ${notification.type} for ${notification.userId}`);
        log('blue', 'CONSUMER', `Message: ${notification.message}`);
      }
    });
    
    // Wait a bit to ensure consumer is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send notifications
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
      
      // Add a small delay between sends
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Keep consumer running for a bit to receive all messages
    log('cyan', 'SIMULATION', 'Waiting for messages to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Disconnect
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

// Run the simulation
runSimulation(); 