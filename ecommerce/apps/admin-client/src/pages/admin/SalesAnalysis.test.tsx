import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createExternalExpenseMock: vi.fn(),
  deleteExternalExpenseMock: vi.fn(),
  exportSalesAnalysisPdfMock: vi.fn(),
  hasPermissionsMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  updateExternalExpenseMock: vi.fn(),
  useQueryMock: vi.fn(),
  writeXlsxFileMock: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock,
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueriesMock
  })
}));

vi.mock('../../hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    hasPermissions: mocks.hasPermissionsMock
  })
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    salesAnalysis: vi.fn(),
    createExternalExpense: mocks.createExternalExpenseMock,
    updateExternalExpense: mocks.updateExternalExpenseMock,
    deleteExternalExpense: mocks.deleteExternalExpenseMock,
    exportSalesAnalysisPdf: mocks.exportSalesAnalysisPdfMock
  }
}));

vi.mock('write-excel-file/browser', () => ({
  default: mocks.writeXlsxFileMock
}));

import { SalesAnalysis } from './SalesAnalysis';

const renderSalesAnalysis = (ui: ReactNode = <SalesAnalysis />) => render(<MemoryRouter>{ui}</MemoryRouter>);

const salesAnalysisQueryResult = {
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  data: {
    data: {
      snapshots: {
        today: { label: 'Today', revenue: 1000, expenses: 200, net: 800, orderCount: 1 },
        monthToDate: { label: 'Month to date', revenue: 4000, expenses: 500, net: 3500, orderCount: 2 },
        yearToDate: { label: 'Year to date', revenue: 4000, expenses: 500, net: 3500, orderCount: 2 }
      },
      revenue: [
        { date: '2026-04-02', revenue: 3000 },
        { date: '2026-04-03', revenue: 1000 }
      ],
      customerGrowth: [
        { date: '2026-04-02', totalCustomers: 12 },
        { date: '2026-04-03', totalCustomers: 13 }
      ],
      dailySales: [
        { period: '2026-04-02', label: 'Apr 2', revenue: 3000, expenses: 300, net: 2700, orderCount: 1 },
        { period: '2026-04-03', label: 'Apr 3', revenue: 1000, expenses: 200, net: 800, orderCount: 1 }
      ],
      monthlySales: [
        { period: '2026-03', label: 'Mar 26', revenue: 2500, expenses: 0, net: 2500, orderCount: 1 },
        { period: '2026-04', label: 'Apr 26', revenue: 4000, expenses: 500, net: 3500, orderCount: 2 }
      ],
      yearlySales: [
        { period: '2025', label: '2025', revenue: 15000, expenses: 2000, net: 13000, orderCount: 9 },
        { period: '2026', label: '2026', revenue: 4000, expenses: 500, net: 3500, orderCount: 2 }
      ],
      expenses: [
        {
          id: 'expense-1',
          label: 'Warehouse rent',
          amount: 45000,
          incurredOn: '2026-04-01T00:00:00.000Z',
          category: 'Operations',
          notes: 'April rent'
        }
      ],
      strongestMonth: {
        period: '2026-04',
        label: 'Apr 26',
        revenue: 4000,
        expenses: 500,
        net: 3500,
        orderCount: 2
      },
      rfmSegments: [
        { key: 'champions', label: 'Champions', customerCount: 1, totalRevenue: 12000, averageOrderValue: 4000, averageRecencyDays: 3 },
        { key: 'atRisk', label: 'At Risk', customerCount: 1, totalRevenue: 4500, averageOrderValue: 2250, averageRecencyDays: 68 },
        { key: 'new', label: 'New', customerCount: 1, totalRevenue: 1800, averageOrderValue: 1800, averageRecencyDays: 4 },
        { key: 'dormant', label: 'Dormant', customerCount: 1, totalRevenue: 2500, averageOrderValue: 2500, averageRecencyDays: 140 }
      ],
      rfmCustomers: [
        {
          customerId: 'customer-1',
          name: 'Ayesha Perera',
          email: 'ayesha@example.com',
          segmentKey: 'champions',
          segmentLabel: 'Champions',
          orderCount: 3,
          totalRevenue: 12000,
          averageOrderValue: 4000,
          lastOrderDate: '2026-04-03T00:00:00.000Z',
          daysSinceLastOrder: 3
        },
        {
          customerId: 'customer-2',
          name: 'Nimal Silva',
          email: 'nimal@example.com',
          segmentKey: 'atRisk',
          segmentLabel: 'At Risk',
          orderCount: 2,
          totalRevenue: 4500,
          averageOrderValue: 2250,
          lastOrderDate: '2026-01-25T00:00:00.000Z',
          daysSinceLastOrder: 68
        }
      ],
      retentionCohorts: [
        {
          cohortMonth: '2026-02',
          cohortLabel: 'Feb 26',
          cohortSize: 2,
          retention: [
            { monthOffset: 0, calendarMonth: '2026-02', calendarLabel: 'Feb 26', activeCustomers: 2, retentionRate: 1 },
            { monthOffset: 1, calendarMonth: '2026-03', calendarLabel: 'Mar 26', activeCustomers: 1, retentionRate: 0.5 },
            { monthOffset: 2, calendarMonth: '2026-04', calendarLabel: 'Apr 26', activeCustomers: 0, retentionRate: 0 },
            { monthOffset: 3, calendarMonth: '2026-05', calendarLabel: 'May 26', activeCustomers: null, retentionRate: null },
            { monthOffset: 4, calendarMonth: '2026-06', calendarLabel: 'Jun 26', activeCustomers: null, retentionRate: null },
            { monthOffset: 5, calendarMonth: '2026-07', calendarLabel: 'Jul 26', activeCustomers: null, retentionRate: null }
          ]
        },
        {
          cohortMonth: '2026-04',
          cohortLabel: 'Apr 26',
          cohortSize: 1,
          retention: [
            { monthOffset: 0, calendarMonth: '2026-04', calendarLabel: 'Apr 26', activeCustomers: 1, retentionRate: 1 },
            { monthOffset: 1, calendarMonth: '2026-05', calendarLabel: 'May 26', activeCustomers: null, retentionRate: null },
            { monthOffset: 2, calendarMonth: '2026-06', calendarLabel: 'Jun 26', activeCustomers: null, retentionRate: null },
            { monthOffset: 3, calendarMonth: '2026-07', calendarLabel: 'Jul 26', activeCustomers: null, retentionRate: null },
            { monthOffset: 4, calendarMonth: '2026-08', calendarLabel: 'Aug 26', activeCustomers: null, retentionRate: null },
            { monthOffset: 5, calendarMonth: '2026-09', calendarLabel: 'Sep 26', activeCustomers: null, retentionRate: null }
          ]
        }
      ],
      customerMining: {
        generatedAt: '2026-04-03T00:00:00.000Z',
        windowDays: 30,
        summary: {
          totalEvents: 48,
          totalPageViews: 22,
          totalProductViews: 14,
          uniqueVisitors: 9,
          repeatVisitors: 4,
          returningVisitorRate: 0.44,
          averagePageViewsPerVisitor: 2.44,
          siteEngagementScore: 67,
          cartIntentCount: 3,
          wishlistIntentCount: 2,
          searchCount: 5
        },
        topProducts: [
          {
            productId: 'product-1',
            name: 'Galaxy S24 Ultra',
            slug: 'galaxy-s24-ultra',
            brand: 'Samsung',
            category: 'Smartphones',
            viewCount: 9,
            cartAdds: 2,
            wishlistAdds: 1,
            demandScore: 20,
            intentRate: 0.33
          }
        ],
        topPages: [
          {
            path: '/product/galaxy-s24-ultra',
            pageType: 'product_detail',
            viewCount: 9,
            uniqueVisitors: 5,
            share: 0.41
          }
        ],
        segments: [
          {
            key: 'repeatVisitors',
            label: 'Repeat visitors',
            visitorCount: 4,
            share: 0.44,
            description: 'Visitors who came back or opened more than one page.'
          },
          {
            key: 'buyingIntent',
            label: 'Buying intent',
            visitorCount: 3,
            share: 0.33,
            description: 'Visitors who added products to cart or wishlist.'
          }
        ]
      }
    }
  }
};

