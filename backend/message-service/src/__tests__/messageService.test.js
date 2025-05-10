import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import MessageService from '../lib/messageService.js';
import Message from '../models/message.model.js';

jest.mock('../models/message.model.js');

describe('MessageService', () => {
    let messageService;
    let httpServer;
    let clientSocket;
    let serverSocket;

    beforeAll((done) => {
        httpServer = createServer();
        messageService = new MessageService();
        messageService.io = new Server(httpServer);
        httpServer.listen(() => {
            const port = httpServer.address().port;
            clientSocket = new Client(`http://localhost:${port}`);
            messageService.io.on('connection', (socket) => {
                serverSocket = socket;
            });
            clientSocket.on('connect', done);
        });
    });

    afterAll(() => {
        messageService.io.close();
        clientSocket.close();
        httpServer.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Message Handling', () => {
        it('should handle new message creation', async () => {
            const mockMessage = {
                sender: 'user1',
                receiver: 'user2',
                content: 'Hello!',
                type: 'text',
                timestamp: new Date(),
            };

            Message.prototype.save.mockResolvedValueOnce({
                ...mockMessage,
                _id: 'message123',
                status: 'delivered'
            });

            const result = await messageService.handleNewMessage(mockMessage);

            expect(Message).toHaveBeenCalledWith({
                ...mockMessage,
                status: 'delivered'
            });
            expect(result._id).toBe('message123');
            expect(result.status).toBe('delivered');
        });

        it('should emit typing status', (done) => {
            const typingData = {
                userId: 'user1',
                receiverId: 'user2',
                isTyping: true
            };

            clientSocket.emit('typing', typingData);

            clientSocket.on('typing_status', (data) => {
                expect(data).toEqual(typingData);
                done();
            });
        });

        it('should handle message delivery status', async () => {
            const messageId = 'message123';
            const mockMessage = {
                _id: messageId,
                sender: 'user1',
                receiver: 'user2',
                content: 'Hello!',
                status: 'sent'
            };

            Message.findById.mockResolvedValueOnce({
                ...mockMessage,
                save: jest.fn().mockResolvedValueOnce({ ...mockMessage, status: 'delivered' })
            });

            clientSocket.emit('messageDelivered', { messageId });

            // Wait for status update
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(Message.findById).toHaveBeenCalledWith(messageId);
        });
    });

    describe('Chat Room Management', () => {
        it('should handle user joining a chat room', (done) => {
            const joinData = {
                userId: 'user1',
                chatId: 'chat123'
            };

            clientSocket.emit('join_chat', joinData);

            // Verify the socket joined the room
            setTimeout(() => {
                const rooms = Array.from(serverSocket.rooms);
                expect(rooms).toContain(joinData.chatId);
                done();
            }, 100);
        });
    });
}); 