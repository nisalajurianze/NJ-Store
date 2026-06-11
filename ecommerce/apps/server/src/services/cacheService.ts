import type { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';
import { getRedisClient } from './redisService.js';

type CacheNamespace = 'analytics' | 'banners' | 'brands' | 'categories' | 'customer-behavior' | 'products' | 'site-config';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const NAMESPACE_VERSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_MEMORY_ENTRIES = 2_000;
let redisCacheFallbackWarningLogged = false;

const now = (): number => Date.now();

const logRedisCacheFallback = (error: unknown): void => {
  if (redisCacheFallbackWarningLogged) {
    return;
  }

  redisCacheFallbackWarningLogged = true;
  logger.warn(
    `cache.redis.unavailable ${error instanceof Error ? error.message : 'Redis command failed'}; falling back to in-memory cache`
  );
};

const stableSerialize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`).join(',')}}`;
};

class CacheService {
  private readonly memory = new Map<string, MemoryEntry>();
  private readonly pendingLoads = new Map<string, Promise<unknown>>();

  private cleanupExpiredMemory(): void {
    const current = now();
    for (const [key, entry] of this.memory.entries()) {
      if (entry.expiresAt <= current) {
        this.memory.delete(key);
      }
    }
  }

  private trimMemory(): void {
    this.cleanupExpiredMemory();

    while (this.memory.size > MAX_MEMORY_ENTRIES) {
      const firstKey = this.memory.keys().next().value;
      if (!firstKey) {
        break;
      }
      this.memory.delete(firstKey);
    }
  }

  private readFromMemory(key: string): string | null {
    const entry = this.memory.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= now()) {
      this.memory.delete(key);
      return null;
    }

    return entry.value;
  }

  private writeToMemory(key: string, value: string, ttlSeconds: number): void {
    this.memory.set(key, {
      value,
      expiresAt: now() + ttlSeconds * 1_000
    });
    this.trimMemory();
  }

  private async getRedis(): Promise<Redis | null> {
    return getRedisClient('cache');
  }

  async get<T>(key: string): Promise<T | null> {
    const redis = await this.getRedis();

    if (redis) {
      try {
        const value = await redis.get(key);
        return value ? (JSON.parse(value) as T) : null;
      } catch (error) {
        logRedisCacheFallback(error);
      }
    }

    const value = this.readFromMemory(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const redis = await this.getRedis();

    if (redis) {
      try {
        await redis.set(key, serialized, 'EX', ttlSeconds);
        return;
      } catch (error) {
        logRedisCacheFallback(error);
      }
    }

    this.writeToMemory(key, serialized, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    const redis = await this.getRedis();

    if (redis) {
      try {
        await redis.del(key);
        return;
      } catch (error) {
        logRedisCacheFallback(error);
      }
    }

    this.memory.delete(key);
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (!keys.length) {
      return;
    }

    const redis = await this.getRedis();

    if (redis) {
      try {
        await redis.del(...keys);
        return;
      } catch (error) {
        logRedisCacheFallback(error);
      }
    }

    keys.forEach((key) => this.memory.delete(key));
  }

  async remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const pendingLoad = this.pendingLoads.get(key) as Promise<T> | undefined;
    if (pendingLoad) {
      return pendingLoad;
    }

    const load = (async () => {
      const value = await loader();
      await this.set(key, value, ttlSeconds);
      return value;
    })();

    this.pendingLoads.set(key, load);

    try {
      return await load;
    } finally {
      this.pendingLoads.delete(key);
    }
  }

  private namespaceVersionKey(namespace: CacheNamespace): string {
    return `cache:namespace:${namespace}:version`;
  }

  async getNamespaceVersion(namespace: CacheNamespace): Promise<number> {
    const versionKey = this.namespaceVersionKey(namespace);
    const redis = await this.getRedis();

    if (redis) {
      try {
        const current = await redis.get(versionKey);
        if (current) {
          return Number(current) || 1;
        }

        await redis.set(versionKey, '1', 'EX', NAMESPACE_VERSION_TTL_SECONDS);
        return 1;
      } catch (error) {
        logRedisCacheFallback(error);
      }
    }

    const cached = this.readFromMemory(versionKey);
    if (cached) {
      return Number(cached) || 1;
    }

    this.writeToMemory(versionKey, '1', NAMESPACE_VERSION_TTL_SECONDS);
    return 1;
  }

  async bumpNamespace(namespace: CacheNamespace): Promise<void> {
    const versionKey = this.namespaceVersionKey(namespace);
    const redis = await this.getRedis();

    if (redis) {
      try {
        const next = await redis.incr(versionKey);
        await redis.expire(versionKey, NAMESPACE_VERSION_TTL_SECONDS);
        logger.info(`cache.namespace.bump namespace=${namespace} version=${next}`);
        return;
      } catch (error) {
        logRedisCacheFallback(error);
      }
    }

    const current = await this.getNamespaceVersion(namespace);
    this.writeToMemory(versionKey, String(current + 1), NAMESPACE_VERSION_TTL_SECONDS);
  }

  async versionedKey(namespace: CacheNamespace, suffix: string): Promise<string> {
    const version = await this.getNamespaceVersion(namespace);
    return `cache:${namespace}:v${version}:${suffix}`;
  }

  async rememberVersioned<T>(
    namespace: CacheNamespace,
    suffix: string,
    ttlSeconds: number,
    loader: () => Promise<T>
  ): Promise<T> {
    const key = await this.versionedKey(namespace, suffix);
    return this.remember(key, ttlSeconds, loader);
  }
}

export const cacheService = new CacheService();

export const cacheKeys = {
  authUser: (userId: string): string => `auth:user:${userId}`,
  authSession: (sessionId: string): string => `auth:session:${sessionId}`,
  homePublicFeed: (): string => 'home-feed:public'
};

export const cacheNamespaces = {
  analytics: 'analytics',
  banners: 'banners',
  brands: 'brands',
  categories: 'categories',
  customerBehavior: 'customer-behavior',
  products: 'products',
  siteConfig: 'site-config'
} as const;

export const invalidateInventoryDerivedCaches = async (): Promise<void> => {
  await Promise.all([
    cacheService.bumpNamespace(cacheNamespaces.products),
    cacheService.bumpNamespace(cacheNamespaces.analytics),
    cacheService.delete(cacheKeys.homePublicFeed())
  ]);
};

export const buildStableCacheSuffix = (value: unknown): string => stableSerialize(value);
