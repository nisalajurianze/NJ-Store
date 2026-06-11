import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { productService } from '../services/productService.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';
const TEST_TIMEOUT = 40000;
const password = 'Password123!';
beforeAll(async () => {
    await setupTestDB();
}, TEST_TIMEOUT);
afterAll(async () => {
    await teardownTestDB();
}, TEST_TIMEOUT);
beforeEach(async () => {
    await clearTestDB();
});
const registerAdmin = async (email) => {
    await request(app)
        .post('/api/v1/auth/register')
        .send({
        name: 'Admin User',
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
    user.permissions = ['product:read', 'product:write'];
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
describe('Admin product routes', () => {
    it('accepts relative canonical URLs and clears optional fields when updating through the admin API', async () => {
        const admin = await registerAdmin('product-admin-update@example.com');
        const category = await Category.create({
            name: 'Phones',
            slug: 'phones',
            description: 'Smartphones'
        });
        const created = await productService.createProduct({
            name: 'Route Phone',
            description: 'Premium route phone for update testing.',
            shortDescription: 'Premium route phone',
            price: 300000,
            comparePrice: 325000,
            category: category._id.toString(),
            images: [{ url: 'https://example.com/route-phone.jpg', publicId: 'route-phone', alt: 'Route phone' }],
            variants: [{ stock: 6, sku: 'ROUTE-PHONE-1', glowColor: '#2563eb' }],
            specifications: [{ key: 'Chip', value: 'Route Gen 2' }],
            isActive: true,
            canonicalUrl: 'https://njstore.lk/product/route-phone',
            warranty: '1 year warranty',
            sku: 'ROUTE-PHONE',
            loyaltyPoints: 80
        }, { actorUserId: admin.id, commitMessage: 'Created route phone' });
        await request(app)
            .patch(`/api/v1/admin/products/${created.id}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            canonicalUrl: '/product/route-phone-pro',
            comparePrice: null,
            warranty: null,
            metaTitle: null,
            metaDescription: null,
            publishAt: null,
            weight: null
        })
            .expect(200);
        const updated = await Product.findById(created.id).lean();
        expect(updated?.canonicalUrl).toBe('/product/route-phone-pro');
        expect(updated?.comparePrice ?? null).toBeNull();
        expect(updated?.warranty ?? null).toBeNull();
        expect(updated?.metaTitle ?? null).toBeNull();
        expect(updated?.metaDescription ?? null).toBeNull();
        expect(updated?.publishAt ?? null).toBeNull();
        expect(updated?.weight ?? null).toBeNull();
    }, TEST_TIMEOUT);
    it('bulk-adjusts product prices and restores an older version through the admin API', async () => {
        const admin = await registerAdmin('product-admin-routes@example.com');
        const category = await Category.create({
            name: 'Laptops',
            slug: 'laptops',
            description: 'Portable computers'
        });
        const created = await productService.createProduct({
            name: 'Route Laptop',
            description: 'High performance laptop for route testing.',
            shortDescription: 'High performance laptop',
            price: 250000,
            comparePrice: 275000,
            category: category._id.toString(),
            images: [{ url: 'https://example.com/route-laptop.jpg', publicId: 'route-laptop', alt: 'Route laptop' }],
            variants: [{ stock: 4, sku: 'ROUTE-LAP-1', price: 255000 }],
            specifications: [{ key: 'CPU', value: 'Ultra 9' }],
            isActive: true,
            sku: 'ROUTE-LAP',
            loyaltyPoints: 100
        }, { actorUserId: admin.id, commitMessage: 'Created route laptop' });
        const versionsBeforeAdjustment = await request(app)
            .get(`/api/v1/admin/products/${created.id}/versions`)
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        expect(versionsBeforeAdjustment.body.data).toHaveLength(1);
        expect(versionsBeforeAdjustment.body.data[0].version).toBe(1);
        const bulkAdjustment = await request(app)
            .post('/api/v1/admin/products/bulk-price-adjust')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            productIds: [created.id],
            adjustmentType: 'percentage',
            amount: 10,
            target: 'both',
            applyToVariantOverrides: true
        })
            .expect(200);
        expect(bulkAdjustment.body.data.updatedCount).toBe(1);
        const adjusted = await Product.findById(created.id).lean();
        expect(adjusted?.price).toBe(275000);
        expect(adjusted?.comparePrice).toBe(302500);
        expect(adjusted?.variants[0]?.price).toBe(280500);
        const versionsAfterAdjustment = await request(app)
            .get(`/api/v1/admin/products/${created.id}/versions`)
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        expect(versionsAfterAdjustment.body.data).toHaveLength(2);
        expect(versionsAfterAdjustment.body.data[0].version).toBe(2);
        const initialVersionId = versionsAfterAdjustment.body.data.find((version) => version.version === 1)?.id;
        expect(initialVersionId).toBeTruthy();
        await request(app)
            .post(`/api/v1/admin/products/${created.id}/versions/${initialVersionId}/restore`)
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        const restored = await Product.findById(created.id).lean();
        expect(restored?.price).toBe(250000);
        expect(restored?.comparePrice).toBe(275000);
        expect(restored?.variants[0]?.price).toBe(255000);
    }, TEST_TIMEOUT);
});
