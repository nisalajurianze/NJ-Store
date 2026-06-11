import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Security headers', () => {
  it('allows Google sign-in popups to communicate with the opener window', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
  });
});
