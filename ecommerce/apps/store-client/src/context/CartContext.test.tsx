import { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { CartDto, ProductDetailDto, UserSummary } from '@njstore/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const GUEST_CART_STORAGE_KEY = 'njstore-guest-cart';

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as UserSummary | null,
    loading: false
  },
  clearMock: vi.fn(),
  getMock: vi.fn(),
  addMock: vi.fn(),
  updateMock: vi.fn(),
  removeMock: vi.fn(),
  syncMock: vi.fn()
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => mocks.authState
}));

vi.mock('../services/cartService', () => ({
  cartService: {
    clear: mocks.clearMock,
    get: mocks.getMock,
    add: mocks.addMock,
    update: mocks.updateMock,
    remove: mocks.removeMock,
    sync: mocks.syncMock
  }
}));

import { CartProvider, useCart } from './CartContext';

const installLocalStorageMock = (): void => {
  const storage = new Map<string, string>();

  const localStorageMock: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'> = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
    removeItem: (key) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    }
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorageMock
  });
};

const CartConsumer = (): JSX.Element => {
  const { cart } = useCart();

  if (!cart?.items.length) {
    return <div>empty</div>;
  }

  const firstItem = cart.items[0];
  return (
    <div>
      {`${cart.itemCount}|${firstItem.product.name}|${firstItem.product.variants?.length ?? 0}|${String(firstItem.variantIndex ?? 'base')}`}
    </div>
  );
};

const LoadCartIdentityConsumer = (): JSX.Element => {
  const { cart, loadCart } = useCart();
  const firstLoadCartRef = useRef(loadCart);

  return <div>{`${firstLoadCartRef.current === loadCart ? 'same' : 'changed'}|${cart?.itemCount ?? 0}`}</div>;
};

const createAuthUser = (): UserSummary => ({
  id: 'user-1',
  name: 'Cart User',
  email: 'cart@example.com',
  role: 'customer',
  language: 'en',
  isEmailVerified: true,
  loyaltyPoints: 0
});

const createGuestProduct = (
  id: string,
  name = 'Sync Phone',
  variants: ProductDetailDto['variants'] = []
): ProductDetailDto => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  shortDescription: 'Cart sync product',
  description: 'Cart sync product',
  price: 12500,
  brand: 'NJ Store',
  brandId: null,
  brandSlug: null,
  ratings: {
    average: 0,
    count: 0
  },
  isBestSeller: false,
  isFeatured: false,
  isActive: true,
  stock: 40,
  discountPercentage: 0,
  productType: 'standard',
  images: [],
  previewImages: [],
  variants,
  specifications: [],
  tags: [],
  loyaltyPoints: 0,
  sku: `${id}-sku`,
  bundleItems: []
});

const createServerCart = (): CartDto => ({
  id: 'server-cart',
  items: [],
  subtotal: 0,
  itemCount: 0
});

