export const CHART_VIEWBOX = {
  width: 760,
  height: 280,
  padding: {
    top: 20,
    right: 34,
    bottom: 36,
    left: 82
  }
} as const;

const roundCoordinate = (value: number): number => Number(value.toFixed(2));

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartBar {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getValueDomain(
  values: readonly number[],
  options: { includeZero?: boolean; paddingRatio?: number } = {}
): { min: number; max: number } {
  const includeZero = options.includeZero ?? true;
  const paddingRatio = options.paddingRatio ?? 0.12;

  if (values.length === 0) {
    return { min: 0, max: 1 };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const baseMin = includeZero ? Math.min(0, minValue) : minValue;
  const baseMax = includeZero ? Math.max(0, maxValue) : maxValue;
  const span = Math.max(baseMax - baseMin, 1);

  if (includeZero && baseMin === 0) {
    return {
      min: 0,
      max: baseMax + span * paddingRatio
    };
  }

  return {
    min: baseMin - span * paddingRatio,
    max: baseMax + span * paddingRatio
  };
}

export function createLinearTicks(min: number, max: number, count = 4): number[] {
  if (count <= 1) {
    return [roundCoordinate(max)];
  }

  const span = max - min;
  const step = span === 0 ? 1 : span / (count - 1);

  return Array.from({ length: count }, (_, index) => roundCoordinate(min + step * index)).reverse();
}

export function pickAxisLabelIndices(length: number, maxLabels = 6): number[] {
  if (length <= 0) {
    return [];
  }

  if (length <= maxLabels) {
    return Array.from({ length }, (_, index) => index);
  }

  const lastIndex = length - 1;
  const rawIndices = Array.from({ length: maxLabels }, (_, index) =>
    Math.round((index / (maxLabels - 1)) * lastIndex)
  );

  return [...new Set(rawIndices)];
}

function getPlotMetrics() {
  const plotWidth = CHART_VIEWBOX.width - CHART_VIEWBOX.padding.left - CHART_VIEWBOX.padding.right;
  const plotHeight = CHART_VIEWBOX.height - CHART_VIEWBOX.padding.top - CHART_VIEWBOX.padding.bottom;

  return { plotWidth, plotHeight };
}

export function getChartY(value: number, domain: { min: number; max: number }): number {
  const { plotHeight } = getPlotMetrics();
  const span = Math.max(domain.max - domain.min, 1);
  const normalizedValue = (value - domain.min) / span;

  return roundCoordinate(
    CHART_VIEWBOX.padding.top + plotHeight - normalizedValue * plotHeight
  );
}

export function getBaselineY(domain: { min: number; max: number }): number {
  return getChartY(0, domain);
}

export function createLinePoints(values: readonly number[], domain: { min: number; max: number }): ChartPoint[] {
  if (values.length === 0) {
    return [];
  }

  const { plotWidth } = getPlotMetrics();

  return values.map((value, index) => {
    const x =
      values.length === 1
        ? CHART_VIEWBOX.padding.left + plotWidth / 2
        : CHART_VIEWBOX.padding.left + (index / (values.length - 1)) * plotWidth;

    return {
      x: roundCoordinate(x),
      y: getChartY(value, domain)
    };
  });
}

export function buildLinePath(points: readonly ChartPoint[]): string {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

export function buildAreaPath(points: readonly ChartPoint[], baselineY: number): string {
  if (points.length === 0) {
    return '';
  }

  const linePath = buildLinePath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
}

export function createBars(values: readonly number[], domain: { min: number; max: number }): ChartBar[] {
  if (values.length === 0) {
    return [];
  }

  const { plotWidth } = getPlotMetrics();
  const step = plotWidth / values.length;
  const barWidth = Math.min(step * 0.62, 44);
  const zeroLineY = getBaselineY(domain);

  return values.map((value, index) => {
    const x = CHART_VIEWBOX.padding.left + index * step + (step - barWidth) / 2;
    const y = getChartY(value, domain);
    const top = Math.min(y, zeroLineY);
    const height = Math.max(Math.abs(zeroLineY - y), value === 0 ? 2 : 0);

    return {
      x: roundCoordinate(x),
      y: roundCoordinate(top),
      width: roundCoordinate(barWidth),
      height: roundCoordinate(height)
    };
  });
}
