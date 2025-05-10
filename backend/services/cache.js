class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
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
  set(key, value, ttl = 3600) {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, value);
    this.ttls.set(key, expiry);
    return true;
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const expiry = this.ttls.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
    return true;
  }

  deletePattern(pattern) {
    const regex = new RegExp(pattern);
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  has(key) {
    return this.get(key) !== null;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.ttls.entries()) {
      if (now > expiry) {
        this.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.ttls.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: process.memoryUsage().heapUsed
    };
  }
}

// Create a singleton instance
const cacheService = new CacheService();

module.exports = cacheService; 