describe('Sales Analysis page', () => {
  beforeEach(() => {
    mocks.createExternalExpenseMock.mockReset();
    mocks.deleteExternalExpenseMock.mockReset();
    mocks.exportSalesAnalysisPdfMock.mockReset();
    mocks.hasPermissionsMock.mockReset();
    mocks.invalidateQueriesMock.mockReset();
    mocks.updateExternalExpenseMock.mockReset();
    mocks.useQueryMock.mockReset();
    mocks.writeXlsxFileMock.mockReset();

    mocks.createExternalExpenseMock.mockResolvedValue(undefined);
    mocks.deleteExternalExpenseMock.mockResolvedValue(undefined);
    mocks.exportSalesAnalysisPdfMock.mockResolvedValue(undefined);
    mocks.hasPermissionsMock.mockImplementation((permission: string) => permission === 'setting:write');
    mocks.invalidateQueriesMock.mockResolvedValue(undefined);
    mocks.updateExternalExpenseMock.mockResolvedValue(undefined);
    mocks.useQueryMock.mockReturnValue(salesAnalysisQueryResult);
    mocks.writeXlsxFileMock.mockResolvedValue(undefined);
  });

  it('renders the switched sales cadence workspace and keeps tracked expenses behind the expense icon', async () => {
    const user = userEvent.setup();

    renderSalesAnalysis();

    expect(screen.getByRole('heading', { name: 'Sales Analysis' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Customer Analysis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Daily Sales' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Revenue Forecast' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Customer Growth' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Customer Behavior Mining' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Customer Retention Cohorts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Customer RFM Segments' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Revenue Forecast chart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daily' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Monthly' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Yearly' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: 'Daily Sales chart' })).toBeInTheDocument();
    expect(screen.getAllByText('Apr 3').length).toBeGreaterThan(0);
    expect(screen.getByText('LKR 500')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tracked Expenses' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open tracked expenses' }));

    const ledgerDialog = await screen.findByRole('dialog', { name: 'Tracked Expenses' });

    expect(within(ledgerDialog).getByText('Warehouse rent')).toBeInTheDocument();
    expect(within(ledgerDialog).getByText('April rent')).toBeInTheDocument();
    expect(within(ledgerDialog).getAllByText('Operations').length).toBeGreaterThan(0);
  });

  it('switches the sales cadence panel between daily, monthly, and yearly views', async () => {
    const user = userEvent.setup();

    renderSalesAnalysis();

    await user.click(screen.getByRole('button', { name: 'Monthly' }));

    expect(screen.getByRole('heading', { name: 'Monthly Sales' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monthly' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Monthly Sales chart' })).toBeInTheDocument();
    expect(screen.getAllByText('Mar 26').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Yearly' }));

    expect(screen.getByRole('heading', { name: 'Yearly Sales' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yearly' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Yearly Sales chart' })).toBeInTheDocument();
    expect(screen.getAllByText('2026').length).toBeGreaterThan(0);
  });

  it('creates a manual outgoing expense and refreshes the analysis', async () => {
    const user = userEvent.setup();

    renderSalesAnalysis(
      <>
        <SalesAnalysis />
        <Toaster position="top-right" />
      </>
    );

    fireEvent.change(screen.getByLabelText('Expense Label'), { target: { value: 'Utility bill' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '3200' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-04-03' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Utilities' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Electricity payment' } });
    await user.click(screen.getByRole('button', { name: 'Add Expense' }));

    expect(mocks.createExternalExpenseMock).toHaveBeenCalledWith({
      label: 'Utility bill',
      amount: 3200,
      incurredOn: '2026-04-03',
      category: 'Utilities',
      notes: 'Electricity payment'
    });
    expect(mocks.invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['admin', 'sales-analysis'] });
    expect(await screen.findByText('Expense added to sales analysis.')).toBeInTheDocument();
  });

  it('opens the tracked expenses ledger modal from the manual outgoing costs icon', async () => {
    const user = userEvent.setup();

    renderSalesAnalysis();

    await user.click(screen.getByRole('button', { name: 'Open tracked expenses' }));

    expect(await screen.findByRole('dialog', { name: 'Tracked Expenses' })).toBeInTheDocument();
  });

  it('exports the sales analysis workbook from the header action', async () => {
    const user = userEvent.setup();

    renderSalesAnalysis();

    await user.click(screen.getByRole('button', { name: 'Export Excel' }));

    await waitFor(() => {
      expect(mocks.writeXlsxFileMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          sheets: expect.arrayContaining(['Snapshots', 'Daily Sales', 'Tracked Expenses']),
          fileName: expect.stringMatching(/^njstore-sales-analysis-\d{4}-\d{2}-\d{2}\.xlsx$/)
        })
      );
    });
  });

  it('exports the sales analysis PDF from the header action', async () => {
    const user = userEvent.setup();

    renderSalesAnalysis();

    await user.click(screen.getByRole('button', { name: 'Export PDF' }));

    expect(mocks.exportSalesAnalysisPdfMock).toHaveBeenCalledWith();
  });
});
