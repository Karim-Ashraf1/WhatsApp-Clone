import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cacheRoutes from './routes/cache.route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5004;

// Middleware
app.use(express.json());
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        process.env.API_GATEWAY_URL || 'http://localhost:5000'
    ],
    credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        service: 'Cache Service'
    });
});

// Routes
app.use('/api/cache', cacheRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Cache service running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 