import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { notificationAdminService } from '../services/admin/notificationAdminService.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';
const TEST_TIMEOUT = 40000;
const password = 'Password123!';
const orderReadPermissions = ['order:read'];
beforeAll(async () => {
    await setupTestDB();
}, TEST_TIMEOUT);
afterAll(async () => {
    await teardownTestDB();
}, TEST_TIMEOUT);
beforeEach(async () => {
    await clearTestDB();
});
const createAdmin = async (email) => User.create({
    name: 'Admin User',
    email,
    password,
    role: 'admin',
    isEmailVerified: true,
    permissions: orderReadPermissions
});
const createPendingOrder = async (userId, orderNumber) => Order.create({
    user: userId,
    orderNumber,
    isQuotation: false,
    type: 'delivery',
    paymentMethod: 'bank_transfer',
    status: 'pending',
    paymentStatus: 'unpaid',
    subtotal: 1000,
    shippingFee: 0,
    discount: 0,
    taxAmount: 0,
    total: 1000,
    shippingAddress: {
        label: 'Home',
        fullName: 'Customer',
        phone: '0771234567',
        line1: '123 Main St',
        city: 'Colombo',
        district: 'Colombo',
        postalCode: '00100',
        country: 'Sri Lanka'
    },
    items: [
        {
            product: new mongoose.Types.ObjectId(),
            name: 'Test Product',
            slug: 'test-product',
            quantity: 1,
            price: 1000,
            sku: 'TEST-1'
        }
    ]
});
describe('admin notification center', () => {
    it('hides a viewed alert for that admin until the alert fingerprint changes', async () => {
        const admin = await createAdmin('admin@example.com');
        const otherAdmin = await createAdmin('other-admin@example.com');
        const customer = await User.create({
            name: 'Customer User',
            email: 'customer@example.com',
            password,
            isEmailVerified: true
        });
        await createPendingOrder(customer._id, 'ORD-1');
        const initialCenter = await notificationAdminService.getCenter(orderReadPermissions, admin._id.toString());
        expect(initialCenter.items.find((item) => item.id === 'pending-orders')?.count).toBe(1);
        const viewedCenter = await notificationAdminService.markViewed(orderReadPermissions, admin._id.toString(), 'pending-orders');
        expect(viewedCenter.items.some((item) => item.id === 'pending-orders')).toBe(false);
        expect(viewedCenter.totalCount).toBe(0);
        const otherAdminCenter = await notificationAdminService.getCenter(orderReadPermissions, otherAdmin._id.toString());
        expect(otherAdminCenter.items.find((item) => item.id === 'pending-orders')?.count).toBe(1);
        await createPendingOrder(customer._id, 'ORD-2');
        const refreshedCenter = await notificationAdminService.getCenter(orderReadPermissions, admin._id.toString());
        expect(refreshedCenter.items.find((item) => item.id === 'pending-orders')?.count).toBe(2);
    });
});
