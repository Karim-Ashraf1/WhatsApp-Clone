import { supabase } from '../lib/supabase.js';
import { Message } from "../models/message.model.js";
import minioClient from "../lib/minio.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import axios from 'axios';
import FormData from 'form-data';

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

    // Get messages between the two users
    const messages = await Message.find({
      $or: [
        { sender_id: myId, receiver_id: userToChatId },
        { sender_id: userToChatId, receiver_id: myId }
      ]
    }).sort({ createdAt: 1 });

    // Process messages to ensure proper image and video URLs and timestamp field
    const processedMessages = messages.map(message => {
      const messageObj = message.toObject();
      return {
        ...messageObj,
        created_at: messageObj.createdAt,
        image: messageObj.image ? `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/messages/${messageObj.image.split('/').pop()}` : null,
        video: messageObj.video ? `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/messages/${messageObj.video.split('/').pop()}` : null
      };
    });

    res.status(200).json(processedMessages);
  } catch (error) {
    console.error("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, video } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver ID is required" });
    }

    let imageFileName;
    let videoFileName;

    if (image) {
      try {
        // Remove the data URL prefix if present
        const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Send the image to the compression service first
        const IMAGE_COMPRESSION_URL = process.env.IMAGE_COMPRESSION_URL || 'http://localhost:8084';
        
        // Create form data for the compression service
        const formData = new FormData();
        formData.append('file', buffer, {
          filename: 'image.jpg',
          contentType: 'image/jpeg',
        });
        
        // Send to compression service
        const compressResponse = await axios.post(`${IMAGE_COMPRESSION_URL}/compress`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          responseType: 'arraybuffer',
        });
        
        // Get the compressed image buffer
        const compressedBuffer = Buffer.from(compressResponse.data);
        
        // Upload compressed image to MinIO
        const fileName = `message-${Date.now()}.jpg`;
        
        await minioClient.putObject('messages', fileName, compressedBuffer, {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': 'inline',
        });
        
        imageFileName = fileName;
      } catch (error) {
        console.error('Error processing image:', error);
        return res.status(400).json({ error: 'Invalid image data or compression failed' });
      }
    }

    if (video) {
      try {
        // Remove the data URL prefix if present
        const base64Data = video.includes('base64,') ? video.split('base64,')[1] : video;
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Upload video to MinIO
        const fileName = `video-${Date.now()}.mp4`;
        
        await minioClient.putObject('messages', fileName, buffer, {
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=31536000'
        });

        // Set bucket policy to allow public read access
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: ['arn:aws:s3:::messages/*']
            }
          ]
        };

        try {
          await minioClient.setBucketPolicy('messages', JSON.stringify(policy));
          console.log('Successfully set bucket policy for public read access');
        } catch (policyError) {
          console.error('Error setting bucket policy:', policyError);
        }
        
        videoFileName = fileName;
      } catch (error) {
        console.error('Error processing video:', error);
        return res.status(400).json({ error: 'Invalid video data or upload failed' });
      }
    }

    const newMessage = new Message({
      sender_id: senderId,
      receiver_id: receiverId,
      text: text || '',
      image: imageFileName || null,
      video: videoFileName || null,
      status: 'sent'
    });

    await newMessage.save();

    // Add the full URLs for the response
    const responseMessage = {
      ...newMessage.toObject(),
      created_at: newMessage.createdAt,
      image: imageFileName ? `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/messages/${imageFileName}` : null,
      video: videoFileName ? `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/messages/${videoFileName}` : null
    };

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", responseMessage);
    }

    res.status(201).json(responseMessage);
  } catch (error) {
    console.error('Error in sendMessage controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add new endpoint to get message status
export const getMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.status(200).json({ status: message.status });
  } catch (error) {
    console.error("Error in getMessageStatus controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}; 