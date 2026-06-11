import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Category } from '../models/Category.js';
import { User } from '../models/User.js';
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

const registerAdmin = async (email: string) => {
  await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Category Admin',
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
  user.permissions = ['category:read', 'category:write'];
  await user.save();

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    token: loginRes.body.data.tokens.accessToken as string
  };
};

describe('Admin category routes', () => {
  it(
    'creates SEO-ready categories, updates child metadata, and returns a nested tree',
    async () => {
      const admin = await registerAdmin('category-admin-routes@example.com');

      const parentResponse = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: 'Phones',
          description: 'Smartphones and feature phones',
          metaTitle: 'Phones | NJ Store',
          metaDescription: 'Browse smartphones and feature phones at NJ Store.',
          isActive: true,
          order: 0
        })
        .expect(201);

      const parentId = parentResponse.body.data.id as string;
      expect(parentResponse.body.data.metaTitle).toBe('Phones | NJ Store');
      expect(parentResponse.body.data.metaDescription).toBe('Browse smartphones and feature phones at NJ Store.');

      const childResponse = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: 'Cases',
          description: 'Protective cases',
          parent: parentId,
          isActive: true,
          order: 0
        })
        .expect(201);

      const childId = childResponse.body.data.id as string;
      expect(childResponse.body.data.parent).toBe(parentId);

      const updateResponse = await request(app)
        .patch(`/api/v1/admin/categories/${childId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          metaTitle: 'Phone Cases | NJ Store',
          metaDescription: 'Protective phone cases and covers for popular devices.',
          order: 1
        })
        .expect(200);

      expect(updateResponse.body.data.metaTitle).toBe('Phone Cases | NJ Store');
      expect(updateResponse.body.data.metaDescription).toBe('Protective phone cases and covers for popular devices.');
      expect(updateResponse.body.data.order).toBe(1);

      const listResponse = await request(app)
        .get('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(listResponse.body.data).toHaveLength(1);
      expect(listResponse.body.data[0]).toMatchObject({
        id: parentId,
        name: 'Phones',
        metaTitle: 'Phones | NJ Store',
        metaDescription: 'Browse smartphones and feature phones at NJ Store.',
        children: [
          expect.objectContaining({
            id: childId,
            name: 'Cases',
            parent: parentId,
            metaTitle: 'Phone Cases | NJ Store',
            metaDescription: 'Protective phone cases and covers for popular devices.',
            order: 1
          })
        ]
      });

      const storedChild = await Category.findById(childId).lean();
      expect(storedChild?.metaTitle).toBe('Phone Cases | NJ Store');
      expect(storedChild?.metaDescription).toBe('Protective phone cases and covers for popular devices.');
    },
    TEST_TIMEOUT
  );
});
