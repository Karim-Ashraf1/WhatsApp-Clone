import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender_id: {
        type: String,
        required: true
    },
    receiver_id: {
        type: String,
        required: true
    },
    text: {
        type: String,
        default: ''
    },
    image: {
        type: String,
        default: null
    },
    video: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    }
}, {
    timestamps: true
});

// Create indexes for faster queries
messageSchema.index({ sender_id: 1, receiver_id: 1 });
messageSchema.index({ receiver_id: 1, sender_id: 1 });
messageSchema.index({ createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema); 