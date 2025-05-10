import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { connectDB } from "./lib/db.js";
import messageRoutes from "./routes/message.route.js";
import { app, server, io } from "./lib/socket.js";
import messageService from './lib/messageService.js';

dotenv.config();
console.log('Environment variables:', {
  MONGO_URI: process.env.MONGO_URI,
  MESSAGE_MONGO_URI: process.env.MESSAGE_MONGO_URI,
  NODE_ENV: process.env.NODE_ENV
});

const PORT = process.env.PORT || 5002;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:5001";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:5000";
const __dirname = path.resolve();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: [FRONTEND_URL, USER_SERVICE_URL, API_GATEWAY_URL],
    credentials: true,
  })
);

// Update Socket.io CORS settings as well
io.engine.opts.cors = {
  origin: [FRONTEND_URL, USER_SERVICE_URL, API_GATEWAY_URL],
  credentials: true,
};

// Log important configuration
console.log(`Message service running on port: ${PORT}`);
console.log(`Connected to user service at: ${USER_SERVICE_URL}`);
console.log(`Accepting connections from frontend at: ${FRONTEND_URL}`);
console.log(`API Gateway URL: ${API_GATEWAY_URL}`);

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/messages", messageRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "message-service" });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_messages')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO and RabbitMQ
async function startServer() {
    try {
        // Initialize message service with both Socket.IO and RabbitMQ
        await messageService.initialize(server);
        
        // Start the server
        server.listen(PORT, () => {
            console.log(`Message Service running on port ${PORT}`);
        });
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('Shutting down server...');
            await messageService.shutdown();
            mongoose.connection.close();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('Shutting down server...');
            await messageService.shutdown();
            mongoose.connection.close();
            process.exit(0);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer(); 