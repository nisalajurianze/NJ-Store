import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../app.js';
describe('app security headers and routes', () => {
    it('does not allow inline scripts in the global CSP', async () => {
        const response = await request(app).get('/api/v1/health').expect(200);
        const scriptSrcDirective = response.headers['content-security-policy']
            .split(';')
            .find((directive) => directive.trim().startsWith('script-src'));
        expect(scriptSrcDirective).toBe("script-src 'self' https://accounts.google.com");
    });
    it('keeps Swagger docs behind a CSP header', async () => {
        const response = await request(app).get('/api/v1/docs/').expect(200);
        expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    });
    it('does not expose the unversioned footer API route', async () => {
        await request(app).get('/api/footer').expect(404);
    });
});
