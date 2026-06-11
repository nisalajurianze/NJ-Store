import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auditLogsQueryResult, buildAdminUser, analyticsQueryResult, ordersQueryResult } from '../test/fixtures/adminRouteFixtures';

const mocks = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useAdminAuthMock: vi.fn()
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');

  return {
    ...actual,
    useQuery: mocks.useQueryMock
  };
});

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: mocks.useAdminAuthMock
}));

vi.mock('../components/dashboard/DashboardCharts', () => ({
  RevenueTrendCard: () => <div>Revenue trend chart</div>,
  GrowthCharts: () => <div>Growth charts</div>
}));

import { AppRouter } from './router';
import { renderAdminRoute } from '../test/renderAdminRoute';

describe('Admin router', () => {
  const setAdminUser = (adminPermissions: string[]) => {
    mocks.useAdminAuthMock.mockReturnValue({
      user: buildAdminUser(adminPermissions),
      accessToken: 'token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn()
    });
  };

  beforeEach(() => {
    setAdminUser(['order:read', 'product:read', 'user:read']);
    mocks.useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      const [domain, scope] = queryKey;

      if (domain === 'admin-notifications') {
        return {
          isLoading: false,
          isError: false,
          error: null,
          refetch: () => Promise.resolve(),
          data: {
            data: {
              items: [],
              totalCount: 0,
              highPriorityCount: 0
            }
          }
        };
      }

      if (scope === 'analytics') {
        return analyticsQueryResult;
      }

      if (scope === 'orders') {
        return ordersQueryResult;
      }

      if (scope === 'users') {
        return {
          isLoading: false,
          isError: false,
          error: null,
          refetch: () => Promise.resolve(),
          data: {
            data: []
          }
        };
      }

      if (scope === 'manual-order-products') {
        return {
          isLoading: false,
          isError: false,
          error: null,
          refetch: () => Promise.resolve(),
          data: {
            data: []
          }
        };
      }

      if (scope === 'audit-logs') {
        return auditLogsQueryResult;
      }

      throw new Error(`Unexpected admin query: ${JSON.stringify(queryKey)}`);
    });
  });

  it('renders the dashboard through the protected admin route and layout', async () => {
    renderAdminRoute(<AppRouter />);

    expect(await screen.findByText('Admin Overview', undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('NJ Store')).toBeInTheDocument();
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getByText('Catalog')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByTestId('router-pathname')).toHaveTextContent('/dashboard');
    const trackedOrdersCard = screen.getByText('Tracked').parentElement;
    expect(trackedOrdersCard).not.toBeNull();
    expect(trackedOrdersCard).toHaveTextContent('23');
    expect(screen.getByText(/revenue, orders, customers, products, stock, and demand\./i)).toBeInTheDocument();
  });

  it('redirects a limited admin from overview to the first permitted route', async () => {
    setAdminUser(['order:read']);

    renderAdminRoute(<AppRouter />, { initialEntries: ['/dashboard'] });

    expect(await screen.findByRole('heading', { name: 'Orders' })).toBeInTheDocument();
    expect(screen.getByTestId('router-pathname')).toHaveTextContent('/dashboard/orders');
    expect(screen.getByText('ORD-1001')).toBeInTheDocument();
    expect(screen.queryByText('Admin Overview')).not.toBeInTheDocument();
  });

  it('shows the limited-access state when an admin has no accessible pages', async () => {
    setAdminUser(['setting:write']);

    renderAdminRoute(<AppRouter />, { initialEntries: ['/dashboard'] });

    expect(await screen.findByText('Access limited')).toBeInTheDocument();
    expect(screen.getByTestId('router-pathname')).toHaveTextContent('/dashboard');
    expect(
      screen.getByText(/This account is active, but it does not currently have any admin page access\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your admin account is signed in, but it does not have permission to open this area yet\./i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Admin Overview')).not.toBeInTheDocument();
  });

  it('renders the audit logs route for admins with the required permission', async () => {
    setAdminUser(['user:read']);

    renderAdminRoute(<AppRouter />, { initialEntries: ['/dashboard/audit-logs'] });

    expect(await screen.findByRole('heading', { name: 'Audit Logs' })).toBeInTheDocument();
    expect(screen.getByTestId('router-pathname')).toHaveTextContent('/dashboard/audit-logs');
    expect(screen.getByText('auth / login')).toBeInTheDocument();
    expect(screen.getByText('Admin signed in successfully.')).toBeInTheDocument();
  });
});
