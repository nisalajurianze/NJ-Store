import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { Coupon } from '../models/Coupon.js';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { StoreSetting } from '../models/StoreSetting.js';
import { User } from '../models/User.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';
vi.mock('../services/uploadService.js', () => ({
    uploadBuffer: vi.fn(async ({ file, folder }) => ({
        url: `http://mock-url.com/${folder}/${file.originalname}`,
        publicId: `mock:${folder}/${file.originalname}`,
        alt: file.originalname
    })),
    uploadGeneratedBuffer: vi.fn(async ({ fileName, folder }) => ({
        url: `http://mock-url.com/${folder}/${fileName}`,
        publicId: `mock:${folder}/${fileName}`,
        alt: fileName
    })),
    removeAsset: vi.fn().mockResolvedValue(undefined),
    isLocalAsset: vi.fn(() => false),
    resolveLocalAssetPath: vi.fn((publicId) => publicId),
    resolveAssetDeliveryUrl: vi.fn((asset) => asset.url)
}));
const TEST_TIMEOUT = 60000;
const PNG_BUFFER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0L0AAAAASUVORK5CYII=', 'base64');
const shippingAddress = {
    label: 'Home',
    fullName: 'Order Tester',
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
describe('Order Flow', () => {
    let productId;
    beforeEach(async () => {
        const product = await Product.create({
            name: 'Test Product',
            slug: 'test-product',
            description: 'A product for testing',
            shortDescription: 'Short desc',
            price: 1500,
            brandName: 'TestBrand',
            sku: 'MAIN-TEST-1',
            category: new mongoose.Types.ObjectId(),
            images: [{ url: 'test.jpg', publicId: 'test', alt: 'Test' }],
            variants: [{ stock: 10, sku: 'TEST-1' }],
            isActive: true
        });
        productId = product._id.toString();
        await StoreSetting.create({
            freeShippingThreshold: 5000,
            lowStockThreshold: 9,
            shippingRates: [{ city: 'default', fee: 300, days: '2-3' }]
        });
    });
    const registerUser = async (email, options) => {
        const password = 'Password123!';
        const assignedRole = options?.role ?? (options?.admin ? 'admin' : undefined);
        const registerRes = await request(app)
            .post('/api/v1/auth/register')
            .send({
            name: assignedRole ? 'Workspace User' : 'Order Tester',
            email,
            password,
            passwordConfirm: password
        })
            .expect(201);
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            throw new Error('Registered user not found');
        }
        if (options?.verified) {
            user.isEmailVerified = true;
        }
        if (assignedRole) {
            user.role = assignedRole;
            user.isEmailVerified = true;
        }
        await user.save();
        if (assignedRole) {
            const loginRes = await request(app)
                .post('/api/v1/auth/login')
                .send({ email, password })
                .expect(200);
            return {
                token: loginRes.body.data.tokens.accessToken,
                userId: user._id.toString(),
                password
            };
        }
        return {
            token: registerRes.body.data.tokens.accessToken,
            userId: user._id.toString(),
            password
        };
    };
    const createQuotation = async (token, options) => {
        const res = await request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
            type: options?.type ?? 'delivery',
            shippingAddress: options?.type === 'pickup' ? undefined : options?.shippingAddress ?? shippingAddress,
            items: options?.items ?? [{ productId, quantity: 2, variantIndex: 0 }]
        })
            .expect(201);
        return res.body.data;
    };
    const confirmQuotation = async (token, quotationToken, expectedStatus = 200) => request(app)
        .post(`/api/v1/orders/quotation/${quotationToken}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .expect(expectedStatus);
    it('rejects quotations for configurable products when no variant has been selected', async () => {
        const configurableProduct = await Product.create({
            name: 'Configurable Test Product',
            slug: 'configurable-test-product',
            description: 'A configurable product for testing',
            shortDescription: 'Configurable product',
            price: 1700,
            brandName: 'TestBrand',
            sku: 'MAIN-TEST-CONFIG',
            category: new mongoose.Types.ObjectId(),
            images: [{ url: 'configurable-test.jpg', publicId: 'configurable-test', alt: 'Configurable Test' }],
            variants: [
                { stock: 10, sku: 'TEST-CONFIG-1', color: 'Black' },
                { stock: 8, sku: 'TEST-CONFIG-2', color: 'Silver' }
            ],
            isActive: true
        });
        const user = await registerUser('variant-required@example.com');
        const res = await request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
            items: [{ productId: configurableProduct._id.toString(), quantity: 1 }]
        })
            .expect(400);
        expect(res.body.message).toBe('Select all required options first.');
    }, TEST_TIMEOUT);
    it('creates a quotation successfully without requiring email verification', async () => {
        const user = await registerUser('order@example.com');
        const quotation = await createQuotation(user.token);
        expect(quotation.isQuotation).toBe(true);
        expect(quotation.total).toBe(3300);
        expect(quotation.quotationToken).toBeTruthy();
    }, TEST_TIMEOUT);
    it('sorts customer order listings by latest activity when requested', async () => {
        const user = await registerUser('activity-sorted-orders@example.com');
        const olderCreatedButRecentlyUpdated = await createQuotation(user.token);
        const newerCreatedOrder = await createQuotation(user.token);
        await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(olderCreatedButRecentlyUpdated.id) }, {
            $set: {
                createdAt: new Date('2026-04-01T08:00:00.000Z'),
                updatedAt: new Date('2026-04-09T09:45:00.000Z')
            }
        });
        await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(newerCreatedOrder.id) }, {
            $set: {
                createdAt: new Date('2026-04-08T10:00:00.000Z'),
                updatedAt: new Date('2026-04-08T10:30:00.000Z')
            }
        });
        const res = await request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${user.token}`)
            .query({ page: 1, limit: 2, sortBy: 'activity' })
            .expect(200);
        expect(res.body.data.map((order) => order.id)).toEqual([
            olderCreatedButRecentlyUpdated.id,
            newerCreatedOrder.id
        ]);
    }, TEST_TIMEOUT);
    it('applies configured tax to quotation totals when tax settings are enabled', async () => {
        await StoreSetting.updateOne({}, {
            $set: {
                taxSettings: {
                    enabled: true,
                    label: 'VAT',
                    rate: 18
                }
            }
        });
        const user = await registerUser('taxed-order@example.com');
        const quotation = await createQuotation(user.token);
        expect(quotation.total).toBe(3894);
        const storedOrder = await Order.findById(quotation.id);
        expect(storedOrder?.subtotal).toBe(3000);
        expect(storedOrder?.shippingFee).toBe(300);
        expect(storedOrder?.discount).toBe(0);
        expect(storedOrder?.taxAmount).toBe(594);
        expect(storedOrder?.taxLabel).toBe('VAT');
        expect(storedOrder?.taxRate).toBe(18);
        expect(storedOrder?.total).toBe(3894);
    }, TEST_TIMEOUT);
    it('stores the selected cash on delivery payment method on quotation creation', async () => {
        const user = await registerUser('cod-order@example.com', { verified: true });
        const res = await request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
            paymentMethod: 'cash_on_delivery',
            items: [{ productId, quantity: 1, variantIndex: 0 }]
        })
            .expect(201);
        expect(res.body.data.isQuotation).toBe(true);
        expect(res.body.data.paymentMethod).toBe('cash_on_delivery');
    }, TEST_TIMEOUT);
    it('creates a quotation before fulfilment is chosen and lets the customer confirm it later with delivery details', async () => {
        const user = await registerUser('fulfilment-later@example.com', { verified: true });
        const quotationRes = await request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
            items: [{ productId, quantity: 2, variantIndex: 0 }]
        })
            .expect(201);
        expect(quotationRes.body.data.isQuotation).toBe(true);
        expect(quotationRes.body.data.fulfilmentConfigured).toBe(false);
        expect(quotationRes.body.data.total).toBe(3000);
        const quotationToken = quotationRes.body.data.quotationToken;
        const lookupRes = await request(app)
            .get(`/api/v1/orders/quotation/${quotationToken}`)
            .set('Authorization', `Bearer ${user.token}`)
            .expect(200);
        expect(lookupRes.body.data.id).toBe(quotationRes.body.data.id);
        expect(lookupRes.body.data.fulfilmentConfigured).toBe(false);
        const confirmRes = await request(app)
            .post(`/api/v1/orders/quotation/${quotationToken}/confirm`)
            .set('Authorization', `Bearer ${user.token}`)
            .send({
            paymentMethod: 'cash_on_delivery',
            type: 'delivery',
            shippingAddress
        })
            .expect(200);
        expect(confirmRes.body.data.isQuotation).toBe(false);
        expect(confirmRes.body.data.fulfilmentConfigured).toBe(true);
        expect(confirmRes.body.data.type).toBe('delivery');
        expect(confirmRes.body.data.paymentMethod).toBe('cash_on_delivery');
        expect(confirmRes.body.data.shippingFee).toBe(300);
        expect(confirmRes.body.data.total).toBe(3300);
        expect(confirmRes.body.data.shippingAddress.line1).toBe(shippingAddress.line1);
    }, TEST_TIMEOUT);
    it('requires verified email before confirming a quotation into an order', async () => {
        const user = await registerUser('unverified@example.com');
        const quotation = await createQuotation(user.token);
        const res = await confirmQuotation(user.token, quotation.quotationToken, 403);
        expect(res.body.message).toMatch(/Verify your email/i);
    }, TEST_TIMEOUT);
    it('uploads multiple receipts and removes a single receipt while unpaid', async () => {
        const user = await registerUser('verified@example.com', { verified: true });
        const quotation = await createQuotation(user.token);
        const confirmed = await confirmQuotation(user.token, quotation.quotationToken);
        const orderId = confirmed.body.data.id;
        const uploadRes = await request(app)
            .post(`/api/v1/orders/${orderId}/receipts`)
            .set('Authorization', `Bearer ${user.token}`)
            .attach('receipts', PNG_BUFFER, 'receipt-one.png')
            .attach('receipts', PNG_BUFFER, 'receipt-two.png')
            .expect(200);
        expect(uploadRes.body.data.receipts).toHaveLength(2);
        expect(uploadRes.body.data.paymentStatus).toBe('receipt_uploaded');
        const firstReceiptId = uploadRes.body.data.receipts[0].id;
        const removeRes = await request(app)
            .delete(`/api/v1/orders/${orderId}/receipts/${firstReceiptId}`)
            .set('Authorization', `Bearer ${user.token}`)
            .expect(200);
        expect(removeRes.body.data.receipts).toHaveLength(1);
        expect(removeRes.body.data.paymentStatus).toBe('receipt_uploaded');
    }, TEST_TIMEOUT);
    it('rejects receipt changes after admin marks the order paid', async () => {
        const customer = await registerUser('paid-lock@example.com', { verified: true });
        const admin = await registerUser('admin-paid@example.com', { role: 'admin' });
        const quotation = await createQuotation(customer.token);
        const confirmed = await confirmQuotation(customer.token, quotation.quotationToken);
        const orderId = confirmed.body.data.id;
        await request(app)
            .post(`/api/v1/orders/${orderId}/receipts`)
            .set('Authorization', `Bearer ${customer.token}`)
            .attach('receipts', PNG_BUFFER, 'receipt-paid.png')
            .expect(200);
        const paidRes = await request(app)
            .patch(`/api/v1/admin/orders/${orderId}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ paymentStatus: 'paid' })
            .expect(200);
        expect(paidRes.body.data.paymentStatus).toBe('paid');
        expect(paidRes.body.data.status).toBe('processing');
        const storedOrder = await Order.findById(orderId);
        expect(storedOrder?.paidAt).toBeTruthy();
        const receiptId = paidRes.body.data.receipts[0].id;
        await request(app)
            .post(`/api/v1/orders/${orderId}/receipts`)
            .set('Authorization', `Bearer ${customer.token}`)
            .attach('receipts', PNG_BUFFER, 'receipt-new.png')
            .expect(400);
        await request(app)
            .delete(`/api/v1/orders/${orderId}/receipts/${receiptId}`)
            .set('Authorization', `Bearer ${customer.token}`)
            .expect(400);
    }, TEST_TIMEOUT);
    it('rejects receipt changes after the order is cancelled', async () => {
        const customer = await registerUser('cancel-lock@example.com', { verified: true });
        const quotation = await createQuotation(customer.token);
        const confirmed = await confirmQuotation(customer.token, quotation.quotationToken);
        const orderId = confirmed.body.data.id;
        const uploadRes = await request(app)
            .post(`/api/v1/orders/${orderId}/receipts`)
            .set('Authorization', `Bearer ${customer.token}`)
            .attach('receipts', PNG_BUFFER, 'receipt-cancel.png')
            .expect(200);
        const receiptId = uploadRes.body.data.receipts[0].id;
        await request(app)
            .patch(`/api/v1/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ reason: 'Changed mind' })
            .expect(200);
        await request(app)
            .post(`/api/v1/orders/${orderId}/receipts`)
            .set('Authorization', `Bearer ${customer.token}`)
            .attach('receipts', PNG_BUFFER, 'receipt-after-cancel.png')
            .expect(400);
        await request(app)
            .delete(`/api/v1/orders/${orderId}/receipts/${receiptId}`)
            .set('Authorization', `Bearer ${customer.token}`)
            .expect(400);
    }, TEST_TIMEOUT);
    it('allows admin to mark an order as paid when no receipt exists', async () => {
        const customer = await registerUser('no-receipt@example.com', { verified: true });
        const admin = await registerUser('admin-no-receipt@example.com', { role: 'admin' });
        const quotation = await createQuotation(customer.token);
        const confirmed = await confirmQuotation(customer.token, quotation.quotationToken);
        const orderId = confirmed.body.data.id;
        const res = await request(app)
            .patch(`/api/v1/admin/orders/${orderId}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ paymentStatus: 'paid' })
            .expect(200);
        expect(res.body.data.paymentStatus).toBe('paid');
        expect(res.body.data.status).toBe('processing');
        expect(res.body.data.receipts).toHaveLength(0);
        const storedOrder = await Order.findById(orderId);
        expect(storedOrder?.paidAt).toBeTruthy();
    }, TEST_TIMEOUT);
    it('only exposes the invoice after admin marks the order as paid', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(Buffer.from('mock proxied invoice pdf'), {
            status: 200,
            headers: {
                'content-type': 'application/pdf',
                'content-disposition': 'attachment; filename="invoice-test.pdf"'
            }
        }));
        try {
            const customer = await registerUser('invoice-customer@example.com', { verified: true });
            const admin = await registerUser('invoice-admin@example.com', { role: 'admin' });
            const quotation = await createQuotation(customer.token);
            const confirmed = await confirmQuotation(customer.token, quotation.quotationToken);
            const orderId = confirmed.body.data.id;
            const unpaidInvoiceRes = await request(app)
                .get(`/api/v1/orders/${orderId}/invoice`)
                .set('Authorization', `Bearer ${customer.token}`)
                .expect(403);
            expect(unpaidInvoiceRes.body.message).toMatch(/after admin confirms your payment/i);
            await request(app)
                .post(`/api/v1/orders/${orderId}/receipts`)
                .set('Authorization', `Bearer ${customer.token}`)
                .attach('receipts', PNG_BUFFER, 'receipt-invoice.png')
                .expect(200);
            await request(app)
                .patch(`/api/v1/admin/orders/${orderId}`)
                .set('Authorization', `Bearer ${admin.token}`)
                .send({ paymentStatus: 'paid' })
                .expect(200);
            const paidInvoiceRes = await request(app)
                .get(`/api/v1/orders/${orderId}/invoice`)
                .set('Authorization', `Bearer ${customer.token}`)
                .expect(200);
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/documents/invoices/'));
            expect(paidInvoiceRes.headers['content-type']).toContain('application/pdf');
            expect(paidInvoiceRes.headers['content-disposition']).toContain('invoice-test.pdf');
            expect(Buffer.isBuffer(paidInvoiceRes.body)).toBe(true);
        }
        finally {
            fetchMock.mockRestore();
        }
    }, TEST_TIMEOUT);
    it('allows an email-restricted coupon for the matching account', async () => {
        await Coupon.create({
            code: 'VIPONLY',
            type: 'fixed',
            value: 500,
            minOrderValue: 0,
            restrictToEmail: 'vip@example.com',
            expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            usageLimit: 5,
            usedCount: 0,
            isActive: true
        });
        const customer = await registerUser('vip@example.com', { verified: true });
        const response = await request(app)
            .post('/api/v1/coupons/apply')
            .set('Authorization', `Bearer ${customer.token}`)
            .send({
            code: 'VIPONLY',
            subtotal: 3000,
            shippingFee: 300
        })
            .expect(200);
        expect(response.body.data.code).toBe('VIPONLY');
        expect(response.body.data.discount).toBe(500);
        expect(response.body.data.finalTotal).toBe(2800);
    }, TEST_TIMEOUT);
    it('rejects an email-restricted coupon for a different account', async () => {
        await Coupon.create({
            code: 'VIPONLY',
            type: 'fixed',
            value: 500,
            minOrderValue: 0,
            restrictToEmail: 'vip@example.com',
            expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            usageLimit: 5,
            usedCount: 0,
            isActive: true
        });
        const customer = await registerUser('other-customer@example.com', { verified: true });
        const response = await request(app)
            .post('/api/v1/coupons/apply')
            .set('Authorization', `Bearer ${customer.token}`)
            .send({
            code: 'VIPONLY',
            subtotal: 3000,
            shippingFee: 300
        })
            .expect(400);
        expect(response.body.message).toBe('Coupon is restricted to a different email address');
    }, TEST_TIMEOUT);
    it('restores inventory and coupon usage when a confirmed order is cancelled by the customer', async () => {
        await Coupon.create({
            code: 'SAVE10',
            type: 'percentage',
            value: 10,
            minOrderValue: 0,
            expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            usageLimit: 5,
            usedCount: 0,
            isActive: true
        });
        const customer = await registerUser('coupon-cancel@example.com', { verified: true });
        const quotationRes = await request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${customer.token}`)
            .send({
            type: 'delivery',
            shippingAddress,
            couponCode: 'SAVE10',
            items: [{ productId, quantity: 2, variantIndex: 0 }]
        })
            .expect(201);
        const quotation = quotationRes.body.data;
        const confirmed = await confirmQuotation(customer.token, quotation.quotationToken);
        const orderId = confirmed.body.data.id;
        const productAfterConfirm = await Product.findById(productId);
        const couponAfterConfirm = await Coupon.findOne({ code: 'SAVE10' });
        expect(productAfterConfirm?.variants[0]?.stock).toBe(8);
        expect(productAfterConfirm?.soldCount).toBe(2);
        expect(couponAfterConfirm?.usedCount).toBe(1);
        const usage = await mongoose.model('CouponUsage').countDocuments({ coupon: couponAfterConfirm?._id });
        expect(usage).toBe(1);
        await request(app)
            .patch(`/api/v1/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ reason: 'Need to change the item' })
            .expect(200);
        const productAfterCancel = await Product.findById(productId);
        const couponAfterCancel = await Coupon.findOne({ code: 'SAVE10' });
        expect(productAfterCancel?.variants[0]?.stock).toBe(10);
        expect(productAfterCancel?.soldCount).toBe(0);
        expect(couponAfterCancel?.usedCount).toBe(0);
        const usageAfterCancel = await mongoose.model('CouponUsage').countDocuments({ coupon: couponAfterCancel?._id });
        expect(usageAfterCancel).toBe(0);
    }, TEST_TIMEOUT);
    it('redeems loyalty points when a quotation is confirmed and returns them when the order is cancelled', async () => {
        const customer = await registerUser('loyalty-redeem@example.com', { verified: true });
        await User.findByIdAndUpdate(customer.userId, { loyaltyPoints: 800 });
        const quotationRes = await request(app)
            .post('/api/v1/orders')
            .set('Authorization', `Bearer ${customer.token}`)
            .send({
            type: 'delivery',
            shippingAddress,
            loyaltyPointsToRedeem: 500,
            items: [{ productId, quantity: 2, variantIndex: 0 }]
        })
            .expect(201);
        expect(quotationRes.body.data).toMatchObject({
            isQuotation: true,
            subtotal: 3000,
            shippingFee: 300,
            discount: 0,
            loyaltyPointsRedeemed: 500,
            loyaltyDiscount: 500,
            total: 2800
        });
        const userAfterQuotation = await User.findById(customer.userId);
        expect(userAfterQuotation?.loyaltyPoints).toBe(800);
        const confirmed = await confirmQuotation(customer.token, quotationRes.body.data.quotationToken);
        const orderId = confirmed.body.data.id;
        expect(confirmed.body.data).toMatchObject({
            isQuotation: false,
            loyaltyPointsRedeemed: 500,
            loyaltyDiscount: 500,
            total: 2800
        });
        const userAfterConfirm = await User.findById(customer.userId);
        expect(userAfterConfirm?.loyaltyPoints).toBe(300);
        const redeemedTransaction = await LoyaltyTransaction.findOne({
            user: customer.userId,
            order: orderId,
            type: 'redeemed'
        });
        expect(redeemedTransaction?.points).toBe(-500);
        await request(app)
            .patch(`/api/v1/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ reason: 'Changed plans' })
            .expect(200);
        const userAfterCancel = await User.findById(customer.userId);
        expect(userAfterCancel?.loyaltyPoints).toBe(800);
        const returnedTransaction = await LoyaltyTransaction.findOne({
            user: customer.userId,
            order: orderId,
            type: 'adjusted'
        });
        expect(returnedTransaction?.points).toBe(500);
    }, TEST_TIMEOUT);
    it('refreshes cached product stock and low-stock analytics after confirmation and cancellation', async () => {
        const customer = await registerUser('cache-order-customer@example.com', { verified: true });
        const admin = await registerUser('cache-order-admin@example.com', { role: 'admin' });
        const quotation = await createQuotation(customer.token);
        const initialProduct = await request(app).get('/api/v1/products/test-product').expect(200);
        const initialAnalytics = await request(app)
            .get('/api/v1/admin/analytics')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        expect(initialProduct.body.data.stock).toBe(10);
        expect(initialAnalytics.body.data.lowStockAlerts).toEqual([]);
        const confirmed = await confirmQuotation(customer.token, quotation.quotationToken);
        const orderId = confirmed.body.data.id;
        const productAfterConfirm = await request(app).get('/api/v1/products/test-product').expect(200);
        const analyticsAfterConfirm = await request(app)
            .get('/api/v1/admin/analytics')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        expect(productAfterConfirm.body.data.stock).toBe(8);
        expect(analyticsAfterConfirm.body.data.lowStockAlerts).toEqual(expect.arrayContaining([
            expect.objectContaining({
                productId,
                variantSku: 'TEST-1',
                stock: 8
            })
        ]));
        await request(app)
            .patch(`/api/v1/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ reason: 'Cache refresh verification' })
            .expect(200);
        const productAfterCancel = await request(app).get('/api/v1/products/test-product').expect(200);
        const analyticsAfterCancel = await request(app)
            .get('/api/v1/admin/analytics')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        expect(productAfterCancel.body.data.stock).toBe(10);
        expect(analyticsAfterCancel.body.data.lowStockAlerts).toEqual([]);
    }, TEST_TIMEOUT);
    it('refreshes cached product stock and low-stock analytics after admin cancellation', async () => {
        const customer = await registerUser('cache-admin-cancel-customer@example.com', { verified: true });
        const admin = await registerUser('cache-admin-cancel-admin@example.com', { role: 'admin' });
        const quotation = await createQuotation(customer.token);
        const confirmed = await confirmQuotation(customer.token, quotation.quotationToken);
        const orderId = confirmed.body.data.id;
        const warmedProduct = await request(app).get('/api/v1/products/test-product').expect(200);
        const warmedAnalytics = await request(app)
            .get('/api/v1/admin/analytics')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        expect(warmedProduct.body.data.stock).toBe(8);
        expect(warmedAnalytics.body.data.lowStockAlerts).toEqual(expect.arrayContaining([
            expect.objectContaining({
                productId,
                variantSku: 'TEST-1',
                stock: 8
            })
        ]));
        await request(app)
            .patch(`/api/v1/admin/orders/${orderId}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ status: 'cancelled', reason: 'Admin cache refresh verification' })
            .expect(200);
        const productAfterCancel = await request(app).get('/api/v1/products/test-product').expect(200);
        const analyticsAfterCancel = await request(app)
            .get('/api/v1/admin/analytics')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        expect(productAfterCancel.body.data.stock).toBe(10);
        expect(analyticsAfterCancel.body.data.lowStockAlerts).toEqual([]);
    }, TEST_TIMEOUT);
    it('keeps quotations out of admin order management', async () => {
        const customer = await registerUser('admin-quotation-customer@example.com');
        const admin = await registerUser('admin-quotation-admin@example.com', { role: 'admin' });
        const quotation = await createQuotation(customer.token);
        const listRes = await request(app)
            .get('/api/v1/admin/orders')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        expect(listRes.body.data.some((entry) => entry.id === quotation.id)).toBe(false);
        const updateRes = await request(app)
            .patch(`/api/v1/admin/orders/${quotation.id}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ status: 'cancelled', reason: 'Invalid quote' })
            .expect(400);
        expect(updateRes.body.message).toMatch(/Quotations cannot be managed/i);
    }, TEST_TIMEOUT);
    it('includes customer details in the admin order list response', async () => {
        const customer = await registerUser('admin-order-customer@example.com', { verified: true });
        const admin = await registerUser('admin-order-viewer@example.com', { role: 'admin' });
        await User.findByIdAndUpdate(customer.userId, {
            name: 'Nisal Jureanz',
            phone: '+94 77 123 4567'
        });
        const quotation = await createQuotation(customer.token);
        await confirmQuotation(customer.token, quotation.quotationToken);
        const listRes = await request(app)
            .get('/api/v1/admin/orders')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        const order = listRes.body.data.find((entry) => entry.orderNumber.startsWith('ORD-'));
        expect(order).toMatchObject({
            customer: {
                name: 'Nisal Jureanz',
                email: 'admin-order-customer@example.com',
                phone: '+94 77 123 4567',
                isEmailVerified: true
            }
        });
    }, TEST_TIMEOUT);
    it('lets admins create a manual delivery order with customer and fulfilment details', async () => {
        const admin = await registerUser('manual-order-admin@example.com', { role: 'admin' });
        const assignee = await registerUser('manual-order-assignee@example.com', { role: 'staff' });
        await User.findByIdAndUpdate(assignee.userId, {
            name: 'Manual Fulfilment'
        });
        const createRes = await request(app)
            .post('/api/v1/admin/orders')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            customerName: 'Manual Customer',
            customerEmail: 'manual-customer@example.com',
            customerPhone: '0779998888',
            type: 'delivery',
            paymentMethod: 'bank_transfer',
            paymentStatus: 'paid',
            status: 'processing',
            assignedToId: assignee.userId,
            shippingFee: 250,
            discount: 100,
            notes: 'Counter sale',
            deliveryNotes: 'Call before arrival',
            shippingAddress: {
                ...shippingAddress,
                fullName: 'Manual Customer',
                phone: '0779998888'
            },
            items: [{ productId, quantity: 2, variantIndex: 0 }]
        })
            .expect(201);
        const manualOrder = createRes.body.data;
        expect(manualOrder).toMatchObject({
            isQuotation: false,
            type: 'delivery',
            status: 'processing',
            paymentStatus: 'paid',
            paymentMethod: 'bank_transfer',
            subtotal: 3000,
            shippingFee: 250,
            discount: 100,
            taxAmount: 0,
            total: 3150,
            notes: 'Counter sale',
            deliveryNotes: 'Call before arrival',
            shippingAddress: expect.objectContaining({
                fullName: 'Manual Customer',
                phone: '0779998888',
                city: 'Colombo'
            })
        });
        expect(manualOrder.items).toHaveLength(1);
        expect(manualOrder.items[0]).toMatchObject({
            product: productId,
            quantity: 2,
            price: 1500,
            sku: 'TEST-1'
        });
        const storedCustomer = await User.findOne({ email: 'manual-customer@example.com' });
        expect(storedCustomer).toMatchObject({
            name: 'Manual Customer',
            phone: '0779998888',
            isEmailVerified: true
        });
        const productAfterCreate = await Product.findById(productId);
        expect(productAfterCreate?.variants[0]?.stock).toBe(8);
        const listRes = await request(app)
            .get('/api/v1/admin/orders')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        const listedOrder = listRes.body.data.find((entry) => entry.id === manualOrder.id);
        expect(listedOrder).toMatchObject({
            customer: {
                name: 'Manual Customer',
                email: 'manual-customer@example.com',
                phone: '0779998888',
                isEmailVerified: true
            },
            assignedTo: {
                id: assignee.userId,
                name: 'Manual Fulfilment',
                email: 'manual-order-assignee@example.com'
            }
        });
    }, TEST_TIMEOUT);
    it('lets admins assign an order to active staff and exposes the assignee in the admin order list response', async () => {
        const customer = await registerUser('admin-assignment-customer@example.com', { verified: true });
        const admin = await registerUser('admin-assignment-manager@example.com', { role: 'admin' });
        const assignee = await registerUser('admin-assignment-assignee@example.com', { role: 'staff' });
        await User.findByIdAndUpdate(assignee.userId, {
            name: 'Fulfilment Lead'
        });
        const quotation = await createQuotation(customer.token);
        const confirmed = await confirmQuotation(customer.token, quotation.quotationToken);
        const orderId = confirmed.body.data.id;
        await request(app)
            .patch(`/api/v1/admin/orders/${orderId}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ assignedToId: assignee.userId })
            .expect(200);
        const listRes = await request(app)
            .get('/api/v1/admin/orders')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        const order = listRes.body.data.find((entry) => entry.id === orderId);
        expect(order).toMatchObject({
            assignedTo: {
                id: assignee.userId,
                name: 'Fulfilment Lead',
                email: 'admin-assignment-assignee@example.com'
            }
        });
    }, TEST_TIMEOUT);
    it('sends a shipping notification email once an order has been shipped', async () => {
        const customer = await registerUser('shipping-notification-customer@example.com', { verified: true });
        const admin = await registerUser('shipping-notification-admin@example.com', { role: 'admin' });
        const quotation = await createQuotation(customer.token);
        const confirmed = await confirmQuotation(customer.token, quotation.quotationToken);
        const orderId = confirmed.body.data.id;
        await request(app)
            .post(`/api/v1/orders/${orderId}/receipts`)
            .set('Authorization', `Bearer ${customer.token}`)
            .attach('receipts', PNG_BUFFER, 'receipt-shipping-email.png')
            .expect(200);
        await request(app)
            .patch(`/api/v1/admin/orders/${orderId}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ paymentStatus: 'paid' })
            .expect(200);
        await request(app)
            .patch(`/api/v1/admin/orders/${orderId}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ status: 'shipped', trackingNumber: 'SHIP-9001' })
            .expect(200);
        const notificationRes = await request(app)
            .post(`/api/v1/admin/orders/${orderId}/notifications/shipping`)
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        const updatedOrder = await request(app)
            .get('/api/v1/admin/orders')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        const order = updatedOrder.body.data.find((entry) => entry.id === orderId);
        expect(notificationRes.body.message).toMatch(/Shipping notification sent/i);
        expect(notificationRes.body.data).toMatchObject({
            recipient: 'shipping-notification-customer@example.com',
            trackingNumber: 'SHIP-9001'
        });
        expect(order.timeline.some((entry) => /Shipping notification sent to customer/i.test(entry.note))).toBe(true);
    }, TEST_TIMEOUT);
    it('merges two compatible orders from the same customer into the kept order', async () => {
        const customer = await registerUser('merge-orders-customer@example.com', { verified: true });
        const admin = await registerUser('merge-orders-admin@example.com', { role: 'admin' });
        const firstQuotation = await createQuotation(customer.token, {
            items: [{ productId, quantity: 1, variantIndex: 0 }]
        });
        const secondQuotation = await createQuotation(customer.token, {
            items: [{ productId, quantity: 2, variantIndex: 0 }]
        });
        const firstOrder = await confirmQuotation(customer.token, firstQuotation.quotationToken);
        const secondOrder = await confirmQuotation(customer.token, secondQuotation.quotationToken);
        const keepOrderId = firstOrder.body.data.id;
        const mergeOrderId = secondOrder.body.data.id;
        const mergeRes = await request(app)
            .post('/api/v1/admin/orders/merge')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ keepOrderId, mergeOrderId })
            .expect(200);
        const listRes = await request(app)
            .get('/api/v1/admin/orders')
            .set('Authorization', `Bearer ${admin.token}`)
            .expect(200);
        const keptOrder = listRes.body.data.find((entry) => entry.id === keepOrderId);
        const removedOrder = listRes.body.data.find((entry) => entry.id === mergeOrderId);
        expect(mergeRes.body.message).toMatch(/Orders merged/i);
        expect(keptOrder).toMatchObject({
            id: keepOrderId,
            subtotal: 4500,
            shippingFee: 300,
            total: 4800,
            paymentStatus: 'unpaid',
            status: 'pending'
        });
        expect(keptOrder.items).toHaveLength(2);
        expect(removedOrder).toBeUndefined();
    }, TEST_TIMEOUT);
    it('grants loyalty points and records the loyalty transaction when an order is delivered', async () => {
        const customer = await registerUser('delivery-loyalty@example.com', { verified: true });
        const admin = await registerUser('delivery-loyalty-admin@example.com', { role: 'admin' });
        const quotation = await createQuotation(customer.token);
        const confirmed = await confirmQuotation(customer.token, quotation.quotationToken);
        const orderId = confirmed.body.data.id;
        await request(app)
            .post(`/api/v1/orders/${orderId}/receipts`)
            .set('Authorization', `Bearer ${customer.token}`)
            .attach('receipts', PNG_BUFFER, 'receipt-delivered.png')
            .expect(200);
        await request(app)
            .patch(`/api/v1/admin/orders/${orderId}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ paymentStatus: 'paid' })
            .expect(200);
        await request(app)
            .patch(`/api/v1/admin/orders/${orderId}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ status: 'shipped', trackingNumber: 'TRACK-123' })
            .expect(200);
        const deliveredRes = await request(app)
            .patch(`/api/v1/admin/orders/${orderId}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ status: 'delivered' })
            .expect(200);
        const updatedUser = await User.findById(customer.userId);
        const transactions = await LoyaltyTransaction.find({ user: customer.userId, order: orderId });
        expect(deliveredRes.body.data.status).toBe('delivered');
        expect(updatedUser?.loyaltyPoints).toBeGreaterThan(0);
        expect(transactions).toHaveLength(1);
        expect(transactions[0]?.points).toBe(updatedUser?.loyaltyPoints);
    }, TEST_TIMEOUT);
});
