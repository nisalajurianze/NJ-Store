import { expect, test, type APIRequestContext } from '@playwright/test';

interface ProductCard {
  id: string;
  slug: string;
  stock?: number;
}

const firstAvailableProduct = async (request: APIRequestContext): Promise<ProductCard | null> => {
  const response = await request.get('/api/v1/products?limit=12&inStock=true');
  expect(response.ok()).toBeTruthy();

  const products = (await response.json()).data as ProductCard[];
  return products.find((product) => (product.stock ?? 0) > 0) ?? products[0] ?? null;
};

test.describe('cart operations', () => {
  test('adds, updates, removes, and clears a guest cart item', async ({ request }) => {
    const product = await firstAvailableProduct(request);
    test.skip(!product, 'No seeded products are available for cart coverage.');

    const addResponse = await request.post('/api/v1/cart', {
      data: {
        productId: product!.id,
        quantity: 1
      }
    });
    expect(addResponse.status()).toBe(201);
    const addedCart = (await addResponse.json()).data;
    expect(addedCart.itemCount).toBe(1);

    const itemId = addedCart.items[0].id as string;
    const updateResponse = await request.put(`/api/v1/cart/${itemId}`, {
      data: {
        quantity: 2
      }
    });
    expect(updateResponse.ok()).toBeTruthy();
    expect((await updateResponse.json()).data.itemCount).toBe(2);

    const removeResponse = await request.delete(`/api/v1/cart/${itemId}`);
    expect(removeResponse.ok()).toBeTruthy();
    expect((await removeResponse.json()).data.itemCount).toBe(0);

    const clearResponse = await request.delete('/api/v1/cart');
    expect(clearResponse.ok()).toBeTruthy();
  });
});
