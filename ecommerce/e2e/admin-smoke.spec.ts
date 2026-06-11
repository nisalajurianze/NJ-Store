import { expect, test, type APIRequestContext } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@njstore.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? 'Password@123';

const loginAsSeedAdmin = async (request: APIRequestContext): Promise<string> => {
  const passwordResponse = await request.post('/api/v1/auth/login', {
    data: {
      email: adminEmail,
      password: adminPassword
    }
  });

  const response = passwordResponse.ok()
    ? passwordResponse
    : await request.post('/api/v1/auth/google', {
        data: {
          credential: `dev:${adminEmail}:Admin User`
        }
      });

  const body = await response.json();
  test.skip(
    !response.ok() || body.data?.user?.role !== 'admin',
    'No seeded admin account is available for admin smoke coverage.'
  );
  expect(body.data.user).toMatchObject({
    email: adminEmail,
    role: 'admin'
  });

  return body.data.tokens.accessToken as string;
};

test.describe('admin smoke', () => {
  test('allows a seeded admin to load core admin resources', async ({ request }) => {
    const token = await loginAsSeedAdmin(request);
    const headers = {
      Authorization: `Bearer ${token}`
    };

    const [analyticsResponse, productsResponse, usersResponse, categoriesResponse, socketTicketResponse] = await Promise.all([
      request.get('/api/v1/admin/analytics?period=30d', { headers }),
      request.get('/api/v1/admin/products?limit=5', { headers }),
      request.get('/api/v1/admin/users?limit=5', { headers }),
      request.get('/api/v1/admin/categories', { headers }),
      request.post('/api/v1/auth/socket-ticket', { headers })
    ]);

    expect(analyticsResponse.ok()).toBeTruthy();
    expect((await analyticsResponse.json()).data).toEqual(expect.any(Object));

    expect(productsResponse.ok()).toBeTruthy();
    const productsBody = await productsResponse.json();
    expect(Array.isArray(productsBody.data)).toBe(true);
    expect(productsBody.pagination).toMatchObject({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number)
    });

    expect(usersResponse.ok()).toBeTruthy();
    expect(Array.isArray((await usersResponse.json()).data)).toBe(true);

    expect(categoriesResponse.ok()).toBeTruthy();
    expect(Array.isArray((await categoriesResponse.json()).data)).toBe(true);

    expect(socketTicketResponse.status()).toBe(201);
    expect((await socketTicketResponse.json()).data.ticket).toEqual(expect.any(String));
  });
});
