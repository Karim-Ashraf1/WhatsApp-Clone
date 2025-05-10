import { supabase } from '../lib/supabase.js';
import { Message } from "../models/message.model.js";
import minioClient from "../lib/minio.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import cacheClient from '../../../shared-services/cache-client.js';

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    
    // Get all users except the logged-in user
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, email, profile_pic')
      .neq('id', loggedInUserId);
    
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ message: 'Error fetching users' });
    }

    // Get online users from socket
    const onlineUsers = req.app.get('onlineUsers') || new Set();
    
    const filteredUsers = users.map(user => ({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      profilePic: user.profile_pic ? `${process.env.MINIO_ENDPOINT || 'http://localhost:9000'}/profile-pictures/${user.profile_pic.split('/').pop()}` : null,
      isOnline: onlineUsers.has(user.id)
    }));

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error('Error in getUsersForSidebar:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user.id;

    if (!userToChatId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Try to get messages from cache first
    const cacheKey = `messages:${myId}:${userToChatId}`;
    const cachedMessages = await cacheClient.get(cacheKey);
    
    if (cachedMessages) {
      return res.status(200).json(cachedMessages);
    }

    // If not in cache, get from database
    const messages = await Message.find({
      $or: [
        { sender_id: myId, receiver_id: userToChatId },
        { sender_id: userToChatId, receiver_id: myId }
      ]
    }).sort({ createdAt: 1 });

    // Process messages to ensure proper image URLs and timestamp field
    const processedMessages = messages.map(message => {
      const messageObj = message.toObject();
      return {
        ...messageObj,
        created_at: messageObj.createdAt,
        image: messageObj.image ? `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/messages/${messageObj.image}` : null
      };
    });

    // Cache the processed messages
    await cacheClient.set(cacheKey, processedMessages, 3600); // Cache for 1 hour

    res.status(200).json(processedMessages);
  } catch (error) {
    console.error("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver ID is required" });
    }

    let imageUrl;
    if (image) {
      try {
        // Remove the data URL prefix if present
        const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `message-${Date.now()}.jpg`;
        
        // Upload to MinIO with metadata
        await minioClient.putObject('messages', fileName, buffer, {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': 'inline',
        });
        
        imageUrl = fileName; // Store only the filename
      } catch (error) {
        console.error('Error processing image:', error);
        return res.status(400).json({ error: 'Invalid image data' });
      }
    }

    const newMessage = await Message.create({
      sender_id: senderId,
      receiver_id: receiverId,
      text,
      image: imageUrl,
    });

    // Add the full image URL and correct timestamp field for the response
    const responseMessage = {
      ...newMessage.toObject(),
      created_at: newMessage.createdAt,
      image: newMessage.image ? `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/messages/${newMessage.image}` : null
    };

    // Update cache for both users
    const cacheKey1 = `messages:${senderId}:${receiverId}`;
    const cacheKey2 = `messages:${receiverId}:${senderId}`;
    
    // Get existing messages from cache
    const existingMessages1 = await cacheClient.get(cacheKey1) || [];
    const existingMessages2 = await cacheClient.get(cacheKey2) || [];
    
    // Add new message to both caches
    existingMessages1.push(responseMessage);
    existingMessages2.push(responseMessage);
    
    // Update both caches
    await cacheClient.set(cacheKey1, existingMessages1, 3600);
    await cacheClient.set(cacheKey2, existingMessages2, 3600);

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", responseMessage);
    }

    res.status(201).json(responseMessage);
  } catch (error) {
    console.error("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}; 