describe('CartProvider', () => {
  beforeEach(() => {
    installLocalStorageMock();
    mocks.authState.user = null;
    mocks.authState.loading = false;
    mocks.clearMock.mockReset();
    mocks.getMock.mockReset();
    mocks.addMock.mockReset();
    mocks.updateMock.mockReset();
    mocks.removeMock.mockReset();
    mocks.syncMock.mockReset();
  });

  it('normalizes legacy guest cart snapshots instead of crashing cart pages', async () => {
    window.localStorage.setItem(
      GUEST_CART_STORAGE_KEY,
      JSON.stringify([
        {
          product: {
            id: 'legacy-mouse',
            name: 'Legacy Mouse',
            slug: 'legacy-mouse',
            shortDescription: 'Compact wireless mouse',
            price: 4500,
            brand: 'Logitech'
          },
          quantity: 2,
          variantIndex: 3
        }
      ])
    );

    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('2|Legacy Mouse|0|base')).toBeInTheDocument();
    });

    expect(mocks.getMock).not.toHaveBeenCalled();

    const storedGuestCart = JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? '[]');
    expect(storedGuestCart.version).toBe(2);
    expect(storedGuestCart.items).toMatchObject([
      {
        quantity: 2,
        product: {
          id: 'legacy-mouse',
          sku: 'legacy-mouse-guest'
        }
      }
    ]);
    expect(storedGuestCart.items[0]?.variantIndex).toBeUndefined();
  });

  it('keeps loadCart stable across cart state updates', async () => {
    window.localStorage.setItem(
      GUEST_CART_STORAGE_KEY,
      JSON.stringify([
        {
          product: {
            id: 'keyboard-1',
            name: 'Mechanical Keyboard',
            slug: 'mechanical-keyboard',
            shortDescription: 'Tactile keyboard',
            description: 'Tactile keyboard',
            price: 18500,
            brand: 'Keychron',
            ratings: {
              average: 4.7,
              count: 12
            },
            isBestSeller: true,
            isFeatured: false,
            isActive: true,
            stock: 14,
            discountPercentage: 0,
            images: [],
            previewImages: [],
            variants: [],
            specifications: [],
            tags: [],
            loyaltyPoints: 0,
            sku: 'KEY-001'
          },
          quantity: 1
        }
      ])
    );

    render(
      <CartProvider>
        <LoadCartIdentityConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('same|1')).toBeInTheDocument();
    });
  });

  it('normalizes legacy single-variant guest cart selections to variant index 0', async () => {
    window.localStorage.setItem(
      GUEST_CART_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        items: [
          {
            product: createGuestProduct('single-variant-phone', 'Single Variant Phone', [
              {
                color: 'Black',
                colorCode: '#111827',
                price: 12500,
                stock: 12,
                sku: 'SVP-001'
              }
            ]),
            quantity: 1
          }
        ]
      })
    );

    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('1|Single Variant Phone|1|0')).toBeInTheDocument();
    });

    const storedGuestCart = JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? 'null');
    expect(storedGuestCart.items[0]?.variantIndex).toBe(0);
  });

  it('drops ambiguous legacy multi-variant guest cart selections instead of inventing a base item', async () => {
    window.localStorage.setItem(
      GUEST_CART_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        items: [
          {
            product: createGuestProduct('legacy-config-phone', 'Legacy Config Phone', [
              {
                color: 'Black',
                colorCode: '#111827',
                price: 12500,
                stock: 12,
                sku: 'LCP-001'
              },
              {
                color: 'Blue',
                colorCode: '#2563eb',
                price: 12900,
                stock: 8,
                sku: 'LCP-002'
              }
            ]),
            quantity: 1
          }
        ]
      })
    );

    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('empty')).toBeInTheDocument();
    });

    expect(window.localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull();
  });

  it('caps signed-in guest cart sync quantities to the server limit', async () => {
    const productId = '69d41f25b9896e7a86d4ae31';
    mocks.authState.user = createAuthUser();
    mocks.syncMock.mockResolvedValue(createServerCart());

    window.localStorage.setItem(
      GUEST_CART_STORAGE_KEY,
      JSON.stringify([
        {
          product: createGuestProduct(productId),
          quantity: 45
        }
      ])
    );

    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(mocks.syncMock).toHaveBeenCalledWith([
        {
          productId,
          quantity: 20,
          variantIndex: undefined
        }
      ]);
    });

    expect(window.localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull();
  });

  it('preserves legacy guest cart items that cannot be synced to server product ids', async () => {
    mocks.authState.user = createAuthUser();
    mocks.getMock.mockResolvedValue(createServerCart());

    window.localStorage.setItem(
      GUEST_CART_STORAGE_KEY,
      JSON.stringify([
        {
          product: createGuestProduct('legacy-phone'),
          quantity: 1
        }
      ])
    );

    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(mocks.getMock).toHaveBeenCalled();
    });

    expect(mocks.syncMock).not.toHaveBeenCalled();
    const storedGuestCart = JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? 'null');
    expect(storedGuestCart).not.toBeNull();
    expect(storedGuestCart.items[0]?.product.id).toBe('legacy-phone');
  });

  it('falls back to the server cart when a guest cart sync is rejected', async () => {
    const productId = '69d41f25b9896e7a86d4ae31';
    mocks.authState.user = createAuthUser();
    mocks.syncMock.mockRejectedValue({ response: { status: 400 } });
    mocks.getMock.mockResolvedValue(createServerCart());

    window.localStorage.setItem(
      GUEST_CART_STORAGE_KEY,
      JSON.stringify([
        {
          product: createGuestProduct(productId),
          quantity: 1
        }
      ])
    );

    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(mocks.getMock).toHaveBeenCalled();
    });

    expect(mocks.syncMock).toHaveBeenCalled();
    const storedGuestCart = JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? 'null');
    expect(storedGuestCart).not.toBeNull();
    expect(storedGuestCart.items[0]?.product.id).toBe(productId);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });
});
