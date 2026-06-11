import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent
} from 'react';
import type { BrandDto, ShopFilterPresetDto } from '@njstore/types';
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Input, Pagination, PriceRangeSlider } from '@njstore/ui';
import { cn } from '@njstore/utils/cn';
import { Check, ChevronDown, LoaderCircle, SlidersHorizontal, X } from 'lucide-react';
import '../styles/shop-controls.css';
import { StoreBreadcrumbs } from '../components/layout/StoreBreadcrumbs';
import { SeoHead } from '../components/seo/SeoHead';
import { SearchSuggestionSkeletonList } from '../components/shop/ShopSkeletons';
import { ShopSelect, type ShopSelectOption } from '../components/shop/ShopSelect';
import { useAuth } from '../context/AuthContext';
import { useBrowseMode, type BrowseMode } from '../hooks/useBrowseMode';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { useDebounce } from '../hooks/useDebounce';
import { useFastMotionPreference } from '../hooks/useFastMotionPreference';
import { normalizePriceRange, usePriceRange } from '../hooks/usePriceRange';
import { useProductFilters } from '../hooks/useProductFilters';
import { useWishlist } from '../hooks/useWishlist';
import { brandService } from '../services/brandService';
import { productService } from '../services/productService';
import { buildKeywordList } from '../seo/siteMetadata';
import { toast } from '../utils/lazyToast';
import {
  CONDITION_OPTIONS,
  DEFAULT_SORT,
  RATING_OPTIONS,
  SEARCH_INPUT_ID,
  SEARCH_SUGGESTIONS_ID,
  SHOP_SEARCH_DEBOUNCE_MS,
  SHOP_SEARCH_SUGGESTION_DEBOUNCE_MS,
  SORT_OPTIONS,
  buildPresetParams,
  buildSearchParamsFromPreset,
  compactFilterToggleClass,
  desktopCompactToolbarRevealButtonClass,
  flattenCategories,
  getProductListVirtualizationConfig,
  mobileCompactToolbarRevealButtonClass,
  mobileToolbarButtonClass,
  mobileToolbarModeToggleClass,
  toolbarControlGroupClass,
  toolbarModeToggleClass,
  type CategoryNode,
  type SearchSuggestionOption
} from './shop/shopPageModel';
import { ShopFilterDrawers } from './shop/ShopFilterDrawers';
import { ShopProductResults } from './shop/ShopProductResults';
import { useResultsToolbar } from './shop/useResultsToolbar';

export const Shop = (): JSX.Element => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const systemReduceMotion = useReducedMotion();
  const fastMotion = useFastMotionPreference();
  const reduceMotion = Boolean(systemReduceMotion || fastMotion);
  const { formatCurrency } = useCurrencyFormatter();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(false);
