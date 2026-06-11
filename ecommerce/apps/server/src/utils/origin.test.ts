import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from './origin.js';

describe('isAllowedOrigin', () => {
  const allowedOrigins = new Set(['http://localhost:5173', 'http://localhost:5174']);

  it('allows configured client origins', () => {
    expect(isAllowedOrigin('http://localhost:5173', allowedOrigins, 'development')).toBe(true);
  });

  it('allows local network dev origins for the known frontend ports', () => {
    expect(isAllowedOrigin('http://192.168.1.50:5173', allowedOrigins, 'development')).toBe(true);
    expect(isAllowedOrigin('http://10.0.0.8:5174', allowedOrigins, 'development')).toBe(true);
    expect(isAllowedOrigin('http://localhost:5175', allowedOrigins, 'development')).toBe(true);
    expect(isAllowedOrigin('http://192.168.1.50:4173', allowedOrigins, 'development')).toBe(true);
  });

  it('blocks unknown origins in production', () => {
    expect(isAllowedOrigin('http://192.168.1.50:5173', allowedOrigins, 'production')).toBe(false);
  });

  it('blocks public non-local origins even in development', () => {
    expect(isAllowedOrigin('http://evil.example.com:5173', allowedOrigins, 'development')).toBe(false);
  });
});
