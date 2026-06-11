import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, SetStateAction } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryDto, NotificationDto, SiteConfigDto } from '@njstore/types';
import {
  ArrowRight,
  Bell,
  BellRing,
  CheckCircle2,
  Clock3,
  GitCompareArrows,
  Heart,
  LayoutGrid,
  Search,
  ShoppingBag,
  X
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button, Modal, Skeleton, type ModalOriginRect } from '@njstore/ui';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { useTheme } from '../../context/ThemeContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useWishlist } from '../../hooks/useWishlist';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { brandService } from '../../services/brandService';
import { notificationService } from '../../services/notificationService';
import { productService } from '../../services/productService';
import { warmStoreRoute } from '../../app/routeWarmup';
import { isKnownUnavailableDemoAsset } from '../../utils/imageAssets';
import { subscribeToMediaQueryChange } from '../../utils/mediaQuery';
import { ProfileDropdown } from './ProfileDropdown';
import { getColorFromName } from '../product/productVariantUtils';

import type { CatalogView } from './CatalogPanel';

type CatalogPanelModule = typeof import('./CatalogPanel');

let catalogPanelModulePromise: Promise<CatalogPanelModule> | null = null;

const loadCatalogPanelModule = (): Promise<CatalogPanelModule> => {
  catalogPanelModulePromise ??= import('./CatalogPanel');
  return catalogPanelModulePromise;
};

const preloadCatalogPanel = (): void => {
  void loadCatalogPanelModule();
};

const CatalogPanel = lazy(async () => {
  const module = await loadCatalogPanelModule();
  return { default: module.CatalogPanel };
});

interface NavbarProps {
  siteConfig?: Pick<SiteConfigDto, 'storeName' | 'storeLogo' | 'storeLogoDark' | 'storeLogoLight'>;
}

const NAV_SEARCH_SUGGESTION_DEBOUNCE_MS = 120;
const NAV_CATALOG_STALE_TIME_MS = 5 * 60_000;
const NAV_CATALOG_GC_TIME_MS = 30 * 60_000;
const catalogCategoriesQueryKey = ['catalog', 'categories'] as const;

const formatNotificationTimestamp = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};

