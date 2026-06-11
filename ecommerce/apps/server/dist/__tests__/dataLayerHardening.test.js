import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { ORDER_TIMELINE_LIMIT, Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { authService } from '../services/authService.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';
const TEST_TIMEOUT = 40000;
const shippingAddress = {
    label: 'Home',
    fullName: 'Data Layer Customer',
    phone: '0771234567',
    line1: '123 Main St',
    city: 'Colombo',
    district: 'Colombo',
    postalCode: '00100',
    country: 'Sri Lanka'
};
beforeAll(async () => {
    await setupTestDB();
}, TEST_TIMEOUT);
afterAll(async () => {
    await teardownTestDB();
}, TEST_TIMEOUT);
beforeEach(async () => {
    await clearTestDB();
});
describe('data layer hardening', () => {
    it('does not re-sanitize product descriptions when unrelated fields are saved', async () => {
        const product = await Product.create({
            name: 'Sanitized Phone',
            slug: 'sanitized-phone',
            description: '<p>Safe</p><script>alert("x")</script>',
            shortDescription: 'Short <strong>summary</strong>',
            price: 120000,
            category: new mongoose.Types.ObjectId(),
            sku: 'SAN-001'
        });
        expect(product.description).toBe('<p>Safe</p>');
        expect(product.shortDescription).toBe('Short summary');
        await Product.collection.updateOne({ _id: product._id }, {
            $set: {
                description: '<p>Legacy import</p><script>alert("kept because untouched")</script>',
                shortDescription: 'Legacy <em>summary</em>'
            }
        });
        const reloaded = await Product.findById(product._id);
        if (!reloaded) {
            throw new Error('Product was not found after direct update');
        }
        reloaded.soldCount += 1;
        await reloaded.save();
        const saved = await Product.findById(product._id).lean();
        expect(saved?.description).toBe('<p>Legacy import</p><script>alert("kept because untouched")</script>');
        expect(saved?.shortDescription).toBe('Legacy <em>summary</em>');
        expect(saved?.soldCount).toBe(1);
    });
    it('caps order timelines to the newest events on save', async () => {
        const timeline = Array.from({ length: ORDER_TIMELINE_LIMIT + 5 }, (_, index) => ({
            status: 'processing',
            note: `event ${index}`,
            actor: 'system',
            createdAt: new Date(Date.UTC(2026, 0, 1, 0, index))
        }));
        const order = await Order.create({
            user: new mongoose.Types.ObjectId(),
            orderNumber: 'ORD-DATA-001',
            type: 'delivery',
            paymentMethod: 'bank_transfer',
            status: 'processing',
            paymentStatus: 'unpaid',
            subtotal: 1000,
            shippingFee: 0,
            discount: 0,
            total: 1000,
            shippingAddress,
            items: [
                {
                    product: new mongoose.Types.ObjectId(),
                    name: 'Timeline test item',
                    slug: 'timeline-test-item',
                    quantity: 1,
                    price: 1000,
                    sku: 'TIMELINE-001'
                }
            ],
            timeline
        });
        expect(order.timeline).toHaveLength(ORDER_TIMELINE_LIMIT);
        expect(order.timeline[0]?.note).toBe('event 5');
        expect(order.timeline.at(-1)?.note).toBe(`event ${ORDER_TIMELINE_LIMIT + 4}`);
    });
    it('clears expired reset tokens and expired account locks without deleting users', async () => {
        const now = Date.now();
        const expiredUser = await User.create({
            name: 'Expired Token',
            email: 'expired-token@example.com',
            password: 'Password123!',
            passwordResetToken: 'expired-token',
            passwordResetExpires: new Date(now - 60_000),
            loginAttempts: 5,
            lockUntil: new Date(now - 60_000)
        });
        const activeUser = await User.create({
            name: 'Active Token',
            email: 'active-token@example.com',
            password: 'Password123!',
            passwordResetToken: 'active-token',
            passwordResetExpires: new Date(now + 60_000),
            loginAttempts: 5,
            lockUntil: new Date(now + 60_000)
        });
        await expect(authService.cleanupExpiredSecurityFields()).resolves.toEqual({
            resetTokensCleared: 1,
            locksCleared: 1
        });
        const expired = await User.findById(expiredUser._id).select('+passwordResetToken +passwordResetExpires +loginAttempts +lockUntil');
        const active = await User.findById(activeUser._id).select('+passwordResetToken +passwordResetExpires +loginAttempts +lockUntil');
        expect(expired).not.toBeNull();
        expect(expired?.passwordResetToken).toBeUndefined();
        expect(expired?.passwordResetExpires).toBeUndefined();
        expect(expired?.loginAttempts).toBe(0);
        expect(expired?.lockUntil).toBeUndefined();
        expect(active?.passwordResetToken).toBe('active-token');
        expect(active?.passwordResetExpires).toBeInstanceOf(Date);
        expect(active?.loginAttempts).toBe(5);
        expect(active?.lockUntil).toBeInstanceOf(Date);
    });
});
