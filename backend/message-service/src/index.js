import express from "express";
import dotenv from "dotenv";
dotenv.config();
console.log('Environment variables:', {
  MONGO_URI: process.env.MONGO_URI,
  MESSAGE_MONGO_URI: process.env.MESSAGE_MONGO_URI,
  NODE_ENV: process.env.NODE_ENV
});
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { connectDB } from "./lib/db.js";
import messageRoutes from "./routes/message.route.js";
import { app, server, io } from "./lib/socket.js";


const PORT = process.env.PORT || 5002;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://user-service:5001";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://frontend:5173";
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://api-gateway:5000";
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

// Start server
server.listen(PORT, () => {
  console.log(`Message service running on PORT: ${PORT}`);
  console.log(`API Gateway URL: ${API_GATEWAY_URL}`);
}); 