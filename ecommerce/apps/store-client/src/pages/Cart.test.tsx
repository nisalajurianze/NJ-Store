import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { CartDto, ProductCardDto, ProductDetailDto, SiteConfigDto } from '@njstore/types';

const mocks = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    name: 'Cart User',
    email: 'cart-user@example.com',
    role: 'customer',
    language: 'en',
    isEmailVerified: true,
    loyaltyPoints: 100
  } as const,
  cart: null as CartDto | null,
  loading: false,
  loadCartMock: vi.fn(),
  addItemMock: vi.fn(),
  updateItemMock: vi.fn(),
  removeItemMock: vi.fn(),
  isWishlistedMock: vi.fn(),
  toggleWishlistMock: vi.fn(),
  siteConfigGetMock: vi.fn(),
  productUpsellMock: vi.fn(),
  productDetailMock: vi.fn(),
  recentlyViewedMock: vi.fn()
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.user
  })
}));

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    cart: mocks.cart,
    loading: mocks.loading,
    loadCart: mocks.loadCartMock,
    addItem: mocks.addItemMock,
    updateItem: mocks.updateItemMock,
    removeItem: mocks.removeItemMock
  })
}));

vi.mock('../hooks/useWishlist', () => ({
  useWishlist: () => ({
    items: [],
    isLoading: false,
    isError: false,
    pendingProductId: null,
    isWishlisted: mocks.isWishlistedMock,
    toggleWishlist: mocks.toggleWishlistMock,
    refetch: vi.fn()
  })
}));

vi.mock('../services/siteConfigService', () => ({
  siteConfigService: {
    get: mocks.siteConfigGetMock
  }
}));

vi.mock('../services/productService', () => ({
  productService: {
    upsell: mocks.productUpsellMock,
    detail: mocks.productDetailMock,
    recentlyViewed: mocks.recentlyViewedMock,
    getLocalRecentlyViewed: vi.fn(() => [])
  }
}));

import { Cart } from './Cart';

const siteConfig: SiteConfigDto = {
  id: 'site-config-1',
  revision: 0,
  storeName: 'NJ Store',
  supportPhoneNumber: '+94 11 245 8899',
  whatsappNumber: '94112458899',
  freeShippingThreshold: 15000,
  lowStockThreshold: 5,
  shippingRates: [
    { city: 'default', fee: 700, days: '3-5' },
    { city: 'Colombo', fee: 400, days: '1-2' }
  ],
  loyaltyPointsRate: 10,
  cancellationWindowHours: 24,
  quotationExpiryDays: 7,
  bankTransferDetails: {
    accountName: 'NJ Store',
    bankName: 'Commercial Bank',
    branch: 'Colombo',
    accountNumber: '1234567890'
  },
  footer: {
    companyName: 'NJ Store',
    description: 'Electronics and accessories.',
    email: 'support@njstore.test',
    phone: '+94 11 245 8899',
    whatsappNumber: '94112458899',
    physicalAddress: '123 Main Street, Colombo',
    mapEmbedUrl: 'https://maps.example.com/embed',
    copyrightText: '© NJ Store',
    socialLinks: {
      facebook: 'https://facebook.com/njstore',
      instagram: 'https://instagram.com/njstore',
      tiktok: '',
      youtube: '',
      x: ''
    },
    sectionTitles: {
      about: 'About',
      quickLinks: 'Quick Links',
      contact: 'Contact',
      social: 'Social'
    },
    quickLinks: []
  },
  emailTemplates: []
};

const buildUpsellProduct = (id: string, name: string, price: number): ProductCardDto => ({
  id,
  name,
  slug: id,
  shortDescription: `${name} description`,
  price,
  thumbnail: {
    url: `https://cdn.example.com/${id}.jpg`,
    publicId: `products/${id}`
  },
  previewImages: [],
  category: {
    id: 'cat-1',
    name: 'Accessories',
    slug: 'accessories',
    isActive: true,
    order: 1
  },
  brand: 'Logitech',
  ratings: {
    average: 4.4,
    count: 12
  },
  isBestSeller: true,
  isFeatured: false,
  isActive: true,
  stock: 25,
  discountPercentage: 0,
  productType: 'standard'
});

const buildUpsellDetail = (product: ProductCardDto): ProductDetailDto => ({
  ...product,
  description: `${product.name} full description`,
  images: product.thumbnail ? [product.thumbnail] : [],
  variants: [],
  specifications: [],
  tags: ['accessories'],
  loyaltyPoints: 10,
  sku: `${product.id}-sku`,
  bundleItems: []
});

const cartProduct: ProductDetailDto = {
  id: 'product-1',
  name: 'Office Laptop',
  slug: 'office-laptop',
  shortDescription: 'Reliable laptop for office work.',
  description: 'Reliable laptop for office work.',
  price: 220000,
  thumbnail: {
    url: 'https://cdn.example.com/product-1.jpg',
    publicId: 'products/product-1'
  },
  previewImages: [],
  category: {
    id: 'cat-1',
    name: 'Accessories',
    slug: 'accessories',
    isActive: true,
    order: 1
  },
  brand: 'Dell',
  ratings: {
    average: 4.8,
    count: 80
  },
  isBestSeller: false,
  isFeatured: true,
  isActive: true,
  stock: 8,
  discountPercentage: 0,
  images: [
    {
      url: 'https://cdn.example.com/product-1-image.jpg',
      publicId: 'products/product-1-image'
    }
  ],
  variants: [],
  specifications: [],
  tags: [],
  loyaltyPoints: 120,
  sku: 'SKU-1',
  productType: 'standard',
  bundleItems: []
};

