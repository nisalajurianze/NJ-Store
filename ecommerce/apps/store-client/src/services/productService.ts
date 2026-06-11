import type {
  PaginatedResult,
  ProductCardDto,
  ProductComparisonDto,
  ProductDetailDto,
  ProductFilterQuery,
  ProductPriceRangeDto,
  ProductQuestionDto,
  ProductSuggestionDto,
  ProductUpsellRequestDto
} from '@njstore/types';
import api from './api';
import { readStorageJson, removeStorageItem, writeStorageItem } from '../utils/browserStorage';

const RECENTLY_VIEWED_STORAGE_KEY = 'njstore-recently-viewed';

const unwrap = <T>(payload: { data: { data: T; pagination?: PaginatedResult<T>['pagination'] } }): { data: T; pagination?: PaginatedResult<T>['pagination'] } => ({
  data: payload.data.data,
  pagination: payload.data.pagination
});

const serializeProductFilterParams = (params: ProductFilterQuery): Record<string, string | number | boolean> =>
  Object.entries(params).reduce<Record<string, string | number | boolean>>((serialized, [key, value]) => {
    if (value === undefined || value === null) {
      return serialized;
    }

    if ((key === 'category' || key === 'brand' || key === 'excludeIds') && Array.isArray(value)) {
      if (value.length) {
        serialized[key] = value.join(',');
      }
      return serialized;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      serialized[key] = value;
    }

    return serialized;
  }, {});

const dedupeRecentlyViewed = (items: ProductDetailDto[]): ProductDetailDto[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.id || item.slug;
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const readLocalRecentlyViewed = (): ProductDetailDto[] => {
  const stored = readStorageJson<unknown>(RECENTLY_VIEWED_STORAGE_KEY, []);
  if (!Array.isArray(stored)) {
    return [];
  }

  return dedupeRecentlyViewed(stored as ProductDetailDto[]);
};

const writeLocalRecentlyViewed = (items: ProductDetailDto[]): void => {
  writeStorageItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(dedupeRecentlyViewed(items).slice(0, 10)));
};

export const productService = {
  list: async (params: ProductFilterQuery) => {
    const response = await api.get<{ data: ProductCardDto[]; pagination?: PaginatedResult<ProductCardDto[]>['pagination'] }>('/products', {
      params: serializeProductFilterParams(params)
    });
    return unwrap<ProductCardDto[]>(response);
  },
  priceRange: async (params: Omit<ProductFilterQuery, 'minPrice' | 'maxPrice' | 'page' | 'limit'> = {}) =>
    unwrap<ProductPriceRangeDto>(
      await api.get('/products/price-range', {
        params: serializeProductFilterParams(params)
      })
    ),
  upsells: async (cartIds: string[], limit = 3) =>
    unwrap<ProductCardDto[]>(
      await api.get('/products/upsell', {
        params: {
          ids: cartIds.join(','),
          limit
        }
      })
    ),
  upsell: async (payload: ProductUpsellRequestDto) => unwrap<ProductCardDto[]>(await api.post('/products/upsell', payload)),
  detail: async (slug: string) => unwrap<ProductDetailDto>(await api.get(`/products/${slug}`)),
  suggestions: async (q: string, signal?: AbortSignal) => unwrap<ProductSuggestionDto[]>(await api.get('/products/suggestions', { params: { q }, signal })),
  compare: async (ids: string[]) => unwrap<ProductComparisonDto[]>(await api.get('/products/compare', { params: { ids: ids.join(',') } })),
  saveCompare: async (items: string[]) => unwrap<{ items: string[] }>(await api.post('/products/compare', { items })),
  wishlist: async () => unwrap<ProductDetailDto[]>(await api.get('/products/wishlist')),
  toggleWishlist: async (id: string) => unwrap<{ added: boolean }>(await api.post(`/products/${id}/wishlist`)),
  questions: async (id: string) => unwrap<ProductQuestionDto[]>(await api.get(`/products/${id}/questions`)),
  askQuestion: async (
    id: string,
    payload: {
      customerName?: string;
      customerEmail?: string;
      question: string;
    }
  ) => unwrap<{ id: string; status: 'pending' }>(await api.post(`/products/${id}/questions`, payload)),
  subscribeToBackInStock: async (
    id: string,
    payload: {
      email: string;
      name?: string;
      variantIndex?: number;
    }
  ) => unwrap<{ id: string; email: string; productId: string; variantIndex?: number }>(
    await api.post(`/products/${id}/back-in-stock-subscriptions`, payload)
  ),
  trackRecentlyViewed: async (id: string, snapshot?: ProductDetailDto) => {
    if (snapshot) {
      const next = [snapshot, ...readLocalRecentlyViewed().filter((item) => item.id !== snapshot.id)].slice(0, 10);
      writeLocalRecentlyViewed(next);
    }
    await api.post(`/products/${id}/recently-viewed`);
  },
  recentlyViewed: async () => unwrap<ProductDetailDto[]>(await api.get('/products/recently-viewed')),
  getLocalRecentlyViewed: (): ProductDetailDto[] => readLocalRecentlyViewed(),
  clearLocalRecentlyViewed: (): void => {
    removeStorageItem(RECENTLY_VIEWED_STORAGE_KEY);
  },
  categories: async () => unwrap(await api.get('/categories'))
};
