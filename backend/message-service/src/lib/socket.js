import express from "express";
import { Server } from "socket.io";
import http from "http";

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

const userSocketMap = {}; // {userId: socketId}

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} connected with socket ${socket.id}`);
    
    // Notify all clients about the new online user
    io.emit("userOnline", userId);
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  }

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    if (userId && userId !== "undefined") {
      delete userSocketMap[userId];
      console.log(`User ${userId} disconnected`);
      
      // Notify all clients about the user going offline
      io.emit("userOffline", userId);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

export { app, server, io }; 