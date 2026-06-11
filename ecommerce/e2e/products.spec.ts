import { expect, test, type APIRequestContext } from '@playwright/test';

interface ProductCard {
  id: string;
  name: string;
  slug: string;
  stock?: number;
}

const listProducts = async (request: APIRequestContext): Promise<ProductCard[]> => {
  const response = await request.get('/api/v1/products?limit=12&inStock=true');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
  return body.data as ProductCard[];
};

test.describe('product catalog', () => {
  test('lists products with pagination metadata and serves search suggestions', async ({ request }) => {
    const response = await request.get('/api/v1/products?limit=8');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toMatchObject({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number)
    });

    const suggestionsResponse = await request.get('/api/v1/products/suggestions?q=galaxy');
    expect(suggestionsResponse.ok()).toBeTruthy();
    expect(Array.isArray((await suggestionsResponse.json()).data)).toBe(true);
  });

  test('serves a product detail page for listed products', async ({ request }) => {
    const products = await listProducts(request);
    test.skip(products.length === 0, 'No seeded products are available for detail coverage.');

    const detailResponse = await request.get(`/api/v1/products/${products[0]!.slug}`);
    expect(detailResponse.ok()).toBeTruthy();

    const detailBody = await detailResponse.json();
    expect(detailBody.data).toMatchObject({
      id: products[0]!.id,
      slug: products[0]!.slug,
      name: expect.any(String)
    });
    expect(Array.isArray(detailBody.data.variants)).toBe(true);
  });
});
