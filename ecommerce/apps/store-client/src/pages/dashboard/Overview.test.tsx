import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authState: {
    user: {
      id: 'user-1',
      name: 'Nisal Fernando',
      email: 'nisal@example.com',
      phone: '',
      isEmailVerified: true,
      loyaltyPoints: 240
    },
    addresses: [] as Array<{ _id?: string }>
  },
  listMock: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mocks.authState
}));

vi.mock('../../services/orderService', () => ({
  orderService: {
    list: mocks.listMock
  }
}));

import { DashboardOverview } from './Overview';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

const renderDashboardOverview = (): void => {
  const queryClient = createQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <DashboardOverview />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const buildOrder = (overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> => ({
  id: 'order-1',
  orderNumber: 'ORD-1001',
  quotationNumber: 'QT-1001',
  quotationToken: 'quote-token',
  quotationExpiry: '2026-04-15T08:00:00.000Z',
  isQuotation: false,
  fulfilmentConfigured: true,
  type: 'delivery',
  status: 'processing',
  paymentStatus: 'paid',
  paymentMethod: 'bank_transfer',
  subtotal: 12000,
  shippingFee: 750,
  discount: 0,
  total: 12750,
  items: [],
  receipts: [],
  createdAt: '2026-04-06T08:00:00.000Z',
  updatedAt: '2026-04-08T06:15:00.000Z',
  estimatedDeliveryDays: '2-3',
  estimatedDeliveryDate: '2026-04-10T08:00:00.000Z',
  loyaltyPointsAwarded: 80,
  loyaltyPointsRedeemed: 0,
  loyaltyDiscount: 0,
  timeline: [
    {
      status: 'pending',
      note: 'Quotation created.',
      createdAt: '2026-04-06T08:00:00.000Z'
    },
    {
      status: 'processing',
      note: 'Payment receipt confirmed by admin.',
      createdAt: '2026-04-08T06:15:00.000Z'
    }
  ],
  ...overrides
});

describe('DashboardOverview', () => {
  beforeEach(() => {
    mocks.authState.user = {
      id: 'user-1',
      name: 'Nisal Fernando',
      email: 'nisal@example.com',
      phone: '',
      isEmailVerified: true,
      loyaltyPoints: 240
    };
    mocks.authState.addresses = [];
    mocks.listMock.mockReset();
  });

  it('shows the recent order timeline and quick actions', async () => {
    mocks.listMock.mockResolvedValue({
      data: [buildOrder()],
      pagination: {
        page: 1,
        limit: 5,
        total: 3,
        totalPages: 1
      }
    });

    renderDashboardOverview();

    expect(await screen.findByRole('heading', { name: /nisal/i })).toBeInTheDocument();
    expect(screen.getByText('Recent Order Timeline')).toBeInTheDocument();
    expect(await screen.findByText('Payment receipt confirmed by admin.')).toBeInTheDocument();
    expect(screen.getByText('Account Completion')).toBeInTheDocument();
    expect(screen.getByText('50% ready')).toBeInTheDocument();
    expect(screen.getByText('Add a phone number')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Track Orders$/ })).toHaveAttribute('href', '/dashboard/orders/order-1');
    expect(screen.getByRole('link', { name: /^Browse Wishlist$/ })).toHaveAttribute('href', '/dashboard/wishlist');
    expect(screen.getByRole('link', { name: /^Finish Account Setup$/ })).toHaveAttribute('href', '/dashboard/profile');
    expect(mocks.listMock).toHaveBeenCalledWith(1, 5, { sortBy: 'activity' });
  });

  it('uses the most recently active order returned by the activity-sorted query', async () => {
    mocks.listMock.mockResolvedValue({
      data: [
        buildOrder({
          id: 'order-older-but-active',
          orderNumber: 'ORD-1002',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-09T09:45:00.000Z',
          timeline: [
            {
              status: 'pending',
              note: 'Quotation created.',
              createdAt: '2026-04-02T08:00:00.000Z'
            },
            {
              status: 'processing',
              note: 'Replacement receipt was verified most recently.',
              createdAt: '2026-04-09T09:45:00.000Z'
            }
          ]
        }),
        buildOrder({
          id: 'order-newer-created',
          orderNumber: 'ORD-1003',
          createdAt: '2026-04-08T10:00:00.000Z',
          updatedAt: '2026-04-08T10:30:00.000Z',
          timeline: [
            {
              status: 'pending',
              note: 'Quotation created later, but activity is older.',
              createdAt: '2026-04-08T10:00:00.000Z'
            }
          ]
        })
      ],
      pagination: {
        page: 1,
        limit: 5,
        total: 2,
        totalPages: 1
      }
    });

    renderDashboardOverview();

    expect(await screen.findByText('ORD-1002')).toBeInTheDocument();
    expect(screen.getByText('Replacement receipt was verified most recently.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Track Order$/ })).toHaveAttribute('href', '/dashboard/orders/order-older-but-active');
    expect(mocks.listMock).toHaveBeenCalledWith(1, 5, { sortBy: 'activity' });
  });

  it('shows the empty state when the customer has not placed an order yet', async () => {
    mocks.authState.user = {
      ...mocks.authState.user,
      phone: '0771234567',
      isEmailVerified: false,
      loyaltyPoints: 0
    };
    mocks.listMock.mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        limit: 5,
        total: 0,
        totalPages: 1
      }
    });

    renderDashboardOverview();

    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
    expect(await screen.findByText('Once you request your first quotation, the latest status updates will appear here with a clear progress view.')).toBeInTheDocument();
    expect(screen.getByText('Account Completion')).toBeInTheDocument();
    expect(screen.getByText('50% ready')).toBeInTheDocument();

    const quotationLinks = screen.getAllByRole('link', { name: /Start New Quotation/i });
    expect(quotationLinks.some((link) => link.getAttribute('href') === '/checkout')).toBe(true);
  });
});
