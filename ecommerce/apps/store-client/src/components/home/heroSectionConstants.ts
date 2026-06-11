/**
 * HeroSection — pure constants and utility helpers.
 *
 * Extracted from HeroSection.tsx to reduce the component's cognitive load.
 * These are pure data/functions with zero React dependency.
 */
import type { ProductCardDto } from '@njstore/types';

// ─── Timing constants ────────────────────────────────────────────────
export const defaultHeroCornerImageSize = 108;
export const SHOWCASE_PREVIEW_KICKOFF_DELAY = 480;
export const SHOWCASE_PREVIEW_AUTOSCROLL_MS = 3000;
export const SHOWCASE_PREVIEW_RESET_DELAY = 320;

// ─── Type exports ────────────────────────────────────────────────────
export type BrandLogoShape = 'square' | 'compact' | 'wide';

export type ProductPreviewImage = {
  url: string;
  alt?: string;
  srcSet?: string;
  sizes?: string;
};

// ─── Utility helpers ─────────────────────────────────────────────────
export const normalizeHeroCornerImageSize = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : defaultHeroCornerImageSize;

export const resolveHeroCornerImageEnabled = (value: boolean | undefined): boolean =>
  typeof value === 'boolean' ? value : true;

export const normalizeBrandLabel = (brand?: string | null): string => {
  const normalizedBrand = typeof brand === 'string' ? brand.trim() : '';
  return normalizedBrand || 'Unbranded';
};

export const resolveProductRatings = (
  ratings?: {
    average?: number | null;
    count?: number | null;
  } | null
): { average: number; count: number } => ({
  average: typeof ratings?.average === 'number' && Number.isFinite(ratings.average) ? ratings.average : 0,
  count: typeof ratings?.count === 'number' && Number.isFinite(ratings.count) ? Math.max(0, Math.trunc(ratings.count)) : 0
});

export const getBrandLogoShapeFromName = (brand?: string | null): BrandLogoShape => {
  const normalizedBrand = normalizeBrandLabel(brand).toLowerCase();

  if (['apple', 'jbl', 'hp'].some((brandName) => normalizedBrand.includes(brandName))) {
    return 'square';
  }

  if (['samsung', 'sony', 'lenovo', 'nillkin', 'canon', 'belkin', 'epson', 'anker'].some((brandName) => normalizedBrand.includes(brandName))) {
    return 'wide';
  }

  return 'compact';
};

export const appendBannerVersion = (imageUrl: string, updatedAt?: string): string => {
  if (!updatedAt) {
    return imageUrl;
  }

  const separator = imageUrl.includes('?') ? '&' : '?';
  return `${imageUrl}${separator}bannerVersion=${encodeURIComponent(updatedAt)}`;
};

export const getUniqueShowcaseProducts = (flashDealItems: ProductCardDto[], featuredItems: ProductCardDto[]): ProductCardDto[] =>
  [...flashDealItems, ...featuredItems].filter(
    (product, index, items) => items.findIndex((candidate) => candidate.id === product.id) === index
  );
