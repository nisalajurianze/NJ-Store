import type { BannerDto, BrandDto, HomeFeedDto, ProductCardDto, ProductDetailDto } from '@njstore/types';
import api from './api';

const HOME_FEED_STORAGE_KEY = 'njstore:home-feed:v1';
const HOME_FEED_STORAGE_TTL_MS = 5 * 60_000;

const unwrap = <T>(payload: { data: { data: T } }): { data: T } => ({
  data: payload.data.data
});

interface CachedHomeFeedPayload {
  cachedAt: number;
  data: Omit<HomeFeedDto, 'recentlyViewed'>;
}

const canUseLocalStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readCachedFeed = (): { data: HomeFeedDto; cachedAt: number } | undefined => {
  if (!canUseLocalStorage()) {
    return undefined;
  }

  try {
    const rawPayload = window.localStorage.getItem(HOME_FEED_STORAGE_KEY);
    if (!rawPayload) {
      return undefined;
    }

    const payload = JSON.parse(rawPayload) as CachedHomeFeedPayload;
    if (!payload.cachedAt || Date.now() - payload.cachedAt > HOME_FEED_STORAGE_TTL_MS) {
      try {
        window.localStorage.removeItem(HOME_FEED_STORAGE_KEY);
      } catch {
        // Ignore storage cleanup failures.
      }
      return undefined;
    }

    return {
      cachedAt: payload.cachedAt,
      data: {
        ...payload.data,
        wantedProducts: payload.data.wantedProducts ?? [],
        recentlyViewed: []
      }
    };
  } catch {
    try {
      window.localStorage.removeItem(HOME_FEED_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
    return undefined;
  }
};

const writeCachedFeed = (feed: HomeFeedDto): void => {
  if (!canUseLocalStorage()) {
    return;
  }

  const { recentlyViewed: _recentlyViewed, ...publicFeed } = feed;

  try {
    window.localStorage.setItem(
      HOME_FEED_STORAGE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        data: publicFeed
      } satisfies CachedHomeFeedPayload)
    );
  } catch {
    // Storage can be unavailable in private browsing or low-quota devices.
  }
};

export const homeService = {
  readCachedFeed,
  writeCachedFeed,
  feed: async () => unwrap<HomeFeedDto>(await api.get('/home-feed')),
  banner: async () => unwrap<BannerDto>(await api.get('/home-feed/banner')),
  featured: async () => unwrap<ProductCardDto[]>(await api.get('/home-feed/featured')),
  latest: async () => unwrap<ProductCardDto[]>(await api.get('/home-feed/latest')),
  flashDeals: async () => unwrap<ProductCardDto[]>(await api.get('/home-feed/flash-deals')),
  wantedProducts: async () => unwrap<ProductCardDto[]>(await api.get('/home-feed/wanted-products')),
  brands: async () => unwrap<BrandDto[]>(await api.get('/home-feed/brands')),
  recentlyViewed: async () => unwrap<ProductDetailDto[]>(await api.get('/home-feed/recently-viewed'))
};
