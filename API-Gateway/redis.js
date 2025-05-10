const Redis = require('ioredis');

class RedisClient {
  constructor() {
    this.client = new Redis(process.env.REDIS_URL);
    
    this.client.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    this.client.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });
  }

  // Message caching operations
  async cacheUserMessages(userId, messages) {
    try {
      const key = `messages:${userId}`;
      // Only cache first 100 messages
      const messagesToCache = messages.slice(0, 100);
      const serializedMessages = JSON.stringify(messagesToCache);
      // Cache for 24 hours
      await this.client.set(key, serializedMessages, 'EX', 86400);
      return true;
    } catch (error) {
      console.error('[Redis] Cache user messages error:', error);
      throw error;
    }
  }

  async getUserMessages(userId) {
    try {
      const key = `messages:${userId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[Redis] Get user messages error:', error);
      throw error;
    }
  }

  async addUserMessage(userId, message) {
    try {
      const key = `messages:${userId}`;
      const existingMessages = await this.getUserMessages(userId) || [];
      
      // Add new message to the beginning of the array
      existingMessages.unshift(message);
      
      // Keep only the first 100 messages
      const updatedMessages = existingMessages.slice(0, 100);
      
      // Cache the updated messages
      await this.cacheUserMessages(userId, updatedMessages);
      return true;
    } catch (error) {
      console.error('[Redis] Add user message error:', error);
      throw error;
    }
  }

  async clearUserMessages(userId) {
    try {
      const key = `messages:${userId}`;
      return await this.client.del(key);
    } catch (error) {
      console.error('[Redis] Clear user messages error:', error);
      throw error;
    }
  }

  // Cache operations
  async cache(key, data, ttl = 3600) {
    try {
      const serializedData = JSON.stringify(data);
      await this.client.set(key, serializedData, 'EX', ttl);
      return true;
    } catch (error) {
      console.error('[Redis] Cache error:', error);
      throw error;
    }
  }

  async getCache(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[Redis] Get cache error:', error);
      throw error;
    }
  }

  async invalidateCache(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('[Redis] Invalidate cache error:', error);
      throw error;
    }
  }

  async invalidateCachePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        return await this.client.del(keys);
      }
      return 0;
    } catch (error) {
      console.error('[Redis] Invalidate cache pattern error:', error);
      throw error;
    }
  }

  // Basic Redis operations
  async set(key, value, expiry = null) {
    try {
      if (expiry) {
        return await this.client.set(key, value, 'EX', expiry);
      }
      return await this.client.set(key, value);
    } catch (error) {
      console.error('[Redis] Set error:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('[Redis] Get error:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('[Redis] Delete error:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error('[Redis] Exists error:', error);
      throw error;
    }
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
