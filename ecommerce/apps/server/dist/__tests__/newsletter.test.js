import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { emailService } from '../services/emailService.js';
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
describe('Newsletter subscription flow', () => {
    it('subscribes immediately and sends the welcome email', async () => {
        const response = await request(app)
            .post('/api/v1/newsletter/subscribe')
            .send({ email: 'subscriber@example.com', source: 'home-page' })
            .expect(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe('subscriber@example.com');
        expect(response.body.data.isConfirmed).toBe(true);
        expect(vi.mocked(emailService.sendNewsletterWelcome)).toHaveBeenCalledWith('subscriber@example.com');
        expect(vi.mocked(emailService.sendNewsletterConfirmation)).not.toHaveBeenCalled();
        const subscriber = await NewsletterSubscriber.findOne({ email: 'subscriber@example.com' }).select('+confirmationToken +confirmationExpires');
        expect(subscriber).not.toBeNull();
        expect(subscriber?.isConfirmed).toBe(true);
        expect(subscriber?.confirmationToken).toBeUndefined();
    }, TEST_TIMEOUT);
    it('still confirms legacy pending subscriptions from an emailed token', async () => {
        const token = 'legacy-confirm-token-12345';
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        await NewsletterSubscriber.create({
            email: 'subscriber@example.com',
            source: 'home-page',
            isConfirmed: false,
            confirmationToken: hashedToken,
            confirmationExpires: new Date(Date.now() + 60_000)
        });
        const response = await request(app)
            .post('/api/v1/newsletter/confirm')
            .send({ token })
            .expect(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isConfirmed).toBe(true);
        expect(vi.mocked(emailService.sendNewsletterWelcome)).toHaveBeenCalledWith('subscriber@example.com');
        const subscriber = await NewsletterSubscriber.findOne({ email: 'subscriber@example.com' }).select('+confirmationToken +confirmationExpires');
        expect(subscriber?.isConfirmed).toBe(true);
        expect(subscriber?.confirmationToken).toBeUndefined();
    }, TEST_TIMEOUT);
});