export const Navbar = ({ siteConfig }: NavbarProps): JSX.Element => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reduceMotion, setReduceMotion] = useState(false);
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { cart } = useCart();
  const { items: compareItems } = useCompare();
  const { formatCurrency } = useCurrencyFormatter();
  const wishlist = useWishlist();
  const mobileCategoriesButtonRef = useRef<HTMLButtonElement>(null);
  const desktopCategoriesButtonRef = useRef<HTMLButtonElement>(null);
  const categoriesHoverCloseTimeoutRef = useRef<number | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const [catalogView, setCatalogView] = useState<CatalogView>('categories');
  const [categoriesOriginRect, setCategoriesOriginRect] = useState<ModalOriginRect | null>(null);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isDesktopCategoriesHoverEnabled, setIsDesktopCategoriesHoverEnabled] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isCondensed, setIsCondensed] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasStoreLogoError, setHasStoreLogoError] = useState(false);
  const [failedCategoryImages, setFailedCategoryImages] = useState<Record<string, true>>({});
  const [failedBrandLogos, setFailedBrandLogos] = useState<Record<string, true>>({});
  const [searchValue, setSearchValue] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const debouncedSearch = useDebounce(searchValue, NAV_SEARCH_SUGGESTION_DEBOUNCE_MS);
  const prefetchCatalogCategories = useCallback((): void => {
    void queryClient.prefetchQuery({
      queryKey: catalogCategoriesQueryKey,
      queryFn: () => productService.categories(),
      staleTime: NAV_CATALOG_STALE_TIME_MS,
      gcTime: NAV_CATALOG_GC_TIME_MS
    });
  }, [queryClient]);
  const prefetchCatalogBrands = useCallback((): void => {
    void queryClient.prefetchQuery({
      queryKey: ['nav', 'brands'],
      queryFn: () => brandService.list({ limit: 12, sort: 'sortOrder' }),
      staleTime: NAV_CATALOG_STALE_TIME_MS,
      gcTime: NAV_CATALOG_GC_TIME_MS
    });
  }, [queryClient]);
  const prefetchCatalogData = useCallback((options: { includeBrands?: boolean } = {}): void => {
    prefetchCatalogCategories();
    if (options.includeBrands) {
      prefetchCatalogBrands();
    }
  }, [prefetchCatalogBrands, prefetchCatalogCategories]);
  const setCatalogViewWithPrefetch = useCallback(
    (nextView: SetStateAction<CatalogView>): void => {
      setCatalogView((currentView) => {
        const resolvedView = typeof nextView === 'function' ? nextView(currentView) : nextView;

        if (resolvedView === 'brands') {
          prefetchCatalogBrands();
        }

        return resolvedView;
      });
    },
    [prefetchCatalogBrands]
  );
  const isCatalogQueryEnabled = isCategoriesOpen;
  const isBrandQueryEnabled = isCategoriesOpen;
  const categories = useQuery({
    queryKey: catalogCategoriesQueryKey,
    queryFn: () => productService.categories(),
    enabled: isCatalogQueryEnabled,
    staleTime: NAV_CATALOG_STALE_TIME_MS,
    gcTime: NAV_CATALOG_GC_TIME_MS,
    refetchOnWindowFocus: false
  });
  const brands = useQuery({
    queryKey: ['nav', 'brands'],
    queryFn: () => brandService.list({ limit: 12, sort: 'sortOrder' }),
    enabled: isBrandQueryEnabled && catalogView === 'brands',
    staleTime: NAV_CATALOG_STALE_TIME_MS,
    gcTime: NAV_CATALOG_GC_TIME_MS,
    refetchOnWindowFocus: false
  });
  const trimmedSearchValue = searchValue.trim();
  const trimmedDebouncedSearch = debouncedSearch.trim();
  const searchSuggestions = useQuery({
    queryKey: ['nav', 'suggestions', trimmedDebouncedSearch],
    queryFn: ({ signal }) => productService.suggestions(trimmedDebouncedSearch, signal),
    enabled: trimmedDebouncedSearch.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false
  });
  const notifications = useQuery({
    queryKey: ['notifications', 'preview'],
    queryFn: () => notificationService.list(1, 6),
    enabled: Boolean(user),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
  const categoryMenuItems = useMemo(() => {
    const items = [...(((categories.data?.data ?? []) as CategoryDto[]) ?? [])];
    return items
      .filter((category) => category.isActive)
      .sort((left, right) => left.order - right.order)
      .slice(0, 10);
  }, [categories.data?.data]);
  const brandMenuItems = useMemo(() => (brands.data?.data ?? []).filter((brand) => brand.isActive).slice(0, 12), [brands.data?.data]);
  const iconButtonCoreClassName =
    'h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-white/16 hover:bg-white/[0.075] hover:text-white active:translate-y-0 motion-reduce:transform-none sm:h-10 sm:w-10';
  const iconButtonClassName = `flex ${iconButtonCoreClassName}`;
  const desktopIconButtonClassName = `hidden ${iconButtonCoreClassName} md:flex`;
  const navPillClassName = (isActive: boolean): string =>
    `rounded-full px-3 py-1.5 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
      isActive ? 'bg-white/[0.08] text-white' : 'hover:bg-white/[0.04] hover:text-white'
    }`;
  const desktopCategoryPillClassName =
    'rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[12px] transition-[background-color,border-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-3 sm:py-1.5 sm:text-sm';
  const headerShortcutClassName = (isActive = false): string =>
    `${desktopIconButtonClassName} relative ${
      isActive
        ? 'border-white/18 border-gold/35 bg-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(212,175,55,0.14))] text-white shadow-[0_14px_34px_rgba(212,175,55,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]'
        : ''
    }`;
  const headerCountClassName =
    'absolute -right-1 -top-1 min-w-[1rem] rounded-full bg-gold px-1 text-center text-[9px] font-bold leading-4 text-dark sm:min-w-[1.15rem] sm:px-1.5 sm:text-[10px] sm:leading-5';
  const quickMatches = useMemo(() => (searchSuggestions.data?.data ?? []).slice(0, 5), [searchSuggestions.data?.data]);
  const isAwaitingDebouncedSuggestions = trimmedSearchValue.length >= 2 && trimmedDebouncedSearch !== trimmedSearchValue;
  const showSearchPanel =
    isSearchFocused &&
    trimmedSearchValue.length >= 2 &&
    (isAwaitingDebouncedSuggestions || searchSuggestions.isFetching || searchSuggestions.isFetched || quickMatches.length > 0);
  const storeName = siteConfig?.storeName?.trim() || t('brand');
  const themeStoreLogo = isDark ? siteConfig?.storeLogoLight : siteConfig?.storeLogoDark;
  const storeLogo = !hasStoreLogoError ? themeStoreLogo ?? siteConfig?.storeLogo : undefined;
  const hasStoreLogo = Boolean(storeLogo?.url);
  const activeSuggestionId = activeSuggestionIndex >= 0 && quickMatches[activeSuggestionIndex]
    ? `nav-search-suggestion-${quickMatches[activeSuggestionIndex].id}`
    : undefined;
  const notificationItems = notifications.data?.data ?? [];
  const unreadNotificationCount = notificationItems.filter((notification) => !notification.isRead).length;
  const isDesktopAnchoredCategoriesPanel = isDesktopViewport;
  const isCartRoute = location.pathname === '/cart' || location.pathname.startsWith('/checkout');
  const isWishlistRoute = location.pathname.startsWith('/dashboard/wishlist');
  const isCompareRoute = location.pathname.startsWith('/compare');
  const isShopRoute = location.pathname.startsWith('/shop');
  const wishlistDestination = user ? '/dashboard/wishlist' : '/auth/login';
  const wishlistState = user ? undefined : { from: '/dashboard/wishlist' };
  const iconButtonActiveClassName =
    'border-white/18 border-gold/35 bg-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(212,175,55,0.14))] text-white shadow-[0_14px_34px_rgba(212,175,55,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]';
  const shortcutActions = [
    {
      key: 'wishlist',
      label: t('nav.wishlist'),
      to: wishlistDestination,
      state: wishlistState,
      icon: Heart,
      count: user ? wishlist.items.length : 0,
      isActive: isWishlistRoute
    },
    {
      key: 'compare',
      label: t('nav.compare'),
      to: '/compare',
      state: undefined,
      icon: GitCompareArrows,
      count: compareItems.length,
      isActive: isCompareRoute
    }
  ] as const;
  const warmShortcutActionRoute = (actionKey: (typeof shortcutActions)[number]['key']): void => {
    if (actionKey === 'compare') {
      warmStoreRoute('compare');
      return;
    }

    warmStoreRoute(user ? 'dashboard' : 'auth-login');
  };

  const clearCategoriesHoverCloseTimeout = useCallback((): void => {
    if (categoriesHoverCloseTimeoutRef.current === null || typeof window === 'undefined') {
      return;
    }

    window.clearTimeout(categoriesHoverCloseTimeoutRef.current);
    categoriesHoverCloseTimeoutRef.current = null;
  }, []);

  const openCategoriesPanelFromTrigger = useCallback((trigger: HTMLButtonElement): void => {
    preloadCatalogPanel();
    prefetchCatalogCategories();
    if (isDesktopViewport) {
      const triggerRect = trigger.getBoundingClientRect();
      setCategoriesOriginRect({
        left: triggerRect.left,
        top: triggerRect.top,
        width: triggerRect.width,
        height: triggerRect.height,
        borderRadius: triggerRect.height / 2
      });
    } else {
      setCategoriesOriginRect(null);
    }
    setCatalogView('categories');
    setIsCategoriesOpen(true);
  }, [isDesktopViewport, prefetchCatalogCategories]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    clearCategoriesHoverCloseTimeout();
    setSearchValue(params.get('q') ?? '');
    setActiveSuggestionIndex(-1);
    setIsCategoriesOpen(false);
    setCatalogView('categories');
    setIsMobileSearchOpen(false);
    setIsSearchFocused(false);
    setIsNotificationsOpen(false);
  }, [clearCategoriesHoverCloseTimeout, location.pathname, location.search]);

  useEffect(() => {
    if (!isCategoriesOpen || catalogView === 'brands' || typeof window === 'undefined') {
      return undefined;
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleHandle = idleWindow.requestIdleCallback(prefetchCatalogBrands, { timeout: 1800 });
    } else {
      timeoutHandle = window.setTimeout(prefetchCatalogBrands, 900);
    }

    return () => {
      if (idleHandle !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [catalogView, isCategoriesOpen, prefetchCatalogBrands]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleHandle = idleWindow.requestIdleCallback(() => {
        preloadCatalogPanel();
        prefetchCatalogCategories();
      }, { timeout: 2400 });
    } else {
      timeoutHandle = window.setTimeout(() => {
        preloadCatalogPanel();
        prefetchCatalogCategories();
      }, 1500);
    }

    return () => {
      if (idleHandle !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [prefetchCatalogCategories]);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [debouncedSearch, isSearchFocused]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = (): void => {
      setReduceMotion(motionQuery.matches);
    };

    syncMotionPreference();
    return subscribeToMediaQueryChange(motionQuery, syncMotionPreference);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)');
    const syncHoverCapability = (): void => {
      setIsDesktopCategoriesHoverEnabled(hoverQuery.matches);
    };

    syncHoverCapability();
    return subscribeToMediaQueryChange(hoverQuery, syncHoverCapability);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const syncDesktopViewport = (): void => {
      setIsDesktopViewport(desktopQuery.matches);
    };

    syncDesktopViewport();
    return subscribeToMediaQueryChange(desktopQuery, syncDesktopViewport);
  }, []);

  useEffect(() => () => {
    clearCategoriesHoverCloseTimeout();
  }, [clearCategoriesHoverCloseTimeout]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const applyScrollState = (): void => {
      scrollAnimationFrameRef.current = null;
      const nextIsCondensed = window.scrollY > 28;
      setIsCondensed((current) => (current === nextIsCondensed ? current : nextIsCondensed));
    };

    const handleScroll = (): void => {
      if (scrollAnimationFrameRef.current !== null) {
        return;
      }

      if (typeof window.requestAnimationFrame !== 'function') {
        applyScrollState();
        return;
      }

      scrollAnimationFrameRef.current = window.requestAnimationFrame(applyScrollState);
    };

    applyScrollState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);

      if (scrollAnimationFrameRef.current !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
      scrollAnimationFrameRef.current = null;
    };
  }, []);

  useEffect(() => {
    setFailedCategoryImages({});
  }, [categories.data?.data]);

  useEffect(() => {
    setFailedBrandLogos({});
  }, [brands.data?.data]);

  useEffect(() => {
    setHasStoreLogoError(false);
  }, [siteConfig?.storeLogo?.url, siteConfig?.storeLogoDark?.url, siteConfig?.storeLogoLight?.url, isDark]);

  const openCategoriesPanel = useCallback((_event: ReactMouseEvent<HTMLButtonElement>): void => {
    clearCategoriesHoverCloseTimeout();
    openCategoriesPanelFromTrigger(_event.currentTarget);
  }, [clearCategoriesHoverCloseTimeout, openCategoriesPanelFromTrigger]);

  const keepDesktopCategoriesPanelOpen = useCallback((): void => {
    clearCategoriesHoverCloseTimeout();
  }, [clearCategoriesHoverCloseTimeout]);

  const scheduleDesktopCategoriesPanelClose = useCallback((): void => {
    if (!isDesktopCategoriesHoverEnabled || typeof window === 'undefined') {
      return;
    }

    clearCategoriesHoverCloseTimeout();
    categoriesHoverCloseTimeoutRef.current = window.setTimeout(() => {
      categoriesHoverCloseTimeoutRef.current = null;
      setIsCategoriesOpen(false);
    }, 160);
  }, [clearCategoriesHoverCloseTimeout, isDesktopCategoriesHoverEnabled]);

  const handleDesktopCategoriesClick = useCallback((_event: ReactMouseEvent<HTMLButtonElement>): void => {
    openCategoriesPanel(_event);
  }, [openCategoriesPanel]);

  const closeCategoriesPanel = useCallback((): void => {
    clearCategoriesHoverCloseTimeout();
    setIsCategoriesOpen(false);
  }, [clearCategoriesHoverCloseTimeout]);

  const handleDesktopCategoriesKeyDown = useCallback((_event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (_event.key === 'Escape') {
      closeCategoriesPanel();
      return;
    }

    if (_event.key !== 'Enter' && _event.key !== ' ') {
      return;
    }

    _event.preventDefault();
    clearCategoriesHoverCloseTimeout();
    openCategoriesPanelFromTrigger(_event.currentTarget);
  }, [clearCategoriesHoverCloseTimeout, closeCategoriesPanel, openCategoriesPanelFromTrigger]);

  const handleCategoryImageError = useCallback((imageKey: string): void => {
    setFailedCategoryImages((current) => (current[imageKey] ? current : { ...current, [imageKey]: true }));
  }, []);

  const handleBrandLogoError = useCallback((brandId: string): void => {
    setFailedBrandLogos((current) => (current[brandId] ? current : { ...current, [brandId]: true }));
  }, []);

  const warmCatalogData = useCallback((): void => {
    preloadCatalogPanel();
    prefetchCatalogData({ includeBrands: isDesktopViewport });
  }, [isDesktopViewport, prefetchCatalogData]);

  const openShopSearch = (value: string): void => {
    const nextSearch = value.trim();
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);

    if (!nextSearch) {
      navigate('/shop');
      return;
    }

    navigate(`/shop?q=${encodeURIComponent(nextSearch)}`);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    openShopSearch(searchValue);
  };

  const closeSearchPanel = (): void => {
    setIsSearchFocused(false);
    setActiveSuggestionIndex(-1);
  };

  const handleSuggestionSelect = (suggestion: { slug: string }): void => {
    closeSearchPanel();
    setIsMobileSearchOpen(false);
    navigate(`/product/${suggestion.slug}`);
  };

  const handleNotificationSelect = (notification: NotificationDto): void => {
    if (!notification.isRead) {
      void notificationService.markAsRead(notification.id).finally(async () => {
        await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
    }

    setIsNotificationsOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' && quickMatches.length) {
      event.preventDefault();
      setIsSearchFocused(true);
      setActiveSuggestionIndex((current) => (current >= quickMatches.length - 1 ? 0 : current + 1));
      return;
    }

    if (event.key === 'ArrowUp' && quickMatches.length) {
      event.preventDefault();
      setIsSearchFocused(true);
      setActiveSuggestionIndex((current) => (current <= 0 ? quickMatches.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && activeSuggestionIndex >= 0 && quickMatches[activeSuggestionIndex]) {
      event.preventDefault();
      handleSuggestionSelect(quickMatches[activeSuggestionIndex]);
      return;
    }

    if (event.key === 'Escape') {
      closeSearchPanel();
      if (isMobileSearchOpen && !trimmedSearchValue) {
        setIsMobileSearchOpen(false);
      }
      event.currentTarget.blur();
    }
  };

  const renderSearchSurface = (mobile = false): JSX.Element => (
    <div
      className="relative"
      onFocusCapture={() => setIsSearchFocused(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!nextTarget || !event.currentTarget.contains(nextTarget as Node)) {
          closeSearchPanel();
        }
      }}
    >
      <form
        onSubmit={handleSearchSubmit}
        className={`nav-search-form group flex items-center gap-2 rounded-full px-2.5 transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mobile ? 'h-12' : 'h-11'
        }`}
      >
        <span className="nav-search-icon flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200">
          <Search className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <input
          id="store-nav-search-input"
          type="text"
          inputMode="search"
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value);
            setIsSearchFocused(true);
            setActiveSuggestionIndex(-1);
          }}
          placeholder={t('nav.search.placeholder')}
          autoComplete="off"
          autoFocus={mobile}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSearchPanel}
          aria-controls="store-nav-search-suggestions"
          aria-activedescendant={activeSuggestionId}
          onKeyDown={handleSearchKeyDown}
          className="nav-search-input h-full min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
        {trimmedSearchValue ? (
          <button
            type="button"
            onClick={() => {
              setSearchValue('');
              closeSearchPanel();
            }}
            className="nav-search-clear flex h-9 w-9 items-center justify-center rounded-full transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
            aria-label={t('nav.search.clear')}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="submit"
          className="nav-search-submit inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-[transform,box-shadow,background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-0 motion-reduce:transform-none"
        >
          <Search className="h-4 w-4" />
          {t('nav.search.submit')}
        </button>
      </form>

      {showSearchPanel ? (
          <div className="nav-search-panel absolute inset-x-0 top-[calc(100%+0.7rem)] z-50 overflow-hidden rounded-[1.55rem]">
            {isAwaitingDebouncedSuggestions || searchSuggestions.isPending ? (
              <div className="space-y-3 px-4 py-4">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : quickMatches.length ? (
              <div id="store-nav-search-suggestions" role="listbox" className="divide-y divide-white/5">
                {quickMatches.map((suggestion, index) => {
                  const suggestionThumbnailUrl =
                    suggestion.thumbnail?.url && !isKnownUnavailableDemoAsset(suggestion.thumbnail.url) ? suggestion.thumbnail.url : undefined;
                  const suggestionColorVariants = (suggestion.colorVariants ?? []).slice(0, 4);
                  const suggestionColorLabel = suggestionColorVariants.map((variant) => variant.name).join(', ');

                  return (
                    <button
                      key={suggestion.id}
                      id={`nav-search-suggestion-${suggestion.id}`}
                      role="option"
                      aria-selected={activeSuggestionIndex === index}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        activeSuggestionIndex === index ? 'bg-white/[0.06] text-white' : 'hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-visible">
                        {suggestionThumbnailUrl ? (
                          <img
                            src={suggestionThumbnailUrl}
                            srcSet={suggestion.thumbnail?.srcSet}
                            sizes="56px"
                            alt={suggestion.thumbnail?.alt ?? suggestion.name}
                            className="h-12 w-12 object-contain"
                            loading="lazy"
                            decoding="async"
                            width={48}
                            height={48}
                          />
                        ) : (
                          <Search className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 self-center">
                        <p className="truncate text-sm font-medium text-white">{suggestion.name}</p>
                        {suggestionColorVariants.length ? (
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <span className="flex shrink-0 items-center -space-x-1">
                              {suggestionColorVariants.map((variant) => {
                                const swatchColor = variant.colorCode ?? getColorFromName(variant.name);

                                return (
                                  <span
                                    key={`${suggestion.id}-${variant.name}-${variant.colorCode ?? ''}`}
                                    className="h-3.5 w-3.5 rounded-full border border-white/45 shadow-[0_0_0_1px_rgba(15,23,42,0.12)]"
                                    style={swatchColor ? { backgroundColor: swatchColor } : undefined}
                                    aria-hidden="true"
                                  />
                                );
                              })}
                            </span>
                            <span className="truncate text-[11px] font-medium text-gray-500">{suggestionColorLabel}</span>
                          </div>
                        ) : null}
                      </div>
                      <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
                        {formatCurrency(suggestion.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-5 text-sm leading-6 text-gray-400">No quick matches yet. Use search to open the full product results page.</div>
            )}

            <div className="border-t border-white/5 bg-white/[0.02] p-3">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openShopSearch(searchValue)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-gray-300 transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
              >
                <span className="truncate">Browse all results for &quot;{trimmedSearchValue}&quot;</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>
      ) : null}
    </div>
  );

  return (
    <>
      <header
        data-testid="store-header"
        data-condensed={isCondensed ? 'true' : 'false'}
        className={`theme-header-surface sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isCondensed ? 'border-white/12 bg-[#07101f]/94 shadow-[0_20px_38px_rgba(0,0,0,0.28)]' : 'bg-[#0a1221]/88'
        }`}
      >
        <div
          className={`page-shell flex items-center justify-between gap-2 transition-[height,gap] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-3 ${
            isCondensed ? 'h-12 sm:h-[3.6rem] lg:h-[4.2rem] lg:gap-4' : 'h-[3.2rem] sm:h-[3.95rem] lg:h-[4.65rem] lg:gap-4'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              ref={mobileCategoriesButtonRef}
              type="button"
              className={`${iconButtonClassName} ${isCategoriesOpen || isShopRoute ? iconButtonActiveClassName : ''} md:hidden`}
              onClick={openCategoriesPanel}
              onPointerEnter={warmCatalogData}
              onFocus={warmCatalogData}
              onTouchStart={warmCatalogData}
              aria-label={t('nav.categories')}
              aria-haspopup="dialog"
              aria-expanded={isCategoriesOpen}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <Link
              to="/"
              aria-label={storeName}
              className={`group flex min-w-0 items-center whitespace-nowrap text-white transition-[transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px ${
                hasStoreLogo ? 'min-h-[2rem]' : ''
              }`}
            >
              {hasStoreLogo ? (
                <>
                  <img
                    src={storeLogo?.url}
                    srcSet={storeLogo?.srcSet}
                    sizes={storeLogo?.sizes}
                    alt=""
                    aria-hidden="true"
                    loading="eager"
                    decoding="async"
                    width={560}
                    height={180}
                    className={`w-auto max-w-[7.9rem] object-contain sm:max-w-[10.5rem] lg:max-w-[11.5rem] ${
                      isCondensed ? 'max-h-[1.45rem] sm:max-h-[2rem]' : 'max-h-[1.55rem] sm:max-h-[2.2rem]'
                    }`}
                    onError={() => setHasStoreLogoError(true)}
                  />
                  <span className="sr-only">{storeName}</span>
                </>
              ) : (
                <span
                  className={`font-display leading-none text-white transition-[font-size,letter-spacing] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isCondensed ? 'text-[1.05rem] sm:text-[1.26rem] lg:text-[1.58rem]' : 'text-[1.1rem] sm:text-[1.38rem] lg:text-[1.74rem]'
                  }`}
                >
                  {storeName}
                </span>
              )}
            </Link>
          </div>

          <div className={`hidden min-w-0 flex-1 transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:block ${isCondensed ? 'max-w-[44rem]' : 'max-w-[46rem]'}`}>
            {renderSearchSurface()}
          </div>

          <div className={`flex items-center transition-[gap] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isCondensed ? 'gap-1 sm:gap-2' : 'gap-1 sm:gap-2.5'}`}>
            <button
              type="button"
              className={`${iconButtonClassName} md:hidden`}
              onClick={() => {
                setIsMobileSearchOpen((current) => !current);
                setIsSearchFocused(false);
              }}
              aria-label={isMobileSearchOpen ? t('nav.search.close') : t('nav.search.open')}
              aria-expanded={isMobileSearchOpen}
            >
              {isMobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            {user ? (
              <div
                className="relative"
                onBlurCapture={(event) => {
                  const nextTarget = event.relatedTarget;
                  if (!nextTarget || !event.currentTarget.contains(nextTarget as Node)) {
                    setIsNotificationsOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  className={`${iconButtonClassName} relative ${
                    isNotificationsOpen
                      ? 'border-gold/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(212,175,55,0.2))] text-white shadow-[0_16px_36px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]'
                      : unreadNotificationCount
                        ? 'border-gold/25 bg-gold/10 text-white shadow-[0_12px_30px_rgba(212,175,55,0.12)]'
                        : ''
                  }`}
                  aria-label={`Notifications${unreadNotificationCount ? ` (${unreadNotificationCount})` : ''}`}
                  aria-expanded={isNotificationsOpen}
                  onClick={() => setIsNotificationsOpen((current) => !current)}
                >
                  {unreadNotificationCount ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  {unreadNotificationCount ? (
                    <>
                      <span className="absolute inset-0 rounded-full border border-gold/25" aria-hidden="true" />
                      <span className={`${headerCountClassName} border border-[#07101f] shadow-[0_8px_18px_rgba(212,175,55,0.25)]`}>
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                      </span>
                    </>
                  ) : null}
                </button>

                {isNotificationsOpen ? (
                    <div className="notification-panel theme-dark-surface fixed inset-x-3 top-[4.35rem] z-50 max-h-[calc(100dvh-8rem)] w-auto overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#04060d] shadow-[0_28px_70px_rgba(0,0,0,0.48)] md:absolute md:inset-x-auto md:right-0 md:top-[calc(100%+0.7rem)] md:max-h-none md:w-[min(25rem,calc(100vw-1.5rem))]">
                      <div className="notification-panel-header border-b border-white/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(212,175,55,0.08))] px-4 py-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">Notifications</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">Account activity</p>
                          </div>
                          <span className={`notification-panel-status shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            unreadNotificationCount ? 'border-gold/25 bg-gold/10 text-gold' : 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
                          }`}>
                            {unreadNotificationCount ? `${unreadNotificationCount} unread` : 'All read'}
                          </span>
                        </div>
                      </div>
                      {notifications.isPending ? (
                        <div className="space-y-3 px-4 py-4">
                          {Array.from({ length: 3 }, (_, index) => (
                            <Skeleton key={index} className="h-16 rounded-2xl" />
                          ))}
                        </div>
                      ) : notifications.isError ? (
                        <div className="px-4 py-5 text-sm leading-6 text-gray-400">Notifications are unavailable right now.</div>
                      ) : notificationItems.length ? (
                        <div className="max-h-[calc(100dvh-13.5rem)] overflow-y-auto py-2 md:max-h-[25rem]">
                          {notificationItems.map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleNotificationSelect(notification)}
                              className={`notification-panel-item group flex w-full items-start gap-3 px-4 py-3 text-left transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.05] ${
                                notification.isRead ? '' : 'bg-gold/[0.035]'
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                                  notification.isRead
                                    ? 'border-white/10 bg-white/[0.035] text-gray-400'
                                    : 'border-gold/25 bg-gold/10 text-gold shadow-[0_10px_24px_rgba(212,175,55,0.12)]'
                                }`}
                              >
                                {notification.isRead ? <CheckCircle2 className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="truncate text-sm font-semibold text-white">{notification.title}</p>
                                  {!notification.isRead ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" aria-hidden="true" /> : null}
                                </div>
                                <p className="mt-1 text-sm leading-6 text-gray-400">{notification.body}</p>
                                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {formatNotificationTimestamp(notification.createdAt)}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-6 text-center">
                          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                            <CheckCircle2 className="h-5 w-5" />
                          </span>
                          <p className="mt-3 text-sm font-semibold text-white">You are all caught up</p>
                          <p className="mt-1 text-sm leading-6 text-gray-400">New order, return, and account updates will show here.</p>
                        </div>
                      )}
                    </div>
                ) : null}
              </div>
            ) : null}
            <Link
              to="/cart"
              onPointerEnter={() => warmStoreRoute('cart')}
              onFocus={() => warmStoreRoute('cart')}
              onTouchStart={() => warmStoreRoute('cart')}
              className={`relative ${desktopIconButtonClassName} ${isCartRoute ? iconButtonActiveClassName : ''}`}
              aria-label="Open cart"
              aria-current={isCartRoute ? 'page' : undefined}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className={headerCountClassName}>
                {cart?.itemCount ?? 0}
              </span>
            </Link>
            {shortcutActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={`${action.key}-mobile-header`}
                  to={action.to}
                  state={action.state}
                  onPointerEnter={() => warmShortcutActionRoute(action.key)}
                  onFocus={() => warmShortcutActionRoute(action.key)}
                  onTouchStart={() => warmShortcutActionRoute(action.key)}
                  className={`${iconButtonClassName} relative md:hidden ${action.isActive ? iconButtonActiveClassName : ''}`}
                  aria-label={`${action.label}${action.count ? ` (${action.count})` : ''}`}
                  title={action.label}
                >
                  <Icon className="h-4 w-4" />
                  {action.count ? <span className={headerCountClassName}>{action.count > 99 ? '99+' : action.count}</span> : null}
                </Link>
              );
            })}
            {shortcutActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={`${action.key}-header`}
                  to={action.to}
                  state={action.state}
                  onPointerEnter={() => warmShortcutActionRoute(action.key)}
                  onFocus={() => warmShortcutActionRoute(action.key)}
                  onTouchStart={() => warmShortcutActionRoute(action.key)}
                  className={headerShortcutClassName(action.isActive)}
                  aria-label={`${action.label}${action.count ? ` (${action.count})` : ''}`}
                  title={action.label}
                >
                  <Icon className="h-4 w-4" />
                  {action.count ? <span className={headerCountClassName}>{action.count > 99 ? '99+' : action.count}</span> : null}
                </Link>
              );
            })}
            {user ? (
              <ProfileDropdown user={user} />
            ) : (
              <Link
                to="/auth/login"
                className="inline-flex"
                onPointerEnter={() => warmStoreRoute('auth-login')}
                onFocus={() => warmStoreRoute('auth-login')}
                onTouchStart={() => warmStoreRoute('auth-login')}
              >
                <Button>{t('nav.login')}</Button>
              </Link>
            )}
          </div>
        </div>

        <div className={`hidden border-t transition-[border-color,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:block ${isCondensed ? 'border-white/8' : 'border-white/5'}`}>
          <div className="page-shell py-2">
            <div
              className={`flex items-center justify-between gap-4 rounded-[1.35rem] border border-white/8 bg-white/[0.025] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[padding,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isCondensed ? 'py-1.5' : 'py-2'
              }`}
            >
              <nav className="flex items-center gap-1 text-[15px] text-gray-300">
                <NavLink to="/" className={({ isActive }) => navPillClassName(isActive)}>
                  {t('nav.home')}
                </NavLink>
                <NavLink
                  to="/shop"
                  className={({ isActive }) => navPillClassName(isActive)}
                  onPointerEnter={() => warmStoreRoute('shop')}
                  onFocus={() => warmStoreRoute('shop')}
                  onTouchStart={() => warmStoreRoute('shop')}
                >
                  {t('nav.shop')}
                </NavLink>
                <NavLink to="/about" className={({ isActive }) => navPillClassName(isActive)}>
                  About
                </NavLink>
                <NavLink to="/contact" className={({ isActive }) => navPillClassName(isActive)}>
                  Contact
                </NavLink>
              </nav>
              <div className="flex items-center gap-2">
                <button
                  ref={desktopCategoriesButtonRef}
                  type="button"
                  className={`${desktopCategoryPillClassName} inline-flex items-center gap-2 ${
                    isCategoriesOpen || isShopRoute
                      ? 'border-white/18 border-gold/35 bg-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(212,175,55,0.12))] text-white shadow-[0_14px_34px_rgba(212,175,55,0.14),inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : ''
                  }`}
                  onClick={handleDesktopCategoriesClick}
                  onKeyDown={handleDesktopCategoriesKeyDown}
                  onPointerEnter={warmCatalogData}
                  onFocus={warmCatalogData}
                  onTouchStart={warmCatalogData}
                  aria-haspopup="dialog"
                  aria-expanded={isCategoriesOpen}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {t('nav.categories')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {isMobileSearchOpen ? (
            <div className="relative z-[60] overflow-visible border-t border-white/10 md:hidden">
              <div className="page-shell relative z-[61] py-4">{renderSearchSurface(true)}</div>
            </div>
        ) : null}

      </header>

      <Modal
        isOpen={isCategoriesOpen}
        onClose={closeCategoriesPanel}
        title={t('nav.categories')}
        size="full"
        showHeader={false}
        overlayVariant={isDesktopAnchoredCategoriesPanel ? 'transparent' : 'plain'}
        closeOnBackdropPointerDown
        lockBodyScroll={!isDesktopAnchoredCategoriesPanel}
        ariaModal={!isDesktopAnchoredCategoriesPanel}
        overlayClassName={isDesktopAnchoredCategoriesPanel ? 'overflow-visible p-0' : 'p-2 sm:p-6 lg:p-8'}
        panelProps={
          isDesktopCategoriesHoverEnabled
            ? {
                onMouseEnter: keepDesktopCategoriesPanelOpen,
                onMouseLeave: scheduleDesktopCategoriesPanelClose,
                onPointerEnter: keepDesktopCategoriesPanelOpen,
                onPointerLeave: scheduleDesktopCategoriesPanelClose
              }
            : undefined
        }
        originRect={isDesktopAnchoredCategoriesPanel ? categoriesOriginRect : null}
        anchorToOrigin={isDesktopAnchoredCategoriesPanel}
        anchoredOffset={8}
        morphOnClose={false}
        performanceMode="fast"
        contentClassName="catalog-panel-shell w-[min(820px,calc(100vw-1rem))] rounded-[22px] max-h-[min(660px,calc(100vh-1rem))] border border-white/10 shadow-[0_18px_46px_rgba(0,0,0,0.28)] sm:rounded-[28px] sm:shadow-[0_22px_56px_rgba(0,0,0,0.32)] md:w-[min(720px,calc(100vw-2rem))]"
        bodyClassName="p-0"
      >
        <Suspense
          fallback={
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-20 rounded-[1.25rem]" />
              ))}
            </div>
          }
        >
          <CatalogPanel
            catalogView={catalogView}
            setCatalogView={setCatalogViewWithPrefetch}
            categoryMenuItems={categoryMenuItems}
            brandMenuItems={brandMenuItems}
            categoriesState={{ isPending: categories.isPending, isError: categories.isError }}
            brandsState={{ isPending: brands.isPending, isError: brands.isError }}
            failedCategoryImages={failedCategoryImages}
            failedBrandLogos={failedBrandLogos}
            reduceMotion={reduceMotion || !isDesktopViewport}
            onClose={closeCategoriesPanel}
            onCategoryImageError={handleCategoryImageError}
            onBrandLogoError={handleBrandLogoError}
          />
        </Suspense>
      </Modal>
    </>
  );
};
