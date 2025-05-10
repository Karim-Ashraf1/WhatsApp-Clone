const Redis = require('ioredis');

// Redis connection with authentication
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: 'A3uug5f1euhk3hqgx1nwiah3od0qoy6nzlego8qgoo8xyda1kb',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('connect', () => {
  console.log(`[Redis] Connected successfully to ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
  console.log('[Redis] Attempting to reconnect...');
});

module.exports = redis;