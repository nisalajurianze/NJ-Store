import { useQuery } from '@tanstack/react-query';
import type {
  AnalyticsFunnelStageDto,
  AnalyticsKpi,
  AnalyticsPeriod,
  AnalyticsSummaryDto,
  CustomerGrowthDto,
  MonthlySalesDto,
  StatusBreakdownDto,
  TopProductDto
} from '@njstore/types';
import { Button, Card, DatePicker, Modal, SectionHeading } from '@njstore/ui';
import { formatCurrency } from '@njstore/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  CalendarRange,
  Download,
  LineChart,
  MapPinned,
  Minus,
  ShoppingCart,
  TrendingUp,
  Users
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { GeographicHeatmap } from '../../components/dashboard/GeographicHeatmap';
import { AdminInlineNotice, AdminPageHeader, AdminStatGrid, adminFormFieldClassName } from '../../components/ui/AdminSurface';
import { adminService } from '../../services/adminService';
import { getApiErrorMessage } from '../../utils/apiError';

const RevenueTrendCard = lazy(() =>
  import('../../components/dashboard/DashboardCharts').then((module) => ({ default: module.RevenueTrendCard }))
);
const GrowthCharts = lazy(() =>
  import('../../components/dashboard/DashboardCharts').then((module) => ({ default: module.GrowthCharts }))
);

const compactNumberFormatter = new Intl.NumberFormat('en-LK', {
  notation: 'compact',
  maximumFractionDigits: 1
});

const wholeNumberFormatter = new Intl.NumberFormat('en-LK', {
  maximumFractionDigits: 0
});

const statusColors: Record<string, string> = {
  pending: '#94a3b8',
  processing: '#3b82f6',
  shipped: '#f59e0b',
  delivered: '#22c55e',
  cancelled: '#ef4444'
};

const kpiMeta: Record<string, { icon: LucideIcon; eyebrow: string; accentClass: string }> = {
  'Total Revenue': {
    icon: BadgeDollarSign,
    eyebrow: 'Revenue',
    accentClass: 'bg-gold/15 text-gold'
  },
  'Total Orders': {
    icon: ShoppingCart,
    eyebrow: 'Orders',
    accentClass: 'bg-blue-500/15 text-blue-300'
  },
  'New Customers': {
    icon: Users,
    eyebrow: 'Customers',
    accentClass: 'bg-cyan-500/15 text-cyan-300'
  },
  'Average Order Value': {
    icon: TrendingUp,
    eyebrow: 'Efficiency',
    accentClass: 'bg-emerald-500/15 text-emerald-300'
  }
};

const periodOptions: AnalyticsPeriod[] = ['7d', '30d', '90d', 'custom'];

interface MetricCardProps {
  kpi: AnalyticsKpi;
}

interface CustomRangeState {
  startDate: string;
  endDate: string;
}

const defaultRangeDate = new Date().toISOString();

const fallbackSummary: AnalyticsSummaryDto = {
  range: {
    period: '30d',
    startDate: defaultRangeDate,
    endDate: defaultRangeDate,
    comparisonStartDate: defaultRangeDate,
    comparisonEndDate: defaultRangeDate,
    label: 'Last 30 days',
    comparisonLabel: 'Previous 30 days',
    days: 30
  },
  kpis: [],
  revenue: [],
  statusBreakdown: [],
  monthlySales: [],
  topProducts: [],
  lowStockAlerts: [],
  customerGrowth: [],
  funnel: [],
  geographicDistribution: []
};

const formatStatusLabel = (status: string): string => status.charAt(0).toUpperCase() + status.slice(1);

const findLeadingStatus = (items: StatusBreakdownDto[]): StatusBreakdownDto =>
  items.reduce<StatusBreakdownDto>(
    (best, item) => (item.count > best.count ? item : best),
    items[0] ?? { status: 'pending', count: 0 }
  );

const findStrongestMonth = (items: MonthlySalesDto[]): MonthlySalesDto =>
  items.reduce<MonthlySalesDto>(
    (best, item) => (item.revenue > best.revenue ? item : best),
    items[0] ?? { month: 'N/A', revenue: 0 }
  );

const getCurrentCustomers = (items: CustomerGrowthDto[]): number => items.at(-1)?.totalCustomers ?? 0;

const getLatestRevenue = (items: AnalyticsSummaryDto['revenue']): number =>
  [...items].reverse().find((item) => item.revenue > 0)?.revenue ?? 0;

const toDateInputValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildDefaultCustomRange = (): CustomRangeState => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 29);

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end)
  };
};

const escapeCsvValue = (value: string | number): string => {
  if (typeof value === 'number') {
    return String(value);
  }

  const normalized = value.replace(/"/g, '""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
};

const downloadCsvFile = (filename: string, headers: string[], rows: Array<Array<string | number>>): void => {
  const csv = [headers.join(','), ...rows.map((row) => row.map(escapeCsvValue).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const getTrendPresentation = (
  value: number
): { accentClass: string; Icon: LucideIcon; label: string } => {
  if (value > 0) {
    return {
      accentClass: 'border-emerald-400/15 bg-emerald-400/8 text-emerald-300',
      Icon: ArrowUpRight,
      label: `+${wholeNumberFormatter.format(value)}%`
    };
  }

  if (value < 0) {
    return {
      accentClass: 'border-red-400/15 bg-red-400/8 text-red-300',
      Icon: ArrowDownRight,
      label: `${wholeNumberFormatter.format(value)}%`
    };
  }

  return {
    accentClass: 'border-white/10 bg-white/[0.05] text-gray-300',
    Icon: Minus,
    label: '0%'
  };
};

const buildAnalyticsFilename = (prefix: string, analytics: AnalyticsSummaryDto): string => {
  const start = analytics.range.startDate.slice(0, 10);
  const end = analytics.range.endDate.slice(0, 10);
  return `${prefix}-${start}-${end}.csv`;
};

const renderMetricValue = (kpi: AnalyticsKpi): JSX.Element => {
  const roundedValue = Math.round(kpi.value);

  if (kpi.currency) {
    return (
      <div className="min-w-0">
        <span className="inline-flex rounded-full bg-gold/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-gold">
          LKR
        </span>
        <div className="mt-2 flex min-w-0 items-end justify-between gap-3">
          <p className="whitespace-nowrap font-mono tabular-nums text-[1.45rem] font-semibold leading-none text-white xl:text-[1.65rem]">
            {compactNumberFormatter.format(roundedValue)}
          </p>
          <p className="truncate font-mono text-[10px] tracking-[0.04em] text-gray-500">{wholeNumberFormatter.format(roundedValue)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-end justify-between gap-3">
        <p className="whitespace-nowrap font-mono tabular-nums text-[1.65rem] font-semibold leading-none text-white xl:text-[1.8rem]">
          {compactNumberFormatter.format(roundedValue)}
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Live</p>
      </div>
    </div>
  );
};

const MetricCard = ({ kpi }: MetricCardProps): JSX.Element => {
  const meta = kpiMeta[kpi.label] ?? {
    icon: Activity,
    eyebrow: 'Metric',
    accentClass: 'bg-white/10 text-white'
  };
  const Icon = meta.icon;

  return (
    <Card className="flex h-full min-h-[118px] flex-col rounded-[18px] p-3">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className={`rounded-[14px] p-2 ${meta.accentClass}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-gold">{meta.eyebrow}</p>
            <h3 className="mt-1 font-display text-[0.92rem] leading-tight text-white">{kpi.label}</h3>
          </div>
        </div>
        <div
          className={`inline-flex min-h-[28px] shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
            kpi.delta >= 0 ? 'border-white/10 bg-emerald-400/8' : 'border-red-400/15 bg-red-400/8'
          }`}
        >
          {kpi.delta >= 0 ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-300" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-red-300" />
          )}
          <span className={`text-[9px] font-medium ${kpi.delta >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {`${kpi.delta >= 0 ? '+' : ''}${wholeNumberFormatter.format(kpi.delta)}%`}
          </span>
        </div>
      </div>

      <div className="mt-3 min-w-0">
        {renderMetricValue(kpi)}
        <p className="mt-2 text-[9px] uppercase tracking-[0.16em] text-gray-500">Vs previous</p>
      </div>
    </Card>
  );
};

const DashboardSkeleton = (): JSX.Element => (
  <div className="space-y-6">
    <SectionHeading
      eyebrow="Analytics"
      title="Overview"
      description="Pulling in live sales, fulfilment, and customer signals."
    />

    <div className="grid gap-4 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={`summary-${index}`} className="h-[132px] animate-pulse rounded-3xl bg-white/5" />
      ))}
    </div>

    <div className="grid gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={`metric-${index}`} className="h-[152px] animate-pulse rounded-3xl bg-white/5" />
      ))}
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.88fr)]">
      <Card className="h-[320px] animate-pulse rounded-3xl bg-white/5" />
      <Card className="h-[320px] animate-pulse rounded-3xl bg-white/5" />
    </div>
  </div>
);

