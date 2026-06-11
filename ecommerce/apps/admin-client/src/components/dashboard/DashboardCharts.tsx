import type { ReactNode } from 'react';
import type { AnalyticsSummaryDto, CustomerGrowthDto, MonthlySalesDto } from '@njstore/types';
import { Card } from '@njstore/ui';
import { formatCurrency } from '@njstore/utils';
import {
  buildAreaPath,
  buildLinePath,
  CHART_VIEWBOX,
  createBars,
  createLinePoints,
  createLinearTicks,
  getBaselineY,
  getChartY,
  getValueDomain,
  pickAxisLabelIndices
} from './chartUtils';

const compactNumberFormatter = new Intl.NumberFormat('en-LK', {
  notation: 'compact',
  maximumFractionDigits: 1
});

const wholeNumberFormatter = new Intl.NumberFormat('en-LK', {
  maximumFractionDigits: 0
});

const formatDayLabel = (value: string): string =>
  new Intl.DateTimeFormat('en-LK', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));

const formatCompactCurrency = (value: number): string => `LKR ${compactNumberFormatter.format(value)}`;
const formatAxisCurrency = (value: number): string => formatCompactCurrency(value);

const gridLineClassName = 'stroke-white/10';
const axisLabelClassName = 'fill-gray-400 text-[10px]';
const chartSurfaceClassName =
  'mt-4 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-2 py-3 sm:px-3 lg:px-4';
const revenuePlotWidth = 1000;
const revenuePlotHeight = 320;

interface ChartEmptyStateProps {
  message: string;
}

interface ChartFrameProps {
  emptyMessage?: string;
  heightClassName?: string;
  yTickFormatter?: (value: number) => string;
  yTicks: readonly number[];
  children: ReactNode;
}

interface RevenueTrendCardProps {
  latestRevenue: number;
  revenue: AnalyticsSummaryDto['revenue'];
}

interface RevenuePlotPoint {
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
}

interface GrowthChartsProps {
  currentCustomers: number;
  customerGrowth: CustomerGrowthDto[];
  monthlySales: MonthlySalesDto[];
  strongestMonth: MonthlySalesDto;
  customerAction?: ReactNode;
  monthlyAction?: ReactNode;
}

const ChartEmptyState = ({ message }: ChartEmptyStateProps): JSX.Element => (
  <div className="flex h-[150px] items-center justify-center rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-5 text-center sm:h-[170px] lg:h-[190px]">
    <p className="max-w-sm text-sm leading-6 text-gray-400">{message}</p>
  </div>
);

