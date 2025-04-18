import { generateToken } from '../lib/utils.js';
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import cloudinary from '../lib/cloudinary.js';

export const signup = async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Please fill all the fields' });
        }
        if(password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        const user = await User.findOne({ email });
    
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
        });
        
        if (newUser) {
            generateToken(newUser._id, res);
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
            });
        } else {
            return res.status(400).json({ message: 'Invalid user data failed to create user' });
        }
    } catch (error) {
        console.log("Error in signup controller:", error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Please fill all the fields' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        generateToken(user._id, res);
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
        });
    } catch (error) {
        console.log("Error in login controller:", error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const logout = (req, res) => {
    try {
        res.cookie('jwt', '', {maxAge: 0});
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.log("Error in logout controller:", error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { profilePic } = req.body;
        const user_id = req.user._id;

        if(!profilePic) {
            return res.status(400).json({ message: 'Profile pic required' });
        }
        const uploadResponse = await cloudinary.uploader.upload(profilePic);
        
        const updatedUser = await User.findByIdAndUpdate(
            user_id, 
            { profilePic: uploadResponse.secure_url }, 
            { new: true }
        ).select('-password');
        
        res.status(200).json(updatedUser);
    } catch (error) {
        console.log("Error in updateProfile controller:", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in checkAuth controller:", error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


export const validateToken = (req, res) => {
    try {
        
        if (!req.user) {
            return res.status(401).json({ 
                valid: false,
                message: 'User not found or token invalid' 
            });
        }
        
        
        res.status(200).json({ 
            valid: true, 
            user: {
                _id: req.user._id,
                fullName: req.user.fullName,
                email: req.user.email,
                profilePic: req.user.profilePic
            }
        });
    } catch (error) {
        console.log("Error in validateToken controller:", error.message);
        return res.status(500).json({ 
            valid: false,
            message: 'Internal server error during token validation' 
        });
    }
}; 