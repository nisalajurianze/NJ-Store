import rateLimit, { MemoryStore } from 'express-rate-limit';
import { env } from '../config/env.js';
import { getRedisClient } from '../services/redisService.js';
import { logger } from '../utils/logger.js';
const normalizeIp = (value) => value?.trim().toLowerCase().replace(/^::ffff:/, '') ?? '';
const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
let missingRedisWarningLogged = false;
let unavailableRedisWarningLogged = false;
class ResilientRedisStore {
    prefix;
    localKeys = false;
    memoryStore = new MemoryStore();
    windowMs = 0;
    constructor(prefix) {
        this.prefix = prefix;
    }
    init(options) {
        this.windowMs = options.windowMs;
        this.memoryStore.init(options);
    }
    prefixedKey(key) {
        return `${this.prefix}${key}`;
    }
    logRedisFallback(error) {
        if (unavailableRedisWarningLogged) {
            return;
        }
        unavailableRedisWarningLogged = true;
        logger.warn(`rate_limit.redis.unavailable ${error instanceof Error ? error.message : 'Redis command failed'}; falling back to in-memory rate limits`);
    }
    async increment(key) {
        try {
            const redis = await getRedisClient('rate_limit');
            if (!redis) {
                return this.memoryStore.increment(key);
            }
            const redisKey = this.prefixedKey(key);
            const totalHits = await redis.incr(redisKey);
            let ttlMs = await redis.pttl(redisKey);
            if (totalHits === 1 || ttlMs < 0) {
                await redis.pexpire(redisKey, this.windowMs);
                ttlMs = this.windowMs;
            }
            return {
                totalHits,
                resetTime: new Date(Date.now() + ttlMs)
            };
        }
        catch (error) {
            this.logRedisFallback(error);
            return this.memoryStore.increment(key);
        }
    }
    async decrement(key) {
        try {
            const redis = await getRedisClient('rate_limit');
            if (!redis) {
                await this.memoryStore.decrement(key);
                return;
            }
            await redis.decr(this.prefixedKey(key));
        }
        catch (error) {
            this.logRedisFallback(error);
            await this.memoryStore.decrement(key);
        }
    }
    async resetKey(key) {
        try {
            const redis = await getRedisClient('rate_limit');
            if (!redis) {
                await this.memoryStore.resetKey(key);
                return;
            }
            await redis.del(this.prefixedKey(key));
        }
        catch (error) {
            this.logRedisFallback(error);
            await this.memoryStore.resetKey(key);
        }
    }
    async get(key) {
        try {
            const redis = await getRedisClient('rate_limit');
            if (!redis) {
                return this.memoryStore.get(key);
            }
            const redisKey = this.prefixedKey(key);
            const [hits, ttlMs] = await Promise.all([redis.get(redisKey), redis.pttl(redisKey)]);
            if (!hits || ttlMs < 0) {
                return undefined;
            }
            return {
                totalHits: Number(hits) || 0,
                resetTime: new Date(Date.now() + ttlMs)
            };
        }
        catch (error) {
            this.logRedisFallback(error);
            return this.memoryStore.get(key);
        }
    }
    shutdown() {
        this.memoryStore.shutdown();
    }
}
const buildRateLimitStore = (keyPrefix) => {
    if (!env.REDIS_URL) {
        if (env.NODE_ENV === 'production' && !missingRedisWarningLogged) {
            missingRedisWarningLogged = true;
            logger.warn('rate_limit.redis.missing REDIS_URL is not configured; falling back to in-memory rate limits');
        }
        return undefined;
    }
    return new ResilientRedisStore(`rate-limit:${keyPrefix ?? 'global'}:`);
};
const isPrivateIpv4 = (ip) => {
    if (ip.startsWith('10.') || ip.startsWith('192.168.')) {
        return true;
    }
    const octets = ip.split('.');
    if (octets.length !== 4) {
        return false;
    }
    const firstOctet = Number(octets[0]);
    const secondOctet = Number(octets[1]);
    return firstOctet === 172 && Number.isInteger(secondOctet) && secondOctet >= 16 && secondOctet <= 31;
};
export const shouldBypassRateLimitInLocalDevelopment = (req) => {
    if (env.NODE_ENV === 'production') {
        return false;
    }
    const ip = normalizeIp(req.ip ?? req.socket?.remoteAddress);
    if (!ip) {
        return false;
    }
    return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || isPrivateIpv4(ip);
};
const buildRateLimiter = (options) => {
    const store = buildRateLimitStore(options.keyPrefix);
    return rateLimit({
        windowMs: options.windowMs,
        max: env.NODE_ENV === 'production' ? options.productionMax : options.developmentMax ?? options.productionMax * 10,
        standardHeaders: true,
        legacyHeaders: false,
        skip: async (req, res) => shouldBypassRateLimitInLocalDevelopment(req) || Boolean(options.skip && (await options.skip(req, res))),
        keyGenerator: options.keyGenerator ?? ((req) => normalizeIp(req.ip ?? req.socket?.remoteAddress) || 'unknown'),
        handler: (_req, res) => {
            res.status(429).json({
                success: false,
                message: options.message ?? 'Too many requests, please try again later.'
            });
        },
        passOnStoreError: true,
        ...(store ? { store } : {})
    });
};
export const globalRateLimiter = buildRateLimiter({
    keyPrefix: 'global',
    windowMs: 15 * 60 * 1000,
    productionMax: 300,
    developmentMax: 5000,
    skip: (req) => req.originalUrl === '/api/v1/health'
});
export const authRateLimiter = buildRateLimiter({
    keyPrefix: 'auth',
    windowMs: 15 * 60 * 1000,
    productionMax: 10,
    developmentMax: 100,
    message: 'Too many sign-in attempts, please try again later.'
});
export const passwordResetRateLimiter = buildRateLimiter({
    keyPrefix: 'password-reset',
    windowMs: 60 * 60 * 1000,
    productionMax: 3,
    developmentMax: 30,
    message: 'Too many password reset attempts, please try again later.'
});
export const forgotPasswordRateLimiter = buildRateLimiter({
    keyPrefix: 'forgot-password',
    windowMs: 15 * 60 * 1000,
    productionMax: 3,
    developmentMax: 3,
    message: 'Too many forgot password requests for this email, please try again later.',
    keyGenerator: (req) => {
        const email = normalizeEmail(req.body?.email);
        return email || normalizeIp(req.ip ?? req.socket?.remoteAddress) || 'unknown';
    }
});
export const resendEmailRateLimiter = buildRateLimiter({
    keyPrefix: 'resend-email',
    windowMs: 60 * 60 * 1000,
    productionMax: 3,
    developmentMax: 30,
    message: 'Too many verification email requests, please try again later.'
});
export const socketTicketRateLimiter = buildRateLimiter({
    keyPrefix: 'socket-ticket',
    windowMs: 60 * 1000,
    productionMax: 30,
    developmentMax: 300,
    message: 'Too many socket connection attempts, please slow down.',
    keyGenerator: (req) => req.user?.id ?? req.ip ?? req.socket?.remoteAddress ?? 'unknown'
});
export const uploadRateLimiter = buildRateLimiter({
    keyPrefix: 'upload',
    windowMs: 60 * 60 * 1000,
    productionMax: 20,
    developmentMax: 200,
    message: 'Too many uploads, please try again later.'
});
export const couponRateLimiter = buildRateLimiter({
    keyPrefix: 'coupon',
    windowMs: 15 * 60 * 1000,
    productionMax: 20,
    developmentMax: 200,
    message: 'Too many coupon validation attempts, please try again later.',
    keyGenerator: (req) => req.user?.id ?? req.ip ?? req.socket?.remoteAddress ?? 'unknown'
});
export const contactRateLimiter = buildRateLimiter({
    keyPrefix: 'contact',
    windowMs: 15 * 60 * 1000,
    productionMax: 5,
    developmentMax: 50,
    message: 'Too many contact form submissions, please try again later.',
    keyGenerator: (req) => {
        const email = normalizeEmail(req.body?.email);
        const ip = normalizeIp(req.ip ?? req.socket?.remoteAddress) || 'unknown';
        return email ? `${ip}:${email}` : ip;
    }
});
export const searchRateLimiter = buildRateLimiter({
    keyPrefix: 'search',
    windowMs: 60 * 1000,
    productionMax: 30,
    developmentMax: 300,
    message: 'Too many search requests, please slow down.'
});
export const searchRateLimiterWhenQueryPresent = (req, res, next) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
        next();
        return;
    }
    searchRateLimiter(req, res, next);
};
export const adminActionRateLimiter = buildRateLimiter({
    keyPrefix: 'admin-action',
    windowMs: 60 * 1000,
    productionMax: 60,
    developmentMax: 600,
    message: 'Too many admin actions, please slow down.',
    keyGenerator: (req) => req.user?.id ?? req.ip ?? req.socket?.remoteAddress ?? 'unknown'
});
