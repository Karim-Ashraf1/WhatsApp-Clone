import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage, updateMessageStatus, deleteMessage } from "../controllers/message.controller.js";
import axios from "axios";
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);

router.get("/user/:userId", protectRoute, async (req, res) => {
    try {
        const { userId } = req.params;
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5001';
        

        const response = await axios.get(`${userServiceUrl}/api/users/${userId}`, {
            headers: {
                Cookie: req.headers.cookie || ''
            },
            withCredentials: true
        });
        
        res.status(200).json(response.data);
    } catch (error) {
        console.error("Error fetching user from user service:", error.message);
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
});

// Message routes
router.get('/', getMessages);
router.post('/', sendMessage);
router.patch('/:messageId/status', updateMessageStatus);
router.delete('/:messageId', deleteMessage);

export default router; 