const ChartCardSkeleton = (): JSX.Element => (
  <Card className="rounded-[28px] p-5 sm:p-6">
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded-full bg-white/10" />
      <div className="mt-4 h-10 w-56 rounded-full bg-white/10" />
      <div className="mt-4 h-4 w-full max-w-xl rounded-full bg-white/5" />
      <div className="mt-2 h-4 w-2/3 rounded-full bg-white/5" />
      <div className="mt-6 h-[280px] rounded-[24px] bg-white/[0.04]" />
    </div>
  </Card>
);

const GrowthChartsSkeleton = (): JSX.Element => (
  <div className="grid gap-4 xl:grid-cols-2">
    <ChartCardSkeleton />
    <ChartCardSkeleton />
  </div>
);

const getFunnelStageActionLabel = (key: AnalyticsFunnelStageDto['key']): string | null => {
  if (key === 'quotations') return 'Open quotations';
  if (key === 'confirmed_orders') return 'Open orders';
  return null;
};

const FunnelCard = ({
  funnel,
  label,
  onOpenStage
}: {
  funnel: AnalyticsFunnelStageDto[];
  label: string;
  onOpenStage?: (stage: AnalyticsFunnelStageDto) => void;
}): JSX.Element => {
  const highestCount = Math.max(...funnel.map((stage) => stage.count), 1);

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="text-xs uppercase tracking-[0.26em] text-gold">Conversion</p>
          <h3 className="font-display text-[1.35rem] leading-tight text-white">Checkout Funnel</h3>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
        <div className="rounded-[16px] border border-white/10 bg-white/5 p-2.5 text-gold">
          <ShoppingCart className="h-5 w-5" />
        </div>
      </div>

      {funnel.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {funnel.map((stage, index) => {
            const previous = funnel[index - 1]?.count ?? 0;
            const carryRate = index === 0 ? null : previous > 0 ? Math.round((stage.count / previous) * 100) : 0;
            const actionLabel = getFunnelStageActionLabel(stage.key);

            return (
              <div key={stage.key} className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{stage.label}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-gray-500">
                      {carryRate == null ? 'Start' : `${carryRate}% carry`}
                    </p>
                  </div>
                  <p className="font-display text-[1.5rem] leading-none text-white">{wholeNumberFormatter.format(stage.count)}</p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(212,175,55,0.95),rgba(59,130,246,0.85))]"
                    style={{ width: `${Math.max((stage.count / highestCount) * 100, stage.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
                {actionLabel && onOpenStage ? (
                  <button
                    type="button"
                    onClick={() => onOpenStage(stage)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-medium text-white transition hover:border-gold/25 hover:bg-gold/10"
                  >
                    {actionLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
          <div>
            <p className="font-display text-xl text-white">No funnel activity</p>
            <p className="mt-2 text-sm text-gray-400">Activity will appear once carts, quotations, and confirmations land inside this range.</p>
          </div>
        </div>
      )}
    </Card>
  );
};

const TopProductsTable = ({ products }: { products: TopProductDto[] }): JSX.Element => (
  <div className="overflow-x-auto rounded-[18px] border border-white/10 bg-white/[0.03]">
    <table className="min-w-full divide-y divide-white/10">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-[0.22em] text-gray-400">
          <th className="px-4 py-3">Product</th>
          <th className="px-4 py-3">Units</th>
          <th className="px-4 py-3">Revenue</th>
          <th className="px-4 py-3">Trend</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {products.length ? (
          products.map((product, index) => {
            const trendPresentation = getTrendPresentation(product.trend);

            return (
              <tr key={product.productId} className="text-sm text-gray-300">
                <td className="px-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 font-mono text-xs text-gold">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="min-w-0 truncate font-medium text-white">{product.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">{wholeNumberFormatter.format(product.unitsSold)}</td>
                <td className="px-4 py-3.5">{formatCurrency(product.revenue)}</td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${trendPresentation.accentClass}`}>
                    <trendPresentation.Icon className="h-3.5 w-3.5" />
                    {trendPresentation.label}
                  </span>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">
              Product sales will appear after paid orders land in this window.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export const Dashboard = (): JSX.Element => {
  const navigate = useNavigate();
  const defaultCustomRange = buildDefaultCustomRange();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [draftCustomRange, setDraftCustomRange] = useState<CustomRangeState>(defaultCustomRange);
  const [appliedCustomRange, setAppliedCustomRange] = useState<CustomRangeState>(defaultCustomRange);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isTopProductsOpen, setIsTopProductsOpen] = useState(false);
  const analyticsQuery = useQuery({
    queryKey: ['admin', 'analytics', period, period === 'custom' ? appliedCustomRange.startDate : null, period === 'custom' ? appliedCustomRange.endDate : null],
    queryFn: () =>
      adminService.analytics(
        period === 'custom'
          ? {
              period,
              startDate: appliedCustomRange.startDate,
              endDate: appliedCustomRange.endDate
            }
          : { period }
      ),
    refetchInterval: () => (document.visibilityState === 'visible' ? 60_000 : false),
    refetchIntervalInBackground: false
  });

  const customRangeInvalid =
    !draftCustomRange.startDate || !draftCustomRange.endDate || draftCustomRange.startDate > draftCustomRange.endDate;

  if (analyticsQuery.isLoading && !analyticsQuery.data) {
    return <DashboardSkeleton />;
  }

  if (analyticsQuery.isError && !analyticsQuery.data) {
    const message = analyticsQuery.error instanceof Error ? analyticsQuery.error.message : 'Unable to load admin analytics right now.';

    return (
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Analytics"
          title="Overview"
          description="The dashboard could not load its latest metrics."
        />
        <Card className="rounded-3xl p-6">
          <p className="text-sm text-red-300">{message}</p>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void analyticsQuery.refetch()}>
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const analytics = analyticsQuery.data?.data ?? fallbackSummary;
  const leadingStatus = findLeadingStatus(analytics.statusBreakdown);
  const strongestMonth = findStrongestMonth(analytics.monthlySales);
  const latestRevenue = getLatestRevenue(analytics.revenue);
  const currentCustomers = getCurrentCustomers(analytics.customerGrowth);
  const trackedOrders = analytics.statusBreakdown.reduce((sum, item) => sum + item.count, 0);
  const topProductPreview = analytics.topProducts.slice(0, 10);

  const exportRevenueCsv = (): void => {
    downloadCsvFile(
      buildAnalyticsFilename('dashboard-revenue', analytics),
      ['Date', 'Revenue'],
      analytics.revenue.map((entry) => [entry.date, entry.revenue])
    );
  };

  const exportStatusCsv = (): void => {
    downloadCsvFile(
      'dashboard-status-mix-live.csv',
      ['Status', 'Count'],
      analytics.statusBreakdown.map((entry) => [formatStatusLabel(entry.status), entry.count])
    );
  };

  const exportDashboardPdf = async (): Promise<void> => {
    try {
      setIsPdfExporting(true);
      await adminService.exportAnalyticsPdf(
        period === 'custom'
          ? {
              period,
              startDate: appliedCustomRange.startDate,
              endDate: appliedCustomRange.endDate
            }
          : { period }
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to export the dashboard PDF right now.'));
    } finally {
      setIsPdfExporting(false);
    }
  };

  const applyCustomRange = (): void => {
    if (customRangeInvalid) {
      return;
    }

    setAppliedCustomRange(draftCustomRange);
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Analytics"
        title="Admin Overview"
        description="Sales, orders, customers, stock, and demand in one clean view."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 p-1">
              {periodOptions.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setPeriod(range)}
                  className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] transition-[background-color,color] duration-150 ${
                    period === range ? 'bg-gold font-semibold text-dark' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            {period === 'custom' ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-2">
                <DatePicker
                  label="From"
                  value={draftCustomRange.startDate}
                  onChange={(event) =>
                    setDraftCustomRange((current) => ({
                      ...current,
                      startDate: event.target.value
                    }))
                  }
                  className={`${adminFormFieldClassName} h-10 min-w-[148px] px-3 py-0 text-xs uppercase tracking-[0.12em]`}
                />
                <DatePicker
                  label="To"
                  value={draftCustomRange.endDate}
                  onChange={(event) =>
                    setDraftCustomRange((current) => ({
                      ...current,
                      endDate: event.target.value
                    }))
                  }
                  className={`${adminFormFieldClassName} h-10 min-w-[148px] px-3 py-0 text-xs uppercase tracking-[0.12em]`}
                />
                <Button variant="secondary" size="sm" onClick={applyCustomRange} disabled={customRangeInvalid}>
                  <CalendarRange className="h-4 w-4" />
                  Apply
                </Button>
              </div>
            ) : null}

            <Button variant="secondary" size="sm" onClick={exportRevenueCsv}>
              <Download className="h-4 w-4" />
              Revenue
            </Button>
            <Button variant="secondary" size="sm" onClick={exportStatusCsv}>
              <Download className="h-4 w-4" />
              Status
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void exportDashboardPdf()} isLoading={isPdfExporting} loadingLabel="Preparing">
              <Download className="h-4 w-4" />
              Dashboard PDF
            </Button>
          </div>
        }
      />

      <AdminStatGrid
        className="xl:grid-cols-5"
        items={[
          {
            label: 'Selected window',
            value: analytics.range.label,
            support: `Vs ${analytics.range.comparisonLabel}.`,
            tone: 'gold'
          },
          {
            label: 'Customer base',
            value: wholeNumberFormatter.format(currentCustomers),
            support: 'Total active customers.',
            tone: 'emerald'
          },
          {
            label: 'Leading status',
            value: formatStatusLabel(leadingStatus.status),
            support: `${wholeNumberFormatter.format(leadingStatus.count)} tracked orders in the current queue.`,
            tone: 'gold',
            onClick: () => navigate(`/dashboard/orders?status=${leadingStatus.status}`)
          },
          {
            label: 'Strongest month',
            value: strongestMonth.month,
            support: strongestMonth.revenue > 0 ? formatCurrency(strongestMonth.revenue) : 'No booked revenue yet.',
            tone: 'slate',
            onClick: () => navigate(strongestMonth.revenue > 0 ? '/dashboard/orders?payment=paid' : '/dashboard/orders')
          },
          {
            label: 'Watchlist',
            value: wholeNumberFormatter.format(analytics.lowStockAlerts.length),
            support:
              analytics.lowStockAlerts.length > 0
                ? 'Variants need replenishment attention.'
                : 'Inventory is currently within safe thresholds.',
            tone: analytics.lowStockAlerts.length > 0 ? 'rose' : 'emerald',
            onClick: () => navigate('/dashboard/inventory?filter=low_stock')
          }
        ]}
      />

      <AdminInlineNotice className="justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-gold">
          Dashboard note
        </span>
        <p className="max-w-4xl">
          {analytics.range.label}: revenue, orders, customers, products, stock, and demand.
        </p>
      </AdminInlineNotice>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">KPI Snapshot</p>
            <h2 className="mt-1 font-display text-[1.35rem] text-white">Key numbers</h2>
          </div>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            {analytics.range.label}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {analytics.kpis.map((kpi) => (
            <MetricCard key={kpi.label} kpi={kpi} />
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <Suspense fallback={<ChartCardSkeleton />}>
          <RevenueTrendCard revenue={analytics.revenue} latestRevenue={latestRevenue} />
        </Suspense>

        <Card className="rounded-[24px] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="text-xs uppercase tracking-[0.26em] text-gold">Fulfilment</p>
              <h3 className="font-display text-[1.35rem] leading-tight text-white">Order Status Mix</h3>
              <p className="text-sm text-gray-400">Live queue by status.</p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Tracked</span>
              <span className="font-display text-lg leading-none text-white">{wholeNumberFormatter.format(trackedOrders)}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {analytics.statusBreakdown.map((item) => {
              const percentage = trackedOrders > 0 ? (item.count / trackedOrders) * 100 : 0;

              return (
                <div key={item.status} className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: statusColors[item.status] ?? '#D4AF37' }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-medium text-white">{formatStatusLabel(item.status)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                      <span>{Math.round(percentage)}%</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white">
                        {wholeNumberFormatter.format(item.count)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(percentage, item.count > 0 ? 8 : 0)}%`,
                        backgroundColor: statusColors[item.status] ?? '#D4AF37'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Suspense fallback={<GrowthChartsSkeleton />}>
        <GrowthCharts
          monthlySales={analytics.monthlySales}
          strongestMonth={strongestMonth}
          customerGrowth={analytics.customerGrowth}
          currentCustomers={currentCustomers}
          customerAction={
            <button
              type="button"
              aria-label="Open customer analysis"
              onClick={() => navigate('/dashboard/customer-analysis')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gold transition-[transform,background-color,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-gold/25 hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35"
            >
              <Users className="h-4.5 w-4.5" />
            </button>
          }
          monthlyAction={
            <button
              type="button"
              aria-label="Open sales analysis"
              onClick={() => navigate('/dashboard/sales-analysis')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gold transition-[transform,background-color,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-gold/25 hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35"
            >
              <LineChart className="h-4.5 w-4.5" />
            </button>
          }
        />
      </Suspense>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <FunnelCard
          funnel={analytics.funnel}
          label={analytics.range.label}
          onOpenStage={(stage) => {
            if (stage.key === 'quotations') {
              navigate('/dashboard/orders?status=pending');
              return;
            }

            if (stage.key === 'confirmed_orders') {
              navigate('/dashboard/orders');
            }
          }}
        />

        <Card className="rounded-[26px] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Geography</p>
              <h3 className="mt-3 font-display text-[1.8rem] text-white">District Demand Map</h3>
              <p className="mt-2.5 text-sm leading-6 text-gray-400">Paid order concentration across delivery districts for {analytics.range.label}.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-gold">
              <MapPinned className="h-5 w-5" />
            </div>
          </div>

          <GeographicHeatmap data={analytics.geographicDistribution} onOpenOrders={() => navigate('/dashboard/orders?payment=paid')} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
        <Card className="rounded-[26px] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Inventory</p>
              <h3 className="mt-3 font-display text-[1.8rem] text-white">Low Stock Alerts</h3>
              <p className="mt-2.5 text-sm leading-6 text-gray-400">Low-stock variants in one scrollable watchlist.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-gold">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Total alerts</p>
                <p className="mt-2 font-display text-2xl text-white">{wholeNumberFormatter.format(analytics.lowStockAlerts.length)}</p>
              </div>
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-red-200">Critical</p>
                <p className="mt-2 font-display text-2xl text-white">
                  {wholeNumberFormatter.format(analytics.lowStockAlerts.filter((alert) => alert.stock <= 2).length)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Lowest remaining</p>
                <p className="mt-2 font-display text-2xl text-white">
                  {analytics.lowStockAlerts.length
                    ? `${wholeNumberFormatter.format(Math.min(...analytics.lowStockAlerts.map((alert) => alert.stock)))} left`
                    : 'Healthy'}
                </p>
              </div>
            </div>
            {analytics.lowStockAlerts.length ? (
              <div className="max-h-[430px] space-y-2.5 overflow-y-auto pr-1">
                {analytics.lowStockAlerts.map((alert) => (
                  <div key={`${alert.productId}-${alert.variantSku}`} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
                    <p className="text-sm font-medium text-white">{alert.productName}</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm text-gray-400">
                      <span className="font-mono">{alert.variantSku}</span>
                      <span className="rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-red-300">
                        {wholeNumberFormatter.format(alert.stock)} left
                      </span>
                    </div>
                    <div className="mt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/dashboard/inventory?filter=low_stock&edit=${alert.productId}`)}
                      >
                        Restock
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
                <div>
                  <p className="font-display text-2xl text-white">No low stock alerts</p>
                  <p className="mt-2 text-sm text-gray-400">Current catalog inventory is within the configured alert threshold.</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-[26px] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Performance</p>
              <h3 className="mt-3 font-display text-[1.8rem] text-white">Top Products</h3>
              <p className="mt-2.5 text-sm leading-6 text-gray-400">Top 10 products by sales, with the full sales list one click away.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                <TrendingUp className="h-4 w-4 text-gold" />
                {analytics.range.label}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setIsTopProductsOpen(true)}>
                View all
              </Button>
            </div>
          </div>

          <div className="mt-5">
            <TopProductsTable products={topProductPreview} />
          </div>
        </Card>
      </div>

      <Modal isOpen={isTopProductsOpen} onClose={() => setIsTopProductsOpen(false)} title="All Product Sales" size="xl">
        <div className="mb-4 rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-gray-300">
          Sales performance for {analytics.range.label}.
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <TopProductsTable products={analytics.topProducts} />
        </div>
      </Modal>
    </div>
  );
};
