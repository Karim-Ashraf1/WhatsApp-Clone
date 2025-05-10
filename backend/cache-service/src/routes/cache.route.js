const express = require('express');
const cacheService = require('../lib/cache.js');

const router = express.Router();

// Get cache value
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const value = await cacheService.get(key);
        
        if (!value) {
            return res.status(404).json({ error: 'Cache key not found' });
        }
        
        res.json({ key, value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Set cache value
router.post('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value, ttl } = req.body;
        
        if (value === undefined) {
            return res.status(400).json({ error: 'Value is required' });
        }

        await cacheService.set(key, value, ttl);
        res.status(201).json({ key, value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete cache value
router.delete('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const deleted = await cacheService.delete(key);
        
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
        await cacheService.clear();
        res.json({ message: 'All cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get cache stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await cacheService.getStats();
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

module.exports = router; 