import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  SetStateAction
} from 'react';
import type { BrandDto, CategoryDto } from '@njstore/types';
import { Button, Skeleton } from '@njstore/ui';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isKnownUnavailableDemoAsset } from '../../utils/imageAssets';
import { buildMonogram, getCategoryFallbackImage } from './navbarConstants';

export type CatalogView = 'categories' | 'brands';

interface CatalogQueryState {
  isPending: boolean;
  isError: boolean;
}

interface CategoryCardItem {
  category: CategoryDto;
  image: string;
  imageKey: string;
  rawImageUrl?: string;
  isUsingFallbackImage: boolean;
}

interface BrandCardItem {
  brand: BrandDto;
  logoUrl?: string;
}

interface CatalogPanelProps {
  catalogView: CatalogView;
  setCatalogView: Dispatch<SetStateAction<CatalogView>>;
  categoryMenuItems: CategoryDto[];
  brandMenuItems: BrandDto[];
  categoriesState: CatalogQueryState;
  brandsState: CatalogQueryState;
  failedCategoryImages: Record<string, true>;
  failedBrandLogos: Record<string, true>;
  reduceMotion: boolean;
  onClose: () => void;
  onCategoryImageError: (imageKey: string) => void;
  onBrandLogoError: (brandId: string) => void;
}

const catalogGridClassName = 'grid grid-cols-3 gap-x-2.5 gap-y-3 sm:grid-cols-4 sm:gap-3.5 xl:grid-cols-5';

const CategoryCatalogCard = memo(
  ({
    item,
    onSelect,
    onImageError
  }: {
    item: CategoryCardItem;
    onSelect: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
    onImageError: (imageKey: string) => void;
  }): JSX.Element => {
    const { category, image, imageKey, rawImageUrl, isUsingFallbackImage } = item;
    const handleImageError = useCallback(() => {
      if (!rawImageUrl || isUsingFallbackImage) {
        return;
      }

      onImageError(imageKey);
    }, [imageKey, isUsingFallbackImage, onImageError, rawImageUrl]);

    return (
      <Link
        to={`/shop?category=${category.id}`}
        onClick={onSelect}
        aria-label={`Shop ${category.name}`}
        title={category.name}
        className="group block h-full"
      >
        <div className="catalog-card relative flex aspect-auto flex-col justify-between overflow-visible rounded-[16px] p-1 sm:aspect-square sm:rounded-[20px] sm:p-2">
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <div className="catalog-card-media flex h-[4.55rem] w-full items-center justify-center overflow-hidden rounded-[14px] min-[380px]:h-[5.1rem] sm:h-full sm:rounded-[16px]">
              <img
                src={image}
                alt={category.image?.alt ?? category.name}
                className={`h-full w-full object-contain object-center ${isUsingFallbackImage ? 'p-1.5' : 'p-1 sm:p-1.5'}`}
                loading="lazy"
                decoding="async"
                onError={handleImageError}
              />
            </div>
          </div>

          <div className="relative mt-1.5 flex min-h-[1.9rem] items-center justify-center px-0.5 text-center sm:mt-1.5 sm:min-h-[2.15rem] sm:px-1">
            <span className="catalog-card-title text-[0.78rem] font-semibold leading-tight sm:text-[0.94rem]">{category.name}</span>
          </div>
        </div>
      </Link>
    );
  }
);

CategoryCatalogCard.displayName = 'CategoryCatalogCard';

