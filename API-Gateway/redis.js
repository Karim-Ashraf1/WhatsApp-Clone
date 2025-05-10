const Redis = require('ioredis');

// Redis connection with authentication
const redis = new Redis({
  host: 'localhost',
  port: 6378,
  password: 'A3uug5f1euhk3hqgx1nwiah3od0qoy6nzlego8qgoo8xyda1kb',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully to localhost:6378');
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
  console.log('[Redis] Attempting to reconnect...');
});

module.exports = redis;