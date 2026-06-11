import { describe, expect, it, vi } from 'vitest';
vi.mock('./pdfService.js', async (importOriginal) => await importOriginal());
import { generateAnalyticsPdfBuffer, generateOrderPdfBuffer, generateSalesAnalysisPdfBuffer } from './pdfService.js';
const analyticsFixture = {
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
    monthlySales: [{ month: 'Mar 26', revenue: 245000 }],
    topProducts: [{ productId: 'prod-1', name: 'NJ Laser Printer', unitsSold: 9, revenue: 112000, trend: 14 }],
    lowStockAlerts: [{ productId: 'prod-low', productName: 'NJ Wireless Mouse', variantSku: 'MOUSE-LOW', stock: 2 }],
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
};
const siteConfigFixture = {
    id: 'site-config-1',
    revision: 0,
    storeName: 'NJ Store',
    supportPhoneNumber: '+94 11 000 0000',
    whatsappNumber: '+94 77 000 0000',
    freeShippingThreshold: 15000,
    lowStockThreshold: 5,
    shippingRates: [{ city: 'Colombo', fee: 350, days: '2-3' }],
    loyaltyPointsRate: 10,
    cancellationWindowHours: 24,
    quotationExpiryDays: 7,
    bankTransferDetails: {
        accountName: 'NJ Store',
        bankName: 'Bank of Ceylon',
        branch: 'Colombo',
        accountNumber: '1234567890'
    },
    emailTemplates: []
};
const salesAnalysisFixture = {
    snapshots: {
        today: { label: 'Today', revenue: 15000, expenses: 2000, net: 13000, orderCount: 3 },
        monthToDate: { label: 'Month to date', revenue: 112000, expenses: 18500, net: 93500, orderCount: 18 },
        yearToDate: { label: 'Year to date', revenue: 980000, expenses: 126000, net: 854000, orderCount: 126 }
    },
    revenue: [
        { date: '2026-04-01', revenue: 14000 },
        { date: '2026-04-02', revenue: 18000 }
    ],
    customerGrowth: [
        { date: '2026-04-01', totalCustomers: 88 },
        { date: '2026-04-02', totalCustomers: 90 }
    ],
    dailySales: [
        { period: '2026-04-01', label: 'Apr 1', revenue: 14000, expenses: 2000, net: 12000, orderCount: 2 },
        { period: '2026-04-02', label: 'Apr 2', revenue: 18000, expenses: 0, net: 18000, orderCount: 3 }
    ],
    monthlySales: [
        { period: '2026-03', label: 'Mar 26', revenue: 88000, expenses: 12000, net: 76000, orderCount: 14 },
        { period: '2026-04', label: 'Apr 26', revenue: 112000, expenses: 18500, net: 93500, orderCount: 18 }
    ],
    yearlySales: [
        { period: '2025', label: '2025', revenue: 720000, expenses: 98000, net: 622000, orderCount: 94 },
        { period: '2026', label: '2026', revenue: 980000, expenses: 126000, net: 854000, orderCount: 126 }
    ],
    expenses: [
        {
            id: 'expense-1',
            label: 'Warehouse rent',
            amount: 45000,
            incurredOn: '2026-04-01T00:00:00.000Z',
            category: 'Operations',
            notes: 'April lease'
        }
    ],
    strongestMonth: {
        period: '2026-04',
        label: 'Apr 26',
        revenue: 112000,
        expenses: 18500,
        net: 93500,
        orderCount: 18
    },
    rfmSegments: [
        { key: 'champions', label: 'Champions', customerCount: 4, totalRevenue: 220000, averageOrderValue: 27500, averageRecencyDays: 5 },
        { key: 'atRisk', label: 'At Risk', customerCount: 3, totalRevenue: 78000, averageOrderValue: 19500, averageRecencyDays: 63 },
        { key: 'new', label: 'New', customerCount: 5, totalRevenue: 54000, averageOrderValue: 10800, averageRecencyDays: 9 },
        { key: 'dormant', label: 'Dormant', customerCount: 2, totalRevenue: 18000, averageOrderValue: 9000, averageRecencyDays: 141 }
    ],
    rfmCustomers: [
        {
            customerId: 'customer-1',
            name: 'Ayesha',
            email: 'ayesha@example.com',
            segmentKey: 'champions',
            segmentLabel: 'Champions',
            orderCount: 4,
            totalRevenue: 86000,
            averageOrderValue: 21500,
            lastOrderDate: '2026-04-02T00:00:00.000Z',
            daysSinceLastOrder: 2
        }
    ],
    retentionCohorts: [
        {
            cohortMonth: '2026-02',
            cohortLabel: 'Feb 26',
            cohortSize: 6,
            retention: [
                { monthOffset: 0, calendarMonth: '2026-02', calendarLabel: 'Feb 26', activeCustomers: 6, retentionRate: 1 },
                { monthOffset: 1, calendarMonth: '2026-03', calendarLabel: 'Mar 26', activeCustomers: 3, retentionRate: 0.5 },
                { monthOffset: 2, calendarMonth: '2026-04', calendarLabel: 'Apr 26', activeCustomers: 2, retentionRate: 0.33 }
            ]
        }
    ],
    customerMining: {
        generatedAt: '2026-04-03T00:00:00.000Z',
        windowDays: 30,
        summary: {
            totalEvents: 48,
            totalPageViews: 24,
            totalProductViews: 12,
            uniqueVisitors: 10,
            repeatVisitors: 4,
            returningVisitorRate: 0.4,
            averagePageViewsPerVisitor: 2.4,
            siteEngagementScore: 74,
            cartIntentCount: 6,
            wishlistIntentCount: 3,
            searchCount: 5
        },
        topProducts: [],
        topPages: [],
        segments: []
    }
};
const orderFixture = {
    id: 'order-1',
    orderNumber: 'ORD-1001',
    quotationNumber: 'QTN-1001',
    quotationExpiry: '2026-04-12T00:00:00.000Z',
    isQuotation: true,
    fulfilmentConfigured: true,
    type: 'delivery',
    status: 'pending',
    paymentStatus: 'unpaid',
    paymentMethod: 'bank_transfer',
    subtotal: 125000,
    shippingFee: 750,
    discount: 5000,
    taxAmount: 0,
    total: 120750,
    shippingAddress: {
        label: 'Office',
        fullName: 'Ayesha Perera',
        line1: '42 Lake Road',
        city: 'Colombo',
        district: 'Colombo',
        postalCode: '00300',
        country: 'Sri Lanka',
        phone: '+94 77 111 2222',
        isDefault: true
    },
    items: [
        {
            product: 'product-1',
            name: 'NJ Laser Printer',
            slug: 'nj-laser-printer',
            quantity: 2,
            price: 62500,
            variantLabel: 'Wi-Fi',
            sku: 'NJP-WIFI'
        }
    ],
    receipts: [],
    createdAt: '2026-04-05T00:00:00.000Z',
    updatedAt: '2026-04-05T00:00:00.000Z',
    loyaltyPointsAwarded: 0,
    loyaltyPointsRedeemed: 0,
    loyaltyDiscount: 0,
    timeline: []
};
describe('generateOrderPdfBuffer', () => {
    it('creates a valid branded quotation PDF buffer', async () => {
        const buffer = await generateOrderPdfBuffer(orderFixture, siteConfigFixture, 'QUOTATION', 'ayesha@example.com', 'Ayesha Perera');
        expect(buffer.byteLength).toBeGreaterThan(1000);
        expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
});
describe('generateAnalyticsPdfBuffer', () => {
    it('creates a valid PDF buffer for dashboard analytics exports', async () => {
        const buffer = await generateAnalyticsPdfBuffer(analyticsFixture, siteConfigFixture);
        expect(buffer.byteLength).toBeGreaterThan(1000);
        expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
});
describe('generateSalesAnalysisPdfBuffer', () => {
    it('creates a valid PDF buffer for sales analysis exports', async () => {
        const buffer = await generateSalesAnalysisPdfBuffer(salesAnalysisFixture, siteConfigFixture);
        expect(buffer.byteLength).toBeGreaterThan(1000);
        expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
});
