import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resolveRefreshCookieDomain, shouldPartitionRefreshCookie } from '../services/authService.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';
const TEST_TIMEOUT = 40000;
beforeAll(async () => {
    await setupTestDB();
}, TEST_TIMEOUT);
afterAll(async () => {
    await teardownTestDB();
}, TEST_TIMEOUT);
beforeEach(async () => {
    await clearTestDB();
});
describe('Authentication Flow', () => {
    const testUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!'
    };
    const getCookies = (value) => {
        if (Array.isArray(value)) {
            return value;
        }
        return value ? [value] : [];
    };
    it('normalizes refresh cookie domains that match the current request host', () => {
        expect(resolveRefreshCookieDomain('api.example.com', '.example.com')).toBe('example.com');
        expect(resolveRefreshCookieDomain('api.example.com', 'https://api.example.com:8443/auth')).toBe('api.example.com');
    });
    it('falls back to a host-only refresh cookie when the configured domain does not match the request host', () => {
        expect(resolveRefreshCookieDomain('project.up.railway.app', '.example.com')).toBeUndefined();
        expect(resolveRefreshCookieDomain('project.up.railway.app', 'https://www.example.com')).toBeUndefined();
    });
    it('partitions production host-only refresh cookies for cross-site preview deployments', () => {
        expect(shouldPartitionRefreshCookie(undefined, 'production')).toBe(true);
        expect(shouldPartitionRefreshCookie('example.com', 'production')).toBe(false);
        expect(shouldPartitionRefreshCookie(undefined, 'test')).toBe(false);
    });
    it('should register a new user successfully', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser)
            .expect(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe(testUser.email);
        expect(res.body.data.user.name).toBe(testUser.name);
        const cookies = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : [];
        expect(cookies.some((cookie) => cookie.includes('refreshToken='))).toBe(true);
    }, TEST_TIMEOUT);
    it('should not allow registration with duplicate email', async () => {
        await request(app).post('/api/v1/auth/register').send(testUser).expect(201);
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser)
            .expect(409);
        expect(res.body.success).toBe(false);
    }, TEST_TIMEOUT);
    it('should login successfully and return tokens', async () => {
        await request(app).post('/api/v1/auth/register').send(testUser).expect(201);
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: testUser.email, password: testUser.password })
            .expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.tokens.accessToken).toBeDefined();
        const cookies = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : [];
        expect(cookies.some((cookie) => cookie.includes('refreshToken='))).toBe(true);
    }, TEST_TIMEOUT);
    it('should login with Google credentials and provision a verified customer session', async () => {
        const res = await request(app)
            .post('/api/v1/auth/google')
            .send({
            credential: 'dev:google-shopper@example.com:Google Shopper',
            rememberMe: true
        })
            .expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe('google-shopper@example.com');
        expect(res.body.data.user.name).toBe('Google Shopper');
        expect(res.body.data.user.isEmailVerified).toBe(true);
        expect(res.body.data.tokens.accessToken).toBeDefined();
        const cookies = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : [];
        expect(cookies.some((cookie) => cookie.includes('refreshToken='))).toBe(true);
    }, TEST_TIMEOUT);
    it('should get profile with valid access token', async () => {
        const loginRes = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser)
            .expect(201);
        const accessToken = loginRes.body.data.tokens.accessToken;
        const res = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe(testUser.email);
    }, TEST_TIMEOUT);
    it('should persist saved shop filters on the user profile', async () => {
        const registerRes = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser)
            .expect(201);
        const accessToken = registerRes.body.data.tokens.accessToken;
        const savedAt = new Date().toISOString();
        const updateRes = await request(app)
            .patch('/api/v1/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
            shopPreferences: {
                myFilters: {
                    params: {
                        inStock: 'true',
                        sort: 'price_desc'
                    },
                    savedAt
                }
            }
        })
            .expect(200);
        expect(updateRes.body.success).toBe(true);
        expect(updateRes.body.data.user.shopPreferences.myFilters.params.inStock).toBe('true');
        expect(updateRes.body.data.user.shopPreferences.myFilters.params.sort).toBe('price_desc');
        const profileRes = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
        expect(profileRes.body.data.user.shopPreferences.myFilters.savedAt).toBe(savedAt);
    }, TEST_TIMEOUT);
    it('should reject profile request without token', async () => {
        await request(app).get('/api/v1/auth/me').expect(401);
    });
    it('should reject an access token after logout revokes its session', async () => {
        const registerRes = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser)
            .expect(201);
        const accessToken = registerRes.body.data.tokens.accessToken;
        const cookies = getCookies(registerRes.headers['set-cookie']);
        await request(app)
            .post('/api/v1/auth/logout')
            .set('Cookie', cookies)
            .expect(200);
        await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(401);
    }, TEST_TIMEOUT);
    it('should reject an old access token after the password is changed', async () => {
        const registerRes = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser)
            .expect(201);
        const accessToken = registerRes.body.data.tokens.accessToken;
        await request(app)
            .patch('/api/v1/auth/password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
            currentPassword: testUser.password,
            newPassword: 'Password456!',
            newPasswordConfirm: 'Password456!'
        })
            .expect(200);
        await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(401);
    }, TEST_TIMEOUT);
});
