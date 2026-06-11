import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
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
describe('Admin permissions', () => {
    const password = 'Password123!';
    const registerAdmin = async (email, permissions) => {
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
        if (permissions) {
            user.permissions = permissions;
        }
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
    it('enforces route permissions and picks up updated permissions without reissuing the access token', async () => {
        const superAdmin = await registerAdmin('super-admin@example.com');
        const limitedAdmin = await registerAdmin('limited-admin@example.com', ['product:read']);
        await request(app)
            .get('/api/v1/admin/products')
            .set('Authorization', `Bearer ${limitedAdmin.token}`)
            .expect(200);
        await request(app)
            .get('/api/v1/admin/users')
            .set('Authorization', `Bearer ${limitedAdmin.token}`)
            .expect(403);
        await request(app)
            .patch(`/api/v1/admin/users/${limitedAdmin.id}`)
            .set('Authorization', `Bearer ${superAdmin.token}`)
            .send({ role: 'admin', permissions: ['user:read'] })
            .expect(200);
        await request(app)
            .get('/api/v1/admin/users')
            .set('Authorization', `Bearer ${limitedAdmin.token}`)
            .expect(200);
        await request(app)
            .get('/api/v1/admin/products')
            .set('Authorization', `Bearer ${limitedAdmin.token}`)
            .expect(403);
    }, TEST_TIMEOUT);
    it('returns analytics successfully for an admin with the required read permissions', async () => {
        const analyticsAdmin = await registerAdmin('analytics-admin@example.com', ['order:read', 'product:read', 'user:read']);
        const res = await request(app)
            .get('/api/v1/admin/analytics')
            .set('Authorization', `Bearer ${analyticsAdmin.token}`)
            .expect(200);
        expect(res.body.data.kpis).toHaveLength(4);
        expect(res.body.data.revenue).toHaveLength(30);
        expect(res.body.data.monthlySales).toHaveLength(12);
        expect(res.body.data.statusBreakdown).toHaveLength(5);
        expect(Array.isArray(res.body.data.customerGrowth)).toBe(true);
    }, TEST_TIMEOUT);
    it('requires user read access for audit logs', async () => {
        const productAdmin = await registerAdmin('product-admin@example.com', ['product:read']);
        const securityAdmin = await registerAdmin('security-admin@example.com', ['user:read']);
        await request(app)
            .get('/api/v1/admin/audit-logs')
            .set('Authorization', `Bearer ${productAdmin.token}`)
            .expect(403);
        const res = await request(app)
            .get('/api/v1/admin/audit-logs')
            .set('Authorization', `Bearer ${securityAdmin.token}`)
            .expect(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    }, TEST_TIMEOUT);
    it('exports filtered audit logs as csv for admins with user read access', async () => {
        const productAdmin = await registerAdmin('audit-product-admin@example.com', ['product:read']);
        const securityAdmin = await registerAdmin('audit-security-admin@example.com', ['user:read']);
        await AuditLog.create({
            actorEmail: 'buyer@example.com',
            actorRole: 'customer',
            action: 'order.cancel',
            targetType: 'order',
            targetId: 'order-1',
            targetLabel: 'Order ORD-1001',
            status: 'blocked',
            message: 'Order cancellation blocked pending payment review.',
            ipAddress: '203.0.113.10',
            userAgent: 'Codex Browser 1.0'
        });
        await request(app)
            .get('/api/v1/admin/audit-logs/export')
            .query({ status: 'blocked', actorRole: 'customer' })
            .set('Authorization', `Bearer ${productAdmin.token}`)
            .expect(403);
        const res = await request(app)
            .get('/api/v1/admin/audit-logs/export')
            .query({ status: 'blocked', actorRole: 'customer' })
            .set('Authorization', `Bearer ${securityAdmin.token}`)
            .expect(200);
        expect(res.headers['content-type']).toMatch(/text\/csv/);
        expect(res.headers['content-disposition']).toMatch(/attachment; filename=audit-logs-\d{4}-\d{2}-\d{2}\.csv/);
        expect(res.text).toContain('"Actor Email"');
        expect(res.text).toContain('"buyer@example.com"');
        expect(res.text).toContain('"203.0.113.10"');
        expect(res.text).not.toContain('admin.audit.export');
        const exportEntry = await AuditLog.findOne({ action: 'admin.audit.export' }).sort({ createdAt: -1 }).lean();
        expect(exportEntry).toBeTruthy();
        expect(exportEntry).toMatchObject({
            actorEmail: 'audit-security-admin@example.com',
            actorRole: 'admin',
            targetType: 'audit_log',
            targetId: 'csv',
            status: 'success'
        });
        expect(exportEntry?.metadata).toMatchObject({
            exportedCount: 1,
            status: 'blocked',
            actorRole: 'customer'
        });
    }, TEST_TIMEOUT);
    it('allows an admin to safely restore their own user write permission after removing it', async () => {
        const selfManagedAdmin = await registerAdmin('self-managed-admin@example.com', ['product:read', 'user:read']);
        const res = await request(app)
            .patch(`/api/v1/admin/users/${selfManagedAdmin.id}`)
            .set('Authorization', `Bearer ${selfManagedAdmin.token}`)
            .send({
            role: 'admin',
            permissions: ['product:read', 'user:read', 'user:write']
        })
            .expect(200);
        expect(res.body.data.permissions).toEqual(['product:read', 'user:read', 'user:write']);
    }, TEST_TIMEOUT);
    it('prevents an admin from removing their own user-management permissions', async () => {
        const selfManagedAdmin = await registerAdmin('self-lockout-admin@example.com', ['product:read', 'user:read', 'user:write']);
        const res = await request(app)
            .patch(`/api/v1/admin/users/${selfManagedAdmin.id}`)
            .set('Authorization', `Bearer ${selfManagedAdmin.token}`)
            .send({
            role: 'admin',
            permissions: ['product:read', 'user:read']
        })
            .expect(400);
        expect(res.body.message).toMatch(/must keep user view and edit access/i);
    }, TEST_TIMEOUT);
});
