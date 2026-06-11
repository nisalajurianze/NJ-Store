import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { AdminPermission } from '@njstore/types';
import app from '../app.js';
import { User } from '../models/User.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';

const TEST_TIMEOUT = 40000;
const password = 'Password123!';

const registerAdmin = async (email: string, permissions: AdminPermission[]) => {
  await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'User Admin',
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
    token: loginRes.body.data.tokens.accessToken as string
  };
};

const registerCustomer = async (email: string) => {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Customer User',
      email,
      password,
      passwordConfirm: password
    })
    .expect(201);

  return response.body.data.user.id as string;
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

describe('Admin user routes', () => {
  it(
    'returns recent login history with IP and device details',
    async () => {
      const admin = await registerAdmin('user-auditor@example.com', ['user:read']);
      const customerId = await registerCustomer('history-customer@example.com');

      await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Codex Browser 1.0 (Macintosh)')
        .set('X-Forwarded-For', '203.0.113.42')
        .send({
          email: 'history-customer@example.com',
          password,
          rememberMe: true
        })
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/admin/users/${customerId}/login-history`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        method: 'password',
        ipAddress: '203.0.113.42',
        userAgent: 'Codex Browser 1.0 (Macintosh)',
        rememberMe: true
      });
      expect(new Date(response.body.data[0].createdAt).toString()).not.toBe('Invalid Date');
    },
    TEST_TIMEOUT
  );

  it(
    'requires user read access to view login history',
    async () => {
      const admin = await registerAdmin('product-only-admin@example.com', ['product:read']);
      const customerId = await registerCustomer('hidden-history@example.com');

      await request(app)
        .get(`/api/v1/admin/users/${customerId}/login-history`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(403);
    },
    TEST_TIMEOUT
  );
});
