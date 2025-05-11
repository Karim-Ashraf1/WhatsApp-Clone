const { createClient } = require('redis');

class CacheService {
    constructor() {
        this.redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://redis:6379',
            password: process.env.REDIS_PASSWORD || 'A3uug5f1euhk3hqgx1nwiah3od0qoy6nzlego8qgoo8xyda1kb'
        });

        // Connect to Redis
        this.connect();
    }

    async connect() {
        try {
            await this.redisClient.connect();
            console.log('Connected to Redis');
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            process.exit(1);
        }
    }

    // Message-specific caching methods
    async cacheUserMessages(userId, messages) {
        const key = `messages:${userId}`;
        // Only cache first 100 messages
        const messagesToCache = messages.slice(0, 100);
        // Cache for 24 hours
        return this.set(key, messagesToCache, 86400);
    }

    async getUserMessages(userId) {
        const key = `messages:${userId}`;
        return this.get(key);
    }

    async addUserMessage(userId, message) {
        const key = `messages:${userId}`;
        const existingMessages = await this.getUserMessages(userId) || [];
        
        // Add new message to the beginning of the array
        existingMessages.unshift(message);
        
        // Keep only the first 100 messages
        const updatedMessages = existingMessages.slice(0, 100);
        
        // Cache the updated messages
        return this.cacheUserMessages(userId, updatedMessages);
    }

    async clearUserMessages(userId) {
        const key = `messages:${userId}`;
        return this.delete(key);
    }

    // Generic caching methods
    async set(key, value, ttl = 3600) {
        try {
            const stringValue = JSON.stringify(value);
            if (ttl) {
                await this.redisClient.set(key, stringValue, { EX: ttl });
            } else {
                await this.redisClient.set(key, stringValue);
            }
            return true;
        } catch (error) {
            console.error('Error setting cache:', error);
            return false;
        }
    }

    async get(key) {
        try {
            const value = await this.redisClient.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Error getting cache:', error);
            return null;
        }
    }

    async delete(key) {
        try {
            const deleted = await this.redisClient.del(key);
            return deleted > 0;
        } catch (error) {
            console.error('Error deleting cache:', error);
            return false;
        }
    }

    async deletePattern(pattern) {
        try {
            const keys = await this.redisClient.keys(pattern);
            if (keys.length > 0) {
                await this.redisClient.del(keys);
            }
            return keys.length;
        } catch (error) {
            console.error('Error deleting pattern:', error);
            return 0;
        }
    }

    async has(key) {
        try {
            return await this.redisClient.exists(key) === 1;
        } catch (error) {
            console.error('Error checking cache:', error);
            return false;
        }
    }

    async clear() {
        try {
            await this.redisClient.flushAll();
            return true;
        } catch (error) {
            console.error('Error clearing cache:', error);
            return false;
        }
    }

    async getStats() {
        try {
            const info = await this.redisClient.info();
            const keys = await this.redisClient.keys('*');
            
            return {
                size: keys.length,
                keys: keys,
                memoryUsage: info.split('\n').find(line => line.startsWith('used_memory_human')),
                uptime: info.split('\n').find(line => line.startsWith('uptime_in_seconds'))
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                size: 0,
                keys: [],
                memoryUsage: 'unknown',
                uptime: 'unknown'
            };
        }
    }
}

// Create a singleton instance
const cacheService = new CacheService();

module.exports = cacheService; 