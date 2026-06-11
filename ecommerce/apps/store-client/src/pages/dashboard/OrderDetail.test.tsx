import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderDto, SiteConfigDto } from '@njstore/types';

const mocks = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  navigateMock: vi.fn(),
  confirmQuotationMock: vi.fn(),
  cancelMock: vi.fn(),
  downloadInvoiceMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  authState: {
    user: {
      id: 'user-1',
      isEmailVerified: true,
      loyaltyPoints: 0
    },
    addresses: [
      {
        _id: 'address-1',
        label: 'Home',
        fullName: 'Test User',
        phone: '0771234567',
        line1: '123 Main Street',
        city: 'Colombo',
        district: 'Colombo',
        postalCode: '00100',
        country: 'Sri Lanka',
        isDefault: true
      }
    ]
  }
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock,
  useQueryClient: mocks.useQueryClientMock
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock,
    useParams: () => ({ id: 'order-1' })
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    ...mocks.authState,
    refreshSession: mocks.refreshSessionMock
  })
}));

vi.mock('../../services/orderService', () => ({
  orderService: {
    detail: vi.fn(),
    uploadReceipts: vi.fn(),
    removeReceipt: vi.fn(),
    getReceiptAsset: vi.fn(),
    confirmQuotation: mocks.confirmQuotationMock,
    cancel: mocks.cancelMock,
    downloadQuotation: vi.fn(),
    downloadInvoice: mocks.downloadInvoiceMock
  }
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: mocks.toastSuccessMock,
    error: mocks.toastErrorMock
  }
}));

import { DashboardOrderDetail } from './OrderDetail';

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

