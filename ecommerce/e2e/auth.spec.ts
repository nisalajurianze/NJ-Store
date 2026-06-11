import { expect, test } from '@playwright/test';

const uniqueEmail = (): string => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

test.describe('auth flow', () => {
  test('registers, logs in, refreshes, issues a socket ticket, and logs out', async ({ request }) => {
    const email = uniqueEmail();
    const password = 'Password@123';

    const registerResponse = await request.post('/api/v1/auth/register', {
      data: {
        name: 'E2E Customer',
        email,
        password,
        language: 'en'
      }
    });

    expect(registerResponse.status()).toBe(201);
    expect((await registerResponse.json()).data.tokens.accessToken).toEqual(expect.any(String));

    const logoutAfterRegister = await request.post('/api/v1/auth/logout');
    expect(logoutAfterRegister.ok()).toBeTruthy();

    const loginResponse = await request.post('/api/v1/auth/login', {
      data: {
        email,
        password
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginBody = await loginResponse.json();
    const loginToken = loginBody.data.tokens.accessToken as string;

    expect(loginBody.data.user.email).toBe(email);
    expect(loginToken).toEqual(expect.any(String));

    const refreshResponse = await request.post('/api/v1/auth/refresh');
    expect(refreshResponse.ok()).toBeTruthy();
    const refreshBody = await refreshResponse.json();
    const refreshedToken = refreshBody.data.tokens.accessToken as string;

    expect(refreshedToken).toEqual(expect.any(String));

    const meResponse = await request.get('/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${refreshedToken}`
      }
    });
    expect(meResponse.ok()).toBeTruthy();
    expect((await meResponse.json()).data.user.email).toBe(email);

    const socketTicketResponse = await request.post('/api/v1/auth/socket-ticket', {
      headers: {
        Authorization: `Bearer ${refreshedToken}`
      }
    });
    expect(socketTicketResponse.status()).toBe(201);
    expect(await socketTicketResponse.json()).toMatchObject({
      success: true,
      data: {
        ticket: expect.any(String),
        expiresIn: 30
      }
    });

    const logoutResponse = await request.post('/api/v1/auth/logout');
    expect(logoutResponse.ok()).toBeTruthy();
  });
});
