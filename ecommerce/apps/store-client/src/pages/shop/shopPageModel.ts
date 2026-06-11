import type { ShopFilterPresetDto, ShopFilterPresetParamKey } from '@njstore/types';
import { cn } from '@njstore/utils/cn';
import type { BrowseMode } from '../../hooks/useBrowseMode';
import type { SortValue } from '../../hooks/useProductFilters';
import type { ShopSelectOption } from '../../components/shop/ShopSelect';

export interface CategoryNode {
  id: string;
  name: string;
  slug?: string;
  productCount?: number;
  metaTitle?: string;
  metaDescription?: string;
  depth?: number;
  children?: CategoryNode[];
}

export type ViewMode = 'grid' | 'list';
export type SearchSuggestionKind = 'product' | 'brand' | 'category';

export interface SearchSuggestionOption {
  id: string;
  kind: SearchSuggestionKind;
  label: string;
  meta: string;
  price?: number;
  slug?: string;
  brandSlug?: string;
  categoryId?: string;
}

interface ProductListVirtualizationConfig {
  columns: number;
  rowHeight: number;
  overscan: number;
  thresholdRows: number;
}

export const SEARCH_INPUT_ID = 'shop-search-input';
export const SEARCH_SUGGESTIONS_ID = 'shop-search-suggestions';
export const DEFAULT_SORT: SortValue = '-createdAt';
export const SHOP_SEARCH_SUGGESTION_DEBOUNCE_MS = 120;
export const SHOP_SEARCH_DEBOUNCE_MS = 220;
export const RESULTS_TOOLBAR_MIN_COLLAPSE_OFFSET = 180;
export const RESULTS_TOOLBAR_RESET_SCROLL_Y = 24;
export const RESULTS_TOOLBAR_REOPEN_SCROLL_GRACE_DISTANCE = 72;
export const RESULTS_TOOLBAR_SCROLL_DELTA = 12;

const PRESET_PARAM_KEYS: ShopFilterPresetParamKey[] = [
  'q',
  'category',
  'brand',
  'condition',
  'minPrice',
  'maxPrice',
  'rating',
  'inStock',
  'bestSeller',
  'flashDeal',
  'sort'
];
const GRID_CARD_ASPECT_RATIO_MOBILE = 9 / 15.2;
const GRID_CARD_MIN_HEIGHT_MOBILE = 248;
const GRID_CARD_HEIGHT_DESKTOP = 548;
const GRID_CARD_GAP = 16;
const LIST_CARD_HEIGHT = 292;
const LIST_CARD_GAP = 16;
const MOBILE_PAGE_SHELL_PADDING = 24;
const GRID_CARD_GAP_MOBILE = 10;
const GRID_CARD_GAP_LARGE_MOBILE = 14;

export const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: '-createdAt', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Rating' }
];

export const RATING_OPTIONS: ShopSelectOption[] = [
  { value: '', label: 'Any rating' },
  { value: '4', label: '4 stars and up' },
  { value: '3', label: '3 stars and up' },
  { value: '2', label: '2 stars and up' }
];

export const CONDITION_OPTIONS: ShopSelectOption[] = [
  { value: '', label: 'All items' },
  { value: 'new', label: 'Brand new' },
  { value: 'used', label: 'Used items' }
];

export const flattenCategories = (
  items: CategoryNode[],
  depth = 0
): Array<{ id: string; name: string; slug?: string; productCount?: number; metaTitle?: string; metaDescription?: string; depth: number }> =>
  items.flatMap((item) => [
    {
      id: item.id,
      name: item.name,
      slug: item.slug,
      productCount: item.productCount,
      metaTitle: item.metaTitle,
      metaDescription: item.metaDescription,
      depth
    },
    ...(item.children ? flattenCategories(item.children, depth + 1) : [])
  ]);

export const buildPresetParams = (params: URLSearchParams): ShopFilterPresetDto['params'] => {
  const next: ShopFilterPresetDto['params'] = {};

  PRESET_PARAM_KEYS.forEach((key) => {
    const value = params.get(key);
    if (!value) {
      return;
    }

    if (key === 'sort' && value === DEFAULT_SORT) {
      return;
    }

    next[key] = value;
  });

  return next;
};

const getStorefrontGridGap = (viewportWidth: number): number => (viewportWidth >= 640 ? GRID_CARD_GAP : viewportWidth >= 480 ? GRID_CARD_GAP_LARGE_MOBILE : GRID_CARD_GAP_MOBILE);

const getDefaultResultsToolbarTopOffset = (viewportWidth: number): number => {
  if (viewportWidth >= 1024) {
    return 100;
  }

  if (viewportWidth >= 640) {
    return 98;
  }

  return 97;
};

