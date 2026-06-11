import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { User } from '../models/User.js';
import { emailService } from '../services/emailService.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';
const TEST_TIMEOUT = 40000;
const password = 'Password123!';
const registerAdmin = async (email, permissions) => {
    await request(app)
        .post('/api/v1/auth/register')
        .send({
        name: 'Broadcast Admin',
        email,
        password,
        passwordConfirm: password
    })
        .expect(201);
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        throw new Error('Registered admin not found');
    }
    user.role = 'admin';
    user.isEmailVerified = true;
    user.permissions = permissions;
    await user.save();
    const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);
    return {
        id: user._id.toString(),
        token: loginRes.body.data.tokens.accessToken
    };
};
const createCustomer = async (overrides = {}) => User.create({
    name: 'Customer User',
    email: overrides.email ?? 'customer@example.com',
    password,
    role: 'customer',
    isActive: overrides.isActive ?? true,
    isEmailVerified: overrides.isEmailVerified ?? true
});
beforeAll(async () => {
    await setupTestDB();
}, TEST_TIMEOUT);
afterAll(async () => {
    await teardownTestDB();
}, TEST_TIMEOUT);
beforeEach(async () => {
    await clearTestDB();
});
describe('Admin broadcast emails', () => {
    it('returns verified recipient counts for the broadcast audience summary', async () => {
        const admin = await registerAdmin('broadcast-read@example.com', ['setting:read']);
        await Promise.all([
            createCustomer({ email: 'shared@example.com', isActive: true, isEmailVerified: true }),
            createCustomer({ email: 'inactive@example.com', isActive: false, isEmailVerified: true }),
            createCustomer({ email: 'unverified@example.com', isActive: true, isEmailVerified: false })
        ]);
        await NewsletterSubscriber.create([
            { email: 'shared@example.com', source: 'home-page', isConfirmed: true, confirmedAt: new Date() },
            { email: 'newsletter-only@example.com', source: 'home-page', isConfirmed: true, confirmedAt: new Date() },
            { email: 'pending@example.com', source: 'home-page', isConfirmed: false }
        ]);
        const response = await request(app)
            .get('/api/v1/admin/broadcasts/audience')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        expect(response.body.data).toEqual({
            customers: 1,
            unverifiedCustomers: 1,
            newsletterSubscribers: 2,
            totalUniqueRecipients: 3
        });
    }, TEST_TIMEOUT);
    it('sends a deduplicated broadcast across verified customers and confirmed newsletter subscribers', async () => {
        const admin = await registerAdmin('broadcast-write@example.com', ['setting:write']);
        await Promise.all([
            createCustomer({ email: 'shared@example.com' }),
            createCustomer({ email: 'customer-only@example.com' }),
            createCustomer({ email: 'unverified-only@example.com', isEmailVerified: false }),
            createCustomer({ email: 'inactive@example.com', isActive: false })
        ]);
        await NewsletterSubscriber.create([
            { email: 'shared@example.com', source: 'home-page', isConfirmed: true, confirmedAt: new Date() },
            { email: 'newsletter-only@example.com', source: 'home-page', isConfirmed: true, confirmedAt: new Date() },
            { email: 'pending@example.com', source: 'home-page', isConfirmed: false }
        ]);
        const response = await request(app)
            .post('/api/v1/admin/broadcasts/email')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            audience: 'all',
            subject: 'April Launch Week',
            previewText: 'Fresh price drops are now live.',
            headline: 'Fresh arrivals are ready to ship',
            body: 'See the latest launch-ready products.\n\nGet your quote before the wider release.',
            ctaLabel: 'Browse Launch Picks',
            ctaUrl: '/shop?featured=true'
        })
            .expect(200);
        expect(response.body.data).toMatchObject({
            audience: 'all',
            subject: 'April Launch Week',
            requestedRecipients: 4,
            sent: 4,
            failed: 0
        });
        expect(vi.mocked(emailService.sendAdminBroadcast)).toHaveBeenCalledTimes(4);
        const sentPayloads = vi.mocked(emailService.sendAdminBroadcast).mock.calls.map(([payload]) => payload);
        expect(sentPayloads.map((payload) => payload.to).sort()).toEqual(['shared@example.com', 'customer-only@example.com', 'unverified-only@example.com', 'newsletter-only@example.com'].sort());
        expect(sentPayloads.every((payload) => payload.subject === 'April Launch Week')).toBe(true);
        expect(sentPayloads.every((payload) => payload.audienceLabel === 'All Reachable Contacts')).toBe(true);
        expect(sentPayloads.every((payload) => payload.ctaUrl?.endsWith('/shop?featured=true'))).toBe(true);
    }, TEST_TIMEOUT);
    it('sends a broadcast only to active unverified customers when that audience is selected', async () => {
        const admin = await registerAdmin('broadcast-unverified@example.com', ['setting:write']);
        await Promise.all([
            createCustomer({ email: 'verified@example.com', isEmailVerified: true }),
            createCustomer({ email: 'unverified-one@example.com', isEmailVerified: false }),
            createCustomer({ email: 'unverified-two@example.com', isEmailVerified: false }),
            createCustomer({ email: 'inactive-unverified@example.com', isEmailVerified: false, isActive: false })
        ]);
        const response = await request(app)
            .post('/api/v1/admin/broadcasts/email')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            audience: 'unverifiedCustomers',
            subject: 'Verify your NJ Store account',
            headline: 'Complete your email verification',
            body: 'Verify your email so you can receive account updates and launch communications.'
        })
            .expect(200);
        expect(response.body.data).toMatchObject({
            audience: 'unverifiedCustomers',
            requestedRecipients: 2,
            sent: 2,
            failed: 0
        });
        const sentPayloads = vi.mocked(emailService.sendAdminBroadcast).mock.calls.map(([payload]) => payload);
        expect(sentPayloads.map((payload) => payload.to).sort()).toEqual(['unverified-one@example.com', 'unverified-two@example.com'].sort());
        expect(sentPayloads.every((payload) => payload.audienceLabel === 'Unverified Customers')).toBe(true);
    }, TEST_TIMEOUT);
    it('requires setting write access to send a broadcast', async () => {
        const admin = await registerAdmin('broadcast-read-only@example.com', ['setting:read']);
        const response = await request(app)
            .post('/api/v1/admin/broadcasts/email')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            audience: 'customers',
            subject: 'Promo update',
            headline: 'A short headline',
            body: 'A short message for the audience.'
        })
            .expect(403);
        expect(response.body.message).toMatch(/permission/i);
    }, TEST_TIMEOUT);
});
