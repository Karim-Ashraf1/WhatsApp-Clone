const axios = require('axios');

class CacheClient {
    constructor() {
        this.baseURL = process.env.CACHE_SERVICE_URL || 'http://cache-service:5004/api/cache';
    }

    async set(key, value, ttl = 3600) {
        try {
            const response = await axios.post(`${this.baseURL}/${key}`, {
                value,
                ttl
            });
            return response.data;
        } catch (error) {
            console.error('Cache set error:', error.message);
            return null;
        }
    }

    async get(key) {
        try {
            const response = await axios.get(`${this.baseURL}/${key}`);
            return response.data.value;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            console.error('Cache get error:', error.message);
            return null;
        }
    }

    async delete(key) {
        try {
            await axios.delete(`${this.baseURL}/${key}`);
            return true;
        } catch (error) {
            console.error('Cache delete error:', error.message);
            return false;
        }
    }

    async has(key) {
        try {
            const response = await axios.head(`${this.baseURL}/${key}`);
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    // Message-specific methods
    async cacheUserMessages(userId, messages) {
        return this.set(`messages:${userId}`, messages, 86400); // 24 hours
    }

    async getUserMessages(userId) {
        return this.get(`messages:${userId}`);
    }

    async addUserMessage(userId, message) {
        const existingMessages = await this.getUserMessages(userId) || [];
        existingMessages.unshift(message);
        const updatedMessages = existingMessages.slice(0, 100); // Keep only first 100 messages
        return this.cacheUserMessages(userId, updatedMessages);
    }

    async clearUserMessages(userId) {
        return this.delete(`messages:${userId}`);
    }
}

// Create a singleton instance
const cacheClient = new CacheClient();

module.exports = cacheClient; 