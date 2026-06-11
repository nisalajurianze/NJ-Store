import { describe, expect, it } from 'vitest';
import { shouldBypassRateLimitInLocalDevelopment } from '../middleware/rateLimiter.js';

describe('rate limiter local development bypass', () => {
  it('bypasses localhost traffic in non-production environments', () => {
    expect(shouldBypassRateLimitInLocalDevelopment({ ip: '127.0.0.1', socket: { remoteAddress: undefined } } as never)).toBe(true);
    expect(shouldBypassRateLimitInLocalDevelopment({ ip: '::1', socket: { remoteAddress: undefined } } as never)).toBe(true);
    expect(shouldBypassRateLimitInLocalDevelopment({ ip: '::ffff:127.0.0.1', socket: { remoteAddress: undefined } } as never)).toBe(true);
  });

  it('bypasses private network addresses used in local development', () => {
    expect(shouldBypassRateLimitInLocalDevelopment({ ip: '192.168.8.102', socket: { remoteAddress: undefined } } as never)).toBe(true);
    expect(shouldBypassRateLimitInLocalDevelopment({ ip: '10.0.0.25', socket: { remoteAddress: undefined } } as never)).toBe(true);
    expect(shouldBypassRateLimitInLocalDevelopment({ ip: '172.20.5.4', socket: { remoteAddress: undefined } } as never)).toBe(true);
  });

  it('does not bypass public addresses', () => {
    expect(shouldBypassRateLimitInLocalDevelopment({ ip: '8.8.8.8', socket: { remoteAddress: undefined } } as never)).toBe(false);
  });
});
