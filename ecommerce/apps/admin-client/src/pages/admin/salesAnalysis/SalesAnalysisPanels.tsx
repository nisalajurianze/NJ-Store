import { Badge, Card } from '@njstore/ui';
import type {
  SalesAnalysisDto,
  SalesPeriodPointDto,
  SalesRfmCustomerDto,
  SalesRfmSegmentDto
} from '@njstore/types';
import { formatCurrency } from '@njstore/utils';
import { BarChart3, CalendarDays, Eye, MousePointerClick, Search, ShoppingCart, Sparkles, UsersRound } from 'lucide-react';
import {
  buildAreaPath,
  buildLinePath,
  CHART_VIEWBOX,
  createBars,
  createLinePoints,
  createLinearTicks,
  getChartY,
  getValueDomain,
  pickAxisLabelIndices
} from '../../../components/dashboard/chartUtils';
import {
  axisLabelClassName,
  buildRevenueForecast,
  formatAxisCurrency,
  formatAxisWholeNumber,
  formatDayLabel,
  formatExpenseDate,
  gridLineClassName,
  percentageFormatter,
  rfmSegmentBadgeVariant,
  rfmSegmentDescription,
  rfmSegmentSurfaceClassName,
  salesCadenceCopy,
  type SalesCadenceKey,
  wholeNumberFormatter
} from './salesAnalysisShared';

