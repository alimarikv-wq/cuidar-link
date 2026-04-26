import Redis from "ioredis";

declare global {
  var redisGlobal: Redis | undefined;
}

export const redis =
  global.redisGlobal ||
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });

if (process.env.NODE_ENV !== "production") {
  global.redisGlobal = redis;
}

export async function getRedisClient() {
  try {
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }
    return redis;
  } catch {
    return null;
  }
}
