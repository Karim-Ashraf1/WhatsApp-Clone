const redis = require('./redis.js');
const WINDOW_SIZE = 60000;
const MAX_REQUESTS = 5;
const MIN_INTERVAL = 2000; //2 second between requests per IP
const slidingWindowRateLimiter = async (req, res, next) => {
  const userKey = req.user?.username ;
  const key = `rate_limiter:${userKey}`;
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE;

  try {
    // Remove timestamps older than the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    const recentRequests = await redis.zrange(key, 0, -1, 'WITHSCORES');
    const requestCount = recentRequests.length / 2;

    if (requestCount >= MAX_REQUESTS) {
      return res.status(429).json({ error: 'Too many requests. Rate limit reached' });
    }
    const lastRequestTime = parseInt(recentRequests[recentRequests.length - 1]); // fetching most recent request to check if the user is spamming
    if (lastRequestTime && now - lastRequestTime < MIN_INTERVAL) {
      const wait = MIN_INTERVAL - (now - lastRequestTime);
      return res.status(429).json({
        error: 'Too many requests, please slow down.',
        retryIn: `${wait}ms`,
      });
    }
    // Add current request with timestamp
    await redis.zadd(key, now, `${now}-${Math.random()}`); // use unique member
    await redis.pexpire(key, WINDOW_SIZE); // expire the key after the window has passed

    next();
  } catch (err) {
    console.error('[SlidingWindowLimiter] Redis error:', err);
    res.status(500).json({ error: 'Internal server error' }); 
  }
};

module.exports = slidingWindowRateLimiter;