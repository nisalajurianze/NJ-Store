import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl, resolveSocketOrigin } from './apiConfig';

describe('store api config helpers', () => {
  it('falls back to the local proxy path when no API URL is configured', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('/api/v1');
    expect(resolveSocketOrigin(undefined)).toBeUndefined();
  });

  it('normalizes relative API paths for local development', () => {
    expect(resolveApiBaseUrl('api/v1/')).toBe('/api/v1');
    expect(resolveApiBaseUrl('/api/v1/')).toBe('/api/v1');
    expect(resolveSocketOrigin('/api/v1')).toBeUndefined();
  });

  it('preserves absolute API origins and derives the socket origin from them', () => {
    expect(resolveApiBaseUrl('http://localhost:5000/api/v1/', 'http://localhost:5173/')).toBe('http://localhost:5000/api/v1');
    expect(resolveSocketOrigin('http://localhost:5000/api/v1', 'http://localhost:5173/')).toBe('http://localhost:5000');
  });

  it('falls back to the same-origin proxy when the app is opened from a LAN host', () => {
    expect(resolveApiBaseUrl('http://localhost:5000/api/v1', 'http://192.168.1.25:5173/checkout')).toBe('/api/v1');
    expect(resolveSocketOrigin('http://localhost:5000/api/v1', 'http://192.168.1.25:5173/checkout')).toBeUndefined();
  });

  it('falls back to the same-origin proxy for insecure API URLs on secure pages', () => {
    expect(resolveApiBaseUrl('http://localhost:5000/api/v1', 'https://store.example.com/checkout')).toBe('/api/v1');
    expect(resolveSocketOrigin('http://localhost:5000/api/v1', 'https://store.example.com/checkout')).toBeUndefined();
  });
});
