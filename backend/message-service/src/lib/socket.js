import express from "express";
import { Server } from "socket.io";
import http from "http";
import { Message } from "../models/message.model.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL],
    credentials: true,
    methods: ["GET", "POST"],
  },
  cookie: true
});

const userSocketMap = {}; 

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} connected with socket ${socket.id}`);
    
    
    io.emit("userOnline", userId);
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  }

  
  socket.on("messageDelivered", async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && message.receiver_id === userId) {
        message.status = 'delivered';
        await message.save();
        
       
        const senderSocketId = userSocketMap[message.sender_id];
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdate", {
            messageId,
            status: 'delivered'
          });
        }
      }
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  });

  socket.on("messageRead", async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && message.receiver_id === userId) {
        message.status = 'read';
        await message.save();
        
        
        const senderSocketId = userSocketMap[message.sender_id];
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdate", {
            messageId,
            status: 'read'
          });
        }
      }
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    if (userId && userId !== "undefined") {
      delete userSocketMap[userId];
      console.log(`User ${userId} disconnected`);
      
      
      io.emit("userOffline", userId);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

export { app, server, io }; 