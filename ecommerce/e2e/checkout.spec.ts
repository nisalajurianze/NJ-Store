import { expect, test, type APIRequestContext } from '@playwright/test';

const uniqueEmail = (): string => `checkout-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

interface ProductCard {
  id: string;
  stock?: number;
}

const registerCustomer = async (request: APIRequestContext): Promise<string> => {
  const response = await request.post('/api/v1/auth/google', {
    data: {
      credential: `dev:${uniqueEmail()}:Checkout Customer`
    }
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()).data.tokens.accessToken as string;
};

const firstAvailableProduct = async (request: APIRequestContext): Promise<ProductCard | null> => {
  const response = await request.get('/api/v1/products?limit=12&inStock=true');
  expect(response.ok()).toBeTruthy();

  const products = (await response.json()).data as ProductCard[];
  return products.find((product) => (product.stock ?? 0) > 0) ?? products[0] ?? null;
};

test.describe('checkout flow', () => {
  test('creates a pickup quotation, confirms it, and uploads a receipt', async ({ request }) => {
    const product = await firstAvailableProduct(request);
    test.skip(!product, 'No seeded products are available for checkout coverage.');

    const accessToken = await registerCustomer(request);
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`
    };

    const quotationResponse = await request.post('/api/v1/orders', {
      headers: authHeaders,
      data: {
        type: 'pickup',
        pickupSlot: '2026-05-04 10:00',
        items: [
          {
            productId: product!.id,
            quantity: 1
          }
        ]
      }
    });

    expect(quotationResponse.status()).toBe(201);
    const quotation = (await quotationResponse.json()).data;
    expect(quotation.isQuotation).toBe(true);
    expect(quotation.quotationToken).toEqual(expect.any(String));

    const confirmResponse = await request.post(`/api/v1/orders/quotation/${quotation.quotationToken}/confirm`, {
      headers: authHeaders,
      data: {}
    });

    expect(confirmResponse.ok()).toBeTruthy();
    const confirmedOrder = (await confirmResponse.json()).data;
    expect(confirmedOrder.isQuotation).toBe(false);

    const receiptResponse = await request.post(`/api/v1/orders/${confirmedOrder.id}/receipts`, {
      headers: authHeaders,
      multipart: {
        receipt: {
          name: 'receipt.png',
          mimeType: 'image/png',
          buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
            'base64'
          )
        }
      }
    });

    expect(receiptResponse.ok()).toBeTruthy();
    expect((await receiptResponse.json()).data.paymentStatus).toBe('receipt_uploaded');
  });
});