const createCart = (): CartDto => ({
  id: 'cart-1',
  subtotal: 220000,
  itemCount: 1,
  items: [
    {
      id: 'cart-item-1',
      quantity: 1,
      lineTotal: 220000,
      product: cartProduct
    }
  ]
});

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      },
      mutations: {
        retry: false
      }
    }
  });

const renderCart = (): ReturnType<typeof render> => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={['/cart']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Cart />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Cart page', () => {
  beforeEach(() => {
    mocks.cart = createCart();
    mocks.loading = false;
    mocks.loadCartMock.mockReset();
    mocks.addItemMock.mockReset();
    mocks.updateItemMock.mockReset();
    mocks.removeItemMock.mockReset();
    mocks.isWishlistedMock.mockReset();
    mocks.toggleWishlistMock.mockReset();
    mocks.siteConfigGetMock.mockReset();
    mocks.productUpsellMock.mockReset();
    mocks.productDetailMock.mockReset();
    mocks.recentlyViewedMock.mockReset();

    mocks.loadCartMock.mockResolvedValue(undefined);
    mocks.addItemMock.mockResolvedValue(undefined);
    mocks.updateItemMock.mockResolvedValue(undefined);
    mocks.removeItemMock.mockResolvedValue(undefined);
    mocks.isWishlistedMock.mockReturnValue(false);
    mocks.toggleWishlistMock.mockResolvedValue(true);
    mocks.siteConfigGetMock.mockResolvedValue(siteConfig);
    mocks.productUpsellMock.mockResolvedValue({
      data: [
        buildUpsellProduct('upsell-1', 'Wireless Mouse', 9500),
        buildUpsellProduct('upsell-2', 'Mechanical Keyboard', 18500),
        buildUpsellProduct('upsell-3', 'Laptop Stand', 12000)
      ]
    });
    mocks.productDetailMock.mockImplementation(async (slug: string) => {
      const product = buildUpsellProduct(slug, slug === 'upsell-1' ? 'Wireless Mouse' : 'Accessory', 9500);
      return { data: buildUpsellDetail(product) };
    });
    mocks.recentlyViewedMock.mockResolvedValue({ data: [] });
  });

  it('shows an illustrated empty state with start shopping CTA', async () => {
    mocks.cart = null;

    renderCart();

    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Shopping' })).toBeInTheDocument();
    expect(screen.getByTestId('cart-empty-state')).not.toHaveClass('bg-white/[0.045]');
    expect(mocks.loadCartMock).not.toHaveBeenCalled();
  });

  it('shows a loading skeleton while the cart is hydrating', () => {
    mocks.cart = null;
    mocks.loading = true;

    renderCart();

    expect(screen.getByText('Loading your saved products and pricing details.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your cart is empty' })).not.toBeInTheDocument();
  });

  it('renders delivery estimate and a 3-item upsell row', async () => {
    renderCart();

    expect(await screen.findByText('Useful accessories')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add accessory' })).toHaveLength(3);
    expect(
      screen.getByText((content) => content.includes('Based on current store settings:'))
    ).toBeInTheDocument();
    expect(screen.getByText('3-5')).toBeInTheDocument();
  });

  it('moves a cart item to wishlist using save for later', async () => {
    const user = userEvent.setup();

    renderCart();

    await user.click(await screen.findByRole('button', { name: 'Save for later' }));

    await waitFor(() => {
      expect(mocks.toggleWishlistMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'product-1' }));
      expect(mocks.removeItemMock).toHaveBeenCalledWith('cart-item-1');
    });
  });

  it('adds an upsell product to cart with the product card payload', async () => {
    const user = userEvent.setup();

    renderCart();
    const upsellAddButtons = await screen.findAllByRole('button', { name: 'Add accessory' });
    await user.click(upsellAddButtons[0]);

    await waitFor(() => {
      expect(mocks.addItemMock).toHaveBeenCalledTimes(1);
    });

    const payload = mocks.addItemMock.mock.calls[0]?.[0];
    expect(mocks.productDetailMock).toHaveBeenCalledWith('upsell-1');
    expect(payload).toEqual(
      expect.objectContaining({
        productId: expect.any(String),
        quantity: 1,
        product: expect.objectContaining({
          id: expect.any(String),
          description: expect.stringContaining('full description'),
          category: expect.objectContaining({
            id: expect.any(String)
          })
        })
      })
    );
    expect(payload.product.id).toBe(payload.productId);
  });

  it('adds a multi-variant upsell product with the first in-stock variant', async () => {
    const user = userEvent.setup();
    const upsellProduct = buildUpsellProduct('upsell-cable', 'USB-C Cable', 5390);

    mocks.productUpsellMock.mockResolvedValue({ data: [upsellProduct] });
    mocks.productDetailMock.mockResolvedValue({
      data: {
        ...buildUpsellDetail(upsellProduct),
        stock: 8,
        variants: [
          { stock: 0, sku: 'CABLE-BLACK', color: 'Black' },
          { stock: 8, sku: 'CABLE-BLUE', color: 'Blue' }
        ]
      }
    });

    renderCart();
    await user.click(await screen.findByRole('button', { name: 'Add accessory' }));

    await waitFor(() => {
      expect(mocks.addItemMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.addItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'upsell-cable',
        quantity: 1,
        variantIndex: 1,
        product: expect.objectContaining({
          id: 'upsell-cable',
          variants: expect.arrayContaining([
            expect.objectContaining({ sku: 'CABLE-BLUE', stock: 8 })
          ])
        })
      })
    );
  });
});