export const getResultsToolbarTopOffset = (viewportWidth: number): number => {
  const fallbackOffset = getDefaultResultsToolbarTopOffset(viewportWidth);

  if (typeof document === 'undefined') {
    return fallbackOffset;
  }

  const storeHeader = document.querySelector<HTMLElement>('[data-testid="store-header"]');
  if (!storeHeader) {
    return fallbackOffset;
  }

  const storeHeaderHeight = storeHeader.getBoundingClientRect().height;
  return storeHeaderHeight > 0 ? Math.round(storeHeaderHeight) : fallbackOffset;
};

const getMobileGridCardHeight = (viewportWidth: number): number => {
  const availableWidth = Math.max(viewportWidth - MOBILE_PAGE_SHELL_PADDING, 0);
  const cardWidth = Math.max((availableWidth - getStorefrontGridGap(viewportWidth)) / 2, 0);

  return Math.max(GRID_CARD_MIN_HEIGHT_MOBILE, Math.round(cardWidth / GRID_CARD_ASPECT_RATIO_MOBILE));
};

export const getProductListVirtualizationConfig = (viewMode: ViewMode, viewportWidth: number): ProductListVirtualizationConfig => {
  const isMobileViewport = viewportWidth < 768;

  if (viewMode === 'list') {
    return {
      columns: 1,
      rowHeight: LIST_CARD_HEIGHT + LIST_CARD_GAP,
      overscan: isMobileViewport ? 6 : 3,
      thresholdRows: 16
    };
  }

  return {
    columns: viewportWidth >= 1280 ? 4 : 2,
    rowHeight:
      (viewportWidth >= 1280
        ? GRID_CARD_HEIGHT_DESKTOP
        : viewportWidth >= 640
          ? GRID_CARD_HEIGHT_DESKTOP
          : getMobileGridCardHeight(viewportWidth)) + getStorefrontGridGap(viewportWidth),
    overscan: isMobileViewport ? 6 : 2,
    thresholdRows: 12
  };
};

export const buildSearchParamsFromPreset = (preset: ShopFilterPresetDto['params'], browseMode: BrowseMode): URLSearchParams => {
  const next = new URLSearchParams();

  if (browseMode === 'infinite') {
    next.set('browse', 'infinite');
  } else {
    next.set('page', '1');
  }

  PRESET_PARAM_KEYS.forEach((key) => {
    const value = preset[key];
    if (value) {
      next.set(key, value);
    }
  });

  return next;
};

export const compactFilterToggleClass = (active: boolean): string =>
  cn(
    'flex min-h-[42px] items-center justify-between gap-2.5 rounded-xl border px-3 py-2 text-[13px] transition-[border-color,background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:min-h-[46px] sm:gap-3 sm:rounded-2xl sm:px-3.5 sm:py-2.5 sm:text-sm',
    active
      ? 'border-gold/30 bg-gold/10 text-white shadow-[0_10px_24px_rgba(212,175,55,0.08)]'
      : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/15 hover:bg-white/[0.05]'
  );

export const toolbarControlGroupClass =
  'shop-toolbar-control-group flex min-w-[5.25rem] items-center gap-1 rounded-[0.8rem] p-1';

export const toolbarIconToggleClass = (active: boolean): string =>
  cn(
    'shop-toolbar-icon-toggle flex h-9 min-w-9 flex-1 items-center justify-center rounded-[0.7rem] transition-[background-color,color,box-shadow,transform] duration-200',
    active && 'shop-toolbar-icon-toggle--active'
  );

export const toolbarModeToggleClass = (active: boolean): string =>
  cn(
    'shop-toolbar-mode-toggle flex min-h-8 flex-1 items-center justify-center rounded-[0.65rem] px-2.5 text-[10.5px] font-medium transition-[background-color,color,box-shadow,transform] duration-200 sm:min-h-[2.25rem] sm:rounded-[0.7rem] sm:px-3 sm:text-[11px]',
    active && 'shop-toolbar-mode-toggle--active'
  );

export const mobileToolbarModeToggleClass = (active: boolean): string =>
  cn(toolbarModeToggleClass(active), 'min-h-[1.75rem] rounded-[0.58rem] px-[0.5625rem] text-[9px] font-semibold');

export const mobileToolbarButtonClass =
  'shop-toolbar-mobile-button flex h-8 items-center justify-center gap-1.5 rounded-[0.75rem] px-2 text-[10px] font-semibold backdrop-blur-sm transition-[border-color,background-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px sm:h-10 sm:gap-2 sm:rounded-[1rem] sm:px-3 sm:text-xs';

export const mobileCompactToolbarRevealButtonClass =
  'group inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(7,17,32,0.96),rgba(9,21,37,0.92))] text-gray-100 shadow-[0_14px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-[border-color,background-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-white/16 hover:text-white active:translate-y-0';

export const desktopCompactToolbarRevealButtonClass =
  'group inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-strong)] text-[color:var(--theme-text-secondary)] shadow-[0_12px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-[color,transform,opacity,background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color:var(--theme-border-strong)] hover:bg-[color:var(--theme-surface)] hover:text-[color:var(--theme-text-primary)] active:translate-y-0';
