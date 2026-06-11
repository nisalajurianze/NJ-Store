import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { AddressDto, CartDto, CouponApplicationDto, SiteConfigDto } from '@njstore/types';

const mocks = vi.hoisted(() => ({
  applyCouponMock: vi.fn(),
  authState: {
    user: {
      id: 'user-1',
      name: 'Checkout User',
      email: 'shopper@example.com',
      isEmailVerified: true,
      loyaltyPoints: 0
    },
    addresses: [
      {
        _id: 'address-1',
        label: 'Home',
        fullName: 'Checkout User',
        phone: '0771234567',
        line1: '123 Main Street',
        city: 'Colombo',
        district: 'Colombo',
        postalCode: '00100',
        country: 'Sri Lanka',
        isDefault: true
      } satisfies AddressDto
    ]
  },
  cart: null as unknown as CartDto,
  loading: false,
  clearCartMock: vi.fn(),
  createQuotationMock: vi.fn(),
  loadCartMock: vi.fn(),
  navigateMock: vi.fn(),
  siteConfigGetMock: vi.fn()
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mocks.authState
}));

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    cart: mocks.cart,
    loading: mocks.loading,
    loadCart: mocks.loadCartMock,
    clearCart: mocks.clearCartMock
  })
}));

vi.mock('../services/orderService', () => ({
  orderService: {
    createQuotation: mocks.createQuotationMock
  }
}));

vi.mock('../services/couponService', () => ({
  couponService: {
    apply: mocks.applyCouponMock
  }
}));

vi.mock('../services/siteConfigService', () => ({
  siteConfigService: {
    get: mocks.siteConfigGetMock
  }
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock
  };
});

import { Checkout } from './Checkout';

