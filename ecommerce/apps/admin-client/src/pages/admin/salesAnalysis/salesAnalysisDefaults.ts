import type { SalesAnalysisDto } from '@njstore/types';

export const fallbackSalesAnalysis: SalesAnalysisDto = {
  snapshots: {
    today: { label: 'Today', revenue: 0, expenses: 0, net: 0, orderCount: 0 },
    monthToDate: { label: 'Month to date', revenue: 0, expenses: 0, net: 0, orderCount: 0 },
    yearToDate: { label: 'Year to date', revenue: 0, expenses: 0, net: 0, orderCount: 0 }
  },
  revenue: [],
  customerGrowth: [],
  dailySales: [],
  monthlySales: [],
  yearlySales: [],
  expenses: [],
  strongestMonth: null,
  rfmSegments: [],
  rfmCustomers: [],
  retentionCohorts: [],
  customerMining: {
    generatedAt: new Date().toISOString(),
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
};
