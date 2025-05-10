import express from 'express';
import cacheService from '../lib/cache.js';

const router = express.Router();

// Get cache value
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const value = cacheService.get(key);
        
        if (!value) {
            return res.status(404).json({ error: 'Cache key not found' });
        }
        
        res.json({ key, value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Set cache value
router.post('/', async (req, res) => {
    try {
        const { key, value, ttl } = req.body;
        
        if (!key || value === undefined) {
            return res.status(400).json({ error: 'Key and value are required' });
        }

        cacheService.set(key, value, ttl);
        res.status(201).json({ key, value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete cache value
router.delete('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const deleted = cacheService.delete(key);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Cache key not found' });
        }
        
        res.json({ message: 'Cache key deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear all cache
router.delete('/', async (req, res) => {
    try {
        cacheService.clear();
        res.json({ message: 'All cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get cache stats
router.get('/stats', async (req, res) => {
    try {
        const stats = cacheService.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Message-specific endpoints
router.post('/messages/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        await cacheService.addUserMessage(userId, message);
        res.status(201).json({ message: 'Message cached successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/messages/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const messages = await cacheService.getUserMessages(userId);
        
        if (!messages) {
            return res.status(404).json({ error: 'No cached messages found' });
        }
        
        res.json({ messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/messages/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await cacheService.clearUserMessages(userId);
        res.json({ message: 'User messages cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router; 