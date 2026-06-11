import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQueryMock: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    salesAnalysis: vi.fn()
  }
}));

import { CustomerAnalysis } from './CustomerAnalysis';

const customerAnalysisQueryResult = {
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  data: {
    data: {
      snapshots: {
        today: { label: 'Today', revenue: 0, expenses: 0, net: 0, orderCount: 0 },
        monthToDate: { label: 'Month to date', revenue: 0, expenses: 0, net: 0, orderCount: 0 },
        yearToDate: { label: 'Year to date', revenue: 0, expenses: 0, net: 0, orderCount: 0 }
      },
      revenue: [],
      customerGrowth: [
        { date: '2026-04-02', totalCustomers: 50 },
        { date: '2026-04-03', totalCustomers: 51 }
      ],
      dailySales: [],
      monthlySales: [],
      yearlySales: [],
      expenses: [],
      strongestMonth: null,
      rfmSegments: [],
      rfmCustomers: [],
      retentionCohorts: [],
      customerMining: {
        generatedAt: '2026-04-03T00:00:00.000Z',
        windowDays: 30,
        summary: {
          totalEvents: 0,
          totalPageViews: 0,
          totalProductViews: 0,
          uniqueVisitors: 0,
          repeatVisitors: 0,
          returningVisitorRate: 0,
          averagePageViewsPerVisitor: 0,
          siteEngagementScore: 0,
          cartIntentCount: 0,
          wishlistIntentCount: 0,
          searchCount: 0
        },
        topProducts: [],
        topPages: [],
        segments: []
      }
    }
  }
};

describe('Customer Analysis page', () => {
  beforeEach(() => {
    mocks.useQueryMock.mockReset();
    mocks.useQueryMock.mockReturnValue(customerAnalysisQueryResult);
  });

  it('renders customer analytics in the dedicated workspace', () => {
    render(
      <MemoryRouter>
        <CustomerAnalysis />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Customer Analysis' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sales Analysis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Customer Growth' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Customer Behavior Mining' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Customer Retention Cohorts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Customer RFM Segments' })).toBeInTheDocument();
    expect(mocks.useQueryMock).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['admin', 'sales-analysis'] }));
  });
});