const siteConfig: SiteConfigDto = {
  id: 'site-config-1',
  revision: 0,
  storeName: 'NJ Store',
  supportPhoneNumber: '+94 11 245 8899',
  whatsappNumber: '94112458899',
  freeShippingThreshold: 15000,
  lowStockThreshold: 5,
  loyaltyPointsRate: 10,
  cancellationWindowHours: 24,
  quotationExpiryDays: 7,
  shippingRates: [
    {
      city: 'Colombo',
      fee: 500,
      days: '1-2'
    },
    {
      city: 'default',
      fee: 750,
      days: '3-5'
    }
  ],
  bankTransferDetails: {
    accountName: 'NJ Store (Pvt) Ltd',
    bankName: 'Commercial Bank',
    branch: 'Colombo Fort',
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

const appliedCoupon: CouponApplicationDto = {
  couponId: 'coupon-1',
  code: 'SAVE10',
  discount: 800,
  finalTotal: 11200
};

const createCart = (subtotal = 12000): CartDto => ({
  id: 'cart-1',
  subtotal,
  itemCount: 1,
  items: [
    {
      id: 'cart-item-1',
      quantity: 1,
      lineTotal: subtotal,
      product: {
        id: 'product-1',
        name: 'Office Laptop',
        slug: 'office-laptop',
        shortDescription: 'Reliable laptop for office work.',
        description: 'Reliable laptop for office work.',
        price: subtotal,
        brand: 'Dell',
        ratings: {
          average: 4.6,
          count: 12
        },
        isBestSeller: false,
        isFeatured: true,
        isActive: true,
        stock: 8,
        discountPercentage: 0,
        images: [],
        variants: [],
        specifications: [],
        tags: ['laptop'],
        loyaltyPoints: 20,
        sku: 'LAP-001',
        productType: 'standard',
        bundleItems: []
      }
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

const renderCheckoutTree = (queryClient: QueryClient): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter
      initialEntries={['/checkout']}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Checkout />
      <Toaster position="top-right" />
    </MemoryRouter>
  </QueryClientProvider>
);

const renderCheckout = (queryClient = createQueryClient()) => {
  const renderResult = render(renderCheckoutTree(queryClient));

  return {
    queryClient,
    ...renderResult
  };
};

describe('Checkout page', () => {
  beforeEach(() => {
    mocks.applyCouponMock.mockReset();
    mocks.authState.user = {
      id: 'user-1',
      name: 'Checkout User',
      email: 'shopper@example.com',
      isEmailVerified: true,
      loyaltyPoints: 0
    };
    mocks.authState.addresses = [
      {
        _id: 'address-1',
        label: 'Home',
        fullName: 'Checkout User',
        phone: '0771234567',
        line1: '123 Main Street',
        city: 'Colombo',
        district: 'Colombo',
        postalCode: '00100',
        country: 'Sri Lanka',
        isDefault: true
      }
    ];
    mocks.cart = createCart();
    mocks.loading = false;
    mocks.clearCartMock.mockReset();
    mocks.createQuotationMock.mockReset();
    mocks.loadCartMock.mockReset();
    mocks.navigateMock.mockReset();
    mocks.siteConfigGetMock.mockReset();

    mocks.clearCartMock.mockResolvedValue(undefined);
    mocks.loadCartMock.mockResolvedValue(undefined);
    mocks.siteConfigGetMock.mockResolvedValue(siteConfig);
  });

  it('shows a loading state while the cart is hydrating', () => {
    mocks.cart = null as unknown as CartDto;
    mocks.loading = true;

    renderCheckout();

    expect(screen.getByText('Preparing your quotation details.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Quotation' })).not.toBeInTheDocument();
  });

  it('creates a quotation, clears the cart, and navigates to the order detail page', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mocks.createQuotationMock.mockResolvedValue({
      data: {
        id: 'order-42'
      }
    });

    renderCheckout(queryClient);

    await screen.findAllByText('Chosen after quotation');
    await user.click(screen.getByRole('button', { name: 'Create Quotation' }));

    expect(mocks.createQuotationMock).toHaveBeenCalledWith({
      items: [
        {
          productId: 'product-1',
          quantity: 1,
          variantIndex: undefined
        }
      ],
      couponCode: undefined,
      notes: undefined
    });
    expect(await screen.findAllByText('Quotation created.')).not.toHaveLength(0);
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);
      expect(mocks.clearCartMock).toHaveBeenCalled();
      expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard/orders/order-42');
    });
  });

  it('shows the API error toast when quotation creation fails', async () => {
    const user = userEvent.setup();

    mocks.createQuotationMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Stock changed before the quotation could be created'
        }
      }
    });

    renderCheckout();

    await screen.findAllByText('Chosen after quotation');
    await user.click(screen.getByRole('button', { name: 'Create Quotation' }));

    expect(await screen.findByText('Stock changed before the quotation could be created')).toBeInTheDocument();
    expect(mocks.clearCartMock).not.toHaveBeenCalled();
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it('applies a coupon and updates the checkout summary', async () => {
    const user = userEvent.setup();

    mocks.applyCouponMock.mockResolvedValue(appliedCoupon);

    renderCheckout();

    await screen.findAllByText('Chosen after quotation');
    await user.type(screen.getByLabelText('Coupon Code'), 'SAVE10');
    await user.click(screen.getByRole('button', { name: 'Validate Coupon' }));

    expect(mocks.applyCouponMock).toHaveBeenCalledWith({
      code: 'SAVE10',
      subtotal: 12000,
      shippingFee: 0,
      items: [{ productId: 'product-1', quantity: 1, variantIndex: undefined }]
    });
    expect(await screen.findByText('SAVE10 applied successfully.')).toBeInTheDocument();
    expect(screen.getByText('SAVE10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('adds loyalty point redemption to the quotation payload and summary', async () => {
    const user = userEvent.setup();

    mocks.authState.user = {
      id: 'user-1',
      name: 'Checkout User',
      email: 'shopper@example.com',
      isEmailVerified: true,
      loyaltyPoints: 700
    };
    mocks.createQuotationMock.mockResolvedValue({
      data: {
        id: 'order-loyalty'
      }
    });

    renderCheckout();

    await screen.findAllByText('Chosen after quotation');
    await user.clear(screen.getByLabelText('Points to redeem'));
    await user.type(screen.getByLabelText('Points to redeem'), '500');
    expect(screen.getByText('LKR 11,500')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create Quotation' }));

    expect(mocks.createQuotationMock).toHaveBeenCalledWith({
      items: [
        {
          productId: 'product-1',
          quantity: 1,
          variantIndex: undefined
        }
      ],
      couponCode: undefined,
      loyaltyPointsToRedeem: 500,
      notes: undefined
    });
  });

  it('adds the configured tax line into the quotation preview total', async () => {
    mocks.siteConfigGetMock.mockResolvedValue({
      ...siteConfig,
      taxSettings: {
        enabled: true,
        label: 'VAT',
        rate: 18
      }
    });

    renderCheckout();

    await screen.findAllByText('Chosen after quotation');

    expect(await screen.findByText('VAT (18%)')).toBeInTheDocument();
    expect(await screen.findByText('LKR 2,160')).toBeInTheDocument();
    expect(await screen.findByText('LKR 14,160')).toBeInTheDocument();
  });

  it('removes an applied coupon and clears the saved discount state', async () => {
    const user = userEvent.setup();

    mocks.applyCouponMock.mockResolvedValue(appliedCoupon);

    renderCheckout();

    await screen.findAllByText('Chosen after quotation');
    await user.type(screen.getByLabelText('Coupon Code'), 'SAVE10');
    await user.click(screen.getByRole('button', { name: 'Validate Coupon' }));
    expect(await screen.findByRole('button', { name: 'Remove' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Coupon Code')).toHaveValue('');
    expect(screen.getByText('Validate your coupon before creating the quotation so your preview total includes the current discount.')).toBeInTheDocument();
  });

  it('clears a validated coupon when the shopper edits the coupon code', async () => {
    const user = userEvent.setup();

    mocks.applyCouponMock.mockResolvedValue(appliedCoupon);

    renderCheckout();

    await screen.findAllByText('Chosen after quotation');
    await user.type(screen.getByLabelText('Coupon Code'), 'SAVE10');
    await user.click(screen.getByRole('button', { name: 'Validate Coupon' }));
    expect(await screen.findByRole('button', { name: 'Remove' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Coupon Code'), 'A');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('Coupon code changed. Validate it again to refresh your savings.')).toBeInTheDocument();
  });

  it('clears a validated coupon when cart pricing changes after validation', async () => {
    const user = userEvent.setup();

    mocks.applyCouponMock.mockResolvedValue(appliedCoupon);

    const view = renderCheckout();

    await screen.findAllByText('Chosen after quotation');
    await user.type(screen.getByLabelText('Coupon Code'), 'SAVE10');
    await user.click(screen.getByRole('button', { name: 'Validate Coupon' }));
    expect(await screen.findByRole('button', { name: 'Remove' })).toBeInTheDocument();

    mocks.cart = createCart(13000);
    view.rerender(renderCheckoutTree(view.queryClient));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('Cart pricing changed. Validate the coupon again to refresh your savings.')).toBeInTheDocument();
    expect(screen.getAllByText('LKR 13,000').length).toBeGreaterThanOrEqual(2);
  });

  it('shows the API error toast when coupon validation fails', async () => {
    const user = userEvent.setup();

    mocks.applyCouponMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'This coupon has expired'
        }
      }
    });

    renderCheckout();

    await screen.findAllByText('Chosen after quotation');
    await user.type(screen.getByLabelText('Coupon Code'), 'OLD10');
    await user.click(screen.getByRole('button', { name: 'Validate Coupon' }));

    expect(await screen.findByText('This coupon has expired')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('lets shoppers create a quotation even when no delivery addresses are saved yet', async () => {
    const user = userEvent.setup();

    mocks.authState.addresses = [];
    mocks.createQuotationMock.mockResolvedValue({
      data: {
        id: 'order-quote-9'
      }
    });

    renderCheckout();

    expect(await screen.findByText('After the quotation')).toBeInTheDocument();
    expect(screen.getAllByText('Chosen after quotation').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Create Quotation' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Create Quotation' }));

    expect(mocks.createQuotationMock).toHaveBeenCalledWith({
      items: [
        {
          productId: 'product-1',
          quantity: 1,
          variantIndex: undefined
        }
      ],
      couponCode: undefined,
      notes: undefined
    });
  });

  it('keeps fulfilment and payment choices out of the checkout form', async () => {
    renderCheckout();

    expect(await screen.findByText('After the quotation')).toBeInTheDocument();
    expect(screen.queryByText('Fulfilment Preference')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment Method')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delivery')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cash on Delivery')).not.toBeInTheDocument();
  });
});
