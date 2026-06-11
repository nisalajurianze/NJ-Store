import { useCallback, useEffect, useState } from 'react';

const clampPrice = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const normalizePriceRange = (min: number, max: number, floor: number, ceiling: number): [number, number] => {
  const safeMin = clampPrice(min, floor, ceiling);
  const safeMax = clampPrice(max, floor, ceiling);
  return safeMin <= safeMax ? [safeMin, safeMax] : [safeMax, safeMin];
};

interface UsePriceRangeOptions {
  floor: number;
  ceiling: number;
  minPrice?: number;
  maxPrice?: number;
}

interface UsePriceRangeValue {
  draftPriceRange: [number, number];
  draftMinPrice: number;
  draftMaxPrice: number;
  setDraftPriceRange: (range: [number, number]) => void;
  syncDraftPriceRange: (nextMin?: number, nextMax?: number) => void;
}

export const usePriceRange = ({ floor, ceiling, minPrice, maxPrice }: UsePriceRangeOptions): UsePriceRangeValue => {
  const [draftPriceRange, setDraftPriceRange] = useState<[number, number]>(
    normalizePriceRange(minPrice ?? floor, maxPrice ?? ceiling, floor, ceiling)
  );

  useEffect(() => {
    setDraftPriceRange(normalizePriceRange(minPrice ?? floor, maxPrice ?? ceiling, floor, ceiling));
  }, [ceiling, floor, maxPrice, minPrice]);

  const syncDraftPriceRange = useCallback(
    (nextMin = minPrice ?? floor, nextMax = maxPrice ?? ceiling) => {
      setDraftPriceRange(normalizePriceRange(nextMin, nextMax, floor, ceiling));
    },
    [ceiling, floor, maxPrice, minPrice]
  );

  return {
    draftPriceRange,
    draftMinPrice: draftPriceRange[0],
    draftMaxPrice: draftPriceRange[1],
    setDraftPriceRange,
    syncDraftPriceRange
  };
};
