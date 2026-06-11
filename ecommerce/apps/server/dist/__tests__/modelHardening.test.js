import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { Category } from '../models/Category.js';
import { ORDER_TIMELINE_LIMIT, Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { authService } from '../services/authService.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';
const TEST_TIMEOUT = 60000;
beforeAll(async () => {
    await setupTestDB();
}, TEST_TIMEOUT);
afterAll(async () => {
    await teardownTestDB();
}, TEST_TIMEOUT);
beforeEach(async () => {
    await clearTestDB();
});
describe('model hardening', () => {
    it('does not re-sanitize product descriptions when unrelated fields are saved', async () => {
        const category = await Category.create({ name: 'Phones', slug: 'phones' });
        const product = await Product.create({
            name: 'Audit Phone',
            slug: 'audit-phone',
            description: '<p>Safe</p>',
            shortDescription: '<strong>Short</strong>',
            price: 100,
            category: category._id,
            variants: [{ stock: 5, sku: 'AUD-1' }],
            sku: 'AUD-1'
        });
        await Product.updateOne({ _id: product._id }, { $set: { description: '<script>alert(1)</script><p>Legacy raw</p>' } });
        const loadedProduct = await Product.findById(product._id);
        expect(loadedProduct).toBeTruthy();
        loadedProduct.soldCount = 1;
        await loadedProduct.save();
        const savedProduct = await Product.findById(product._id).lean();
        expect(savedProduct?.description).toBe('<script>alert(1)</script><p>Legacy raw</p>');
    });
    it('keeps only the newest order timeline entries', async () => {
        const order = await Order.create({
            user: new Types.ObjectId(),
            orderNumber: 'ORD-TRIM-1',
            type: 'delivery',
            subtotal: 100,
            shippingFee: 0,
            total: 100,
            timeline: Array.from({ length: ORDER_TIMELINE_LIMIT + 5 }, (_, index) => ({
                status: 'pending',
                note: `Event ${index}`,
                createdAt: new Date(Date.now() + index)
            }))
        });
        expect(order.timeline).toHaveLength(ORDER_TIMELINE_LIMIT);
        expect(order.timeline[0]?.note).toBe('Event 5');
    });
    it('scrubs expired reset tokens and login locks without deleting users', async () => {
        const user = await User.create({
            name: 'Locked User',
            email: 'locked@example.com',
            password: 'Password@123',
            passwordResetToken: 'expired-token',
            passwordResetExpires: new Date(Date.now() - 1000),
            loginAttempts: 5,
            lockUntil: new Date(Date.now() - 1000)
        });
        const result = await authService.cleanupExpiredSecurityFields();
        const savedUser = await User.findById(user._id).select('+passwordResetToken +passwordResetExpires +loginAttempts +lockUntil');
        expect(result.resetTokensCleared).toBe(1);
        expect(result.locksCleared).toBe(1);
        expect(savedUser).toBeTruthy();
        expect(savedUser.passwordResetToken).toBeUndefined();
        expect(savedUser.passwordResetExpires).toBeUndefined();
        expect(savedUser.lockUntil).toBeUndefined();
        expect(savedUser.loginAttempts).toBe(0);
    });
});
