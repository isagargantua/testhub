const Redis = require("ioredis");

let redis = null;

try {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 200, 2000);
    },
  });

  redis.on("connect", () => {
    console.log("Redis connected");
  });

  redis.on("error", (err) => {
    console.log("Redis error:", err.message);
  });
} catch (error) {
  console.log("Redis unavailable");
}

module.exports = redis;