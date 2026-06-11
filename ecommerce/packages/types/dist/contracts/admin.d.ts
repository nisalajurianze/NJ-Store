import type { AnalyticsKpi, PaginatedResult, UserSummary } from './common.js';
import type { OrderDto } from './commerce.js';
import type { BrandDto, ProductCardDto } from './catalog.js';
export interface RevenuePointDto {
    date: string;
    revenue: number;
}
export interface StatusBreakdownDto {
    status: string;
    count: number;
}
export interface MonthlySalesDto {
    month: string;
    revenue: number;
}
export interface TopProductDto {
    productId: string;
    name: string;
    unitsSold: number;
    revenue: number;
    trend: number;
}
export interface CustomerGrowthDto {
    date: string;
    totalCustomers: number;
}
export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'custom';
export interface AnalyticsQueryDto {
    period?: AnalyticsPeriod;
    startDate?: string;
    endDate?: string;
}
export interface AnalyticsRangeDto {
    period: AnalyticsPeriod;
    startDate: string;
    endDate: string;
    comparisonStartDate: string;
    comparisonEndDate: string;
    label: string;
    comparisonLabel: string;
    days: number;
}
export interface AnalyticsFunnelStageDto {
    key: 'cart_activity' | 'quotations' | 'confirmed_orders';
    label: string;
    count: number;
}
export interface AnalyticsGeographicPointDto {
    district: string;
    orderCount: number;
    revenue: number;
}
export interface ExternalExpenseDto {
    id: string;
    label: string;
    amount: number;
    incurredOn: string;
    category: string;
    notes?: string;
}
export interface SalesPeriodPointDto {
    period: string;
    label: string;
    revenue: number;
    expenses: number;
    net: number;
    orderCount: number;
}
export interface SalesSnapshotDto {
    label: string;
    revenue: number;
    expenses: number;
    net: number;
    orderCount: number;
}
export type SalesRfmSegmentKey = 'champions' | 'atRisk' | 'new' | 'dormant';
export interface SalesRfmSegmentDto {
    key: SalesRfmSegmentKey;
    label: string;
    customerCount: number;
    totalRevenue: number;
    averageOrderValue: number;
    averageRecencyDays: number;
}
export interface SalesRfmCustomerDto {
    customerId: string;
    name: string;
    email: string;
    segmentKey: SalesRfmSegmentKey;
    segmentLabel: string;
    orderCount: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastOrderDate: string;
    daysSinceLastOrder: number;
}
export interface SalesRetentionCellDto {
    monthOffset: number;
    calendarMonth: string;
    calendarLabel: string;
    activeCustomers: number | null;
    retentionRate: number | null;
}
export interface SalesRetentionCohortDto {
    cohortMonth: string;
    cohortLabel: string;
    cohortSize: number;
    retention: SalesRetentionCellDto[];
}
export interface CustomerMiningSummaryDto {
    totalEvents: number;
    totalPageViews: number;
    totalProductViews: number;
    uniqueVisitors: number;
    repeatVisitors: number;
    returningVisitorRate: number;
    averagePageViewsPerVisitor: number;
    siteEngagementScore: number;
    cartIntentCount: number;
    wishlistIntentCount: number;
    searchCount: number;
}
export interface CustomerMiningProductDto {
    productId: string;
    name: string;
    slug?: string;
    brand?: string;
    category?: string;
    viewCount: number;
    cartAdds: number;
    wishlistAdds: number;
    demandScore: number;
    intentRate: number;
}
export interface CustomerMiningPageDto {
    path: string;
    pageType: string;
    viewCount: number;
    uniqueVisitors: number;
    share: number;
}
export type CustomerMiningSegmentKey = 'newVisitors' | 'repeatVisitors' | 'productExplorers' | 'buyingIntent';
export interface CustomerMiningSegmentDto {
    key: CustomerMiningSegmentKey;
    label: string;
    visitorCount: number;
    share: number;
    description: string;
}
export interface CustomerMiningDto {
    generatedAt: string;
    windowDays: number;
    summary: CustomerMiningSummaryDto;
    topProducts: CustomerMiningProductDto[];
    topPages: CustomerMiningPageDto[];
    segments: CustomerMiningSegmentDto[];
}
export interface LowStockAlertDto {
    productId: string;
    productName: string;
    variantSku: string;
    stock: number;
}
export type AdminNotificationKind = 'order' | 'payment' | 'return' | 'inventory' | 'question' | 'review';
export type AdminNotificationPriority = 'high' | 'medium' | 'low';
export interface AdminNotificationItemDto {
    id: string;
    kind: AdminNotificationKind;
    priority: AdminNotificationPriority;
    title: string;
    body: string;
    count: number;
    href: string;
    actionLabel: string;
    createdAt?: string;
}
export interface AdminNotificationCenterDto {
    items: AdminNotificationItemDto[];
    totalCount: number;
    highPriorityCount: number;
    generatedAt: string;
}
export interface AuditLogDto {
    id: string;
    actorUserId?: string;
    actorEmail?: string;
    actorRole: 'customer' | 'staff' | 'admin' | 'system';
    action: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    status: 'success' | 'failure' | 'blocked';
    message?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface AnalyticsSummaryDto {
    range: AnalyticsRangeDto;
    kpis: AnalyticsKpi[];
    revenue: RevenuePointDto[];
    statusBreakdown: StatusBreakdownDto[];
    monthlySales: MonthlySalesDto[];
    topProducts: TopProductDto[];
    lowStockAlerts: LowStockAlertDto[];
    customerGrowth: CustomerGrowthDto[];
    funnel: AnalyticsFunnelStageDto[];
    geographicDistribution: AnalyticsGeographicPointDto[];
}
export interface SalesAnalysisDto {
    snapshots: {
        today: SalesSnapshotDto;
        monthToDate: SalesSnapshotDto;
        yearToDate: SalesSnapshotDto;
    };
    revenue: RevenuePointDto[];
    customerGrowth: CustomerGrowthDto[];
    dailySales: SalesPeriodPointDto[];
    monthlySales: SalesPeriodPointDto[];
    yearlySales: SalesPeriodPointDto[];
    expenses: ExternalExpenseDto[];
    strongestMonth: SalesPeriodPointDto | null;
    rfmSegments: SalesRfmSegmentDto[];
    rfmCustomers: SalesRfmCustomerDto[];
    retentionCohorts: SalesRetentionCohortDto[];
    customerMining: CustomerMiningDto;
}
export interface AdminOrderCustomerDto {
    id: string;
    name: string;
    email: string;
    phone?: string;
    isEmailVerified: boolean;
}
export interface AdminOrderAssigneeDto {
    id: string;
    name: string;
    email: string;
}
export interface AdminOrderDto extends OrderDto {
    customer?: AdminOrderCustomerDto;
    assignedTo?: AdminOrderAssigneeDto;
}
export interface AdminOrderListDto extends PaginatedResult<AdminOrderDto> {
}
export interface AdminProductListDto extends PaginatedResult<ProductCardDto> {
}
export interface AdminBrandListDto extends PaginatedResult<BrandDto> {
}
export interface AdminUserLoginEntryDto {
    id: string;
    method: 'password' | 'google' | 'session';
    ipAddress?: string;
    userAgent?: string;
    rememberMe?: boolean;
    createdAt: string;
}
export interface AdminUserOrderStatsDto {
    totalOrders: number;
    totalSpend: number;
    lastOrderAt?: string;
}
export interface AdminUserSummaryDto extends UserSummary {
    orderStats: AdminUserOrderStatsDto;
}
export interface AdminUserListDto extends PaginatedResult<AdminUserSummaryDto> {
}
export interface AdminUserMergeResultDto {
    keepUser: UserSummary;
    mergedUserId: string;
    transferred: {
        orders: number;
        reviewsMoved: number;
        reviewsDiscarded: number;
        loyaltyTransactions: number;
        activeSessionsRevoked: number;
        wishlistItems: number;
        compareItems: number;
        cartItems: number;
        couponUsageEntriesRetargeted: number;
    };
}
export type BroadcastAudience = 'customers' | 'unverifiedCustomers' | 'newsletter' | 'all' | 'specificUsers';
export interface BroadcastAudienceSummaryDto {
    customers: number;
    unverifiedCustomers: number;
    newsletterSubscribers: number;
    totalUniqueRecipients: number;
}
export interface BroadcastCampaignInputDto {
    audience: BroadcastAudience;
    recipientUserIds?: string[];
    subject: string;
    previewText?: string;
    headline: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
}
export interface BroadcastDispatchDto {
    audience: BroadcastAudience;
    subject: string;
    requestedRecipients: number;
    sent: number;
    failed: number;
}