export const SalesCadenceExplorer = ({
  activeCadence,
  onCadenceChange,
  dailySales,
  monthlySales,
  yearlySales
}: {
  activeCadence: SalesCadenceKey;
  onCadenceChange: (nextCadence: SalesCadenceKey) => void;
  dailySales: SalesPeriodPointDto[];
  monthlySales: SalesPeriodPointDto[];
  yearlySales: SalesPeriodPointDto[];
}): JSX.Element => {
  const pointsByCadence: Record<SalesCadenceKey, SalesPeriodPointDto[]> = {
    daily: dailySales,
    monthly: monthlySales,
    yearly: yearlySales
  };
  const activeCopy = salesCadenceCopy[activeCadence];
  const activePoints = pointsByCadence[activeCadence];
  const visibleRows = [...activePoints].slice(-6).reverse();
  const totals = activePoints.reduce(
    (summary, point) => ({
      revenue: summary.revenue + point.revenue,
      expenses: summary.expenses + point.expenses,
      net: summary.net + point.net,
      orderCount: summary.orderCount + point.orderCount
    }),
    { revenue: 0, expenses: 0, net: 0, orderCount: 0 }
  );
  const bestPeriod = activePoints.reduce<SalesPeriodPointDto | null>(
    (leader, point) => (leader === null || point.revenue > leader.revenue ? point : leader),
    null
  );
  const chartValues = activePoints.flatMap((point) => [point.revenue, point.expenses, point.net]);
  const chartDomain = getValueDomain(chartValues.length ? chartValues : [0], {
    includeZero: true,
    paddingRatio: 0.18
  });
  const revenueBars = createBars(
    activePoints.map((point) => point.revenue),
    chartDomain
  );
  const expensePoints = createLinePoints(
    activePoints.map((point) => point.expenses),
    chartDomain
  );
  const netPoints = createLinePoints(
    activePoints.map((point) => point.net),
    chartDomain
  );
  const expensePath = buildLinePath(expensePoints);
  const netPath = buildLinePath(netPoints);
  const yTicks = createLinearTicks(chartDomain.min, chartDomain.max, 5);
  const xLabelIndices = pickAxisLabelIndices(activePoints.length, activeCadence === 'yearly' ? 5 : 6);
  const zeroLineY = getChartY(0, chartDomain);
  const netAreaPath = netPath ? buildAreaPath(netPoints, zeroLineY) : '';
  const cadenceGradientId = `cadence-revenue-gradient-${activeCadence}`;
  const cadenceNetAreaId = `cadence-net-area-${activeCadence}`;

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Sales cadence</p>
          <h3 className="mt-2 font-display text-[1.72rem] text-white">{activeCopy.title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">{activeCopy.description}</p>
        </div>
        <div className="inline-flex flex-wrap rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          {(['daily', 'monthly', 'yearly'] as const).map((cadence) => {
            const isActive = cadence === activeCadence;

            return (
              <button
                key={cadence}
                type="button"
                aria-pressed={isActive}
                onClick={() => onCadenceChange(cadence)}
                className={`rounded-xl px-4 py-2 text-sm transition-colors duration-200 ${
                  isActive ? 'bg-gold text-dark shadow-[0_10px_24px_rgba(212,175,55,0.16)]' : 'text-gray-300 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                {salesCadenceCopy[cadence].buttonLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]">
        <div className="rounded-[20px] border border-blue-400/20 bg-blue-400/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-blue-200">Revenue</p>
          <p className="mt-2 break-words font-display text-[1.32rem] leading-tight text-white">{formatCurrency(totals.revenue)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">Gross booked revenue across the visible {activeCopy.buttonLabel.toLowerCase()} periods.</p>
        </div>
        <div className="rounded-[20px] border border-red-400/20 bg-red-400/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-red-200">Expenses</p>
          <p className="mt-2 break-words font-display text-[1.32rem] leading-tight text-white">{formatCurrency(totals.expenses)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">Manual outgoing costs included in the same cadence.</p>
        </div>
        <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-200">Net</p>
          <p className="mt-2 break-words font-display text-[1.32rem] leading-tight text-white">{formatCurrency(totals.net)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">Revenue after subtracting the tracked expenses above.</p>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Best period</p>
          <p className="mt-2 break-words font-display text-[1.32rem] leading-tight text-white">{bestPeriod?.label ?? 'N/A'}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">
            {bestPeriod ? `${formatCurrency(bestPeriod.revenue)} across ${wholeNumberFormatter.format(bestPeriod.orderCount)} orders.` : 'No paid periods are available yet.'}
          </p>
        </div>
      </div>

      {activePoints.length ? (
        <div className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-3 sm:p-4">
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-gray-300">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gold" />
              Revenue bars
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-0 w-4 border-t-2 border-emerald-300" />
              Net line
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-0 w-4 border-t-2 border-dashed border-red-300" />
              Expenses line
            </span>
          </div>

          <svg viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`} className="h-[260px] w-full sm:h-[300px] lg:h-[330px]" role="img" aria-label={`${activeCopy.title} chart`}>
            <defs>
              <linearGradient id={cadenceGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F2C94C" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#8A6A18" stopOpacity={0.42} />
              </linearGradient>
              <linearGradient id={cadenceNetAreaId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6EE7B7" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#6EE7B7" stopOpacity={0.01} />
              </linearGradient>
              <filter id="cadence-line-glow" x="-10%" y="-20%" width="120%" height="140%">
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {yTicks.map((tick) => {
              const y = getChartY(tick, chartDomain);

              return (
                <g key={`cadence-tick-${tick}`}>
                  <line
                    x1={CHART_VIEWBOX.padding.left}
                    x2={CHART_VIEWBOX.width - CHART_VIEWBOX.padding.right}
                    y1={y}
                    y2={y}
                    className={gridLineClassName}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text x={CHART_VIEWBOX.padding.left - 12} y={y + 4} textAnchor="end" className={axisLabelClassName}>
                    {formatAxisCurrency(tick)}
                  </text>
                </g>
              );
            })}

            <line
              x1={CHART_VIEWBOX.padding.left}
              x2={CHART_VIEWBOX.width - CHART_VIEWBOX.padding.right}
              y1={zeroLineY}
              y2={zeroLineY}
              className="stroke-white/15"
              vectorEffect="non-scaling-stroke"
            />

            {netAreaPath ? <path d={netAreaPath} fill={`url(#${cadenceNetAreaId})`} /> : null}

            {revenueBars.map((bar, index) => (
              <rect
                key={`cadence-bar-${index}`}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx="12"
                fill={`url(#${cadenceGradientId})`}
                stroke="rgba(242,201,76,0.24)"
              >
                <title>{`${activePoints[index]?.label ?? ''}: ${formatCurrency(activePoints[index]?.revenue ?? 0)} revenue`}</title>
              </rect>
            ))}

            {expensePath ? <path d={expensePath} fill="none" stroke="#F87171" strokeWidth="2.5" strokeDasharray="8 8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
            {netPath ? <path d={netPath} fill="none" stroke="#6EE7B7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#cadence-line-glow)" vectorEffect="non-scaling-stroke" /> : null}

            {netPoints.map((point, index) => (
              <circle key={`net-point-${index}`} cx={point.x} cy={point.y} r="3.5" fill="#6EE7B7">
                <title>{`${activePoints[index]?.label ?? ''}: ${formatCurrency(activePoints[index]?.net ?? 0)} net`}</title>
              </circle>
            ))}

            {xLabelIndices.map((index) => {
              const bar = revenueBars[index];

              if (!bar) {
                return null;
              }

              return (
                <text
                  key={`cadence-label-${index}`}
                  x={bar.x + bar.width / 2}
                  y={CHART_VIEWBOX.height - 8}
                  textAnchor="middle"
                  className={axisLabelClassName}
                >
                  {activePoints[index]?.label ?? ''}
                </text>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="mt-5 flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
          <p className="max-w-sm text-sm leading-6 text-gray-400">{activeCopy.emptyMessage}</p>
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-[20px] border border-white/10 bg-white/[0.03]">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="text-left text-[11px] uppercase tracking-[0.24em] text-gray-400">
            <tr>
              <th className="px-4 py-4">Period</th>
              <th className="px-4 py-4">Revenue</th>
              <th className="px-4 py-4">Expenses</th>
              <th className="px-4 py-4">Net</th>
              <th className="px-4 py-4">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-gray-300">
            {visibleRows.length ? (
              visibleRows.map((point) => (
                <tr key={point.period}>
                  <td className="px-4 py-4 font-medium text-white">{point.label}</td>
                  <td className="px-4 py-4">{formatCurrency(point.revenue)}</td>
                  <td className="px-4 py-4">{formatCurrency(point.expenses)}</td>
                  <td className={`px-4 py-4 ${point.net < 0 ? 'text-red-300' : 'text-emerald-300'}`}>{formatCurrency(point.net)}</td>
                  <td className="px-4 py-4">{wholeNumberFormatter.format(point.orderCount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  No period breakdown is available for this cadence yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export const CustomerGrowthPanel = ({
  customerGrowth
}: {
  customerGrowth: SalesAnalysisDto['customerGrowth'];
}): JSX.Element => {
  const values = customerGrowth.map((point) => point.totalCustomers);
  const currentCustomers = customerGrowth.at(-1)?.totalCustomers ?? 0;
  const startingCustomers = customerGrowth[0]?.totalCustomers ?? currentCustomers;
  const growthDelta = currentCustomers - startingCustomers;

  if (!values.length) {
    return (
      <Card className="rounded-[24px] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Growth</p>
            <h3 className="mt-2 font-display text-[1.72rem] text-white">Customer Growth</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">Keep one clean read on how the customer base is moving without repeating the sales charts above.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Current total</p>
            <p className="mt-2 font-display text-[1.45rem] text-white">{wholeNumberFormatter.format(currentCustomers)}</p>
          </div>
        </div>

        <div className="mt-5 flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
          <p className="max-w-sm text-sm leading-6 text-gray-400">Customer growth will appear here once there is signup history to chart.</p>
        </div>
      </Card>
    );
  }

  const domain = getValueDomain(values, {
    includeZero: false,
    paddingRatio: 0.12
  });
  const points = createLinePoints(values, domain);
  const linePath = buildLinePath(points);
  const yTicks = createLinearTicks(domain.min, domain.max, 4);
  const xLabelIndices = pickAxisLabelIndices(customerGrowth.length, 6);

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Growth</p>
          <h3 className="mt-2 font-display text-[1.72rem] text-white">Customer Growth</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">Follow the running customer base separately while the switched sales explorer handles revenue, expenses, and net performance.</p>
        </div>
        <div className="grid gap-2 sm:w-[13rem] sm:shrink-0">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Current total</p>
            <p className="mt-2 font-display text-[1.45rem] text-white">{wholeNumberFormatter.format(currentCustomers)}</p>
          </div>
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-blue-200">30-day change</p>
            <p className="mt-2 font-display text-[1.3rem] text-white">{`${growthDelta >= 0 ? '+' : ''}${wholeNumberFormatter.format(growthDelta)}`}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-3 sm:p-4">
        <svg viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`} className="h-[320px] w-full" role="img" aria-label="Customer Growth chart">
          {yTicks.map((tick) => {
            const y = getChartY(tick, domain);

            return (
              <g key={`customer-tick-${tick}`}>
                <line
                  x1={CHART_VIEWBOX.padding.left}
                  x2={CHART_VIEWBOX.width - CHART_VIEWBOX.padding.right}
                  y1={y}
                  y2={y}
                  className={gridLineClassName}
                />
                <text x={CHART_VIEWBOX.padding.left - 12} y={y + 4} textAnchor="end" className={axisLabelClassName}>
                  {formatAxisWholeNumber(tick)}
                </text>
              </g>
            );
          })}

          {linePath ? <path d={linePath} fill="none" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}

          {points.map((point, index) => (
            <circle
              key={`customer-growth-point-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === points.length - 1 ? 4.5 : 2.5}
              fill="#60A5FA"
              fillOpacity={index === points.length - 1 ? 1 : 0.6}
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
                key={`customer-growth-label-${index}`}
                x={point.x}
                y={CHART_VIEWBOX.height - 8}
                textAnchor="middle"
                className={axisLabelClassName}
              >
                {formatDayLabel(customerGrowth[index]?.date ?? '')}
              </text>
            );
          })}
        </svg>
      </div>
    </Card>
  );
};

export const RevenueForecastPanel = ({
  dailySales
}: {
  dailySales: SalesAnalysisDto['dailySales'];
}): JSX.Element => {
  const forecast = buildRevenueForecast(dailySales);
  const chartSeries = [...forecast.actualPoints, ...forecast.forecastPoints];

  if (!chartSeries.length) {
    return (
      <Card className="rounded-[24px] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-3 text-blue-200">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Forecast</p>
            <h3 className="mt-2 font-display text-[1.72rem] text-white">Revenue Forecast</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">A 7-day linear projection will appear here after the daily revenue series has enough history to chart.</p>
          </div>
        </div>

        <div className="mt-5 flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
          <p className="max-w-sm text-sm leading-6 text-gray-400">No daily sales points are available yet for projecting the next 7 days.</p>
        </div>
      </Card>
    );
  }

  const chartValues = chartSeries.map((point) => point.revenue);
  const chartDomain = getValueDomain(chartValues, {
    includeZero: true,
    paddingRatio: 0.18
  });
  const chartPoints = createLinePoints(chartValues, chartDomain);
  const actualLength = forecast.actualPoints.length;
  const actualPath = buildLinePath(chartPoints.slice(0, actualLength));
  const forecastPath =
    actualLength > 0 ? buildLinePath([chartPoints[Math.max(actualLength - 1, 0)]!, ...chartPoints.slice(actualLength)]) : '';
  const yTicks = createLinearTicks(chartDomain.min, chartDomain.max, 5);
  const xLabelIndices = pickAxisLabelIndices(chartSeries.length, 6);
  const projectionBoundary = chartPoints[Math.max(actualLength - 1, 0)]?.x;
  const trendDirectionLabel =
    forecast.slope > 0 ? `+${formatCurrency(Math.abs(forecast.slope))}/day` : forecast.slope < 0 ? `-${formatCurrency(Math.abs(forecast.slope))}/day` : 'Flat';

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Forecast</p>
          <h3 className="mt-2 font-display text-[1.72rem] text-white">Revenue Forecast</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">A simple linear projection based on the last 30 daily paid-order revenue points, extended across the next 7 days.</p>
        </div>
        <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-right sm:w-[13.5rem] sm:shrink-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-blue-200">Projected 7 days</p>
          <p className="mt-2 break-words font-display text-[1.28rem] leading-tight text-white">{formatCurrency(forecast.projectedRevenue)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]">
        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Projected daily average</p>
          <p className="mt-2 break-words font-display text-[1.18rem] leading-tight text-white">{formatCurrency(forecast.averageDailyRevenue)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">Average expected revenue across the next week.</p>
        </div>
        <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-200">Daily trend</p>
          <p className="mt-2 break-words font-display text-[1.18rem] leading-tight text-white">{trendDirectionLabel}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">Estimated direction of movement from the regression slope.</p>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Model window</p>
          <p className="mt-2 break-words font-display text-[1.18rem] leading-tight text-white">Last 30 days</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">Actual line shows the latest 14 days for easier visual comparison.</p>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-3 sm:p-4">
        <div className="mb-4 flex flex-wrap gap-4 text-xs text-gray-300">
          <span className="inline-flex items-center gap-2">
            <span className="h-0 w-4 border-t-2 border-gold" />
            Actual revenue
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0 w-4 border-t-2 border-dashed border-blue-300" />
            Forecast revenue
          </span>
        </div>

        <svg viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`} className="h-[280px] w-full sm:h-[300px]" role="img" aria-label="Revenue Forecast chart">
          {yTicks.map((tick) => {
            const y = getChartY(tick, chartDomain);

            return (
              <g key={`forecast-tick-${tick}`}>
                <line
                  x1={CHART_VIEWBOX.padding.left}
                  x2={CHART_VIEWBOX.width - CHART_VIEWBOX.padding.right}
                  y1={y}
                  y2={y}
                  className={gridLineClassName}
                />
                <text x={CHART_VIEWBOX.padding.left - 12} y={y + 4} textAnchor="end" className={axisLabelClassName}>
                  {formatAxisCurrency(tick)}
                </text>
              </g>
            );
          })}

          {projectionBoundary ? (
            <line
              x1={projectionBoundary}
              x2={projectionBoundary}
              y1={CHART_VIEWBOX.padding.top}
              y2={CHART_VIEWBOX.height - CHART_VIEWBOX.padding.bottom}
              className="stroke-white/12"
              strokeDasharray="6 8"
            />
          ) : null}

          {actualPath ? <path d={actualPath} fill="none" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {forecastPath ? <path d={forecastPath} fill="none" stroke="#93C5FD" strokeWidth="3" strokeDasharray="8 8" strokeLinecap="round" strokeLinejoin="round" /> : null}

          {forecast.actualPoints.map((_point, index) => {
            const point = chartPoints[index];

            if (!point) {
              return null;
            }

            return (
              <circle key={`forecast-actual-point-${index}`} cx={point.x} cy={point.y} r="3" fill="#D4AF37">
                <title>{`${chartSeries[index]?.label ?? ''}: ${formatCurrency(chartSeries[index]?.revenue ?? 0)} actual revenue`}</title>
              </circle>
            );
          })}

          {forecast.forecastPoints.map((_point, index) => {
            const chartPoint = chartPoints[actualLength + index];

            if (!chartPoint) {
              return null;
            }

            return (
              <circle key={`forecast-point-${index}`} cx={chartPoint.x} cy={chartPoint.y} r="3.4" fill="#93C5FD">
                <title>{`${chartSeries[actualLength + index]?.label ?? ''}: ${formatCurrency(chartSeries[actualLength + index]?.revenue ?? 0)} forecast revenue`}</title>
              </circle>
            );
          })}

          {xLabelIndices.map((index) => {
            const point = chartPoints[index];

            if (!point) {
              return null;
            }

            return (
              <text key={`forecast-label-${index}`} x={point.x} y={CHART_VIEWBOX.height - 8} textAnchor="middle" className={axisLabelClassName}>
                {chartSeries[index]?.label ?? ''}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-5 overflow-x-auto rounded-[18px] pb-1">
        <div className="flex min-w-max gap-3">
          {forecast.forecastPoints.map((point) => (
            <div key={point.period} className="w-[10.75rem] rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">{point.label}</p>
              <p className="mt-2 break-words font-display text-[1.08rem] leading-tight text-white">{formatCurrency(point.revenue)}</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">{point.period}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export const CustomerMiningPanel = ({
  customerMining
}: {
  customerMining: SalesAnalysisDto['customerMining'];
}): JSX.Element => {
  const { summary } = customerMining;
  const totalIntentActions = summary.cartIntentCount + summary.wishlistIntentCount;
  const maxDemandScore = Math.max(1, ...customerMining.topProducts.map((product) => product.demandScore));
  const visibleProducts = customerMining.topProducts.slice(0, 5);
  const visiblePages = customerMining.topPages.slice(0, 5);

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-gold">
            <BarChart3 className="h-3.5 w-3.5" />
            Data Mining
          </div>
          <h3 className="mt-3 font-display text-[1.72rem] text-white">Customer Behavior Mining</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Read what customers view, which pages pull the most attention, and which products show the strongest save-to-cart intent.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-right lg:w-[13rem] lg:shrink-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Engagement score</p>
          <p className="mt-2 font-display text-[1.55rem] text-white">{wholeNumberFormatter.format(summary.siteEngagementScore)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-400">{customerMining.windowDays}-day mining window</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(12.5rem,1fr))]">
        <div className="rounded-[20px] border border-blue-400/20 bg-blue-400/10 p-4">
          <div className="flex items-center gap-2 text-blue-200">
            <Eye className="h-4 w-4" />
            <p className="text-[10px] uppercase tracking-[0.22em]">Product views</p>
          </div>
          <p className="mt-2 font-display text-[1.35rem] text-white">{wholeNumberFormatter.format(summary.totalProductViews)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">{wholeNumberFormatter.format(summary.totalPageViews)} total page views.</p>
        </div>
        <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-400/10 p-4">
          <div className="flex items-center gap-2 text-emerald-200">
            <UsersRound className="h-4 w-4" />
            <p className="text-[10px] uppercase tracking-[0.22em]">Visitors</p>
          </div>
          <p className="mt-2 font-display text-[1.35rem] text-white">{wholeNumberFormatter.format(summary.uniqueVisitors)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">{percentageFormatter.format(summary.returningVisitorRate)} returning visitor rate.</p>
        </div>
        <div className="rounded-[20px] border border-gold/20 bg-gold/10 p-4">
          <div className="flex items-center gap-2 text-gold">
            <ShoppingCart className="h-4 w-4" />
            <p className="text-[10px] uppercase tracking-[0.22em]">Buying intent</p>
          </div>
          <p className="mt-2 font-display text-[1.35rem] text-white">{wholeNumberFormatter.format(totalIntentActions)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">Cart and wishlist actions from customer behavior events.</p>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-4">
          <div className="flex items-center gap-2 text-gray-300">
            <Search className="h-4 w-4" />
            <p className="text-[10px] uppercase tracking-[0.22em]">Searches</p>
          </div>
          <p className="mt-2 font-display text-[1.35rem] text-white">{wholeNumberFormatter.format(summary.searchCount)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">{wholeNumberFormatter.format(summary.totalEvents)} total behavior events.</p>
        </div>
      </div>

      {summary.totalEvents > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gold">Most wanted products</p>
                <p className="mt-1 text-sm text-gray-400">Weighted by views, cart adds, and wishlist saves.</p>
              </div>
              <Badge variant="info">{wholeNumberFormatter.format(visibleProducts.length)} ranked</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {visibleProducts.length ? (
                visibleProducts.map((product, index) => {
                  const width = `${Math.max(8, Math.round((product.demandScore / maxDemandScore) * 100))}%`;

                  return (
                    <div key={product.productId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">#{index + 1}</p>
                          <p className="mt-1 truncate text-sm font-medium text-white">{product.name}</p>
                          <p className="mt-1 text-xs text-gray-400">{[product.brand, product.category].filter(Boolean).join(' · ') || 'Catalog product'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-[1.15rem] text-white">{wholeNumberFormatter.format(product.demandScore)}</p>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Score</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gold" style={{ width }} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>{wholeNumberFormatter.format(product.viewCount)} views</span>
                        <span>{wholeNumberFormatter.format(product.cartAdds)} carts</span>
                        <span>{wholeNumberFormatter.format(product.wishlistAdds)} saves</span>
                        <span>{percentageFormatter.format(product.intentRate)} intent</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-gray-400">
                  Product demand will appear after customers view, save, or add products to cart.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-gold">Top pages</p>
              <div className="mt-4 space-y-3">
                {visiblePages.length ? (
                  visiblePages.map((page) => (
                    <div key={page.path} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{page.path}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-500">{page.pageType}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">{wholeNumberFormatter.format(page.viewCount)}</p>
                          <p className="text-xs text-gray-400">{percentageFormatter.format(page.share)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-gray-400">
                    Page ranking will appear after storefront visits are captured.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-gold">Visitor segments</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {customerMining.segments.map((segment) => (
                  <div key={segment.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{segment.label}</p>
                      <p className="font-display text-[1.1rem] text-white">{wholeNumberFormatter.format(segment.visitorCount)}</p>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-gray-400">{segment.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <MousePointerClick className="h-3.5 w-3.5 text-gold" />
                      {percentageFormatter.format(segment.share)} of tracked visitors
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex h-[260px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
          <p className="max-w-md text-sm leading-6 text-gray-400">
            Customer mining starts after storefront page views and product intent events are captured. The home page will use the same ranked product signal.
          </p>
        </div>
      )}
    </Card>
  );
};

export const CustomerRetentionPanel = ({
  retentionCohorts
}: {
  retentionCohorts: SalesAnalysisDto['retentionCohorts'];
}): JSX.Element => {
  const trackedCustomers = retentionCohorts.reduce((sum, cohort) => sum + cohort.cohortSize, 0);
  const retentionWindow = Math.max(6, ...retentionCohorts.map((cohort) => cohort.retention.length));
  const monthOffsets = Array.from({ length: retentionWindow }, (_, index) => index);
  const monthOneRates = retentionCohorts
    .map((cohort) => cohort.retention.find((cell) => cell.monthOffset === 1)?.retentionRate ?? null)
    .filter((rate): rate is number => rate !== null);
  const averageMonthOneRetention =
    monthOneRates.length > 0 ? monthOneRates.reduce((sum, rate) => sum + rate, 0) / monthOneRates.length : null;
  let strongestMonthOneCohort: { label: string; retentionRate: number } | null = null;

  for (const cohort of retentionCohorts) {
    const monthOneRate = cohort.retention.find((cell) => cell.monthOffset === 1)?.retentionRate;

    if (monthOneRate === null || monthOneRate === undefined) {
      continue;
    }

    if (!strongestMonthOneCohort || monthOneRate > strongestMonthOneCohort.retentionRate) {
      strongestMonthOneCohort = {
        label: cohort.cohortLabel,
        retentionRate: monthOneRate
      };
    }
  }

  const getRetentionCellStyle = (retentionRate: number | null): { backgroundColor: string; borderColor: string } => {
    if (retentionRate === null) {
      return {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.08)'
      };
    }

    const intensity = Math.max(0, Math.min(1, retentionRate));

    return {
      backgroundColor: `rgba(16,185,129, ${0.12 + intensity * 0.58})`,
      borderColor: `rgba(110,231,183, ${0.16 + intensity * 0.42})`
    };
  };

  if (!retentionCohorts.length) {
    return (
      <Card className="rounded-[24px] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Retention</p>
            <h3 className="mt-2 font-display text-[1.72rem] text-white">Customer Retention Cohorts</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">Monthly cohort retention will appear here once paid customer orders build enough history to compare repeat activity over time.</p>
          </div>
        </div>

        <div className="mt-5 flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
          <p className="max-w-sm text-sm leading-6 text-gray-400">No paid customer cohorts are available yet for a retention heatmap.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200">
            <CalendarDays className="h-3.5 w-3.5" />
            Cohort Retention
          </div>
          <h3 className="mt-3 font-display text-[1.72rem] text-white">Customer Retention Cohorts</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">Read repeat-purchase behavior by acquisition month. Month 0 is the cohort’s first paid-order month, and later columns show how many of that same customers came back again.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-right sm:w-[13rem] sm:shrink-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Tracked cohort customers</p>
          <p className="mt-2 font-display text-[1.45rem] text-white">{wholeNumberFormatter.format(trackedCustomers)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]">
        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Active cohorts</p>
          <p className="mt-2 font-display text-[1.3rem] text-white">{wholeNumberFormatter.format(retentionCohorts.length)}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">Monthly first-order cohorts shown in the heatmap below.</p>
        </div>
        <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-200">Average month 1 retention</p>
          <p className="mt-2 font-display text-[1.3rem] text-white">
            {averageMonthOneRetention === null ? 'N/A' : percentageFormatter.format(averageMonthOneRetention)}
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-300">Average share of each cohort that returned in the next month.</p>
        </div>
        <div className="rounded-[20px] border border-blue-400/20 bg-blue-400/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-blue-200">Strongest return cohort</p>
          <p className="mt-2 font-display text-[1.3rem] text-white">{strongestMonthOneCohort?.label ?? 'N/A'}</p>
          <p className="mt-1 text-xs leading-5 text-gray-300">
            {strongestMonthOneCohort ? percentageFormatter.format(strongestMonthOneCohort.retentionRate) : 'No next-month retention is available yet.'}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-400">Heatmap intensity increases with higher retention. Blank future cells mean the cohort has not reached that month yet.</p>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gray-400">
          <span>Low</span>
          {[0.15, 0.35, 0.6, 0.85].map((opacity) => (
            <span
              key={opacity}
              className="h-3.5 w-6 rounded-md border"
              style={{
                backgroundColor: `rgba(16,185,129, ${opacity})`,
                borderColor: `rgba(110,231,183, ${Math.min(opacity + 0.12, 1)})`
              }}
            />
          ))}
          <span>High</span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-[20px] border border-white/10 bg-white/[0.03]">
        <table className="w-full min-w-[900px]" aria-label="Customer Retention Cohorts table">
          <thead className="text-left text-[11px] uppercase tracking-[0.24em] text-gray-400">
            <tr>
              <th className="px-4 py-4">Cohort</th>
              {monthOffsets.map((monthOffset) => (
                <th key={monthOffset} className="px-2 py-4 text-center">{`Month ${monthOffset}`}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-gray-300">
            {retentionCohorts.map((cohort) => (
              <tr key={cohort.cohortMonth} className="border-t border-white/5 align-top">
                <td className="px-4 py-4">
                  <div className="min-w-[170px]">
                    <p className="font-medium text-white">{cohort.cohortLabel}</p>
                    <p className="mt-1 text-xs text-gray-400">{`${wholeNumberFormatter.format(cohort.cohortSize)} customers`}</p>
                  </div>
                </td>
                {monthOffsets.map((monthOffset) => {
                  const cell = cohort.retention.find((entry) => entry.monthOffset === monthOffset);
                  const retentionRate = cell?.retentionRate ?? null;
                  const activeCustomers = cell?.activeCustomers ?? null;
                  const cellStyle = getRetentionCellStyle(retentionRate);

                  return (
                    <td key={`${cohort.cohortMonth}-${monthOffset}`} className="px-2 py-2">
                      <div className="min-w-[104px] rounded-2xl border px-3 py-2.5" style={cellStyle}>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-200">{cell?.calendarLabel ?? `Month ${monthOffset}`}</p>
                        {retentionRate === null ? (
                          <>
                            <p className="mt-1.5 font-display text-[1rem] leading-tight text-white">Upcoming</p>
                            <p className="mt-1 text-xs leading-4 text-gray-200">Not enough elapsed time yet.</p>
                          </>
                        ) : (
                          <>
                            <p className="mt-1.5 font-display text-[1.12rem] leading-tight text-white">{percentageFormatter.format(retentionRate)}</p>
                            <p className="mt-1 text-xs leading-4 text-gray-100">{`${wholeNumberFormatter.format(activeCustomers ?? 0)} / ${wholeNumberFormatter.format(cohort.cohortSize)} customers`}</p>
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export const CustomerRfmPanel = ({
  rfmSegments,
  rfmCustomers
}: {
  rfmSegments: SalesRfmSegmentDto[];
  rfmCustomers: SalesRfmCustomerDto[];
}): JSX.Element => {
  const orderedSegments = (['champions', 'atRisk', 'new', 'dormant'] as const).map(
    (key) =>
      rfmSegments.find((segment) => segment.key === key) ?? {
        key,
        label: key,
        customerCount: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        averageRecencyDays: 0
      }
  );
  const visibleCustomers = rfmCustomers.slice(0, 6);

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-blue-200">
            <UsersRound className="h-3.5 w-3.5" />
            RFM Segments
          </div>
          <h3 className="mt-3 font-display text-[1.72rem] text-white">Customer RFM Segments</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">Segment customers by recency, frequency, and monetary value using paid non-quotation orders, then spot who is thriving, cooling, just arriving, or fully dormant.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-right sm:w-[12rem] sm:shrink-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Tracked customers</p>
          <p className="mt-2 font-display text-[1.45rem] text-white">{wholeNumberFormatter.format(rfmCustomers.length)}</p>
        </div>
      </div>

      {rfmCustomers.length ? (
        <>
          <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(13.5rem,1fr))]">
            {orderedSegments.map((segment) => (
              <div key={segment.key} className={`rounded-[20px] border p-4 ${rfmSegmentSurfaceClassName[segment.key]}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant={rfmSegmentBadgeVariant[segment.key]}>{segment.label}</Badge>
                  <span className="text-right text-xs uppercase tracking-[0.18em] text-gray-300">{wholeNumberFormatter.format(segment.customerCount)} customers</span>
                </div>
                <p className="mt-3 break-words font-display text-[1.22rem] leading-tight text-white">{formatCurrency(segment.totalRevenue)}</p>
                <p className="mt-1 text-xs leading-5 text-gray-300">{rfmSegmentDescription[segment.key]}</p>
                <div className="mt-3 grid gap-2 text-xs text-gray-300">
                  <div className="flex items-center justify-between gap-3">
                    <span>Average order value</span>
                    <span className="break-words text-right font-medium text-white">{formatCurrency(segment.averageOrderValue)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Average recency</span>
                    <span className="break-words text-right font-medium text-white">{wholeNumberFormatter.format(segment.averageRecencyDays)} days</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto rounded-[20px] border border-white/10 bg-white/[0.03]">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="text-left text-[11px] uppercase tracking-[0.24em] text-gray-400">
                <tr>
                  <th className="px-4 py-4">Customer</th>
                  <th className="px-4 py-4">Segment</th>
                  <th className="px-4 py-4">Orders</th>
                  <th className="px-4 py-4">Revenue</th>
                  <th className="px-4 py-4">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                {visibleCustomers.map((customer) => (
                  <tr key={customer.customerId}>
                    <td className="px-4 py-4">
                      <div className="min-w-[220px]">
                        <p className="font-medium text-white">{customer.name}</p>
                        <p className="mt-1 text-xs text-gray-400">{customer.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={rfmSegmentBadgeVariant[customer.segmentKey]}>{customer.segmentLabel}</Badge>
                    </td>
                    <td className="px-4 py-4">{wholeNumberFormatter.format(customer.orderCount)}</td>
                    <td className="px-4 py-4 text-white">{formatCurrency(customer.totalRevenue)}</td>
                    <td className="px-4 py-4">
                      <p>{formatExpenseDate(customer.lastOrderDate)}</p>
                      <p className="mt-1 text-xs text-gray-400">{wholeNumberFormatter.format(customer.daysSinceLastOrder)} days ago</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="mt-5 flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
          <p className="max-w-sm text-sm leading-6 text-gray-400">RFM tags will appear here after paid customer orders start building enough history to segment.</p>
        </div>
      )}
    </Card>
  );
};
