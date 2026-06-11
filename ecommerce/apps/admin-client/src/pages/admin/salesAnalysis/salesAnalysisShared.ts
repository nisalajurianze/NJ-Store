import type {
  SalesPeriodPointDto,
  SalesRfmSegmentKey
} from '@njstore/types';

export type SalesCadenceKey = 'daily' | 'monthly' | 'yearly';

export const wholeNumberFormatter = new Intl.NumberFormat('en-LK', {
  maximumFractionDigits: 0
});

const compactNumberFormatter = new Intl.NumberFormat('en-LK', {
  notation: 'compact',
  maximumFractionDigits: 1
});

export const percentageFormatter = new Intl.NumberFormat('en-LK', {
  style: 'percent',
  maximumFractionDigits: 0
});

export const axisLabelClassName = 'fill-gray-400 text-[11px]';
export const gridLineClassName = 'stroke-white/10';

export const salesCadenceCopy: Record<
  SalesCadenceKey,
  {
    buttonLabel: string;
    title: string;
    description: string;
    emptyMessage: string;
  }
> = {
  daily: {
    buttonLabel: 'Daily',
    title: 'Daily Sales',
    description: 'Track the latest 30 business days with revenue bars, expense drag, and net outcome in one switched view.',
    emptyMessage: 'Daily sales points will appear here once paid orders land in the current 30-day window.'
  },
  monthly: {
    buttonLabel: 'Monthly',
    title: 'Monthly Sales',
    description: 'Review the rolling 12-month performance without opening a separate block for each cadence.',
    emptyMessage: 'Monthly sales points will appear here once the dashboard has a longer paid-order history.'
  },
  yearly: {
    buttonLabel: 'Yearly',
    title: 'Yearly Sales',
    description: 'Compare yearly revenue, outgoing costs, and final net performance in a single management view.',
    emptyMessage: 'Yearly sales points will appear here once more than one yearly period is available.'
  }
};

export const rfmSegmentBadgeVariant: Record<SalesRfmSegmentKey, 'success' | 'warning' | 'info' | 'danger'> = {
  champions: 'success',
  atRisk: 'warning',
  new: 'info',
  dormant: 'danger'
};

export const rfmSegmentSurfaceClassName: Record<SalesRfmSegmentKey, string> = {
  champions: 'border-emerald-400/20 bg-emerald-400/10',
  atRisk: 'border-amber-400/20 bg-amber-400/10',
  new: 'border-blue-400/20 bg-blue-400/10',
  dormant: 'border-red-400/20 bg-red-400/10'
};

export const rfmSegmentDescription: Record<SalesRfmSegmentKey, string> = {
  champions: 'Recent repeat buyers with the strongest spend and order depth.',
  atRisk: 'Customers with meaningful value whose buying recency is slipping.',
  new: 'Fresh buyers and early repeat customers still building purchase history.',
  dormant: 'Long-inactive paid customers who likely need a reactivation push.'
};

const buildIsoDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface RevenueForecastPoint {
  period: string;
  label: string;
  revenue: number;
  kind: 'actual' | 'forecast';
}

export interface RevenueForecastSummary {
  actualPoints: RevenueForecastPoint[];
  forecastPoints: RevenueForecastPoint[];
  projectedRevenue: number;
  averageDailyRevenue: number;
  slope: number;
}

export const formatExpenseDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(parsed);
};

export const formatDayLabel = (value: string): string =>
  new Intl.DateTimeFormat('en-LK', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));

export const formatAxisCurrency = (value: number): string => `LKR ${compactNumberFormatter.format(value)}`;

export const formatAxisWholeNumber = (value: number): string => wholeNumberFormatter.format(value);

export const buildRevenueForecast = (
  dailySales: SalesPeriodPointDto[],
  forecastDays = 7
): RevenueForecastSummary => {
  const regressionWindow = dailySales.slice(-30);
  const actualPoints = regressionWindow.slice(-14).map((point) => ({
    period: point.period,
    label: point.label,
    revenue: point.revenue,
    kind: 'actual' as const
  }));

  if (!regressionWindow.length) {
    return {
      actualPoints,
      forecastPoints: [],
      projectedRevenue: 0,
      averageDailyRevenue: 0,
      slope: 0
    };
  }

  const pointCount = regressionWindow.length;
  const sumX = regressionWindow.reduce((sum, _point, index) => sum + index, 0);
  const sumY = regressionWindow.reduce((sum, point) => sum + point.revenue, 0);
  const sumXY = regressionWindow.reduce((sum, point, index) => sum + index * point.revenue, 0);
  const sumXX = regressionWindow.reduce((sum, _point, index) => sum + index * index, 0);
  const denominator = pointCount * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (pointCount * sumXY - sumX * sumY) / denominator;
  const intercept = pointCount === 0 ? 0 : (sumY - slope * sumX) / pointCount;
  const lastActualPoint = regressionWindow[regressionWindow.length - 1];
  const lastActualDate = lastActualPoint ? new Date(lastActualPoint.period) : null;
  const forecastPoints = Array.from({ length: forecastDays }, (_, index) => {
    const predictedRevenue = Math.max(0, intercept + slope * (pointCount + index));
    const nextDate = lastActualDate ? new Date(lastActualDate) : new Date();
    nextDate.setDate(nextDate.getDate() + index + 1);
    const period = buildIsoDate(nextDate);

    return {
      period,
      label: formatDayLabel(period),
      revenue: predictedRevenue,
      kind: 'forecast' as const
    };
  });
  const projectedRevenue = forecastPoints.reduce((sum, point) => sum + point.revenue, 0);

  return {
    actualPoints,
    forecastPoints,
    projectedRevenue,
    averageDailyRevenue: forecastPoints.length > 0 ? projectedRevenue / forecastPoints.length : 0,
    slope
  };
};