const ChartFrame = ({
  yTicks,
  children,
  heightClassName = 'h-[150px] w-full sm:h-[170px] lg:h-[190px] 2xl:h-[210px]',
  emptyMessage,
  yTickFormatter = (value) => wholeNumberFormatter.format(value)
}: ChartFrameProps): JSX.Element => {
  if (!yTicks.length) {
    return <ChartEmptyState message={emptyMessage ?? 'No chart data available yet.'} />;
  }

  const chartDomain = {
    min: yTicks[yTicks.length - 1] ?? 0,
    max: yTicks[0] ?? 1
  };

  return (
    <div className={chartSurfaceClassName}>
      <svg
        viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`}
        preserveAspectRatio="none"
        className={heightClassName}
        role="img"
        aria-hidden="true"
      >
        {yTicks.map((tick) => {
          const y = getChartY(tick, chartDomain);

          return (
            <g key={`tick-${tick}`}>
              <line
                x1={CHART_VIEWBOX.padding.left}
                x2={CHART_VIEWBOX.width - CHART_VIEWBOX.padding.right}
                y1={y}
                y2={y}
                className={gridLineClassName}
              />
              <text
                x={CHART_VIEWBOX.padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className={axisLabelClassName}
              >
                {yTickFormatter(tick)}
              </text>
            </g>
          );
        })}

        {children}
      </svg>
    </div>
  );
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const getRevenuePlotYPercent = (value: number, domain: { min: number; max: number }): number => {
  const span = Math.max(domain.max - domain.min, 1);
  return clamp(((domain.max - value) / span) * 100, 4, 96);
};

const createRevenuePlotPoints = (
  values: readonly number[],
  domain: { min: number; max: number }
): RevenuePlotPoint[] =>
  values.map((value, index) => {
    const xPercent = values.length === 1 ? 50 : 3 + (index / (values.length - 1)) * 94;
    const yPercent = getRevenuePlotYPercent(value, domain);

    return {
      x: Number(((xPercent / 100) * revenuePlotWidth).toFixed(2)),
      y: Number(((yPercent / 100) * revenuePlotHeight).toFixed(2)),
      xPercent,
      yPercent
    };
  });

const buildSmoothRevenueLinePath = (points: readonly RevenuePlotPoint[]): string => {
  if (!points.length) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  const segments = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const previousPoint = points[index - 1] ?? points[index];
    const currentPoint = points[index];
    const nextPoint = points[index + 1];
    const followingPoint = points[index + 2] ?? nextPoint;
    const minY = Math.min(currentPoint.y, nextPoint.y);
    const maxY = Math.max(currentPoint.y, nextPoint.y);
    const controlOneX = currentPoint.x + (nextPoint.x - previousPoint.x) / 6;
    const controlOneY = clamp(currentPoint.y + (nextPoint.y - previousPoint.y) / 6, minY, maxY);
    const controlTwoX = nextPoint.x - (followingPoint.x - currentPoint.x) / 6;
    const controlTwoY = clamp(nextPoint.y - (followingPoint.y - currentPoint.y) / 6, minY, maxY);

    segments.push(`C ${controlOneX.toFixed(2)} ${controlOneY.toFixed(2)}, ${controlTwoX.toFixed(2)} ${controlTwoY.toFixed(2)}, ${nextPoint.x} ${nextPoint.y}`);
  }

  return segments.join(' ');
};

export const RevenueTrendCard = ({ revenue, latestRevenue }: RevenueTrendCardProps): JSX.Element => {
  const values = revenue.map((item) => item.revenue);
  const paidRevenue = revenue.filter((item) => item.revenue > 0);
  const paidValues = paidRevenue.map((item) => item.revenue);
  const totalRevenue = paidRevenue.reduce((sum, item) => sum + item.revenue, 0);
  const peakRevenue = Math.max(...paidRevenue.map((item) => item.revenue), 0);
  const peakDay = paidRevenue.find((item) => item.revenue === peakRevenue);
  const latestPaidDate = paidRevenue.at(-1)?.date;

  if (!values.length || !paidRevenue.length) {
    return (
      <Card className="rounded-[24px] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.26em] text-gold">Revenue</p>
            <h3 className="mt-1 font-display text-[1.35rem] leading-tight text-white">Daily Revenue</h3>
            <p className="mt-1 text-sm text-gray-400">Paid orders in range.</p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Latest</span>
            <span className="font-mono text-sm text-gold">{formatCompactCurrency(latestRevenue)}</span>
          </div>
        </div>

        <ChartEmptyState message="Paid revenue will appear here once paid orders land inside this window." />
      </Card>
    );
  }

  const domain = getValueDomain(paidValues, { paddingRatio: 0.18 });
  const yTicks = createLinearTicks(domain.min, domain.max, 4);
  const chartDomain = {
    min: yTicks[yTicks.length - 1] ?? 0,
    max: yTicks[0] ?? 1
  };
  const plotPoints = createRevenuePlotPoints(paidValues, chartDomain);
  const linePath = buildSmoothRevenueLinePath(plotPoints);
  const firstPoint = plotPoints[0];
  const lastPoint = plotPoints[plotPoints.length - 1];
  const areaPath = linePath && firstPoint && lastPoint
    ? `${linePath} L ${lastPoint.x} ${revenuePlotHeight} L ${firstPoint.x} ${revenuePlotHeight} Z`
    : '';
  const xLabelIndices = pickAxisLabelIndices(paidRevenue.length, 6);
  const baselineY = (getRevenuePlotYPercent(0, chartDomain) / 100) * revenuePlotHeight;

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.26em] text-gold">Revenue</p>
          <h3 className="mt-1 font-display text-[1.35rem] leading-tight text-white">Daily Revenue</h3>
          <p className="mt-1 text-sm text-gray-400">Paid revenue days in range.</p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Latest</span>
          <span className="font-mono text-sm text-gold">{formatCompactCurrency(latestRevenue)}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-[16px] border border-gold/20 bg-gold/[0.08] px-3.5 py-3">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gold">Booked</p>
          <p className="mt-1 font-mono text-sm font-semibold text-white">{formatCompactCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-[16px] border border-white/10 bg-white/[0.035] px-3.5 py-3">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gray-500">Paid days</p>
          <p className="mt-1 font-display text-xl leading-none text-white">{wholeNumberFormatter.format(paidRevenue.length)}</p>
        </div>
        <div className="rounded-[16px] border border-white/10 bg-white/[0.035] px-3.5 py-3">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gray-500">Peak</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {peakDay ? `${formatDayLabel(peakDay.date)} - ${formatCompactCurrency(peakDay.revenue)}` : 'None'}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-3 sm:p-4">
        <div className="grid grid-cols-[78px_minmax(0,1fr)] grid-rows-[minmax(260px,1fr)_32px] gap-x-3 sm:grid-cols-[88px_minmax(0,1fr)] sm:grid-rows-[minmax(300px,1fr)_34px] lg:grid-rows-[minmax(340px,1fr)_36px]">
          <div className="relative row-start-1">
            {yTicks.map((tick) => (
              <span
                key={`revenue-axis-${tick}`}
                className="absolute right-0 whitespace-nowrap font-mono text-[10px] text-gray-500 sm:text-[11px]"
                style={{ top: `${getRevenuePlotYPercent(tick, chartDomain)}%`, transform: 'translateY(-50%)' }}
              >
                {formatAxisCurrency(tick)}
              </span>
            ))}
          </div>

          <div className="relative row-start-1 overflow-visible rounded-[18px] bg-[radial-gradient(circle_at_75%_18%,rgba(212,175,55,0.08),transparent_28%)]">
            <svg
              viewBox={`0 0 ${revenuePlotWidth} ${revenuePlotHeight}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              role="img"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#C99718" />
                  <stop offset="48%" stopColor="#F2C94C" />
                  <stop offset="100%" stopColor="#FFE27A" />
                </linearGradient>
                <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F2C94C" stopOpacity={0.22} />
                  <stop offset="64%" stopColor="#D4AF37" stopOpacity={0.075} />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.01} />
                </linearGradient>
                <filter id="revenueLineGlow" x="-10%" y="-25%" width="120%" height="150%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {yTicks.map((tick) => {
                const y = (getRevenuePlotYPercent(tick, chartDomain) / 100) * revenuePlotHeight;

                return (
                  <line
                    key={`revenue-grid-${tick}`}
                    x1="0"
                    x2={revenuePlotWidth}
                    y1={y}
                    y2={y}
                    className="stroke-white/10"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              <line
                x1="0"
                x2={revenuePlotWidth}
                y1={baselineY}
                y2={baselineY}
                className="stroke-white/20"
                vectorEffect="non-scaling-stroke"
              />

              {areaPath ? <path d={areaPath} fill="url(#revenueAreaGradient)" /> : null}
              {linePath ? (
                <>
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#D4AF37"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.14"
                    filter="url(#revenueLineGlow)"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="url(#revenueLineGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : null}
            </svg>

            {plotPoints.map((point, index) => {
              const entry = paidRevenue[index];

              if (!entry) {
                return null;
              }

              const isLatest = entry.date === latestPaidDate;
              const isPeak = entry.revenue === peakRevenue;
              const showLabel = isLatest || isPeak || paidRevenue.length <= 5;

              return (
                <div key={`revenue-point-${entry.date}`}>
                  <span
                    className={`absolute z-10 h-3.5 w-3.5 rounded-full border-2 shadow-[0_8px_18px_rgba(0,0,0,0.28)] ${
                      isLatest || isPeak ? 'border-gold-light bg-gold-light' : 'border-gold bg-gold'
                    }`}
                    style={{ left: `${point.xPercent}%`, top: `${point.yPercent}%`, transform: 'translate(-50%, -50%)' }}
                    title={`${formatDayLabel(entry.date)}: ${formatCurrency(entry.revenue)}`}
                  />
                  {showLabel ? (
                    <span
                      className="absolute z-20 rounded-full border border-gold/20 bg-[#101722]/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-gold shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
                      style={{
                        left: `${clamp(point.xPercent, 6, 94)}%`,
                        top: `${clamp(point.yPercent - 9, 5, 88)}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      {compactNumberFormatter.format(entry.revenue)}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="relative col-start-2 row-start-2">
            {xLabelIndices.map((index) => {
              const point = plotPoints[index];
              const entry = paidRevenue[index];

              if (!point || !entry) {
                return null;
              }

              return (
                <span
                  key={`revenue-label-${entry.date}`}
                  className="absolute top-1 whitespace-nowrap text-xs font-medium text-gray-500 sm:text-sm"
                  style={{ left: `${point.xPercent}%`, transform: 'translateX(-50%)' }}
                >
                  {formatDayLabel(entry.date)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

const MonthlySalesChart = ({
  monthlySales,
  strongestMonth,
  monthlyAction
}: Pick<GrowthChartsProps, 'monthlySales' | 'strongestMonth' | 'monthlyAction'>): JSX.Element => {
  const values = monthlySales.map((item) => item.revenue);

  if (!values.length) {
    return (
      <Card className="rounded-[24px] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="text-xs uppercase tracking-[0.26em] text-gold">Sales</p>
            <h3 className="font-display text-[1.35rem] leading-tight text-white">Monthly Sales</h3>
            <p className="text-sm text-gray-400">12-month revenue.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {monthlyAction ? <div className="shrink-0">{monthlyAction}</div> : null}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Peak</span>
              <span className="text-sm font-medium text-white">{strongestMonth.month}</span>
              <span className="font-mono text-xs text-gold">LKR {compactNumberFormatter.format(strongestMonth.revenue)}</span>
            </div>
          </div>
        </div>

        <ChartEmptyState message="Monthly sales will appear here once the dashboard has historical order data." />
      </Card>
    );
  }

  const domain = getValueDomain(values);
  const bars = createBars(values, domain);
  const yTicks = createLinearTicks(domain.min, domain.max, 4);
  const xLabelIndices = pickAxisLabelIndices(monthlySales.length, 6);
  const peakValue = Math.max(...values);

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="text-xs uppercase tracking-[0.26em] text-gold">Sales</p>
          <h3 className="font-display text-[1.35rem] leading-tight text-white">Monthly Sales</h3>
          <p className="text-sm text-gray-400">12-month revenue.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {monthlyAction ? <div className="shrink-0">{monthlyAction}</div> : null}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Peak</span>
            <span className="text-sm font-medium text-white">{strongestMonth.month}</span>
            <span className="font-mono text-xs text-gold">LKR {compactNumberFormatter.format(strongestMonth.revenue)}</span>
          </div>
        </div>
      </div>

      <ChartFrame yTicks={yTicks} yTickFormatter={formatAxisCurrency}>
        {bars.map((bar, index) => (
          <rect
            key={`sales-bar-${index}`}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx="12"
            fill={values[index] === peakValue ? '#F2C94C' : '#D4AF37'}
            fillOpacity={values[index] === peakValue ? 1 : 0.8}
          >
            <title>{`${monthlySales[index]?.month ?? ''}: ${formatCurrency(monthlySales[index]?.revenue ?? 0)}`}</title>
          </rect>
        ))}

        {xLabelIndices.map((index) => {
          const bar = bars[index];

          if (!bar) {
            return null;
          }

          return (
            <text
              key={`sales-label-${index}`}
              x={bar.x + bar.width / 2}
              y={CHART_VIEWBOX.height - 8}
              textAnchor="middle"
              className={axisLabelClassName}
            >
              {monthlySales[index]?.month ?? ''}
            </text>
          );
        })}
      </ChartFrame>
    </Card>
  );
};

const CustomerGrowthChart = ({
  customerGrowth,
  currentCustomers,
  customerAction
}: Pick<GrowthChartsProps, 'customerGrowth' | 'currentCustomers' | 'customerAction'>): JSX.Element => {
  const values = customerGrowth.map((item) => item.totalCustomers);

  if (!values.length) {
    return (
      <Card className="rounded-[24px] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="text-xs uppercase tracking-[0.26em] text-gold">Customers</p>
            <h3 className="font-display text-[1.35rem] leading-tight text-white">Customer Growth</h3>
            <p className="text-sm text-gray-400">Customer total over time.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {customerAction ? <div className="shrink-0">{customerAction}</div> : null}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Total</span>
              <span className="font-display text-lg leading-none text-white">{wholeNumberFormatter.format(currentCustomers)}</span>
            </div>
          </div>
        </div>

        <ChartEmptyState message="Customer growth will appear here once there is signup history to chart." />
      </Card>
    );
  }

  const domain = getValueDomain(values);
  const points = createLinePoints(values, domain);
  const linePath = buildLinePath(points);
  const areaPath = buildAreaPath(points, getBaselineY(domain));
  const yTicks = createLinearTicks(domain.min, domain.max, 4);
  const xLabelIndices = pickAxisLabelIndices(customerGrowth.length, 6);

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="text-xs uppercase tracking-[0.26em] text-gold">Customers</p>
          <h3 className="font-display text-[1.35rem] leading-tight text-white">Customer Growth</h3>
          <p className="text-sm text-gray-400">Customer total over time.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {customerAction ? <div className="shrink-0">{customerAction}</div> : null}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Total</span>
            <span className="font-display text-lg leading-none text-white">{wholeNumberFormatter.format(currentCustomers)}</span>
          </div>
        </div>
      </div>

      <ChartFrame yTicks={yTicks}>
        <defs>
          <linearGradient id="customerGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.34} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
          </linearGradient>
        </defs>

        {areaPath ? <path d={areaPath} fill="url(#customerGradient)" /> : null}
        {linePath ? <path d={linePath} fill="none" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}

        {points.map((point, index) => (
          <circle
            key={`customer-point-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? 4.5 : 2.5}
            fill="#60A5FA"
            fillOpacity={index === points.length - 1 ? 1 : 0.55}
          >
            <title>{`${formatDayLabel(customerGrowth[index]?.date ?? '')}: ${wholeNumberFormatter.format(customerGrowth[index]?.totalCustomers ?? 0)} customers`}</title>
          </circle>
        ))}

        {xLabelIndices.map((index) => {
          const point = points[index];

          if (!point) {
            return null;
          }

          return (
            <text
              key={`growth-label-${index}`}
              x={point.x}
              y={CHART_VIEWBOX.height - 8}
              textAnchor="middle"
              className={axisLabelClassName}
            >
              {formatDayLabel(customerGrowth[index]?.date ?? '')}
            </text>
          );
        })}
      </ChartFrame>
    </Card>
  );
};

export const GrowthCharts = ({
  monthlySales,
  strongestMonth,
  customerGrowth,
  currentCustomers,
  customerAction,
  monthlyAction
}: GrowthChartsProps): JSX.Element => (
  <div className="grid gap-4 xl:grid-cols-2">
    <MonthlySalesChart monthlySales={monthlySales} strongestMonth={strongestMonth} monthlyAction={monthlyAction} />
    <CustomerGrowthChart customerGrowth={customerGrowth} currentCustomers={currentCustomers} customerAction={customerAction} />
  </div>
);