const viewMode = 'grid' as const;
const catalogCategoriesQueryKey = ['catalog', 'categories'] as const;
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [optimisticMyFilters, setOptimisticMyFilters] = useState<ShopFilterPresetDto | null>(null);
  const [presetAction, setPresetAction] = useState<'save' | 'clear' | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const [mobileToolbarMenuOpen, setMobileToolbarMenuOpen] = useState(false);
  const {
    isResultsToolbarOpen,
    hasScrolledPastResultsToolbar,
    resultsToolbarTopOffset,
    resultsHeaderRef,
    expandResultsToolbar
  } = useResultsToolbar(() => setMobileToolbarMenuOpen(false));
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const infiniteSentinelRef = useRef<HTMLDivElement | null>(null);
  const productListRef = useRef<HTMLDivElement | null>(null);
  const mobileToolbarMenuRef = useRef<HTMLDivElement | null>(null);
  const skipNextSearchParamSyncRef = useRef(false);
  const [isInfiniteSentinelVisible, setIsInfiniteSentinelVisible] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateProfile, user } = useAuth();
  const wishlist = useWishlist();
  const debouncedSearch = useDebounce(search, SHOP_SEARCH_DEBOUNCE_MS);
  const debouncedSuggestionSearch = useDebounce(search, SHOP_SEARCH_SUGGESTION_DEBOUNCE_MS);
  const querySearch = searchParams.get('q') ?? '';
  const browseMode = useBrowseMode(searchParams);
  const isDesktopViewport = viewportWidth >= 1024;
  const { selectedCategoryIds, selectedBrands, catalogFilters, paginatedFilters, priceRangeFilters } =
    useProductFilters(searchParams);

  const paginatedProducts = useQuery({
    queryKey: ['shop', 'pagination', paginatedFilters],
    queryFn: () => productService.list(paginatedFilters),
    enabled: browseMode === 'pagination',
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false
  });

  const infiniteProducts = useInfiniteQuery({
    queryKey: ['shop', 'infinite', catalogFilters],
    queryFn: ({ pageParam }) => productService.list({ ...catalogFilters, page: Number(pageParam) }),
    enabled: browseMode === 'infinite',
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (!pagination || pagination.page >= pagination.totalPages) {
        return undefined;
      }

      return pagination.page + 1;
    },
    refetchOnWindowFocus: false
  });

  const categories = useQuery({
    queryKey: catalogCategoriesQueryKey,
    queryFn: () => productService.categories(),
    staleTime: 5 * 60_000
  });

  const priceRangeQuery = useQuery({
    queryKey: ['shop', 'price-range', priceRangeFilters],
    queryFn: () => productService.priceRange(priceRangeFilters),
    staleTime: 2 * 60_000
  });

  const brands = useQuery({
    queryKey: ['shop', 'brands'],
    queryFn: () => brandService.list({ limit: 50, sort: 'sortOrder' }),
    staleTime: 5 * 60_000
  });

  const trimmedSuggestionSearch = debouncedSuggestionSearch.trim();
  const suggestions = useQuery({
    queryKey: ['shop', 'suggestions', trimmedSuggestionSearch],
    queryFn: ({ signal }) => productService.suggestions(trimmedSuggestionSearch, signal),
    enabled: trimmedSuggestionSearch.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false
  });

  const categoryOptions = useMemo(() => flattenCategories((categories.data?.data ?? []) as CategoryNode[]), [categories.data?.data]);
  const categoryDetailsById = useMemo(() => new Map(categoryOptions.map((category) => [category.id, category])), [categoryOptions]);
  const selectedCategoryDetails = useMemo(
    () =>
      selectedCategoryIds
        .map((categoryId) => categoryDetailsById.get(categoryId))
        .filter((category): category is NonNullable<ReturnType<typeof categoryDetailsById.get>> => Boolean(category)),
    [categoryDetailsById, selectedCategoryIds]
  );
  const primarySelectedCategory = selectedCategoryDetails[0];
  const categorySelectOptions = useMemo<ShopSelectOption[]>(
    () => [
      { value: '', label: 'All categories', selectionLabel: 'All categories' },
      ...categoryOptions.map((category) => ({
        value: category.id,
        label:
          typeof category.productCount === 'number'
            ? `${category.depth > 0 ? `${'— '.repeat(category.depth)}` : ''}${category.name} (${category.productCount.toLocaleString()})`
            : `${category.depth > 0 ? `${'— '.repeat(category.depth)}` : ''}${category.name}`,
        selectionLabel: category.name,
        disabled: category.productCount === 0 && !selectedCategoryIds.includes(category.id)
      }))
    ],
    [categoryOptions, selectedCategoryIds]
  );
  const availableBrands = useMemo(() => (brands.data?.data ?? []) as BrandDto[], [brands.data?.data]);
  const brandNameMap = useMemo(() => new Map(availableBrands.map((brand) => [brand.slug, brand.name])), [availableBrands]);
  const brandSelectOptions = useMemo<ShopSelectOption[]>(
    () => [
      { value: '', label: 'All brands', selectionLabel: 'All brands' },
      ...availableBrands.map((brand) => ({
        value: brand.slug,
        label:
          typeof brand.productCount === 'number' ? `${brand.name} (${brand.productCount.toLocaleString()})` : brand.name,
        selectionLabel: brand.name,
        disabled: brand.productCount === 0 && !selectedBrands.includes(brand.slug)
      }))
    ],
    [availableBrands, selectedBrands]
  );
  const maxCatalogPrice = useMemo(
    () => Math.max(priceRangeQuery.data?.data.max ?? 0, 0),
    [priceRangeQuery.data?.data.max]
  );

  const priceStep = useMemo(() => {
    if (maxCatalogPrice >= 1_000_000) {
      return 10_000;
    }
    if (maxCatalogPrice >= 250_000) {
      return 5_000;
    }
    if (maxCatalogPrice >= 100_000) {
      return 2_500;
    }
    return 1_000;
  }, [maxCatalogPrice]);

  const priceSliderFloor = 0;
  const priceSliderCeiling = useMemo(() => {
    const rawMaximum = Math.max(maxCatalogPrice, catalogFilters.maxPrice ?? 0, catalogFilters.minPrice ?? 0, 100_000);
    return Math.max(priceStep, Math.ceil(rawMaximum / priceStep) * priceStep);
  }, [catalogFilters.maxPrice, catalogFilters.minPrice, maxCatalogPrice, priceStep]);
  const { draftPriceRange, draftMinPrice, draftMaxPrice, setDraftPriceRange, syncDraftPriceRange } = usePriceRange({
    floor: priceSliderFloor,
    ceiling: priceSliderCeiling,
    minPrice: catalogFilters.minPrice,
    maxPrice: catalogFilters.maxPrice
  });

  const infinitePages = infiniteProducts.data?.pages ?? [];
  const lastInfinitePage = infinitePages[infinitePages.length - 1];
  const productRows = browseMode === 'pagination' ? paginatedProducts.data?.data ?? [] : infinitePages.flatMap((page) => page.data);
  const totalResults =
    browseMode === 'pagination' ? paginatedProducts.data?.pagination?.total ?? productRows.length : lastInfinitePage?.pagination?.total ?? productRows.length;
  const currentSort = catalogFilters.sort ?? DEFAULT_SORT;
  const deferredProductRows = useDeferredValue(productRows);
  const renderedProductRows = browseMode === 'infinite' && productRows.length > 24 ? deferredProductRows : productRows;
  const virtualizationConfig = useMemo(
    () => getProductListVirtualizationConfig(viewMode, viewportWidth),
    [viewMode, viewportWidth]
  );
  const virtualRowCount = Math.ceil(renderedProductRows.length / virtualizationConfig.columns);
  const shouldVirtualizeResults = virtualRowCount > virtualizationConfig.thresholdRows;
  const productRowVirtualizer = useWindowVirtualizer<HTMLDivElement>({
    count: virtualRowCount,
    estimateSize: () => virtualizationConfig.rowHeight,
    overscan: virtualizationConfig.overscan,
    enabled: shouldVirtualizeResults,
    scrollMargin: productListRef.current?.offsetTop ?? 0,
    getItemKey: (index) => `${viewMode}-${index}`,
    initialRect: {
      width: viewportWidth,
      height: typeof window === 'undefined' ? 768 : window.innerHeight
    }
  });
  const virtualProductRows = shouldVirtualizeResults ? productRowVirtualizer.getVirtualItems() : [];
  const rawProductSuggestions = suggestions.data?.data ?? [];
  const trimmedSearch = search.trim();
  const isAwaitingSuggestionSearch = trimmedSearch.length >= 2 && trimmedSuggestionSearch !== trimmedSearch;
  const searchSuggestionOptions = useMemo<SearchSuggestionOption[]>(() => {
    const normalizedQuery = trimmedSuggestionSearch.toLowerCase();
    if (normalizedQuery.length < 2) {
      return rawProductSuggestions
        .slice(0, 5)
        .map((suggestion) => ({
          id: suggestion.id,
          kind: 'product',
          label: suggestion.name,
          meta: 'Product',
          price: suggestion.price,
          slug: suggestion.slug
        }));
    }

    const productSuggestions = rawProductSuggestions.slice(0, 5).map((suggestion) => ({
      id: suggestion.id,
      kind: 'product' as const,
      label: suggestion.name,
      meta: 'Product',
      price: suggestion.price,
      slug: suggestion.slug
    }));
    const brandSuggestions = availableBrands
      .filter((brand) => brand.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 2)
      .map((brand) => ({
        id: `brand-${brand.id}`,
        kind: 'brand' as const,
        label: brand.name,
        meta: `Brand${typeof brand.productCount === 'number' ? ` • ${brand.productCount.toLocaleString()} items` : ''}`,
        brandSlug: brand.slug
      }));
    const categorySuggestions = categoryOptions
      .filter((category) => category.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 2)
      .map((category) => ({
        id: `category-${category.id}`,
        kind: 'category' as const,
        label: category.name,
        meta: `Category${typeof category.productCount === 'number' ? ` • ${category.productCount.toLocaleString()} items` : ''}`,
        categoryId: category.id
      }));

    return [...productSuggestions, ...brandSuggestions, ...categorySuggestions].slice(0, 9);
  }, [availableBrands, categoryOptions, rawProductSuggestions, trimmedSuggestionSearch]);
  const shouldRenderSuggestionPanel =
    isSearchFocused &&
    trimmedSearch.length >= 2 &&
    (isAwaitingSuggestionSearch || suggestions.isFetching || suggestions.isFetched || searchSuggestionOptions.length > 0);
  const isInitialProductLoad =
    browseMode === 'pagination'
      ? paginatedProducts.isLoading && productRows.length === 0
      : infiniteProducts.isLoading && productRows.length === 0;
  const isRefreshingRows =
    browseMode === 'pagination'
      ? paginatedProducts.isFetching && !paginatedProducts.isLoading && productRows.length > 0
      : infiniteProducts.isFetching && !infiniteProducts.isLoading && !infiniteProducts.isFetchingNextPage && productRows.length > 0;
  const isLoadingMore = browseMode === 'infinite' && infiniteProducts.isFetchingNextPage;
  const hasMoreInfiniteResults = browseMode === 'infinite' && Boolean(infiniteProducts.hasNextPage);
  const myFiltersPreset = user ? optimisticMyFilters : null;
  const isResolvingInitialResults = isInitialProductLoad;
  const resultsHeadline = isResolvingInitialResults
    ? 'Loading products...'
    : `${totalResults.toLocaleString()} ${totalResults === 1 ? 'result' : 'results'} found`;
  const resultsSummary = isResolvingInitialResults
    ? 'Checking the latest matching products for your current filters.'
    : browseMode === 'infinite'
      ? `${productRows.length.toLocaleString()} loaded so far from ${totalResults.toLocaleString()} matches.`
      : `Showing ${productRows.length.toLocaleString()} products on this page.`;
  const shopOpenGraphImage = renderedProductRows[0]?.thumbnail?.url ?? renderedProductRows[0]?.previewImages?.[0]?.url;
  const emptyStateActionKeys = useMemo(() => {
    const actions: Array<{ key: string; label: string }> = [];

    if (catalogFilters.inStock) {
      actions.push({ key: 'inStock', label: 'Include out-of-stock' });
    }
    if (catalogFilters.q) {
      actions.push({ key: 'q', label: 'Clear search' });
    }
    if (catalogFilters.minPrice || catalogFilters.maxPrice) {
      actions.push({ key: 'price', label: 'Reset price range' });
    }
    if (selectedBrands.length) {
      actions.push({ key: 'brand', label: 'Show all brands' });
    }
    if (selectedCategoryIds.length) {
      actions.push({ key: 'category', label: 'Browse all categories' });
    }
    if (catalogFilters.rating) {
      actions.push({ key: 'rating', label: 'Allow any rating' });
    }
    if (catalogFilters.condition) {
      actions.push({ key: 'condition', label: 'Show all item types' });
    }
    if (catalogFilters.bestSeller) {
      actions.push({ key: 'bestSeller', label: 'Include all products' });
    }
    if (catalogFilters.flashDeal) {
      actions.push({ key: 'flashDeal', label: 'Show all offers' });
    }

    return actions.slice(0, 4);
  }, [
    catalogFilters.bestSeller,
    catalogFilters.condition,
    catalogFilters.flashDeal,
    catalogFilters.inStock,
    catalogFilters.maxPrice,
    catalogFilters.minPrice,
    catalogFilters.q,
    catalogFilters.rating,
    selectedCategoryIds.length,
    selectedBrands.length
  ]);

  useEffect(() => {
    setOptimisticMyFilters(user?.shopPreferences?.myFilters ?? null);
  }, [user?.id, user?.shopPreferences?.myFilters]);

  useEffect(() => {
    setSearch((current) => (current === querySearch ? current : querySearch));
  }, [querySearch]);

  useEffect(() => {
    if (activeSuggestionIndex >= searchSuggestionOptions.length) {
      setActiveSuggestionIndex(searchSuggestionOptions.length ? 0 : -1);
    }
  }, [activeSuggestionIndex, searchSuggestionOptions.length]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let resizeFrameId: number | null = null;

    const syncViewportWidth = (): void => {
      const nextViewportWidth = window.innerWidth;
      setViewportWidth((currentViewportWidth) =>
        currentViewportWidth === nextViewportWidth ? currentViewportWidth : nextViewportWidth
      );
    };

    const scheduleSyncViewportWidth = (): void => {
      if (resizeFrameId !== null) {
        return;
      }

      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        syncViewportWidth();
      });
    };

    syncViewportWidth();
    window.addEventListener('resize', scheduleSyncViewportWidth);

    return () => {
      window.removeEventListener('resize', scheduleSyncViewportWidth);
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
    };
  }, []);




  useEffect(() => {
    if (!mobileToolbarMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent): void => {
      if (event.target instanceof Node && mobileToolbarMenuRef.current?.contains(event.target)) {
        return;
      }

      setMobileToolbarMenuOpen(false);
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileToolbarMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileToolbarMenuOpen]);

  useEffect(() => {
    if (isDesktopViewport) {
      setMobileToolbarMenuOpen(false);
    }
  }, [isDesktopViewport]);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim();

    if (skipNextSearchParamSyncRef.current) {
      skipNextSearchParamSyncRef.current = false;
      return;
    }

    if (normalizedSearch === querySearch) {
      return;
    }

    setSearchParams(
      (currentParams) => {
        const next = new URLSearchParams(currentParams);

        if (normalizedSearch) {
          next.set('q', normalizedSearch);
        } else {
          next.delete('q');
        }

        if (browseMode === 'pagination') {
          next.set('page', '1');
        } else {
          next.delete('page');
        }

        return next;
      },
      { replace: true }
    );
  }, [browseMode, debouncedSearch, querySearch, setSearchParams]);

  useEffect(() => {
    if (isDesktopViewport) {
      setMobileFilterOpen(false);
      return;
    }

    setDesktopFilterOpen(false);
  }, [isDesktopViewport]);

  useEffect(() => {
    if (!desktopFilterOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setDesktopFilterOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [desktopFilterOpen]);

  useEffect(() => {
    if (browseMode !== 'infinite' || typeof IntersectionObserver === 'undefined' || !infiniteSentinelRef.current) {
      setIsInfiniteSentinelVisible(false);
      return;
    }

    const sentinel = infiniteSentinelRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInfiniteSentinelVisible(entry.isIntersecting);
      },
      {
        rootMargin: '720px 0px',
        threshold: 0.01
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [browseMode, hasMoreInfiniteResults, productRows.length]);

  useEffect(() => {
    if (browseMode !== 'infinite' || !isInfiniteSentinelVisible || !infiniteProducts.hasNextPage || infiniteProducts.isFetchingNextPage) {
      return;
    }

    void infiniteProducts.fetchNextPage();
  }, [browseMode, infiniteProducts, isInfiniteSentinelVisible]);

  const prefetchPaginationPage = (page: number): void => {
    const nextFilters = {
      ...catalogFilters,
      page
    };

    void queryClient.prefetchQuery({
      queryKey: ['shop', 'pagination', nextFilters],
      queryFn: () => productService.list(nextFilters)
    });
  };

  useEffect(() => {
    if (browseMode !== 'pagination') {
      return;
    }

    const pagination = paginatedProducts.data?.pagination;
    if (!pagination || pagination.page >= pagination.totalPages) {
      return;
    }

    prefetchPaginationPage(pagination.page + 1);
  }, [browseMode, catalogFilters, paginatedProducts.data?.pagination, queryClient]);

  const updateParams = (updates: Record<string, string | null>, resetPage = true): void => {
    setSearchParams(
      (currentParams) => {
        const next = new URLSearchParams(currentParams);

        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        });

        if (resetPage) {
          if (browseMode === 'pagination') {
            next.set('page', '1');
          } else {
            next.delete('page');
          }
        }

        return next;
      },
      { replace: true }
    );
  };

  const commitPriceRange = (range: [number, number] = draftPriceRange): void => {
    const [nextMin, nextMax] = normalizePriceRange(range[0], range[1], priceSliderFloor, priceSliderCeiling);

    updateParams({
      minPrice: nextMin > priceSliderFloor ? String(nextMin) : null,
      maxPrice: nextMax < priceSliderCeiling ? String(nextMax) : null
    });
  };

  const closeSuggestions = (): void => {
    setActiveSuggestionIndex(-1);
    setIsSearchFocused(false);
  };

  const applySearch = (): void => {
    const trimmedSearch = search.trim();
    skipNextSearchParamSyncRef.current = true;
    updateParams({ q: trimmedSearch || null });
    setSearch(trimmedSearch);
    setActiveSuggestionIndex(-1);
    setIsSearchFocused(false);
  };

  const resetFilters = (): void => {
    skipNextSearchParamSyncRef.current = true;
    setSearch('');
    setSearchParams(
      () => {
        const next = new URLSearchParams();

        if (browseMode === 'infinite') {
          next.set('browse', 'infinite');
        }

        return next;
      },
      { replace: true }
    );
    syncDraftPriceRange(priceSliderFloor, priceSliderCeiling);
    setActiveSuggestionIndex(-1);
    setIsSearchFocused(false);
    setMobileToolbarMenuOpen(false);
    setMobileFilterOpen(false);
    setDesktopFilterOpen(false);
  };

  const setResultMode = (nextMode: BrowseMode): void => {
    if (nextMode === browseMode) {
      return;
    }

    setSearchParams(
      (currentParams) => {
        const next = new URLSearchParams(currentParams);

        if (nextMode === 'infinite') {
          next.set('browse', 'infinite');
          next.delete('page');
        } else {
          next.delete('browse');
          next.set('page', '1');
        }

        return next;
      },
      { replace: true }
    );
  };

  const closeFilterPanel = (): void => {
    setMobileToolbarMenuOpen(false);
    setDesktopFilterOpen(false);
    setMobileFilterOpen(false);
  };

  const toggleFilterPanel = (): void => {
    setMobileToolbarMenuOpen(false);

    if (isDesktopViewport) {
      setDesktopFilterOpen((current) => !current);
      return;
    }

    setMobileFilterOpen(true);
  };

  const setMobileBrowseMode = (nextMode: BrowseMode): void => {
    setResultMode(nextMode);
    setMobileToolbarMenuOpen(false);
  };

  const setSortMode = (nextValue: string, closeMobileMenu = false): void => {
    updateParams({ sort: nextValue === DEFAULT_SORT ? null : nextValue }, false);

    if (closeMobileMenu) {
      setMobileToolbarMenuOpen(false);
    }
  };

  const handleSearchFocus = (): void => {
    setIsSearchFocused(true);
  };

  const handleSearchBlur = (event: FocusEvent<HTMLInputElement>): void => {
    if (event.relatedTarget instanceof Node && event.currentTarget.parentElement?.contains(event.relatedTarget)) {
      return;
    }

    setIsSearchFocused(false);
    setActiveSuggestionIndex(-1);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestionOption): void => {
    setActiveSuggestionIndex(-1);
    setIsSearchFocused(false);

    if (suggestion.kind === 'product' && suggestion.slug) {
      navigate(`/product/${suggestion.slug}`);
      return;
    }

    if (suggestion.kind === 'brand' && suggestion.brandSlug) {
      skipNextSearchParamSyncRef.current = true;
      setSearch('');
      updateParams({ brand: suggestion.brandSlug, q: null });
      return;
    }

    if (suggestion.kind === 'category' && suggestion.categoryId) {
      skipNextSearchParamSyncRef.current = true;
      setSearch('');
      updateParams({ category: suggestion.categoryId, q: null });
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' && searchSuggestionOptions.length) {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current >= searchSuggestionOptions.length - 1 ? 0 : current + 1));
      return;
    }

    if (event.key === 'ArrowUp' && searchSuggestionOptions.length) {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current <= 0 ? searchSuggestionOptions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      searchInputRef.current?.blur();
      closeSuggestions();
      return;
    }

    if (event.key === 'Tab') {
      closeSuggestions();
      return;
    }

    if (event.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && searchSuggestionOptions[activeSuggestionIndex]) {
        event.preventDefault();
        handleSuggestionSelect(searchSuggestionOptions[activeSuggestionIndex]);
        return;
      }

      event.preventDefault();
      applySearch();
    }
  };

  const runEmptyStateAction = (key: string): void => {
    if (key === 'q') {
      skipNextSearchParamSyncRef.current = true;
      setSearch('');
      updateParams({ q: null });
      return;
    }

    if (key === 'brand') {
      updateParams({ brand: null });
      return;
    }

    if (key === 'category') {
      updateParams({ category: null });
      return;
    }

    if (key === 'price') {
      syncDraftPriceRange(priceSliderFloor, priceSliderCeiling);
      updateParams({ minPrice: null, maxPrice: null });
      return;
    }

    updateParams({ [key]: null });
  };

  const saveMyFilters = async (): Promise<void> => {
    if (!user) {
      return;
    }

    const presetParams = buildPresetParams(searchParams);

    if (!Object.keys(presetParams).length) {
      toast.error('Choose at least one filter or sort before saving My Filters.');
      return;
    }

    const nextPreset: ShopFilterPresetDto = {
      params: presetParams,
      savedAt: new Date().toISOString()
    };
    const hadSavedPreset = Boolean(myFiltersPreset);

    try {
      setPresetAction('save');
      await updateProfile({
        shopPreferences: {
          myFilters: nextPreset
        }
      });
      setOptimisticMyFilters(nextPreset);
      toast.success(hadSavedPreset ? 'My Filters updated.' : 'My Filters saved.');
    } catch {
      toast.error('Unable to save My Filters right now.');
    } finally {
      setPresetAction(null);
    }
  };

  const loadMyFilters = (): void => {
    if (!user || !myFiltersPreset) {
      return;
    }

    skipNextSearchParamSyncRef.current = true;
    setSearch(myFiltersPreset.params.q ?? '');
    setSearchParams(buildSearchParamsFromPreset(myFiltersPreset.params, browseMode), { replace: true });
    setActiveSuggestionIndex(-1);
    setIsSearchFocused(false);
    setMobileFilterOpen(false);
    setDesktopFilterOpen(false);
    toast.success('My Filters loaded.');
  };

  const clearMyFilters = async (): Promise<void> => {
    if (!user || !myFiltersPreset) {
      return;
    }

    try {
      setPresetAction('clear');
      await updateProfile({
        shopPreferences: {
          myFilters: null
        }
      });
      setOptimisticMyFilters(null);
      toast.success('Saved filters removed.');
    } catch {
      toast.error('Unable to remove saved filters right now.');
    } finally {
      setPresetAction(null);
    }
  };

  const clearFilter = (key: string): void => {
    if (key.startsWith('category:')) {
      const category = key.replace('category:', '');
      const nextCategories = selectedCategoryIds.filter((item) => item !== category);
      updateParams({ category: nextCategories.length ? nextCategories.join(',') : null });
      return;
    }

    if (key.startsWith('brand:')) {
      const brand = key.replace('brand:', '');
      const nextBrands = selectedBrands.filter((item) => item !== brand);
      updateParams({ brand: nextBrands.length ? nextBrands.join(',') : null });
      return;
    }

    if (key === 'q') {
      skipNextSearchParamSyncRef.current = true;
      setSearch('');
    }

    updateParams({ [key]: null });
  };

  const activeFilters = [
    catalogFilters.q ? { key: 'q', label: `Search: ${catalogFilters.q}` } : null,
    ...selectedCategoryIds.map((categoryId) => ({
      key: `category:${categoryId}`,
      label: `Category: ${categoryDetailsById.get(categoryId)?.name ?? categoryId}`
    })),
    ...selectedBrands.map((brandSlug) => ({ key: `brand:${brandSlug}`, label: `Brand: ${brandNameMap.get(brandSlug) ?? brandSlug}` })),
    catalogFilters.condition
      ? { key: 'condition', label: catalogFilters.condition === 'used' ? 'Used items' : 'Brand new' }
      : null,
    catalogFilters.minPrice ? { key: 'minPrice', label: `Min: ${formatCurrency(catalogFilters.minPrice)}` } : null,
    catalogFilters.maxPrice ? { key: 'maxPrice', label: `Max: ${formatCurrency(catalogFilters.maxPrice)}` } : null,
    catalogFilters.rating ? { key: 'rating', label: `${catalogFilters.rating}+ stars` } : null,
    catalogFilters.inStock ? { key: 'inStock', label: 'In stock' } : null,
    catalogFilters.bestSeller ? { key: 'bestSeller', label: 'Best seller' } : null,
    catalogFilters.flashDeal ? { key: 'flashDeal', label: 'Fresh deals' } : null
  ].filter(Boolean) as Array<{ key: string; label: string }>;
  const shopSeoTitle =
    primarySelectedCategory?.metaTitle?.trim() ||
    (primarySelectedCategory
      ? `${primarySelectedCategory.name} | NJ Store Shop`
      : catalogFilters.q
        ? `${catalogFilters.q} | NJ Store Shop Search`
        : 'Shop Electronics | NJ Store');
  const shopSeoDescription =
    primarySelectedCategory?.metaDescription?.trim() ||
    (primarySelectedCategory
      ? `Browse ${primarySelectedCategory.name} and related electronics at NJ Store with filters for price, brand, and rating.`
      : 'Browse electronics, compare prices, and filter by category, brand, condition, and fresh deals at NJ Store.');
  const shopCanonicalUrl = `${location.pathname}${location.search}`;
  const shopSeoKeywords = buildKeywordList(
    [
      'NJ Store shop',
      'electronics catalog Sri Lanka',
      'buy electronics online',
      ...selectedCategoryDetails.map((category) => category?.name),
      catalogFilters.q,
      catalogFilters.inStock ? 'in stock electronics' : undefined,
      catalogFilters.bestSeller ? 'best seller electronics' : undefined,
      catalogFilters.flashDeal ? 'fresh electronics deals' : undefined,
      catalogFilters.condition === 'used' ? 'used electronics Sri Lanka' : catalogFilters.condition === 'new' ? 'brand new electronics' : undefined
    ],
    selectedBrands.map((brandSlug) => brandNameMap.get(brandSlug) ?? brandSlug)
  );
  const resultsToolbarMotion = reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: -14, scale: 0.985 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -10, scale: 0.992 },
      transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
    };
  const compactToolbarRevealMotion = reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: -8, scale: 0.94 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -6, scale: 0.97 },
      transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
    };
  const mobileToolbarMenuMotion = reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: -8, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -6, scale: 0.98 },
      transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
    };
  const mobileFilterButtonMotion = reduceMotion
    ? {}
    : {
      whileTap: { scale: 0.94 },
      transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
    };

  const filterContent = (
    <div className="space-y-3.5">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold/85">Auto Filters</p>
            <p className="mt-1 max-w-[15rem] text-xs leading-5 text-gray-500">
              {activeFilters.length ? `${activeFilters.length} active right now.` : 'Search and filter changes update the catalog automatically.'}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-9 shrink-0 rounded-full px-3 text-xs"
            onClick={resetFilters}
            disabled={!activeFilters.length && !search.trim()}
          >
            Reset Filters
          </Button>
        </div>
      </div>

      <div className="relative rounded-[24px] border border-white/10 bg-white/[0.03] p-3.5">
        <Input
          ref={searchInputRef}
          id={SEARCH_INPUT_ID}
          label="Search"
          value={search}
          className="h-11 rounded-2xl text-sm"
          placeholder="Search phones, printers, chargers..."
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={SEARCH_SUGGESTIONS_ID}
          aria-expanded={shouldRenderSuggestionPanel}
          aria-activedescendant={activeSuggestionIndex >= 0 ? `${SEARCH_SUGGESTIONS_ID}-${activeSuggestionIndex}` : undefined}
          onChange={(event) => {
            setSearch(event.target.value);
            setActiveSuggestionIndex(-1);
          }}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          onKeyDown={handleSearchKeyDown}
        />

        {shouldRenderSuggestionPanel ? (
          <div
            id={SEARCH_SUGGESTIONS_ID}
            role="listbox"
            aria-label="Suggested products"
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-dark-light shadow-[0_18px_36px_rgba(0,0,0,0.3)]"
          >
            {(isAwaitingSuggestionSearch || suggestions.isFetching) && !searchSuggestionOptions.length ? (
              <SearchSuggestionSkeletonList />
            ) : searchSuggestionOptions.length ? (
              <>
                {isAwaitingSuggestionSearch || suggestions.isFetching ? (
                  <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.28em] text-gold/80">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    Refreshing matches
                  </div>
                ) : null}

                {searchSuggestionOptions.map((suggestion, index) => {
                  const isActive = activeSuggestionIndex === index;
                  return (
                    <button
                      key={`${suggestion.kind}-${suggestion.id}`}
                      id={`${SEARCH_SUGGESTIONS_ID}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      tabIndex={-1}
                      className={cn(
                        'flex w-full items-center justify-between border-b border-white/5 px-4 py-3.5 text-left text-sm text-gray-300 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] last:border-b-0 hover:bg-white/[0.06] hover:text-white',
                        isActive && 'bg-white/[0.08] text-white'
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <div className="min-w-0 pr-4">
                        <div className="truncate">{suggestion.label}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.24em] text-gray-500">{suggestion.meta}</div>
                      </div>
                      {typeof suggestion.price === 'number' ? (
                        <span className="shrink-0 font-mono text-gold">{formatCurrency(suggestion.price)}</span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-gray-400">
                          {suggestion.kind}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            ) : (
              <p className="px-4 py-3.5 text-sm leading-6 text-gray-400">
                No quick matches yet. Try a brand, category, or press Enter to search the full catalog.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        <ShopSelect
          label="Category"
          hint={categories.isLoading ? 'Loading categories' : selectedCategoryIds.length ? `${selectedCategoryIds.length} selected` : 'All categories'}
          multiple
          values={selectedCategoryIds}
          options={categorySelectOptions}
          placeholder="All categories"
          onChange={(nextValues) => updateParams({ category: nextValues.length ? nextValues.join(',') : null })}
        />

        <ShopSelect
          label="Brand"
          hint={brands.isLoading ? 'Loading brands' : selectedBrands.length ? `${selectedBrands.length} selected` : 'All brands'}
          multiple
          values={selectedBrands}
          options={brandSelectOptions}
          placeholder="All brands"
          onChange={(nextValues) => updateParams({ brand: nextValues.length ? nextValues.join(',') : null })}
        />

        <ShopSelect
          label="Item Type"
          hint={
            catalogFilters.condition === 'used'
              ? 'Used items'
              : catalogFilters.condition === 'new'
                ? 'Brand new'
                : 'All conditions'
          }
          value={searchParams.get('condition') ?? ''}
          options={CONDITION_OPTIONS}
          onChange={(nextValue) => updateParams({ condition: nextValue || null })}
        />

        <ShopSelect
          label="Rating"
          hint={catalogFilters.rating ? `${catalogFilters.rating}+ stars` : 'Any rating'}
          value={searchParams.get('rating') ?? ''}
          options={RATING_OPTIONS}
          onChange={(nextValue) => updateParams({ rating: nextValue || null })}
        />
      </div>

      <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-gray-200">Price Range</p>
            <p className="text-xs leading-5 text-gray-500">Auto-applies when you release a handle.</p>
          </div>
          <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
            {formatCurrency(draftMinPrice)} - {formatCurrency(draftMaxPrice)}
          </span>
        </div>

        <PriceRangeSlider
          min={priceSliderFloor}
          max={priceSliderCeiling}
          step={priceStep}
          value={draftPriceRange}
          formatValue={formatCurrency}
          onChange={(nextRange) =>
            setDraftPriceRange(normalizePriceRange(nextRange[0], nextRange[1], priceSliderFloor, priceSliderCeiling))
          }
          onCommit={commitPriceRange}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className={compactFilterToggleClass(Boolean(catalogFilters.inStock))}
          onClick={() => updateParams({ inStock: catalogFilters.inStock ? null : 'true' })}
        >
          <span>In stock only</span>
          {catalogFilters.inStock ? <Check className="h-4 w-4 text-gold" /> : <span className="text-xs text-gray-500">Off</span>}
        </button>

        <button
          type="button"
          className={compactFilterToggleClass(Boolean(catalogFilters.bestSeller))}
          onClick={() => updateParams({ bestSeller: catalogFilters.bestSeller ? null : 'true' })}
        >
          <span>Best sellers</span>
          {catalogFilters.bestSeller ? <Check className="h-4 w-4 text-gold" /> : <span className="text-xs text-gray-500">Off</span>}
        </button>

        <button
          type="button"
          className={compactFilterToggleClass(Boolean(catalogFilters.flashDeal))}
          onClick={() => updateParams({ flashDeal: catalogFilters.flashDeal ? null : 'true' })}
        >
          <span>Fresh deals</span>
          {catalogFilters.flashDeal ? <Check className="h-4 w-4 text-gold" /> : <span className="text-xs text-gray-500">Off</span>}
        </button>

        <button
          type="button"
          className={compactFilterToggleClass(search.trim().length > 0)}
          onClick={() => {
            skipNextSearchParamSyncRef.current = true;
            setSearch('');
            updateParams({ q: null });
          }}
        >
          <span>Clear search</span>
          {search.trim().length > 0 ? <X className="h-4 w-4 text-gold" /> : <span className="text-xs text-gray-500">Empty</span>}
        </button>
      </div>

      <div className="rounded-[20px] border border-gold/20 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.14),rgba(255,255,255,0.02)_56%)] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium text-white">My Filters</p>
            <p className="mt-1 text-[12px] leading-5 text-gray-400">
              {user ? 'Save the current filter stack and reopen it in one tap.' : 'Sign in to bookmark your favorite shop filters.'}
            </p>
          </div>
          {myFiltersPreset ? <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">Saved</span> : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Button size="sm" className="h-9 w-full rounded-[18px]" onClick={() => void saveMyFilters()} disabled={!user || presetAction !== null}>
            {presetAction === 'save' ? 'Saving...' : myFiltersPreset ? 'Update My Filters' : 'Save My Filters'}
          </Button>
          <Button size="sm" variant="secondary" className="h-9 w-full rounded-[18px]" onClick={loadMyFilters} disabled={!user || !myFiltersPreset}>
            Load My Filters
          </Button>
        </div>

        {myFiltersPreset ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">Saved {new Date(myFiltersPreset.savedAt).toLocaleString()}</p>
            <button
              type="button"
              className="text-xs font-medium text-gold transition-colors duration-200 hover:text-gold-light"
              onClick={() => void clearMyFilters()}
            >
              {presetAction === 'clear' ? 'Removing...' : 'Remove saved'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="page-shell page-nav-gap">
      <SeoHead
        title={shopSeoTitle}
        description={shopSeoDescription}
        keywords={shopSeoKeywords}
        canonicalUrl={shopCanonicalUrl}
        openGraphImage={shopOpenGraphImage}
      />

      <StoreBreadcrumbs items={[{ label: 'Shop' }]} />
      <h1 className="sr-only">Shop Electronics</h1>

      <ShopFilterDrawers mobileFilterOpen={mobileFilterOpen} desktopFilterOpen={desktopFilterOpen} onClose={closeFilterPanel}>
        {filterContent}
      </ShopFilterDrawers>

      <div className="mt-1.5 space-y-3 sm:mt-2 sm:space-y-4">
        <div
          ref={resultsHeaderRef}
          data-testid="shop-results-toolbar"
          className="sticky z-30 transition-[top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ top: `${resultsToolbarTopOffset}px` }}
        >
          <AnimatePresence initial={false} mode="wait">
            {isResultsToolbarOpen ? (
              <motion.div key="shop-toolbar-expanded" className="space-y-2" {...resultsToolbarMotion}>
                <div className="shop-results-toolbar-shell flex items-center justify-between gap-2 rounded-[1rem] px-2.5 py-2 backdrop-blur-xl sm:gap-3 sm:rounded-[1.35rem] sm:px-4 sm:py-3.5 lg:gap-4">
                  <div className="flex min-w-0 flex-1 items-start sm:items-center">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                        <p className="shop-results-toolbar-title truncate text-[0.9rem] font-semibold leading-5 sm:text-[1.02rem]">{resultsHeadline}</p>
                        {isRefreshingRows || isLoadingMore ? <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-gold" /> : null}
                      </div>
                      <p className="shop-results-toolbar-summary truncate text-[0.68rem] leading-4 sm:mt-0.5 sm:text-[0.78rem] sm:leading-5">{resultsSummary}</p>
                    </div>
                  </div>

                  {isDesktopViewport ? (
                    <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2.5 lg:w-auto">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={toggleFilterPanel}
                        className="shop-results-filter-button !h-9 w-auto justify-start gap-2 rounded-full px-3.5 text-xs"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Filters {activeFilters.length ? `(${activeFilters.length})` : ''}
                      </Button>

                      <div className={toolbarControlGroupClass}>
                        <button
                          type="button"
                          aria-label="Pagination mode"
                          aria-pressed={browseMode === 'pagination'}
                          onClick={() => setResultMode('pagination')}
                          className={toolbarModeToggleClass(browseMode === 'pagination')}
                        >
                          Pages
                        </button>
                        <button
                          type="button"
                          aria-label="Infinite scroll mode"
                          aria-pressed={browseMode === 'infinite'}
                          onClick={() => setResultMode('infinite')}
                          className={toolbarModeToggleClass(browseMode === 'infinite')}
                        >
                          Infinite
                        </button>
                      </div>

                      <div className="min-w-0 lg:w-[12rem]">
                        <ShopSelect compact accent="gold" ariaLabel="Sort products" value={currentSort} options={SORT_OPTIONS} onChange={setSortMode} />
                      </div>
                    </div>
                  ) : (
                    <div ref={mobileToolbarMenuRef} className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
                      <motion.button
                        type="button"
                        aria-label={`Filters${activeFilters.length ? ` (${activeFilters.length})` : ''}`}
                        aria-expanded={mobileFilterOpen}
                        data-has-filters={activeFilters.length ? 'true' : undefined}
                        className={cn(mobileToolbarButtonClass, 'shop-mobile-filter-trigger min-w-9 px-2 sm:min-w-[3rem] sm:px-3')}
                        onClick={toggleFilterPanel}
                        {...mobileFilterButtonMotion}
                      >
                        <SlidersHorizontal className="relative z-[1] h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-4 sm:w-4" />
                        {activeFilters.length ? (
                          <span className="relative z-[1] rounded-full border border-gold/30 bg-gold/10 px-1.5 py-[1px] text-[10px] font-semibold text-gold">
                            {activeFilters.length}
                          </span>
                        ) : null}
                      </motion.button>

                      <button
                        type="button"
                        aria-label="Catalog controls"
                        aria-expanded={mobileToolbarMenuOpen}
                        aria-controls="shop-mobile-toolbar-controls"
                        className={cn(mobileToolbarButtonClass, 'min-w-9 px-2 sm:min-w-[3rem] sm:px-3')}
                        onClick={() => setMobileToolbarMenuOpen((current) => !current)}
                      >
                        <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform duration-200', mobileToolbarMenuOpen && 'rotate-180 text-gold')} />
                      </button>

                      <AnimatePresence initial={false}>
                        {mobileToolbarMenuOpen ? (
                          <motion.div
                            id="shop-mobile-toolbar-controls"
                            role="dialog"
                            aria-label="Catalog controls"
                            className="shop-toolbar-mobile-popover absolute right-0 top-[calc(100%+0.55rem)] z-40 w-[min(14.5rem,calc(100vw-2.2rem))] origin-top-right rounded-[1rem] p-2 backdrop-blur-xl"
                            {...mobileToolbarMenuMotion}
                          >
                            <div className="space-y-2">
                              <div className="shop-toolbar-mobile-section rounded-[0.8rem] p-[0.4rem]">
                                <p className="mb-1 px-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-gold/75">Browse</p>
                                <div className={cn(toolbarControlGroupClass, 'min-w-0 rounded-[0.75rem] p-[3px]')}>
                                  <button
                                    type="button"
                                    aria-label="Pagination mode"
                                    aria-pressed={browseMode === 'pagination'}
                                    onClick={() => setMobileBrowseMode('pagination')}
                                    className={mobileToolbarModeToggleClass(browseMode === 'pagination')}
                                  >
                                    Pages
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Infinite scroll mode"
                                    aria-pressed={browseMode === 'infinite'}
                                    onClick={() => setMobileBrowseMode('infinite')}
                                    className={mobileToolbarModeToggleClass(browseMode === 'infinite')}
                                  >
                                    Infinite
                                  </button>
                                </div>
                              </div>

                              <div className="shop-toolbar-mobile-section rounded-[0.8rem] p-[0.4rem]">
                                <p className="mb-1 px-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-gold/75">Sort</p>
                                <ShopSelect
                                  compact
                                  accent="gold"
                                  ariaLabel="Sort products"
                                  value={currentSort}
                                  options={SORT_OPTIONS}
                                  onChange={(nextValue) => setSortMode(nextValue, true)}
                                />
                              </div>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {activeFilters.length ? (
                  <div className="shop-active-filter-row flex flex-wrap items-center gap-2.5">
                    {activeFilters.map((filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        className="shop-active-filter-chip inline-flex transform-gpu items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-[transform,border-color,background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none"
                        onClick={() => clearFilter(filter.key)}
                      >
                        {filter.label}
                        <X className="h-3 w-3" />
                      </button>
                    ))}

                    <button
                      type="button"
                      className="shop-active-filter-clear inline-flex items-center rounded-full border border-transparent px-1.5 py-1 text-xs font-medium transition-colors duration-200"
                      onClick={resetFilters}
                    >
                      Clear all
                    </button>
                  </div>
                ) : null}
              </motion.div>
            ) : hasScrolledPastResultsToolbar ? (
              <motion.div
                key="shop-toolbar-collapsed"
                className={cn('flex justify-center', isDesktopViewport ? 'pb-2 pt-3' : 'pb-1 pt-0.5')}
                {...compactToolbarRevealMotion}
              >
                <button
                  type="button"
                  aria-label="Show catalog toolbar"
                  className={isDesktopViewport ? desktopCompactToolbarRevealButtonClass : mobileCompactToolbarRevealButtonClass}
                  onClick={expandResultsToolbar}
                >
                  <span className="sr-only">Show catalog toolbar</span>
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <ShopProductResults
          isInitialProductLoad={isInitialProductLoad}
          isLoadingMore={isLoadingMore}
          viewMode={viewMode}
          productListRef={productListRef}
          shouldVirtualizeResults={shouldVirtualizeResults}
          productRowVirtualizer={productRowVirtualizer}
          virtualProductRows={virtualProductRows}
          virtualizationConfig={virtualizationConfig}
          renderedProductRows={renderedProductRows}
          wishlist={wishlist}
        />

        {!isInitialProductLoad && productRows.length === 0 ? (
          <Card className="rounded-[28px] p-8 text-center">
            <p className="font-display text-[1.7rem] leading-tight text-white">0 results found</p>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              No products matched your current filters. Try one of these quick recovery moves or clear the stack to reopen the catalog.
            </p>
            {emptyStateActionKeys.length ? (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {emptyStateActionKeys.map((action) => (
                  <Button key={action.key} variant="secondary" onClick={() => runEmptyStateAction(action.key)}>
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="mt-4">
              <Button onClick={resetFilters}>Reset all filters</Button>
            </div>
          </Card>
        ) : null}

        {browseMode === 'pagination' && paginatedProducts.data?.pagination ? (
          <Pagination
            className="rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 sm:px-6"
            page={paginatedProducts.data.pagination.page}
            totalPages={paginatedProducts.data.pagination.totalPages}
            disabled={paginatedProducts.isFetching}
            onPageChange={(nextPage) => {
              updateParams({ page: String(nextPage) }, false);
              prefetchPaginationPage(Math.min(nextPage + 1, paginatedProducts.data!.pagination!.totalPages));
            }}
          />
        ) : null}

        {browseMode === 'infinite' && productRows.length ? (
          <Card className="rounded-[28px] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">
                  {hasMoreInfiniteResults ? 'Keep scrolling for more results' : 'You have reached the end of the catalog'}
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-400">
                  {hasMoreInfiniteResults
                    ? `${productRows.length.toLocaleString()} of ${totalResults.toLocaleString()} products are loaded right now.`
                    : `All ${productRows.length.toLocaleString()} matching products are already on screen.`}
                </p>
              </div>

              {hasMoreInfiniteResults ? (
                <Button variant="secondary" onClick={() => void infiniteProducts.fetchNextPage()} disabled={isLoadingMore}>
                  {isLoadingMore ? 'Loading...' : 'Load more results'}
                </Button>
              ) : null}
            </div>

            <div ref={infiniteSentinelRef} aria-hidden="true" className="h-1 w-full" />
          </Card>
        ) : null}
      </div>
    </div>
  );
};
