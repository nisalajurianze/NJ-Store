import { useMemo } from 'react';

export type SortValue = '-createdAt' | 'price_asc' | 'price_desc' | 'rating' | 'popular';

export interface CatalogFilters {
  q?: string;
  category?: string[];
  brand?: string[];
  condition?: 'new' | 'used';
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  bestSeller?: boolean;
  flashDeal?: boolean;
  sort?: SortValue;
  limit: number;
}

interface UseProductFiltersValue {
  selectedCategoryIds: string[];
  selectedBrands: string[];
  catalogFilters: CatalogFilters;
  currentPage: number;
  paginatedFilters: CatalogFilters & { page: number };
  priceRangeFilters: Omit<CatalogFilters, 'minPrice' | 'maxPrice' | 'sort' | 'limit'>;
}

const parseCsvParam = (value: string | null): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseNumberParam = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const useProductFilters = (searchParams: URLSearchParams): UseProductFiltersValue => {
  const selectedCategoryIds = useMemo(() => parseCsvParam(searchParams.get('category')), [searchParams]);
  const selectedBrands = useMemo(() => parseCsvParam(searchParams.get('brand')), [searchParams]);

  const catalogFilters = useMemo<CatalogFilters>(
    () => ({
      q: searchParams.get('q') ?? undefined,
      category: selectedCategoryIds.length ? selectedCategoryIds : undefined,
      brand: selectedBrands.length ? selectedBrands : undefined,
      condition: (searchParams.get('condition') as 'new' | 'used' | null) ?? undefined,
      minPrice: parseNumberParam(searchParams.get('minPrice')),
      maxPrice: parseNumberParam(searchParams.get('maxPrice')),
      rating: parseNumberParam(searchParams.get('rating')),
      inStock: searchParams.get('inStock') === 'true' ? true : undefined,
      bestSeller: searchParams.get('bestSeller') === 'true' ? true : undefined,
      flashDeal: searchParams.get('flashDeal') === 'true' ? true : undefined,
      sort: (searchParams.get('sort') as SortValue | null) ?? undefined,
      limit: 12
    }),
    [searchParams, selectedBrands, selectedCategoryIds]
  );

  const currentPage = useMemo(() => {
    const parsedPage = Number(searchParams.get('page') ?? 1);
    return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  }, [searchParams]);

  const paginatedFilters = useMemo(
    () => ({
      ...catalogFilters,
      page: currentPage
    }),
    [catalogFilters, currentPage]
  );

  const priceRangeFilters = useMemo(
    () => ({
      q: catalogFilters.q,
      category: catalogFilters.category,
      brand: catalogFilters.brand,
      condition: catalogFilters.condition,
      rating: catalogFilters.rating,
      inStock: catalogFilters.inStock,
      bestSeller: catalogFilters.bestSeller,
      flashDeal: catalogFilters.flashDeal
    }),
    [
      catalogFilters.bestSeller,
      catalogFilters.brand,
      catalogFilters.category,
      catalogFilters.condition,
      catalogFilters.flashDeal,
      catalogFilters.inStock,
      catalogFilters.q,
      catalogFilters.rating
    ]
  );

  return {
    selectedCategoryIds,
    selectedBrands,
    catalogFilters,
    currentPage,
    paginatedFilters,
    priceRangeFilters
  };
};
