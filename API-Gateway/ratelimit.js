const WINDOW_SIZE = 60000; // 1 minute window
const MAX_REQUESTS = 5;
const MIN_INTERVAL = 2000; // 2 seconds between requests per IP

// In-memory store for rate limiting
const requestStore = new Map();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, requests] of requestStore.entries()) {
    const validRequests = requests.filter(time => now - time < WINDOW_SIZE);
    if (validRequests.length === 0) {
      requestStore.delete(key);
    } else {
      requestStore.set(key, validRequests);
    }
  }
}, WINDOW_SIZE);

const slidingWindowRateLimiter = async (req, res, next) => {
  const userKey = req.user?.username;
  const key = `rate_limiter:${userKey}`;
  const now = Date.now();

  try {
    // Get or initialize user's request timestamps
    let userRequests = requestStore.get(key) || [];
    
    // Remove timestamps older than the window
    userRequests = userRequests.filter(time => now - time < WINDOW_SIZE);
    
    // Check if user has exceeded the rate limit
    if (userRequests.length >= MAX_REQUESTS) {
      return res.status(429).json({ error: 'Too many requests. Rate limit reached' });
    }

    // Check minimum interval between requests
    const lastRequestTime = userRequests[userRequests.length - 1];
    if (lastRequestTime && now - lastRequestTime < MIN_INTERVAL) {
      const wait = MIN_INTERVAL - (now - lastRequestTime);
      return res.status(429).json({
        error: 'Too many requests, please slow down.',
        retryIn: `${wait}ms`,
      });
    }

    // Add current request timestamp
    userRequests.push(now);
    requestStore.set(key, userRequests);

    next();
  } catch (err) {
    console.error('[SlidingWindowLimiter] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = slidingWindowRateLimiter;