const createOrder = (overrides: Partial<OrderDto> = {}): OrderDto => ({
  id: 'order-1',
  orderNumber: 'ORD-1001',
  quotationNumber: 'QTN-1001',
  quotationToken: 'token-1',
  quotationExpiry: new Date().toISOString(),
  isQuotation: false,
  type: 'delivery',
  status: 'pending',
  paymentStatus: 'receipt_uploaded',
  paymentMethod: 'bank_transfer',
  subtotal: 1000,
  shippingFee: 150,
  discount: 0,
  loyaltyDiscount: 0,
  total: 1150,
  shippingAddress: {
    _id: 'address-1',
    label: 'Home',
    fullName: 'Test User',
    phone: '0771234567',
    line1: '123 Main Street',
    city: 'Colombo',
    district: 'Colombo',
    postalCode: '00100',
    country: 'Sri Lanka',
    isDefault: true
  },
  notes: '',
  deliveryNotes: '',
  couponCode: undefined,
  pickupSlot: undefined,
  items: [
    {
      product: 'product-1',
      name: 'Test Product',
      slug: 'test-product',
      quantity: 1,
      price: 1000,
      sku: 'SKU-1'
    }
  ],
  trackingNumber: undefined,
  receipts: [
    {
      id: 'receipt-1',
      url: 'https://example.com/receipt-1.png',
      publicId: 'receipt-1',
      alt: 'Receipt 1',
      createdAt: new Date().toISOString()
    }
  ],
  receipt: undefined,
  receiptRejectionReason: undefined,
  quotationPdf: {
    url: 'https://example.com/quotation.pdf',
    publicId: 'quotation-1',
    alt: 'Quotation PDF'
  },
  invoicePdf: {
    url: 'https://example.com/invoice.pdf',
    publicId: 'invoice-1',
    alt: 'Invoice PDF'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  estimatedDeliveryDays: '3-5',
  estimatedDeliveryDate: new Date().toISOString(),
  loyaltyPointsAwarded: 0,
  loyaltyPointsRedeemed: 0,
  timeline: [
    {
      status: 'pending',
      note: 'Order created',
      createdAt: new Date().toISOString(),
      actor: 'system'
    }
  ],
  ...overrides
});

describe('DashboardOrderDetail', () => {
  beforeEach(() => {
    mocks.confirmQuotationMock.mockReset();
    mocks.cancelMock.mockReset();
    mocks.downloadInvoiceMock.mockReset();
    mocks.toastSuccessMock.mockReset();
    mocks.toastErrorMock.mockReset();
    mocks.refreshSessionMock.mockReset();
    mocks.refreshSessionMock.mockResolvedValue('token');
    mocks.authState.user = {
      id: 'user-1',
      isEmailVerified: true,
      loyaltyPoints: 0
    };
    mocks.authState.addresses = [
      {
        _id: 'address-1',
        label: 'Home',
        fullName: 'Test User',
        phone: '0771234567',
        line1: '123 Main Street',
        city: 'Colombo',
        district: 'Colombo',
        postalCode: '00100',
        country: 'Sri Lanka',
        isDefault: true
      }
    ];
    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'site-config') {
        return { data: siteConfig };
      }

      return { data: { data: createOrder() } };
    });
    mocks.useQueryClientMock.mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined)
    });
  });

  it('allows uploading and removing receipts while payment is not confirmed', () => {
    render(<DashboardOrderDetail />);

    expect(screen.getByRole('button', { name: 'Upload Receipt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByText(/You can still upload more receipts/i)).toBeInTheDocument();
  });

  it('locks receipt editing after payment is marked as paid', () => {
    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'site-config') {
        return { data: siteConfig };
      }

      return {
        data: {
          data: createOrder({
            paymentStatus: 'paid',
            status: 'processing'
          })
        }
      };
    });

    render(<DashboardOrderDetail />);

    expect(screen.getByRole('button', { name: 'View Receipt' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload Receipt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(screen.getByText(/Receipts are locked because payment has been confirmed/i)).toBeInTheDocument();
  });

  it('hides invoice download until admin marks the order as paid', () => {
    render(<DashboardOrderDetail />);

    expect(screen.queryByRole('button', { name: 'Download Invoice' })).not.toBeInTheDocument();
  });

  it('downloads the invoice after payment is marked as paid', async () => {
    const user = userEvent.setup();

    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'site-config') {
        return { data: siteConfig };
      }

      return {
        data: {
          data: createOrder({
            paymentStatus: 'paid',
            status: 'processing'
          })
        }
      };
    });

    render(<DashboardOrderDetail />);

    await user.click(screen.getByRole('button', { name: 'Download Invoice' }));

    expect(mocks.downloadInvoiceMock).toHaveBeenCalledWith('order-1');
  });

  it('submits post-quotation pickup fulfilment details during confirmation', async () => {
    const user = userEvent.setup();

    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'site-config') {
        return { data: siteConfig };
      }

      return {
        data: {
          data: createOrder({
            isQuotation: true,
            fulfilmentConfigured: false,
            paymentStatus: 'unpaid',
            receipts: [],
            invoicePdf: undefined,
            shippingFee: 0,
            total: 1000,
            shippingAddress: undefined,
            estimatedDeliveryDays: undefined,
            estimatedDeliveryDate: undefined
          })
        }
      };
    });
    mocks.confirmQuotationMock.mockResolvedValue({
      data: {
        id: 'order-1'
      }
    });

    render(<DashboardOrderDetail />);

    await user.click(screen.getByRole('button', { name: 'Store Pickup' }));
    expect(screen.getByRole('button', { name: 'Cash on Delivery' })).toBeDisabled();
    expect(screen.getByText('Cash on Delivery is disabled for store pickup because no courier delivery or doorstep payment is involved.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Preferred Pickup Slot'), '2026-04-02 10:30');
    await user.click(screen.getByRole('button', { name: 'Confirm Quotation' }));

    expect(mocks.confirmQuotationMock).toHaveBeenCalledWith('token-1', {
      paymentMethod: 'bank_transfer',
      type: 'pickup',
      addressId: undefined,
      pickupSlot: '2026-04-02 10:30',
      deliveryNotes: undefined
    });
  });

  it('opens bank transfer details from the quotation payment block', async () => {
    const user = userEvent.setup();

    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'site-config') {
        return { data: siteConfig };
      }

      return {
        data: {
          data: createOrder({
            isQuotation: true,
            fulfilmentConfigured: false,
            paymentStatus: 'unpaid',
            receipts: [],
            invoicePdf: undefined,
            shippingFee: 0,
            total: 1000,
            shippingAddress: undefined,
            estimatedDeliveryDays: undefined,
            estimatedDeliveryDate: undefined
          })
        }
      };
    });

    render(<DashboardOrderDetail />);

    await user.click(screen.getByRole('button', { name: 'View bank details' }));

    expect(await screen.findByRole('dialog', { name: 'Bank Transfer Details' })).toBeInTheDocument();
    expect(screen.getByText('NJ Store (Pvt) Ltd')).toBeInTheDocument();
    expect(screen.getByText('Commercial Bank')).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
  });

  it('submits cash on delivery only for delivery confirmation', async () => {
    const user = userEvent.setup();

    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'site-config') {
        return { data: siteConfig };
      }

      return {
        data: {
          data: createOrder({
            isQuotation: true,
            fulfilmentConfigured: false,
            paymentStatus: 'unpaid',
            receipts: [],
            invoicePdf: undefined,
            shippingFee: 0,
            total: 1000,
            shippingAddress: undefined,
            estimatedDeliveryDays: undefined,
            estimatedDeliveryDate: undefined
          })
        }
      };
    });
    mocks.confirmQuotationMock.mockResolvedValue({
      data: {
        id: 'order-1'
      }
    });

    render(<DashboardOrderDetail />);

    await user.click(screen.getByRole('button', { name: 'Cash on Delivery' }));
    await user.click(screen.getByRole('button', { name: 'Confirm Quotation' }));

    expect(mocks.confirmQuotationMock).toHaveBeenCalledWith('token-1', {
      paymentMethod: 'cash_on_delivery',
      type: 'delivery',
      addressId: 'address-1',
      pickupSlot: undefined,
      deliveryNotes: undefined
    });
  });

  it('submits loyalty point redemption during quotation confirmation', async () => {
    const user = userEvent.setup();

    mocks.authState.user = {
      id: 'user-1',
      isEmailVerified: true,
      loyaltyPoints: 600
    };
    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'site-config') {
        return { data: siteConfig };
      }

      return {
        data: {
          data: createOrder({
            isQuotation: true,
            fulfilmentConfigured: false,
            paymentStatus: 'unpaid',
            receipts: [],
            invoicePdf: undefined,
            shippingFee: 0,
            total: 1000,
            shippingAddress: undefined,
            estimatedDeliveryDays: undefined,
            estimatedDeliveryDate: undefined
          })
        }
      };
    });
    mocks.confirmQuotationMock.mockResolvedValue({
      data: {
        id: 'order-1'
      }
    });

    render(<DashboardOrderDetail />);

    await user.clear(screen.getByLabelText('Points to redeem'));
    await user.type(screen.getByLabelText('Points to redeem'), '400');
    await user.click(screen.getByRole('button', { name: 'Confirm Quotation' }));

    expect(mocks.confirmQuotationMock).toHaveBeenCalledWith('token-1', {
      paymentMethod: 'bank_transfer',
      type: 'delivery',
      addressId: 'address-1',
      pickupSlot: undefined,
      deliveryNotes: undefined,
      loyaltyPointsToRedeem: 400
    });
  });

  it('shows fulfilment guidance when a quotation still needs delivery details', () => {
    mocks.authState.addresses = [];
    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'site-config') {
        return { data: siteConfig };
      }

      return {
        data: {
          data: createOrder({
            isQuotation: true,
            fulfilmentConfigured: false,
            paymentStatus: 'unpaid',
            receipts: [],
            invoicePdf: undefined,
            shippingFee: 0,
            total: 1000,
            shippingAddress: undefined,
            estimatedDeliveryDays: undefined,
            estimatedDeliveryDate: undefined
          })
        }
      };
    });

    render(<DashboardOrderDetail />);

    expect(screen.getByText('Choose fulfilment before confirmation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Addresses' })).toBeInTheDocument();
  });

  it('shows an API error toast when confirming a quotation fails', async () => {
    const user = userEvent.setup();

    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'site-config') {
        return { data: siteConfig };
      }

      return {
        data: {
          data: createOrder({
            isQuotation: true,
            fulfilmentConfigured: false,
            paymentStatus: 'unpaid',
            receipts: [],
            invoicePdf: undefined,
            shippingFee: 0,
            total: 1000,
            shippingAddress: undefined,
            estimatedDeliveryDays: undefined,
            estimatedDeliveryDate: undefined
          })
        }
      };
    });
    mocks.confirmQuotationMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Quotation confirmation expired'
        }
      }
    });

    render(<DashboardOrderDetail />);

    await user.click(screen.getByRole('button', { name: 'Store Pickup' }));
    await user.click(screen.getByRole('button', { name: 'Confirm Quotation' }));

    expect(mocks.toastErrorMock).toHaveBeenCalledWith('Quotation confirmation expired');
  });

  it('shows an API error toast when order cancellation fails', async () => {
    const user = userEvent.setup();

    mocks.cancelMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Order can no longer be cancelled'
        }
      }
    });

    render(<DashboardOrderDetail />);

    await user.click(screen.getByRole('button', { name: 'Cancel Order' }));

    expect(mocks.toastErrorMock).toHaveBeenCalledWith('Order can no longer be cancelled');
  });
});
