import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

class RabbitMQAdapter {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672/';
        this.messageHandlers = new Map();
    }

    async initialize() {
        try {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();
            
            // Handle connection closure
            this.connection.on('close', () => {
                console.log('RabbitMQ connection closed, attempting to reconnect...');
                setTimeout(() => this.initialize(), 5000);
            });
            
            // Handle connection errors
            this.connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err);
                if (this.connection) this.connection.close();
            });
            
            console.log('Connected to RabbitMQ');
            return true;
        } catch (error) {
            console.error('Failed to connect to RabbitMQ:', error);
            return false;
        }
    }

    async declareQueue(queueName, options = {}) {
        if (!this.channel) await this.initialize();
        await this.channel.assertQueue(queueName, {
            durable: true,
            ...options
        });
    }

    async declareExchange(exchangeName, type = 'direct', options = {}) {
        if (!this.channel) await this.initialize();
        await this.channel.assertExchange(exchangeName, type, {
            durable: true,
            ...options
        });
    }

    async bindQueue(queueName, exchangeName, routingKey) {
        if (!this.channel) await this.initialize();
        await this.channel.bindQueue(queueName, exchangeName, routingKey);
    }

    async publishToQueue(queueName, message) {
        if (!this.channel) await this.initialize();
        const content = Buffer.from(JSON.stringify(message));
        return this.channel.sendToQueue(queueName, content, {
            persistent: true,
            contentType: 'application/json'
        });
    }

    async publishToExchange(exchangeName, routingKey, message) {
        if (!this.channel) await this.initialize();
        const content = Buffer.from(JSON.stringify(message));
        return this.channel.publish(exchangeName, routingKey, content, {
            persistent: true,
            contentType: 'application/json'
        });
    }

    async consume(queueName, handler) {
        if (!this.channel) await this.initialize();
        
        await this.channel.consume(queueName, (msg) => {
            if (msg === null) return;
            
            try {
                const content = JSON.parse(msg.content.toString());
                handler(content);
                this.channel.ack(msg);
            } catch (error) {
                console.error(`Error processing message from ${queueName}:`, error);
                // Nack and requeue on error
                this.channel.nack(msg, false, true);
            }
        });
    }

    async close() {
        if (this.channel) await this.channel.close();
        if (this.connection) await this.connection.close();
    }
}

// Singleton instance
const rabbitMQAdapter = new RabbitMQAdapter();

export default rabbitMQAdapter; 