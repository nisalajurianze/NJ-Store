import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as null | {
      id: string;
      name: string;
      email: string;
      isEmailVerified: boolean;
    },
    loading: false
  },
  getQuotationByTokenMock: vi.fn(),
  navigateMock: vi.fn()
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mocks.authState
}));

vi.mock('../services/orderService', () => ({
  orderService: {
    getQuotationByToken: mocks.getQuotationByTokenMock
  }
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock
  };
});

import { QuotationConfirm } from './QuotationConfirm';

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

const renderQuotationConfirm = (entry = '/quotation/confirm?token=quote-token', queryClient = createQueryClient()): QueryClient => {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[entry]}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <QuotationConfirm />
        <Toaster position="top-right" />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return queryClient;
};

describe('QuotationConfirm', () => {
  beforeEach(() => {
    mocks.authState.user = {
      id: 'user-1',
      name: 'Verified Shopper',
      email: 'shopper@example.com',
      isEmailVerified: true
    };
    mocks.authState.loading = false;
    mocks.getQuotationByTokenMock.mockReset();
    mocks.navigateMock.mockReset();
  });

  it('shows the API error message when opening a quotation fails', async () => {
    mocks.getQuotationByTokenMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'This quotation token has already been used'
        }
      }
    });

    renderQuotationConfirm();

    expect(await screen.findAllByText('This quotation token has already been used')).toHaveLength(2);
  });

  it('navigates to the quotation detail page after opening it', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mocks.getQuotationByTokenMock.mockResolvedValue({
      data: {
        id: 'order-42'
      }
    });

    renderQuotationConfirm('/quotation/confirm?token=quote-token', queryClient);

    await waitFor(() => {
      expect(mocks.getQuotationByTokenMock).toHaveBeenCalledWith('quote-token');
    });

    expect(await screen.findByText('Quotation opened')).toBeInTheDocument();
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
      expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard/orders/order-42', { replace: true });
    });
  });

  it('redirects unauthenticated shoppers to login before attempting to open the quotation', async () => {
    mocks.authState.user = null;

    renderQuotationConfirm();

    await waitFor(() => {
      expect(mocks.navigateMock).toHaveBeenCalledWith('/auth/login', {
        replace: true,
        state: {
          from: '/quotation/confirm?token=quote-token'
        }
      });
    });
    expect(mocks.getQuotationByTokenMock).not.toHaveBeenCalled();
  });

  it('redirects unverified shoppers to the verification section and shows a toast', async () => {
    mocks.authState.user = {
      id: 'user-2',
      name: 'Unverified Shopper',
      email: 'pending@example.com',
      isEmailVerified: false
    };

    renderQuotationConfirm();

    expect(await screen.findByText('Verify your email in profile before confirming the order.')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard/security?section=verification', { replace: true });
    });
    expect(mocks.getQuotationByTokenMock).not.toHaveBeenCalled();
  });

  it('shows the incomplete-link state when the confirmation token is missing', async () => {
    renderQuotationConfirm('/quotation/confirm');

    expect(await screen.findByText('This confirmation link is missing its quotation token.')).toBeInTheDocument();
    expect(screen.getByText('The confirmation link is incomplete. Use the email link again or sign in to view your dashboard orders.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Orders' })).toHaveAttribute('href', '/dashboard/orders');
    expect(mocks.getQuotationByTokenMock).not.toHaveBeenCalled();
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it('shows a login shortcut for signed-out shoppers when the token is missing', async () => {
    mocks.authState.user = null;

    renderQuotationConfirm('/quotation/confirm');

    expect(await screen.findByRole('link', { name: 'Go to Login' })).toHaveAttribute('href', '/auth/login');
    expect(screen.queryByRole('link', { name: 'Go to Orders' })).not.toBeInTheDocument();
  });
});
