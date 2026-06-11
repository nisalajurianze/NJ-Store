import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exportAnalyticsPdfMock: vi.fn(),
  navigateMock: vi.fn(),
  useQueryMock: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigateMock
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    analytics: vi.fn(),
    exportAnalyticsPdf: mocks.exportAnalyticsPdfMock
  }
}));

import { Dashboard } from './Dashboard';

describe('Admin Dashboard page', () => {
  beforeEach(() => {
    mocks.exportAnalyticsPdfMock.mockReset();
    mocks.exportAnalyticsPdfMock.mockResolvedValue(undefined);
    mocks.navigateMock.mockReset();
    mocks.useQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      data: {
        data: {
          range: {
            period: '30d',
            startDate: '2026-03-01T00:00:00.000Z',
            endDate: '2026-03-30T23:59:59.999Z',
            comparisonStartDate: '2026-01-30T00:00:00.000Z',
            comparisonEndDate: '2026-02-28T23:59:59.999Z',
            label: '1 Mar - 30 Mar 2026',
            comparisonLabel: '30 Jan - 28 Feb 2026',
            days: 30
          },
          kpis: [
            { label: 'Total Revenue', value: 245000, delta: 18, currency: true },
            { label: 'Total Orders', value: 104, delta: 12 },
            { label: 'New Customers', value: 18, delta: 4 },
            { label: 'Average Order Value', value: 12750, delta: 6, currency: true }
          ],
          revenue: [
            { date: '2026-03-01', revenue: 80000 },
            { date: '2026-03-02', revenue: 91000 }
          ],
          statusBreakdown: [
            { status: 'processing', count: 11 },
            { status: 'shipped', count: 7 },
            { status: 'delivered', count: 5 }
          ],
          monthlySales: [{ month: 'Mar', revenue: 245000 }],
          topProducts: [
            { productId: 'prod-1', name: 'NJ Laser Printer', unitsSold: 9, revenue: 112000, trend: 14 },
            { productId: 'prod-2', name: 'USB-C Dock', unitsSold: 7, revenue: 82000, trend: 8 },
            { productId: 'prod-3', name: 'Laptop Sleeve', unitsSold: 6, revenue: 24000, trend: 0 },
            { productId: 'prod-4', name: 'Studio Monitor', unitsSold: 4, revenue: 156000, trend: -6 },
            { productId: 'prod-5', name: 'Wireless Keyboard', unitsSold: 3, revenue: 45000, trend: 12 },
            { productId: 'prod-6', name: 'Desk Charger', unitsSold: 2, revenue: 18000, trend: 3 },
            { productId: 'prod-7', name: 'Phone Stand', unitsSold: 2, revenue: 9000, trend: 5 },
            { productId: 'prod-8', name: 'HDMI Cable', unitsSold: 2, revenue: 7000, trend: 2 },
            { productId: 'prod-9', name: 'Mouse Pad', unitsSold: 1, revenue: 4500, trend: 0 },
            { productId: 'prod-10', name: 'Cleaning Kit', unitsSold: 1, revenue: 3500, trend: -2 },
            { productId: 'prod-11', name: 'Hidden Product', unitsSold: 1, revenue: 1800, trend: 3 }
          ],
          lowStockAlerts: [
            { productId: 'prod-low', productName: 'NJ Wireless Mouse', variantSku: 'MOUSE-LOW', stock: 2 }
          ],
          customerGrowth: [
            { date: '2026-03-01', totalCustomers: 56 },
            { date: '2026-03-02', totalCustomers: 62 }
          ],
          funnel: [
            { key: 'cart_activity', label: 'Cart Activity', count: 12 },
            { key: 'quotations', label: 'Quotations', count: 8 },
            { key: 'confirmed_orders', label: 'Confirmed Orders', count: 5 }
          ],
          geographicDistribution: [
            { district: 'Colombo', orderCount: 3, revenue: 120000 }
          ]
        }
      }
    });
  });

  it('tracks live queue totals from the status breakdown instead of the paid-order KPI', () => {
    render(<Dashboard />);

    const trackedOrdersCard = screen.getByText('Tracked').parentElement;

    expect(trackedOrdersCard).not.toBeNull();
    expect(within(trackedOrdersCard as HTMLElement).getByText('23')).toBeInTheDocument();
    expect(within(trackedOrdersCard as HTMLElement).queryByText('104')).not.toBeInTheDocument();
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('104')).toBeInTheDocument();
    expect(screen.getByText(/11 tracked orders in the current queue/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Mar - 30 Mar 2026: revenue, orders, customers, products, stock, and demand\./i)).toBeInTheDocument();
  });

  it('keeps the dashboard top-products table to ten rows and opens the full sales list', async () => {
    const user = userEvent.setup();

    render(<Dashboard />);

    expect(screen.getByText('Cleaning Kit')).toBeInTheDocument();
    expect(screen.queryByText('Hidden Product')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View all' }));

    expect(await screen.findByText('All Product Sales')).toBeInTheDocument();
    expect(screen.getByText('Hidden Product')).toBeInTheDocument();
  });

  it('routes the summary cards to their relevant admin workspaces', async () => {
    const user = userEvent.setup();

    render(<Dashboard />);

    await screen.findByText('Monthly Sales', {}, { timeout: 5000 });
    await user.click(await screen.findByLabelText('Open sales analysis', {}, { timeout: 5000 }));
    expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard/sales-analysis');

    await user.click(screen.getByLabelText('Open customer analysis'));
    expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard/customer-analysis');

    await user.click(screen.getByRole('button', { name: /Leading status/i }));
    expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard/orders?status=processing');

    await user.click(screen.getByRole('button', { name: /Strongest month/i }));
    expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard/orders?payment=paid');

    await user.click(screen.getByRole('button', { name: /Watchlist/i }));
    expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard/inventory?filter=low_stock');
  }, 10000);

  it('opens inventory from a low-stock restock action', async () => {
    const user = userEvent.setup();

    render(<Dashboard />);

    await user.click(screen.getByRole('button', { name: 'Restock' }));
    expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard/inventory?filter=low_stock&edit=prod-low');
  });

  it('exports a dashboard PDF for the selected period', async () => {
    const user = userEvent.setup();

    render(<Dashboard />);

    await user.click(screen.getByRole('button', { name: 'Dashboard PDF' }));
    expect(mocks.exportAnalyticsPdfMock).toHaveBeenCalledWith({ period: '30d' });
  });
});
