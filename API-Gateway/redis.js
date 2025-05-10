// import Redis from 'ioredis';

// const redis = new Redis({
//   host: 'redis',
//   port: 6379,
//   password: process.env.REDIS_PASSWORD,
//   retryStrategy: (times) => {
//     const delay = Math.min(times * 50, 2000);
//     return delay;
//   }
// });

// redis.on('connect', () => {
//   console.log('Redis connected successfully');
// });

// redis.on('error', (err) => {
//   console.error('Redis connection error:', err);
// });

// export default redis;