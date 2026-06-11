import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const REDIS_RETRY_DELAY_MS = 30_000;

let redis: Redis | null = null;
let lastRedisAttemptAt = 0;
let redisWarningLogged = false;

const now = (): number => Date.now();

const buildRedisClient = (): Redis =>
  new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 1_000,
    retryStrategy: () => null
  });

export const getRedisClient = async (source = 'redis'): Promise<Redis | null> => {
  if (!env.REDIS_URL) {
    return null;
  }

  if (redis?.status === 'ready') {
    return redis;
  }

  if (redis?.status === 'end') {
    redis = null;
  }

  const current = now();
  if (!redis && current - lastRedisAttemptAt < REDIS_RETRY_DELAY_MS) {
    return null;
  }

  lastRedisAttemptAt = current;

  try {
    if (!redis) {
      redis = buildRedisClient();
      redis.on('error', (error) => {
        if (!redisWarningLogged) {
          redisWarningLogged = true;
          logger.warn(`${source}.redis.unavailable ${error.message}`);
        }
      });
    }

    if (redis.status === 'wait') {
      await redis.connect();
    }

    if (redis.status !== 'ready') {
      await redis.ping();
    }

    return redis.status === 'ready' ? redis : null;
  } catch (error) {
    redis?.disconnect();
    redis = null;

    if (!redisWarningLogged) {
      redisWarningLogged = true;
      logger.warn(`${source}.redis.unavailable ${error instanceof Error ? error.message : 'Redis connection failed'}`);
    }

    return null;
  }
};