const BrandCatalogCard = memo(
  ({
    item,
    onSelect,
    onLogoError
  }: {
    item: BrandCardItem;
    onSelect: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
    onLogoError: (brandId: string) => void;
  }): JSX.Element => {
    const { brand, logoUrl } = item;
    const handleLogoError = useCallback(() => onLogoError(brand.id), [brand.id, onLogoError]);

    return (
      <Link
        to={`/shop?brand=${encodeURIComponent(brand.slug)}`}
        onClick={onSelect}
        aria-label={`Shop ${brand.name} brand`}
        title={brand.name}
        className="group block h-full"
      >
        <div className="catalog-card catalog-brand-card relative flex aspect-auto flex-col justify-between overflow-visible rounded-[16px] p-1 sm:aspect-square sm:rounded-[20px] sm:p-2">
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <div className="catalog-card-media catalog-brand-media flex h-[4.55rem] w-full items-center justify-center overflow-hidden rounded-[14px] px-2 min-[380px]:h-[5.1rem] sm:h-full sm:rounded-[16px] sm:px-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${brand.name} logo`}
                  className="brand-logo-image catalog-brand-logo w-auto max-w-full object-contain"
                  loading="lazy"
                  decoding="async"
                  onError={handleLogoError}
                />
              ) : (
                <span className="catalog-card-title catalog-brand-monogram text-[0.72rem] font-semibold uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.22em]">
                  {buildMonogram(brand.name)}
                </span>
              )}
            </div>
          </div>

          <div className="relative mt-1.5 flex min-h-[1.9rem] items-center justify-center px-0.5 text-center sm:mt-1.5 sm:min-h-[2.15rem] sm:px-1">
            <span className="catalog-card-title text-[0.78rem] font-semibold leading-tight sm:text-[0.94rem]">{brand.name}</span>
          </div>
        </div>
      </Link>
    );
  }
);

BrandCatalogCard.displayName = 'BrandCatalogCard';

