import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../app.js';
import { sendEmail } from '../services/emailService.js';
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

describe('Contact form security', () => {
  it(
    'sends valid messages but silently drops honeypot submissions',
    async () => {
      await request(app)
        .post('/api/v1/contact')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          message: 'I need help with a quotation for office equipment.'
        })
        .expect(200);

      expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);

      await request(app)
        .post('/api/v1/contact')
        .send({
          name: 'Spam Bot',
          email: 'spam@example.com',
          message: 'This should look valid to the public response.',
          website: 'https://spam.example'
        })
        .expect(200);

      expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
    },
    TEST_TIMEOUT
  );
});
