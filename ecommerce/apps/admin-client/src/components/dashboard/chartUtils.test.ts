import { describe, expect, it } from 'vitest';
import {
  buildAreaPath,
  buildLinePath,
  createBars,
  createLinePoints,
  createLinearTicks,
  getBaselineY,
  getValueDomain,
  pickAxisLabelIndices
} from './chartUtils';

describe('chart utils', () => {
  it('creates a stable zero-based domain for positive values', () => {
    expect(getValueDomain([1200, 1800, 2400])).toEqual({
      min: 0,
      max: 2688
    });
  });

  it('creates readable label indices that keep the first and last label', () => {
    expect(pickAxisLabelIndices(3)).toEqual([0, 1, 2]);
    expect(pickAxisLabelIndices(12, 5)).toEqual([0, 3, 6, 8, 11]);
  });

  it('builds line and area paths from calculated points', () => {
    const domain = { min: 0, max: 100 };
    const points = createLinePoints([0, 50, 100], domain);

    expect(buildLinePath(points)).toBe('M 82 244 L 404 132 L 726 20');
    expect(buildAreaPath(points, getBaselineY(domain))).toBe(
      'M 82 244 L 404 132 L 726 20 L 726 244 L 82 244 Z'
    );
  });

  it('creates ticks and bars within the expected plot bounds', () => {
    const domain = getValueDomain([1200, 1800, 2400]);
    const ticks = createLinearTicks(domain.min, domain.max, 4);
    const bars = createBars([1200, 1800, 2400], domain);

    expect(ticks).toEqual([2688, 1792, 896, 0]);
    expect(bars).toHaveLength(3);
    expect(bars[0]?.height).toBeGreaterThan(0);
    expect(bars[2]?.y).toBeLessThan(bars[0]?.y ?? 0);
  });
});