export const CatalogPanel = memo(
  ({
    catalogView,
    setCatalogView,
    categoryMenuItems,
    brandMenuItems,
    categoriesState,
    brandsState,
    failedCategoryImages,
    failedBrandLogos,
    reduceMotion,
    onClose,
    onCategoryImageError,
    onBrandLogoError
  }: CatalogPanelProps): JSX.Element => {
    const catalogSwitchDragRef = useRef<{ pointerId: number; startX: number; startY: number; hasDragged: boolean } | null>(null);
    const catalogContentDragRef = useRef<{ pointerId: number; startX: number; startY: number; hasDragged: boolean } | null>(null);
    const suppressCatalogSwitchClickRef = useRef(false);
    const suppressCatalogCardClickRef = useRef(false);
    const isInitialCatalogPaintSettledRef = useRef(false);

    useEffect(() => {
      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        isInitialCatalogPaintSettledRef.current = true;
        return undefined;
      }

      const frameId = window.requestAnimationFrame(() => {
        isInitialCatalogPaintSettledRef.current = true;
      });

      return () => window.cancelAnimationFrame(frameId);
    }, []);

    const categoryCards = useMemo<CategoryCardItem[]>(
      () =>
        categoryMenuItems.map((category) => {
          const rawCategoryImageUrl = category.image?.url?.trim();
          const categoryImageUrl =
            rawCategoryImageUrl && !isKnownUnavailableDemoAsset(rawCategoryImageUrl) ? rawCategoryImageUrl : undefined;
          const imageKey = categoryImageUrl || category.id;
          const fallbackImage = getCategoryFallbackImage(category);
          const image = failedCategoryImages[imageKey] ? fallbackImage : categoryImageUrl || fallbackImage;

          return {
            category,
            image,
            imageKey,
            rawImageUrl: categoryImageUrl,
            isUsingFallbackImage: image === fallbackImage
          };
        }),
      [categoryMenuItems, failedCategoryImages]
    );

    const brandCards = useMemo<BrandCardItem[]>(
      () =>
        brandMenuItems.map((brand) => ({
          brand,
          logoUrl: failedBrandLogos[brand.id] ? undefined : brand.logoUrl
        })),
      [brandMenuItems, failedBrandLogos]
    );

    const shouldAnimateCatalogView = !reduceMotion && isInitialCatalogPaintSettledRef.current;
    const catalogViewMotion = !shouldAnimateCatalogView
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const }
        };

    const getCatalogViewFromSwitchPoint = (element: HTMLElement, clientX: number): CatalogView => {
      const rect = element.getBoundingClientRect();
      return clientX < rect.left + rect.width / 2 ? 'categories' : 'brands';
    };

    const handleCatalogSwitchPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
      if (event.pointerType === 'mouse') {
        return;
      }

      catalogSwitchDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        hasDragged: false
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }, []);

    const handleCatalogSwitchPointerMove = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>): void => {
        const drag = catalogSwitchDragRef.current;

        if (!drag || drag.pointerId !== event.pointerId) {
          return;
        }

        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;

        if (Math.abs(deltaX) < 10 || Math.abs(deltaX) <= Math.abs(deltaY)) {
          return;
        }

        event.preventDefault();
        drag.hasDragged = true;
        suppressCatalogSwitchClickRef.current = true;
        setCatalogView(getCatalogViewFromSwitchPoint(event.currentTarget, event.clientX));
      },
      [setCatalogView]
    );

    const handleCatalogSwitchPointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
      const drag = catalogSwitchDragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      if (drag.hasDragged) {
        suppressCatalogSwitchClickRef.current = true;
      }

      event.currentTarget.releasePointerCapture?.(event.pointerId);
      catalogSwitchDragRef.current = null;
    }, []);

    const handleCatalogSwitchTabClick = useCallback(
      (view: CatalogView): void => {
        if (suppressCatalogSwitchClickRef.current) {
          suppressCatalogSwitchClickRef.current = false;
          return;
        }

        setCatalogView(view);
      },
      [setCatalogView]
    );

    const handleCatalogContentPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
      if (event.pointerType === 'mouse') {
        return;
      }

      suppressCatalogCardClickRef.current = false;
      catalogContentDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        hasDragged: false
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }, []);

    const handleCatalogContentPointerMove = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>): void => {
        const drag = catalogContentDragRef.current;

        if (!drag || drag.pointerId !== event.pointerId) {
          return;
        }

        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;

        if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) {
          return;
        }

        event.preventDefault();
        drag.hasDragged = true;
        suppressCatalogCardClickRef.current = true;
        setCatalogView((current) => (current === 'categories' ? 'brands' : 'categories'));
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        catalogContentDragRef.current = null;
      },
      [setCatalogView]
    );

    const handleCatalogContentPointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
      const drag = catalogContentDragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      if (drag.hasDragged) {
        suppressCatalogCardClickRef.current = true;
      }

      event.currentTarget.releasePointerCapture?.(event.pointerId);
      catalogContentDragRef.current = null;
    }, []);

    const handleCatalogCardClick = useCallback(
      (event: ReactMouseEvent<HTMLAnchorElement>): void => {
        if (suppressCatalogCardClickRef.current) {
          event.preventDefault();
          suppressCatalogCardClickRef.current = false;
          return;
        }

        onClose();
      },
      [onClose]
    );

    const isActiveViewPending =
      catalogView === 'categories'
        ? categoriesState.isPending && categoryCards.length === 0
        : brandsState.isPending && brandCards.length === 0;

    return (
      <div className="relative overflow-hidden">
        <div className="catalog-panel-ambient" aria-hidden="true" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="catalog-close-button absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px motion-reduce:transform-none sm:right-4 sm:top-4 sm:h-11 sm:w-11"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <div className="px-2 pb-2.5 pt-2.5 sm:px-4 sm:pb-4 sm:pt-4">
          <div className="flex justify-center pr-8 min-[360px]:pr-10 sm:pr-12">
            <div
              role="tablist"
              aria-label="Browse categories or brands"
              className="catalog-switch relative inline-flex max-w-[calc(100vw-4.75rem)] touch-pan-y rounded-full p-1"
              onPointerDown={handleCatalogSwitchPointerDown}
              onPointerMove={handleCatalogSwitchPointerMove}
              onPointerUp={handleCatalogSwitchPointerEnd}
              onPointerCancel={handleCatalogSwitchPointerEnd}
            >
              {([
                { key: 'categories', label: 'Categories', count: categoryCards.length },
                { key: 'brands', label: 'Brands', count: brandCards.length }
              ] as const).map((view) => {
                const isActive = catalogView === view.key;

                return (
                  <button
                    key={view.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleCatalogSwitchTabClick(view.key)}
                    className={`catalog-switch-button relative inline-flex h-9 min-w-0 items-center gap-1 rounded-full px-2 text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 min-[360px]:gap-1.5 min-[360px]:px-3 min-[360px]:text-[10px] min-[360px]:tracking-[0.18em] sm:h-10 sm:gap-2.5 sm:px-4 sm:text-[11px] sm:tracking-[0.24em] ${
                      isActive ? 'catalog-switch-button-active' : ''
                    }`}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="catalog-switch-pill"
                        className="catalog-switch-pill absolute inset-0 rounded-full"
                        transition={reduceMotion ? undefined : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ) : null}
                    <span className="relative z-10 truncate">{view.label}</span>
                    <span
                      className={`catalog-switch-count relative z-10 inline-flex min-w-[1.35rem] shrink-0 items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-semibold min-[360px]:min-w-[1.45rem] min-[360px]:text-[10px] sm:min-w-[1.8rem] sm:px-1.5 sm:py-1 sm:text-[11px] ${
                        isActive ? 'catalog-switch-count-active' : ''
                      }`}
                    >
                      {view.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          role="group"
          aria-label="Catalog items"
          className="touch-pan-y px-3 pb-3 sm:px-4 sm:pb-4"
          onPointerDown={handleCatalogContentPointerDown}
          onPointerMove={handleCatalogContentPointerMove}
          onPointerUp={handleCatalogContentPointerEnd}
          onPointerCancel={handleCatalogContentPointerEnd}
        >
          <motion.div key={catalogView} className="contents" {...catalogViewMotion}>
            {isActiveViewPending ? (
              <div className={catalogGridClassName}>
                {Array.from({ length: 8 }, (_, index) => (
                  <Skeleton key={index} className="aspect-[0.86] rounded-[16px] sm:aspect-square sm:rounded-[22px]" />
                ))}
              </div>
            ) : catalogView === 'categories' ? (
              categoriesState.isError ? (
                <div className="catalog-empty-state rounded-[28px] p-8 text-center">
                  <p className="text-sm text-gray-400">Categories are temporarily unavailable.</p>
                  <Link to="/shop" onClick={onClose} className="mt-5 inline-flex">
                    <Button>Open Shop</Button>
                  </Link>
                </div>
              ) : categoryCards.length ? (
                <div className={catalogGridClassName}>
                  {categoryCards.map((item) => (
                    <CategoryCatalogCard
                      key={item.category.id}
                      item={item}
                      onSelect={handleCatalogCardClick}
                      onImageError={onCategoryImageError}
                    />
                  ))}
                </div>
              ) : (
                <div className="catalog-empty-state rounded-[28px] p-8 text-center">
                  <p className="text-sm text-gray-400">No categories available right now.</p>
                </div>
              )
            ) : brandsState.isError ? (
              <div className="catalog-empty-state rounded-[28px] p-8 text-center">
                <p className="text-sm text-gray-400">Brands are temporarily unavailable.</p>
                <Link to="/shop" onClick={onClose} className="mt-5 inline-flex">
                  <Button>Open Shop</Button>
                </Link>
              </div>
            ) : brandCards.length ? (
              <div className={catalogGridClassName}>
                {brandCards.map((item) => (
                  <BrandCatalogCard
                    key={item.brand.id}
                    item={item}
                    onSelect={handleCatalogCardClick}
                    onLogoError={onBrandLogoError}
                  />
                ))}
              </div>
            ) : (
              <div className="catalog-empty-state rounded-[28px] p-8 text-center">
                <p className="text-sm text-gray-400">No brands available right now.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }
);

CatalogPanel.displayName = 'CatalogPanel';
