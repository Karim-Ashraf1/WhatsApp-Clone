import { Server } from 'socket.io';
import Message from '../models/message.model.js';
import rabbitMQAdapter from './rabbitMQAdapter.js';

// Define queues and exchanges
const CHAT_QUEUE = 'chat_messages';
const CHAT_EXCHANGE = 'chat_exchange';
const STATUS_QUEUE = 'user_status';
const STATUS_EXCHANGE = 'status_exchange';
const TYPING_QUEUE = 'typing_status';
const TYPING_EXCHANGE = 'typing_exchange';

class MessageService {
    constructor() {
        this.io = null;
        this.rabbitInitialized = false;
    }

    async initialize(server) {
        // Initialize Socket.IO
        this.io = new Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5173',
                credentials: true
            }
        });

        // Set up Socket.IO event handlers
        this.setupSocketHandlers();
        
        // Initialize RabbitMQ
        try {
            await this.setupRabbitMQ();
        } catch (error) {
            console.error('Failed to initialize RabbitMQ:', error);
        }

        console.log('MessageService initialized with Socket.IO and RabbitMQ');
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('New client connected:', socket.id);

            // Handle user joining a chat room
            socket.on('join_chat', ({ userId, chatId }) => {
                socket.join(chatId);
                console.log(`User ${userId} joined chat ${chatId}`);
            });

            // Handle new messages via Socket.IO
            socket.on('send_message', async (message) => {
                try {
                    await this.handleNewMessage(message);
                    
                    // Also publish to RabbitMQ for additional processing
                    if (this.rabbitInitialized) {
                        rabbitMQAdapter.publishToExchange(CHAT_EXCHANGE, CHAT_QUEUE, message);
                    }
                } catch (error) {
                    console.error('Error handling message:', error);
                    socket.emit('error', { message: 'Failed to process message' });
                }
            });

            // Handle typing status
            socket.on('typing', ({ userId, receiverId, isTyping }) => {
                const typingData = { userId, receiverId, isTyping };
                const chatId = this.getChatId(userId, receiverId);
                socket.to(chatId).emit('typing_status', typingData);
                
                // Also publish to RabbitMQ
                if (this.rabbitInitialized) {
                    rabbitMQAdapter.publishToExchange(TYPING_EXCHANGE, TYPING_QUEUE, typingData);
                }
            });

            // Handle user status updates
            socket.on('user_status', async ({ userId, status }) => {
                const statusData = { userId, status, timestamp: new Date() };
                this.io.emit('user_status_update', statusData);
                
                // Also publish to RabbitMQ
                if (this.rabbitInitialized) {
                    rabbitMQAdapter.publishToExchange(STATUS_EXCHANGE, STATUS_QUEUE, statusData);
                }
            });

            // Handle reading messages
            socket.on('read_messages', async ({ userId, senderId }) => {
                try {
                    await Message.updateMany(
                        { sender: senderId, receiver: userId, status: { $ne: 'read' } },
                        { $set: { status: 'read' } }
                    );

                    const chatId = this.getChatId(userId, senderId);
                    this.io.to(chatId).emit('messages_read', { userId, senderId });
                } catch (error) {
                    console.error('Error marking messages as read:', error);
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }

    async setupRabbitMQ() {
        try {
            // Initialize RabbitMQ connection
            await rabbitMQAdapter.initialize();
            
            // Set up exchanges
            await rabbitMQAdapter.declareExchange(CHAT_EXCHANGE);
            await rabbitMQAdapter.declareExchange(STATUS_EXCHANGE);
            await rabbitMQAdapter.declareExchange(TYPING_EXCHANGE);
            
            // Set up queues
            await rabbitMQAdapter.declareQueue(CHAT_QUEUE);
            await rabbitMQAdapter.declareQueue(STATUS_QUEUE);
            await rabbitMQAdapter.declareQueue(TYPING_QUEUE);
            
            // Bind queues to exchanges
            await rabbitMQAdapter.bindQueue(CHAT_QUEUE, CHAT_EXCHANGE, CHAT_QUEUE);
            await rabbitMQAdapter.bindQueue(STATUS_QUEUE, STATUS_EXCHANGE, STATUS_QUEUE);
            await rabbitMQAdapter.bindQueue(TYPING_QUEUE, TYPING_EXCHANGE, TYPING_QUEUE);
            
            // Consume messages
            await rabbitMQAdapter.consume(CHAT_QUEUE, this.handleRabbitMQMessage.bind(this));
            
            this.rabbitInitialized = true;
            console.log('RabbitMQ setup completed successfully');
        } catch (error) {
            console.error('Failed to set up RabbitMQ:', error);
            this.rabbitInitialized = false;
            throw error;
        }
    }
    
    // Handler for messages from RabbitMQ
    async handleRabbitMQMessage(message) {
        try {
            // We can process messages from other services or perform additional operations
            console.log('Received message from RabbitMQ:', message);
            
            // If it's a chat message and wasn't already processed via Socket.IO
            if (message.type === 'external_message') {
                await this.handleNewMessage(message);
            }
        } catch (error) {
            console.error('Error processing RabbitMQ message:', error);
        }
    }

    async handleNewMessage(message) {
        // Save message to database
        const newMessage = new Message({
            sender: message.sender,
            receiver: message.receiver,
            content: message.content,
            type: message.type,
            timestamp: message.timestamp || new Date(),
            status: 'delivered'
        });
        await newMessage.save();

        // Broadcast message to users in the chat via Socket.IO
        const chatId = this.getChatId(message.sender, message.receiver);
        this.io.to(chatId).emit('receive_message', {
            ...message,
            _id: newMessage._id,
            status: 'delivered'
        });

        // Emit message status update
        this.io.to(chatId).emit('message_status', {
            messageId: newMessage._id,
            status: 'delivered',
            timestamp: new Date()
        });
        
        return newMessage;
    }

    // Helper method to generate consistent chat room IDs
    getChatId(userId1, userId2) {
        return [userId1, userId2].sort().join('_');
    }

    // Method to send a direct message to a specific user
    sendDirectMessage(userId, event, data) {
        const userSockets = this.io.sockets.adapter.rooms.get(userId);
        if (userSockets) {
            userSockets.forEach(socketId => {
                this.io.to(socketId).emit(event, data);
            });
        }
    }

    // Method to broadcast to all connected clients
    broadcast(event, data) {
        this.io.emit(event, data);
    }
    
    // Method to publish a message to RabbitMQ
    async publishToRabbitMQ(exchange, routingKey, message) {
        if (!this.rabbitInitialized) {
            console.warn('RabbitMQ not initialized, cannot publish message');
            return false;
        }
        
        try {
            await rabbitMQAdapter.publishToExchange(exchange, routingKey, message);
            return true;
        } catch (error) {
            console.error('Failed to publish message to RabbitMQ:', error);
            return false;
        }
    }
    
    // Gracefully shut down connections
    async shutdown() {
        if (this.rabbitInitialized) {
            try {
                await rabbitMQAdapter.close();
                console.log('RabbitMQ connection closed');
            } catch (error) {
                console.error('Error closing RabbitMQ connection:', error);
            }
        }
        
        if (this.io) {
            this.io.close();
            console.log('Socket.IO server closed');
        }
    }
}

export default new MessageService(); 