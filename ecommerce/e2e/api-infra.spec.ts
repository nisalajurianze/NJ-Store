import { expect, test } from '@playwright/test';

test.describe('API infrastructure', () => {
  test('serves the health endpoint', async ({ request }) => {
    const response = await request.get('/api/v1/health');

    expect(response.ok()).toBeTruthy();

    const body = await response.json();

    expect(body).toMatchObject({
      success: true,
      data: {
        status: 'ok'
      }
    });
    expect(typeof body.data.uptime).toBe('number');
  });

  test('serves the OpenAPI JSON document', async ({ request }) => {
    const response = await request.get('/api/v1/docs.json');

    expect(response.ok()).toBeTruthy();

    const body = await response.json();

    expect(body.openapi).toBe('3.0.3');
    expect(body.info.title).toBe('NJ Store API');
    expect(body.paths['/health']).toBeDefined();
  });

  test('serves the Swagger UI', async ({ request }) => {
    const response = await request.get('/api/v1/docs/');

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('text/html');
    expect(await response.text()).toContain('swagger-ui');
  });
});
