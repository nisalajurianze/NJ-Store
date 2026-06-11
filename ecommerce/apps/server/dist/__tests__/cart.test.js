import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
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
describe('Cart Flow', () => {
    it('rejects adding configurable products without a selected variant', async () => {
        const product = await Product.create({
            name: 'Configurable Cart Product',
            slug: 'configurable-cart-product',
            description: 'A configurable product for cart testing',
            shortDescription: 'Configurable cart product',
            price: 3200,
            brandName: 'TestBrand',
            sku: 'CART-CONFIG-BASE',
            category: new mongoose.Types.ObjectId(),
            images: [{ url: 'cart-config.jpg', publicId: 'cart-config', alt: 'Cart Config' }],
            variants: [
                { stock: 10, sku: 'CART-CONFIG-1', color: 'Black' },
                { stock: 6, sku: 'CART-CONFIG-2', color: 'Silver' }
            ],
            isActive: true
        });
        const res = await request(app)
            .post('/api/v1/cart')
            .send({
            productId: product._id.toString(),
            quantity: 1
        })
            .expect(400);
        expect(res.body.message).toBe('Select all required options first.');
    }, TEST_TIMEOUT);
    it('normalizes legacy single-variant guest cart items when the cart is read', async () => {
        const product = await Product.create({
            name: 'Single Variant Cart Product',
            slug: 'single-variant-cart-product',
            description: 'A single-variant product for cart testing',
            shortDescription: 'Single variant cart product',
            price: 2800,
            brandName: 'TestBrand',
            sku: 'CART-SINGLE-BASE',
            category: new mongoose.Types.ObjectId(),
            images: [{ url: 'cart-single.jpg', publicId: 'cart-single', alt: 'Cart Single' }],
            variants: [{ stock: 12, sku: 'CART-SINGLE-1', color: 'Black' }],
            isActive: true
        });
        await Cart.create({
            sessionId: 'single-variant-session',
            items: [{ product: product._id, quantity: 2 }]
        });
        const res = await request(app)
            .get('/api/v1/cart')
            .set('Cookie', ['sessionId=single-variant-session'])
            .expect(200);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.items[0].variantIndex).toBe(0);
        const storedCart = await Cart.findOne({ sessionId: 'single-variant-session' });
        expect(storedCart?.items[0]?.variantIndex).toBe(0);
    }, TEST_TIMEOUT);
    it('drops ambiguous legacy multi-variant guest cart items when the cart is read', async () => {
        const product = await Product.create({
            name: 'Legacy Configurable Cart Product',
            slug: 'legacy-configurable-cart-product',
            description: 'A configurable product for legacy cart testing',
            shortDescription: 'Legacy configurable cart product',
            price: 3600,
            brandName: 'TestBrand',
            sku: 'CART-LEGACY-BASE',
            category: new mongoose.Types.ObjectId(),
            images: [{ url: 'cart-legacy.jpg', publicId: 'cart-legacy', alt: 'Cart Legacy' }],
            variants: [
                { stock: 9, sku: 'CART-LEGACY-1', color: 'Black' },
                { stock: 7, sku: 'CART-LEGACY-2', color: 'Blue' }
            ],
            isActive: true
        });
        await Cart.create({
            sessionId: 'legacy-configurable-session',
            items: [{ product: product._id, quantity: 1 }]
        });
        const res = await request(app)
            .get('/api/v1/cart')
            .set('Cookie', ['sessionId=legacy-configurable-session'])
            .expect(200);
        expect(res.body.data.items).toHaveLength(0);
        expect(res.body.data.itemCount).toBe(0);
        const storedCart = await Cart.findOne({ sessionId: 'legacy-configurable-session' });
        expect(storedCart?.items).toHaveLength(0);
    }, TEST_TIMEOUT);
});
