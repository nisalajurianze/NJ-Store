export const analyticsQueryResult = {
  isLoading: false,
  isError: false,
  error: null,
  refetch: () => Promise.resolve(),
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
        { label: 'Total Revenue', value: 245000, delta: 18, currency: 'LKR' },
        { label: 'Total Orders', value: 104, delta: 12 },
        { label: 'New Customers', value: 18, delta: 4 },
        { label: 'Average Order Value', value: 12750, delta: 6, currency: 'LKR' }
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
      topProducts: [{ productId: 'prod-1', name: 'NJ Laser Printer', unitsSold: 9, revenue: 112000, trend: 14 }],
      lowStockAlerts: [],
      customerGrowth: [
        { date: '2026-03-01', totalCustomers: 56 },
        { date: '2026-03-02', totalCustomers: 62 }
      ],
      funnel: [
        { key: 'cart_activity', label: 'Cart Activity', count: 12 },
        { key: 'quotations', label: 'Quotations', count: 8 },
        { key: 'confirmed_orders', label: 'Confirmed Orders', count: 5 }
      ],
      geographicDistribution: [{ district: 'Colombo', orderCount: 3, revenue: 120000 }]
    }
  }
};

export const ordersQueryResult = {
  isLoading: false,
  isError: false,
  error: null,
  refetch: () => Promise.resolve(),
  data: {
    data: [
      {
        id: 'order-1',
        orderNumber: 'ORD-1001',
        status: 'processing',
        paymentStatus: 'receipt_uploaded',
        total: 2400,
        receipts: [
          {
            id: 'receipt-1',
            url: 'https://example.com/receipt-1.png',
            publicId: 'receipt-1',
            alt: 'Receipt 1'
          }
        ]
      }
    ]
  }
};

export const auditLogsQueryResult = {
  isLoading: false,
  isError: false,
  error: null,
  isFetching: false,
  refetch: () => Promise.resolve(),
  data: {
    data: [
      {
        id: 'audit-1',
        createdAt: '2026-03-31T10:15:00.000Z',
        actorEmail: 'admin@njstore.com',
        actorRole: 'admin',
        action: 'auth.login',
        targetLabel: 'Admin account',
        targetType: 'user',
        targetId: 'user-1',
        status: 'success',
        message: 'Admin signed in successfully.',
        metadata: {
          source: 'web'
        },
        ipAddress: '127.0.0.1'
      }
    ],
    pagination: {
      total: 1
    }
  }
};

export const buildAdminUser = (permissions: string[]) => ({
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@njstore.com',
  role: 'admin' as const,
  language: 'en' as const,
  isEmailVerified: true,
  loyaltyPoints: 0,
  permissions
});
