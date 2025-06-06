import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
        const user = await User.findById(decoded.userId);
        if(!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { password, ...userWithoutPassword } = user;
        req.user = {
            id: userWithoutPassword.id,
            full_name: userWithoutPassword.full_name,
            email: userWithoutPassword.email,
            profile_pic: userWithoutPassword.profile_pic
        };
        next();
    } catch (error) {
        console.log("Error in protectRoute middleware:", error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
}; 