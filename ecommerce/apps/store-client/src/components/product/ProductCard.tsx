import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type SyntheticEvent,
  type TouchEvent
} from 'react';
import type { ProductCardDto, ProductDetailDto } from '@njstore/types';
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'framer-motion';
import { ArrowLeft, Heart, ImageOff, Scale } from 'lucide-react';
import { Badge, Button } from '@njstore/ui';
import { cn } from '@njstore/utils/cn';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { analytics } from '../../analytics/analytics';
import { warmStoreRoute } from '../../app/routeWarmup';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useFastMotionPreference } from '../../hooks/useFastMotionPreference';
import { useInView } from '../../hooks/useInView';
import { productService } from '../../services/productService';
import { getApiErrorMessage } from '../../utils/apiError';
import { isKnownUnavailableDemoAsset } from '../../utils/imageAssets';
import { toast } from '../../utils/lazyToast';
import { subscribeToMediaQueryChange } from '../../utils/mediaQuery';
import { STOREFRONT_PRODUCT_CARD_HEIGHT_CLASSNAME } from './productCardLayout';
import { ProgressiveImage } from '../media/ProgressiveImage';
import { isProductPreviewBudgetScrollActive, useProductPreviewBudget } from './useProductPreviewBudget';
import {
  buildAnimationVariants,
  cinematicEase,
  getBrandLogoShapeFromName,
  normalizeBrandLabel,
  resolveProductRatings,
  type BrandLogoShape
} from './productCardConstants';
import {
  buildVariantSelection,
  findExactVariantIndex,
  getStockLabel,
  getVariantAttributeGroups,
  getVariantOptionColor,
  getVariantSummary,
  resolveVariantSelectionChange,
  type VariantAttributeKey,
  type VariantSelection
} from './productVariantUtils';
import { useProductCardSelection } from './useProductCardSelection';

interface ProductCardProps {
  product: ProductCardDto;
  isWishlisted?: boolean;
  isWishlistPending?: boolean;
  onWishlistToggle?: (product: ProductCardDto | ProductDetailDto) => void | Promise<unknown>;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  size?: 'default' | 'compact' | 'featured';
}


import { ProductCardSwatches } from './ProductCardSwatches';

let productCardOptionsPromise: Promise<typeof import('./ProductCardOptions')> | null = null;

const loadProductCardOptions = (): Promise<typeof import('./ProductCardOptions')> => {
  productCardOptionsPromise ??= import('./ProductCardOptions');
  return productCardOptionsPromise;
};

const preloadProductCardOptions = (): void => {
  void loadProductCardOptions();
};

let productCardOptionsIdlePreloadScheduled = false;

const isMobileRuntime = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  (window.matchMedia('(max-width: 767px)').matches ||
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches);

const scheduleProductCardOptionsIdlePreload = (): void => {
  if (productCardOptionsIdlePreloadScheduled || typeof window === 'undefined') {
    return;
  }

  productCardOptionsIdlePreloadScheduled = true;
  const runtimeWindow = window as typeof window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  };
  const mobileRuntime = isMobileRuntime();

  if (typeof runtimeWindow.requestIdleCallback === 'function') {
    runtimeWindow.requestIdleCallback(preloadProductCardOptions, { timeout: mobileRuntime ? 5_000 : 2_500 });
    return;
  }

  window.setTimeout(preloadProductCardOptions, mobileRuntime ? 3_200 : 1_400);
};

const ProductCardDefaultOptions = lazy(async () => ({
  default: (await loadProductCardOptions()).ProductCardDefaultOptions
}));

const ProductCardImmersiveOptions = lazy(async () => ({
  default: (await loadProductCardOptions()).ProductCardImmersiveOptions
}));

const PRODUCT_DETAIL_QUERY_STALE_MS = 60_000;

const ProductCardComponent = ({
  product,
  isWishlisted = false,
  isWishlistPending = false,
  onWishlistToggle,
  onInteractionStart,
  onInteractionEnd,
  size = 'default'
}: ProductCardProps): JSX.Element => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { toggleCompare, items } = useCompare();
  const { formatCurrency } = useCurrencyFormatter();
  const systemReduceMotion = useReducedMotion();
  const fastMotion = useFastMotionPreference();
  const reduceMotion = Boolean(systemReduceMotion || fastMotion);
  const defaultOptionDragControls = useDragControls();
  const productBrand = normalizeBrandLabel(product.brand);
  const productBrandQueryValue = product.brandSlug?.trim() || productBrand;
  const productRatings = resolveProductRatings(product.ratings);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [hasBrandLogoError, setHasBrandLogoError] = useState(false);
  const [brandLogoShape, setBrandLogoShape] = useState<BrandLogoShape>(() => getBrandLogoShapeFromName(productBrand));
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImagePreviewActive, setIsImagePreviewActive] = useState(false);
  const [isPreviewPriorityActive, setIsPreviewPriorityActive] = useState(false);
  const [isTouchPreviewMode, setIsTouchPreviewMode] = useState(false);
  const { ref: inViewRef, inView } = useInView({
    enabled: Boolean(product.previewImages?.length && product.previewImages.length > 1),
    threshold: 0.45,
    rootMargin: '80px 0px',
    triggerOnce: false,
    deferWhileScrolling: true
  });
  const [failedImageUrls, setFailedImageUrls] = useState<Record<string, true>>({});
  const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState(false);
  const [isDefaultOptionDragging, setIsDefaultOptionDragging] = useState(false);
  const [mobileSheetPullY, setMobileSheetPullY] = useState(0);
  const [detailProduct, setDetailProduct] = useState<ProductDetailDto | null>(null);
  const [isOptionsLoading, setIsOptionsLoading] = useState(false);
  const [hasOptionsError, setHasOptionsError] = useState(false);
  const {
    selectedOptions,
    selectedVariantIndex,
    setSelectedOptions,
    setSelectedVariantIndex,
    resetSelection,
    applyInitialSelection
  } = useProductCardSelection();
  const preloadedImageUrlsRef = useRef<Record<string, true>>({});
  const previewResetTimeoutRef = useRef<number | null>(null);
  const previewPriorityTimeoutRef = useRef<number | null>(null);
  const detailRequestIdRef = useRef(0);
  const defaultOptionsScrollRef = useRef<HTMLDivElement | null>(null);
  const compactOptionsScrollRef = useRef<HTMLDivElement | null>(null);
  const isPointerInsideCardRef = useRef(false);
  const mobileSheetPullRef = useRef<{ startY: number; lastY: number; startTime: number; isPulling: boolean } | null>(null);
  const productDetailQueryKey = useMemo(() => ['product-detail', product.slug] as const, [product.slug]);
  const shouldMeasureLayout = !reduceMotion && !isOptionsPanelOpen;
  const isCompact = size === 'compact';
  const isFeatured = size === 'featured';
  const isCondensed = isCompact || isFeatured;
  const previewKickoffDelay = 420;
  const previewAutoplayInterval = 2800;
  const previewResetDelay = 320;
  const cardRadiusClass = 'rounded-[20px] min-[390px]:rounded-[22px] min-[480px]:rounded-[24px] sm:rounded-[28px]';
  const touchCardActiveClass = '';
  const cardHeightClass = isCompact
    ? 'min-h-[248px] sm:min-h-[304px]'
    : isFeatured
      ? 'min-h-[332px] sm:min-h-[452px]'
      : `${STOREFRONT_PRODUCT_CARD_HEIGHT_CLASSNAME} min-[390px]:aspect-[9/16] sm:aspect-auto`;
  const shouldUseTouchCardSummaryLayout = false;
  const mediaShellClass = isCompact
    ? 'h-44 rounded-t-[18px] sm:h-auto sm:w-[280px] sm:shrink-0 sm:rounded-l-[28px] sm:rounded-tr-none sm:rounded-t-[28px]'
      : isFeatured
        ? 'h-[168px] rounded-t-[18px] sm:h-64 sm:rounded-t-[28px]'
      : shouldUseTouchCardSummaryLayout
        ? 'h-[46%] min-h-[176px] shrink-0 rounded-t-[20px] min-[390px]:min-h-[198px] min-[390px]:rounded-t-[22px] min-[480px]:min-h-[234px] min-[480px]:rounded-t-[24px] sm:h-[274px] sm:min-h-0 sm:rounded-t-[28px] lg:h-[276px] 2xl:h-[292px]'
        : 'h-[50%] min-h-[128px] shrink-0 rounded-t-[20px] min-[390px]:h-[58%] min-[390px]:min-h-[186px] min-[390px]:rounded-t-[22px] min-[480px]:min-h-[210px] min-[480px]:rounded-t-[24px] sm:h-[274px] sm:min-h-0 sm:rounded-t-[28px] lg:h-[276px] 2xl:h-[292px]';
  const contentPaddingClass = isCompact
    ? 'px-3.5 py-3.5 sm:px-6 sm:py-6'
      : isFeatured
        ? 'px-3.5 pb-3.5 pt-3 sm:px-6 sm:pb-5 sm:pt-5'
      : shouldUseTouchCardSummaryLayout
        ? 'px-3 pb-3 pt-3 min-[390px]:px-3.5 min-[390px]:pb-3.5 min-[390px]:pt-3.5 min-[480px]:px-4 min-[480px]:pb-4 min-[480px]:pt-4 sm:px-5 sm:pb-5 sm:pt-4'
        : 'px-2.5 pb-2.5 pt-2 min-[390px]:px-3 min-[390px]:pb-3 min-[390px]:pt-2.5 min-[480px]:px-3.5 min-[480px]:pb-3.5 min-[480px]:pt-3 sm:px-6 sm:pb-5 sm:pt-4.5';
  const actionSize = isCondensed ? 'sm' : 'md';
  const actionRowClassName = cn('relative z-[2] flex items-center', isCondensed ? 'gap-1 sm:gap-1.5' : 'gap-1.5 sm:gap-2');
  const primaryActionButtonClassName = cn(
    'w-full min-w-0 overflow-hidden border border-[#c99b13] bg-[#d8a918] bg-none font-semibold tracking-normal text-slate-950 shadow-[0_4px_10px_rgba(216,169,24,0.14)] hover:border-[#d7ad24] hover:bg-[#e0b326] hover:bg-none hover:shadow-[0_8px_14px_rgba(216,169,24,0.18)] active:translate-y-0',
    isCondensed
      ? '!h-7 !rounded-[9px] !px-2 text-[11px] min-[390px]:!h-8 min-[390px]:!rounded-[10px] min-[390px]:!px-2.5 min-[390px]:text-[12px] sm:!h-9 sm:!rounded-[11px] sm:text-[12.5px]'
      : '!h-[1.625rem] !rounded-[8px] !px-1.5 text-[10px] min-[390px]:!h-7 min-[390px]:!rounded-[9px] min-[390px]:!px-2 min-[390px]:text-[11px] min-[480px]:!h-8 min-[480px]:!rounded-[10px] min-[480px]:text-[12px] sm:!h-9 sm:!rounded-[11px] sm:!px-3 sm:text-sm'
  );
  const iconButtonClass = cn(
    'shrink-0 justify-center border border-slate-200 bg-white bg-none !px-0 text-slate-600 shadow-[0_4px_10px_rgba(15,23,42,0.07)] transition-[border-color,background-color,color,box-shadow,transform] duration-300 ease-out hover:border-slate-300 hover:bg-white hover:bg-none hover:text-slate-900 hover:shadow-[0_8px_14px_rgba(15,23,42,0.1)] active:translate-y-0',
    isCondensed
      ? '!h-7 !w-7 !rounded-[9px] min-[390px]:!h-8 min-[390px]:!w-8 min-[390px]:!rounded-[10px] sm:!h-9 sm:!w-9 sm:!rounded-[11px]'
      : '!h-[1.625rem] !w-[1.625rem] !rounded-[8px] min-[390px]:!h-7 min-[390px]:!w-7 min-[390px]:!rounded-[9px] min-[480px]:!h-8 min-[480px]:!w-8 min-[480px]:!rounded-[10px] sm:!h-9 sm:!w-9 sm:!rounded-[11px]'
  );
  const activeUtilityButtonClass = `${iconButtonClass} border-[#e1c358] text-[#b88b05]`;
  const immersiveUtilityButtonClass = cn(
    'shrink-0 justify-center border border-white/22 bg-white/[0.08] bg-none !px-0 text-white shadow-[0_6px_16px_rgba(18,17,16,0.16)] backdrop-blur-md transition-[border-color,background-color,color,box-shadow,transform] duration-300 ease-out hover:border-white/34 hover:bg-white/[0.14] hover:bg-none hover:text-white hover:shadow-[0_10px_20px_rgba(18,17,16,0.2)] active:translate-y-0',
    '!h-8 !w-8 !rounded-[10px] sm:!h-9 sm:!w-9 sm:!rounded-[12px]'
  );
  const immersiveActiveUtilityButtonClass = `${immersiveUtilityButtonClass} border-[#f1cf43]/65 bg-[#d8a918]/18 text-[#ffe98a]`;
  const previewImages = useMemo(() => {
    const images = product.previewImages?.length ? product.previewImages : product.thumbnail ? [product.thumbnail] : [];

    return images.filter(
      (image, index, items) =>
        !isKnownUnavailableDemoAsset(image.url) && items.findIndex((candidate) => candidate.url === image.url) === index
    );
  }, [product.previewImages, product.thumbnail]);
  const availablePreviewImages = useMemo(
    () => previewImages.filter((image) => !failedImageUrls[image.url]),
    [failedImageUrls, previewImages]
  );
  const safeActiveImageIndex = availablePreviewImages.length ? Math.min(activeImageIndex, availablePreviewImages.length - 1) : 0;
  const renderedPreviewImages = useMemo(() => {
    if (availablePreviewImages.length <= 2) {
      return availablePreviewImages.map((image, imageIndex) => ({ image, imageIndex }));
    }

    const nextImageIndex = (safeActiveImageIndex + 1) % availablePreviewImages.length;
    return [safeActiveImageIndex, nextImageIndex].map((imageIndex) => ({
      image: availablePreviewImages[imageIndex]!,
      imageIndex
    }));
  }, [availablePreviewImages, safeActiveImageIndex]);
  const isPreviewBudgetGranted = useProductPreviewBudget({
    eligible: availablePreviewImages.length > 1 && !isOptionsPanelOpen && !isDefaultOptionDragging,
    inView,
    priority: isPreviewPriorityActive
  });
  const shouldRunImagePreview =
    isImagePreviewActive && isPreviewBudgetGranted && !isOptionsPanelOpen && !isDefaultOptionDragging;
  const isTouchCardMotionActive =
    isTouchPreviewMode && inView && isPreviewBudgetGranted && !isOptionsPanelOpen && !isDefaultOptionDragging;
  const isPreviewVisualActive = isImagePreviewActive && (isPreviewBudgetGranted || isPreviewPriorityActive);
  const isCardPopActive = isPreviewPriorityActive && !isOptionsPanelOpen && !isDefaultOptionDragging;
  const cardMicroMotionClassName =
    'transform-gpu transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';
  const cardTextLiftClassName = isCardPopActive ? '-translate-y-0.5 will-change-transform' : 'translate-y-0';
  const hasBrandLogo = Boolean(product.brandLogoUrl && !hasBrandLogoError);
  const isCompared = items.includes(product.id);
  const brandHref = `/shop?brand=${encodeURIComponent(productBrandQueryValue)}`;
  const brandLogoBadgeClassName = cn(
    'product-card-logo-badge absolute left-2 top-2 z-[2] flex h-[1.4rem] items-center justify-center overflow-hidden rounded-[0.75rem] border border-slate-200/90 bg-white/95 px-1.5 py-0 shadow-[0_7px_16px_rgba(15,23,42,0.08)] backdrop-blur min-[390px]:left-2.5 min-[390px]:top-2.5 min-[390px]:h-[1.45rem] min-[390px]:rounded-[0.78rem] min-[480px]:left-3 min-[480px]:top-3 min-[480px]:h-[1.55rem] min-[480px]:rounded-[0.85rem] sm:left-3 sm:top-3 sm:h-6 sm:rounded-[0.95rem] sm:px-2 lg:left-4 lg:top-4 lg:h-7 lg:rounded-[1.05rem] lg:px-2.5',
    cardMicroMotionClassName,
    isCardPopActive ? 'scale-[1.04]' : 'scale-100',
    brandLogoShape === 'square'
      ? 'w-[2.45rem] min-[390px]:w-[2.6rem] min-[480px]:w-[2.8rem] sm:w-[3.35rem] lg:w-[3.65rem]'
      : brandLogoShape === 'wide'
        ? 'w-[3rem] min-[390px]:w-[3.25rem] min-[480px]:w-[3.5rem] sm:w-[4.55rem] lg:w-[5rem]'
        : 'w-[2.8rem] min-[390px]:w-[3rem] min-[480px]:w-[3.25rem] sm:w-[4rem] lg:w-[4.35rem]'
  );
  const variantGroups = useMemo(
    () => (detailProduct?.productType === 'standard' ? getVariantAttributeGroups(detailProduct.variants) : []),
    [detailProduct?.productType, detailProduct?.variants]
  );
  const displayColorVariants = useMemo(() => {
    const cardColorVariants = product.colorVariants ?? [];
    if (cardColorVariants.length) {
      return cardColorVariants
        .map((variant) => ({
          name: variant.name.trim(),
          colorCode: variant.colorCode
        }))
        .filter((variant) => Boolean(variant.name));
    }

    if (!detailProduct || detailProduct.productType !== 'standard') {
      return [];
    }

    const colorGroup = variantGroups.find((group) => group.presentation === 'swatch');
    if (!colorGroup) {
      return [];
    }

    return colorGroup.options.map((option) => ({
      name: option,
      colorCode: getVariantOptionColor(detailProduct.variants, option)
    }));
  }, [detailProduct, product.colorVariants, variantGroups]);
  const selectedVariant =
    detailProduct?.productType === 'standard' && selectedVariantIndex !== undefined
      ? detailProduct.variants[selectedVariantIndex]
      : undefined;
  const hasConfigurableVariants = Boolean(detailProduct?.productType === 'standard' && detailProduct.variants.length);
  const isSelectionComplete = detailProduct
    ? detailProduct.productType !== 'standard' || !detailProduct.variants.length
      ? true
      : variantGroups.length
        ? variantGroups.every((group) => Boolean(selectedOptions[group.key])) && selectedVariantIndex !== undefined
        : selectedVariantIndex !== undefined
    : false;
  const selectedVariantSummary =
    selectedVariant && selectedVariantIndex !== undefined ? getVariantSummary(selectedVariant, variantGroups, selectedVariantIndex) : undefined;
  const displayPrice = selectedVariant?.price ?? detailProduct?.price ?? product.price;
  const stockCount = selectedVariant?.stock ?? detailProduct?.stock ?? product.stock;
  const compactDetails = [
    `${productRatings.average.toFixed(1)} / 5 rating`,
    `${productRatings.count.toLocaleString()} reviews`,
    product.category?.name
  ].filter(Boolean) as string[];
  const shouldRenderOptionsDock = (!isCondensed || isTouchPreviewMode || isImagePreviewActive || isOptionsPanelOpen) && (!shouldUseTouchCardSummaryLayout || isOptionsPanelOpen);
  const shouldReserveOptionsDockSpace = false;
  const shouldShowCompletedActions = Boolean(detailProduct) && isOptionsPanelOpen && isSelectionComplete;
  const shouldEnableDefaultOptionDrag = isTouchPreviewMode && !isCondensed;
  const isCardSceneActive = isTouchCardMotionActive || isPreviewVisualActive || isOptionsPanelOpen;
  const shouldShowMediaAvailabilityBadge = !isCompact && !isFeatured;
  const primaryActionLabel = stockCount > 0 ? 'Add to Cart' : 'Out of Stock';
  const selectedOptionCount = variantGroups.filter((group) => Boolean(selectedOptions[group.key])).length;
  const selectionPrompt = isOptionsLoading
    ? 'Loading the latest product options.'
    : hasOptionsError
      ? 'We could not load the options right now.'
      : selectedVariantSummary
        ? selectedVariantSummary
        : hasConfigurableVariants
          ? variantGroups.length
            ? `${selectedOptionCount} of ${variantGroups.length} options selected`
            : 'Choose one configuration to unlock actions.'
          : detailProduct
            ? 'This product is ready to order.'
            : 'Open the drawer to choose product options.';
  const optionTriggerStatus = isOptionsLoading
    ? 'Loading'
    : selectedVariantSummary
      ? 'Ready'
      : hasConfigurableVariants
        ? variantGroups.length
          ? `${selectedOptionCount}/${variantGroups.length}`
          : 'Pick one'
        : detailProduct
          ? 'Ready'
          : isTouchPreviewMode
            ? 'Tap'
            : 'Click';
  const immersiveOptionStatus = selectedVariantSummary
    ? selectedVariantSummary
    : hasConfigurableVariants && variantGroups.length
      ? `${selectedOptionCount} of ${variantGroups.length} options selected`
      : selectionPrompt;
  const animations = useMemo(() => buildAnimationVariants(reduceMotion), [reduceMotion]);
  const {
    immersiveActionTrayVariants,
    immersiveActionItemVariants,
    defaultOptionRevealVariants,
    foregroundContainerVariants,
    foregroundItemVariants,
    sceneTransition,
    optionsDrawerTransition,
    optionsDrawerContentTransition,
    defaultOptionSceneTransition,
    defaultOptionContentTransition,
    immersiveActionTap
  } = animations;
  const selectOptionLabelClass =
    'product-card-select-option-label relative z-[1] block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[7px] font-semibold uppercase leading-none tracking-[0.16em] text-slate-700 min-[390px]:text-[8.5px] min-[390px]:tracking-[0.19em] min-[480px]:text-[9.5px] min-[480px]:tracking-[0.21em] sm:text-[10px] sm:tracking-[0.22em]';
  const defaultSelectOptionBarSizingClassName =
    'h-[1.5rem] min-h-[1.5rem] min-w-0 min-[390px]:h-[1.8rem] min-[390px]:min-h-[1.8rem] min-[480px]:h-[1.95rem] min-[480px]:min-h-[1.95rem] sm:h-8 sm:min-h-8';
  const defaultSelectOptionBarFrameClassName = cn(
    'box-border -mx-2.5 w-[calc(100%+1.25rem)] max-w-none overflow-hidden min-[390px]:-mx-3 min-[390px]:w-[calc(100%+1.5rem)] min-[480px]:-mx-3.5 min-[480px]:w-[calc(100%+1.75rem)]',
    shouldUseTouchCardSummaryLayout ? 'sm:-mx-5 sm:w-[calc(100%+2.5rem)]' : 'sm:-mx-6 sm:w-[calc(100%+3rem)]'
  );
  const defaultSelectOptionBarRadiusClassName =
    'rounded-none';
  const defaultSelectOptionBarSurfaceClassName =
    'product-card-select-option-bar relative isolate overflow-hidden border-y border-[#dfc248]/75 bg-[linear-gradient(180deg,#eef7f6_0%,#e6f0ef_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),inset_0_-1px_0_rgba(216,169,24,0.2),0_8px_18px_rgba(15,23,42,0.08)]';
  const defaultSelectOptionBarInteractiveClassName =
    'transition-[background,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#d8a918]/90 hover:bg-[linear-gradient(180deg,#f3faf9_0%,#eaf3f2_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(216,169,24,0.28),0_10px_20px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8a918]/35';
  const defaultOptionStatusLabelClassName =
    'line-clamp-1 px-2.5 text-center text-[8.5px] font-medium leading-[0.875rem] text-white/82 min-[390px]:text-[9px] min-[480px]:text-[9.5px] min-[480px]:leading-4 sm:text-[10.5px]';
  const defaultOptionOpenBarClassName =
    'relative z-[2] flex w-full items-center justify-center px-3 text-center text-white min-[480px]:px-4 sm:px-5';
  const defaultOptionStatusRowClassName =
    'product-card-option-status-row flex min-h-[2.35rem] shrink-0 items-center justify-center border-b border-white/8 bg-[linear-gradient(180deg,#111827_0%,#0b1220_100%)] px-2.5 py-1 text-center min-[480px]:min-h-[2.5rem] min-[480px]:px-3 sm:min-h-[2.65rem] sm:px-4';

  const renderSelectOptionBarContent = (): JSX.Element => (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.62),transparent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-0 w-16 bg-[linear-gradient(90deg,rgba(255,255,255,0.11),rgba(255,255,255,0))] min-[480px]:w-24"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-px bg-[#d8a918]/80"
      />
      <span className={selectOptionLabelClass}>select option</span>
    </>
  );

  useEffect(() => {
    setHasImageError(false);
    setHasBrandLogoError(false);
    setBrandLogoShape(getBrandLogoShapeFromName(productBrand));
    setActiveImageIndex(0);
    setIsImagePreviewActive(false);
    setIsPreviewPriorityActive(false);
    setFailedImageUrls({});
    setIsOptionsPanelOpen(false);
    setIsDefaultOptionDragging(false);
    isPointerInsideCardRef.current = false;
    setDetailProduct(null);
    setIsOptionsLoading(false);
    setHasOptionsError(false);
    resetSelection();
    preloadedImageUrlsRef.current = {};
    detailRequestIdRef.current += 1;

    if (previewResetTimeoutRef.current !== null) {
      window.clearTimeout(previewResetTimeoutRef.current);
      previewResetTimeoutRef.current = null;
    }

    if (previewPriorityTimeoutRef.current !== null) {
      window.clearTimeout(previewPriorityTimeoutRef.current);
      previewPriorityTimeoutRef.current = null;
    }

  }, [product.previewImages, product.thumbnail?.url, product.id, product.brandLogoUrl, productBrand, resetSelection]);

  const handleBrandLogoLoad = (event: SyntheticEvent<HTMLImageElement>): void => {
    const image = event.currentTarget;
    const aspectRatio = image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 2;

    setBrandLogoShape(aspectRatio < 1.45 ? 'square' : aspectRatio > 3.2 ? 'wide' : 'compact');
  };

  useEffect(() => {
    return () => {
      if (previewResetTimeoutRef.current !== null) {
        window.clearTimeout(previewResetTimeoutRef.current);
      }

      if (previewPriorityTimeoutRef.current !== null) {
        window.clearTimeout(previewPriorityTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOptionsPanelOpen && isDefaultOptionDragging) {
      setIsDefaultOptionDragging(false);
    }

    if (!isOptionsPanelOpen) {
      setMobileSheetPullY(0);
      mobileSheetPullRef.current = null;
    }
  }, [isDefaultOptionDragging, isOptionsPanelOpen]);

  useEffect(() => {
    if (!isOptionsPanelOpen) {
      return;
    }

    onInteractionStart?.();

    return () => {
      if (!isPointerInsideCardRef.current) {
        onInteractionEnd?.();
      }
    };
  }, [isOptionsPanelOpen, onInteractionEnd, onInteractionStart]);

  useEffect(() => {
    if (!isTouchPreviewMode || isCondensed || !isOptionsPanelOpen || typeof document === 'undefined') {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isCondensed, isOptionsPanelOpen, isTouchPreviewMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const hoverNoneQuery = window.matchMedia('(hover: none)');
    const pointerCoarseQuery = window.matchMedia('(pointer: coarse)');
    const mobileViewportQuery = window.matchMedia('(max-width: 767px)');
    const touchViewportQuery = window.matchMedia('(max-width: 1023px)');
    const mediaQueries = [hoverNoneQuery, pointerCoarseQuery, mobileViewportQuery, touchViewportQuery];

    const syncTouchPreviewMode = (): void => {
      const hasTouchLikeInput = hoverNoneQuery.matches || pointerCoarseQuery.matches;
      setIsTouchPreviewMode(mobileViewportQuery.matches || (touchViewportQuery.matches && hasTouchLikeInput));
    };

    syncTouchPreviewMode();
    const unsubscribeQueries = mediaQueries.map((query) => subscribeToMediaQueryChange(query, syncTouchPreviewMode));

    return () => {
      unsubscribeQueries.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Image === 'undefined' || !shouldRunImagePreview || availablePreviewImages.length <= 1) {
      return;
    }

    const nextPreviewImageIndex = (safeActiveImageIndex + 1) % availablePreviewImages.length;
    const nextPreviewImage = availablePreviewImages[nextPreviewImageIndex];

    if (
      isProductPreviewBudgetScrollActive() ||
      !nextPreviewImage?.url ||
      nextPreviewImageIndex === 0 ||
      failedImageUrls[nextPreviewImage.url] ||
      preloadedImageUrlsRef.current[nextPreviewImage.url]
    ) {
      return;
    }

    preloadedImageUrlsRef.current[nextPreviewImage.url] = true;
    const preloader = new window.Image();
    preloader.decoding = 'async';
    preloader.src = nextPreviewImage.url;

    return () => {
      preloader.onload = null;
      preloader.onerror = null;
    };
  }, [availablePreviewImages, failedImageUrls, safeActiveImageIndex, shouldRunImagePreview]);

  useEffect(() => {
    if (!shouldRunImagePreview || availablePreviewImages.length <= 1) {
      return;
    }

    let intervalId: number | undefined;
    const kickoffId = window.setTimeout(() => {
      if (!isProductPreviewBudgetScrollActive()) {
        setActiveImageIndex((current) => {
          if (availablePreviewImages.length <= 1) {
            return 0;
          }

          return current === 0 ? 1 : current;
        });
      }

      intervalId = window.setInterval(() => {
        if ((typeof document !== 'undefined' && document.hidden) || isProductPreviewBudgetScrollActive()) {
          return;
        }

        setActiveImageIndex((current) => {
          if (availablePreviewImages.length <= 1) {
            return 0;
          }

          return (current + 1) % availablePreviewImages.length;
        });
      }, previewAutoplayInterval);
    }, previewKickoffDelay);

    return () => {
      window.clearTimeout(kickoffId);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [availablePreviewImages.length, previewAutoplayInterval, previewKickoffDelay, shouldRunImagePreview]);

  useEffect(() => {
    if (!availablePreviewImages.length) {
      if (!hasImageError) {
        setHasImageError(true);
      }
      return;
    }

    if (hasImageError) {
      setHasImageError(false);
    }

    if (activeImageIndex > availablePreviewImages.length - 1) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, availablePreviewImages.length, hasImageError]);

  useEffect(() => {
    if (!isTouchPreviewMode || availablePreviewImages.length <= 1) {
      return;
    }

    if (inView) {
      if (previewResetTimeoutRef.current !== null) {
        window.clearTimeout(previewResetTimeoutRef.current);
        previewResetTimeoutRef.current = null;
      }

      setIsImagePreviewActive(true);
      return;
    }

    setIsImagePreviewActive(false);
    if (previewResetTimeoutRef.current !== null) {
      window.clearTimeout(previewResetTimeoutRef.current);
    }

    previewResetTimeoutRef.current = window.setTimeout(() => {
      setActiveImageIndex(0);
      previewResetTimeoutRef.current = null;
    }, previewResetDelay);
  }, [availablePreviewImages.length, inView, isTouchPreviewMode, previewResetDelay]);

  useEffect(() => {
    if (isTouchPreviewMode) {
      scheduleProductCardOptionsIdlePreload();
    }
  }, [isTouchPreviewMode]);

  useEffect(() => {
    if (!isOptionsPanelOpen || detailProduct || isOptionsLoading) {
      return;
    }

    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    setIsOptionsLoading(true);
    setHasOptionsError(false);

    void queryClient
      .fetchQuery({
        queryKey: productDetailQueryKey,
        queryFn: () => productService.detail(product.slug),
        staleTime: PRODUCT_DETAIL_QUERY_STALE_MS
      })
      .then((response) => {
        if (detailRequestIdRef.current !== requestId) {
          return;
        }

        const nextDetailProduct = response.data;
        setDetailProduct(nextDetailProduct);
        applyInitialSelection(nextDetailProduct);
      })
      .catch(() => {
        if (detailRequestIdRef.current !== requestId) {
          return;
        }

        setHasOptionsError(true);
      })
      .finally(() => {
        if (detailRequestIdRef.current === requestId) {
          setIsOptionsLoading(false);
        }
      });
  }, [applyInitialSelection, detailProduct, isOptionsLoading, isOptionsPanelOpen, product.slug, productDetailQueryKey, queryClient]);

  useEffect(() => {
    if (!isOptionsPanelOpen) {
      return undefined;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const scrollAreas = [defaultOptionsScrollRef.current, compactOptionsScrollRef.current];

      scrollAreas.forEach((scrollArea) => {
        if (!scrollArea) {
          return;
        }

        if (typeof scrollArea.scrollTo === 'function') {
          scrollArea.scrollTo({ top: 0, behavior: 'auto' });
          return;
        }

        scrollArea.scrollTop = 0;
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isOptionsPanelOpen]);

  const goToProduct = (): void => {
    navigate(`/product/${product.slug}`);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      goToProduct();
    }
  };

  const stopCardNavigation = (event: MouseEvent<HTMLElement>): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleAddToCart = async (event: MouseEvent<HTMLButtonElement>): Promise<void> => {
    stopCardNavigation(event);

    if (isAddingToCart || stockCount <= 0) {
      return;
    }

    if (detailProduct?.productType === 'standard' && detailProduct.variants.length > 0 && selectedVariantIndex === undefined) {
      toast.error('Select all required options first.');
      return;
    }

    try {
      setIsAddingToCart(true);
      const snapshot = detailProduct ?? (await productService.detail(product.slug)).data;
      if (snapshot.productType === 'standard' && snapshot.variants.length > 0 && selectedVariantIndex === undefined) {
        toast.error('Select all required options first.');
        return;
      }

      const productId = snapshot.id || product.id;
      setIsOptionsPanelOpen(false);
      await addItem({
        productId,
        quantity: 1,
        variantIndex: snapshot.productType === 'standard' ? selectedVariantIndex : undefined,
        product: snapshot
      });
      analytics.trackAddToCart({
        product: snapshot,
        quantity: 1,
        price: displayPrice,
        origin: isFeatured ? 'featured_card' : isCompact ? 'compact_card' : 'catalog_card'
      });
      toast.success('Added to cart');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to add this product right now.'));
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleImagePreviewStart = (): void => {
    if (previewResetTimeoutRef.current !== null) {
      window.clearTimeout(previewResetTimeoutRef.current);
      previewResetTimeoutRef.current = null;
    }

    if (previewPriorityTimeoutRef.current !== null) {
      window.clearTimeout(previewPriorityTimeoutRef.current);
      previewPriorityTimeoutRef.current = null;
    }

    setIsPreviewPriorityActive(true);
    setIsImagePreviewActive(true);
  };

  const handleImagePreviewEnd = (): void => {
    setIsImagePreviewActive(false);
    setIsPreviewPriorityActive(false);
    if (previewResetTimeoutRef.current !== null) {
      window.clearTimeout(previewResetTimeoutRef.current);
    }

    previewResetTimeoutRef.current = window.setTimeout(() => {
      setActiveImageIndex(0);
      previewResetTimeoutRef.current = null;
    }, previewResetDelay);
  };

  const requestTemporaryPreviewPriority = (): void => {
    if (previewPriorityTimeoutRef.current !== null) {
      window.clearTimeout(previewPriorityTimeoutRef.current);
    }

    setIsImagePreviewActive(true);
    setIsPreviewPriorityActive(true);
    previewPriorityTimeoutRef.current = window.setTimeout(() => {
      setIsPreviewPriorityActive(false);
      previewPriorityTimeoutRef.current = null;
    }, 1600);
  };

  const warmProductDestination = useCallback((): void => {
    warmStoreRoute('product-detail');
    void queryClient.prefetchQuery({
      queryKey: productDetailQueryKey,
      queryFn: () => productService.detail(product.slug),
      staleTime: PRODUCT_DETAIL_QUERY_STALE_MS
    });
  }, [product.slug, productDetailQueryKey, queryClient]);

  const handleCardPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    warmProductDestination();

    if (event.pointerType !== 'touch' && (!isTouchPreviewMode || event.pointerType === 'mouse')) {
      return;
    }

    requestTemporaryPreviewPriority();
  };

  const handleCardTouchStart = (event: TouchEvent<HTMLDivElement>): void => {
    warmProductDestination();

    if (event.target instanceof Element && event.target.closest('button, input, select, textarea')) {
      return;
    }

    requestTemporaryPreviewPriority();
  };

  const handleCardFocus = (event: FocusEvent<HTMLDivElement>): void => {
    warmProductDestination();

    if (isTouchPreviewMode) {
      return;
    }

    if (event.currentTarget.contains(event.target as Node)) {
      onInteractionStart?.();
      handleImagePreviewStart();
    }
  };

  const handleCardBlur = (event: FocusEvent<HTMLDivElement>): void => {
    if (isTouchPreviewMode) {
      return;
    }

    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    if (isPointerInsideCardRef.current && isOptionsPanelOpen) {
      onInteractionStart?.();
      return;
    }

    setIsOptionsPanelOpen(false);
    onInteractionEnd?.();
    handleImagePreviewEnd();
  };

  const handleCardMouseEnter = (): void => {
    isPointerInsideCardRef.current = true;
    warmProductDestination();

    if (isTouchPreviewMode) {
      return;
    }

    onInteractionStart?.();
    handleImagePreviewStart();
  };

  const handleCardMouseMove = (): void => {
    if (isTouchPreviewMode) {
      return;
    }

    isPointerInsideCardRef.current = true;
  };

  const handleCardMouseLeave = (): void => {
    isPointerInsideCardRef.current = false;
    setIsOptionsPanelOpen(false);
    onInteractionEnd?.();

    if (isTouchPreviewMode) {
      return;
    }

    handleImagePreviewEnd();
  };

  const handleSelectOptionsToggle = (event: MouseEvent<HTMLButtonElement>): void => {
    stopCardNavigation(event);
    preloadProductCardOptions();
    warmProductDestination();

    if (isTouchPreviewMode) {
      if (!isOptionsPanelOpen) {
        onInteractionStart?.();
      }
      setIsOptionsPanelOpen((current) => !current);
      return;
    }

    onInteractionStart?.();
    setIsOptionsPanelOpen(true);
  };

  const handleOptionsPanelHide = (event: MouseEvent<HTMLButtonElement>): void => {
    stopCardNavigation(event);
    setIsOptionsPanelOpen(false);
  };

  const handleProductControlPointerDown = (event: PointerEvent<HTMLElement>): void => {
    event.stopPropagation();
    onInteractionStart?.();
  };

  const stopProductControlPointerPropagation = (event: PointerEvent<HTMLElement>): void => {
    event.stopPropagation();
  };

  const handleCompletedSelectionBack = (event: MouseEvent<HTMLButtonElement>): void => {
    stopCardNavigation(event);
    resetSelection();
    setIsOptionsPanelOpen(true);
  };

  const handleDefaultOptionDragStart = (event: PointerEvent<HTMLElement>): void => {
    if (!shouldEnableDefaultOptionDrag) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.stopPropagation();
    defaultOptionDragControls.start(event.nativeEvent);
  };

  const handleDefaultOptionDragEnd = (_event: globalThis.PointerEvent | globalThis.MouseEvent | globalThis.TouchEvent, info: PanInfo): void => {
    setIsDefaultOptionDragging(false);

    if (!shouldEnableDefaultOptionDrag) {
      return;
    }

    if (info.offset.y > 42 || info.velocity.y > 520) {
      setIsOptionsPanelOpen(false);
    }
  };

  const handleMobileSheetContentPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (!isTouchPreviewMode || isCondensed || !isOptionsPanelOpen || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    if (event.currentTarget.scrollTop > 2) {
      mobileSheetPullRef.current = null;
      return;
    }

    mobileSheetPullRef.current = {
      startY: event.clientY,
      lastY: event.clientY,
      startTime: Date.now(),
      isPulling: false
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleMobileSheetContentPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const pullState = mobileSheetPullRef.current;
    if (!pullState) {
      return;
    }

    const distance = event.clientY - pullState.startY;
    pullState.lastY = event.clientY;

    if (distance <= 0) {
      if (pullState.isPulling) {
        setMobileSheetPullY(0);
        setIsDefaultOptionDragging(false);
      }
      pullState.isPulling = false;
      return;
    }

    if (event.currentTarget.scrollTop > 2 && !pullState.isPulling) {
      return;
    }

    if (distance < 8 && !pullState.isPulling) {
      return;
    }

    event.stopPropagation();
    pullState.isPulling = true;
    setIsDefaultOptionDragging(true);
    setMobileSheetPullY(Math.min(132, distance * 0.62));
  };

  const finishMobileSheetContentPull = (): void => {
    const pullState = mobileSheetPullRef.current;
    if (!pullState) {
      return;
    }

    const distance = pullState.lastY - pullState.startY;
    const elapsed = Math.max(Date.now() - pullState.startTime, 1);
    const velocity = (distance / elapsed) * 1000;
    const pulledDistance = Math.min(132, Math.max(0, distance) * 0.62);

    mobileSheetPullRef.current = null;
    setIsDefaultOptionDragging(false);

    if (pullState.isPulling && (pulledDistance > 72 || velocity > 620)) {
      setIsOptionsPanelOpen(false);
      return;
    }

    setMobileSheetPullY(0);
  };

  const handleMobileSheetBackdropPointerDown = (event: PointerEvent<HTMLButtonElement>): void => {
    if (!isTouchPreviewMode || isCondensed || !isOptionsPanelOpen || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    mobileSheetPullRef.current = {
      startY: event.clientY,
      lastY: event.clientY,
      startTime: Date.now(),
      isPulling: false
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleMobileSheetBackdropPointerMove = (event: PointerEvent<HTMLButtonElement>): void => {
    const pullState = mobileSheetPullRef.current;
    if (!pullState) {
      return;
    }

    const distance = event.clientY - pullState.startY;
    pullState.lastY = event.clientY;

    if (distance <= 0) {
      setMobileSheetPullY(0);
      pullState.isPulling = false;
      return;
    }

    if (distance < 6 && !pullState.isPulling) {
      return;
    }

    event.stopPropagation();
    pullState.isPulling = true;
    setIsDefaultOptionDragging(true);
    setMobileSheetPullY(Math.min(150, distance * 0.72));
  };

  const finishMobileSheetBackdropPull = (): void => {
    const pullState = mobileSheetPullRef.current;
    if (!pullState) {
      return;
    }

    const distance = pullState.lastY - pullState.startY;
    const elapsed = Math.max(Date.now() - pullState.startTime, 1);
    const velocity = (distance / elapsed) * 1000;
    const pulledDistance = Math.min(150, Math.max(0, distance) * 0.72);

    mobileSheetPullRef.current = null;
    setIsDefaultOptionDragging(false);

    if (pullState.isPulling && (pulledDistance > 64 || velocity > 520)) {
      setIsOptionsPanelOpen(false);
      return;
    }

    setMobileSheetPullY(0);
  };

  const handleRetryOptionsLoad = (event: MouseEvent<HTMLButtonElement>): void => {
    stopCardNavigation(event);
    setDetailProduct(null);
    setHasOptionsError(false);
    setIsOptionsLoading(false);
    setIsOptionsPanelOpen(true);
  };

  const handleVariantOptionSelect = (event: MouseEvent<HTMLButtonElement>, key: VariantAttributeKey, option: string): void => {
    stopCardNavigation(event);

    if (!detailProduct || detailProduct.productType !== 'standard') {
      return;
    }

    onInteractionStart?.();

    const nextSelection: VariantSelection = {
      ...selectedOptions,
      [key]: option
    };
    const exactVariantIndex = findExactVariantIndex(detailProduct.variants, variantGroups, nextSelection);

    if (exactVariantIndex !== undefined) {
      setSelectedOptions(buildVariantSelection(detailProduct.variants[exactVariantIndex], variantGroups));
      setSelectedVariantIndex(exactVariantIndex);
      return;
    }

    if (variantGroups.every((group) => Boolean(nextSelection[group.key]))) {
      const resolvedSelection = resolveVariantSelectionChange(detailProduct.variants, variantGroups, selectedOptions, key, option);

      if (resolvedSelection) {
        setSelectedOptions(resolvedSelection.selection);
        setSelectedVariantIndex(resolvedSelection.variantIndex);
        return;
      }
    }

    setSelectedOptions(nextSelection);
    setSelectedVariantIndex(undefined);
  };

  const handleVariantCardSelect = (event: MouseEvent<HTMLButtonElement>, nextVariantIndex: number): void => {
    stopCardNavigation(event);

    if (!detailProduct || detailProduct.productType !== 'standard') {
      return;
    }

    onInteractionStart?.();

    const nextVariant = detailProduct.variants[nextVariantIndex];
    if (!nextVariant) {
      return;
    }

    setSelectedOptions(buildVariantSelection(nextVariant, variantGroups));
    setSelectedVariantIndex(nextVariantIndex);
  };

  const renderPrimaryActionButton = (): JSX.Element => (
    <motion.div
      className={cn('relative min-w-0', isCondensed ? 'flex-1' : 'flex-[1.6_1_0]')}
      whileTap={!reduceMotion && stockCount > 0 ? { scale: 0.985 } : undefined}
    >
      <Button
        size={actionSize}
        className={primaryActionButtonClassName}
        onClick={handleAddToCart}
        isLoading={isAddingToCart}
        loadingLabel="Adding..."
        disabled={stockCount <= 0}
      >
        <span className="relative inline-flex min-w-0 items-center justify-center gap-2 truncate text-center">
          {primaryActionLabel}
        </span>
      </Button>
    </motion.div>
  );

  const renderCompletedActionRow = (): JSX.Element => (
    <motion.div
      layout={shouldMeasureLayout}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={sceneTransition}
      className={actionRowClassName}
      onClick={(event) => {
        stopCardNavigation(event);
      }}
    >
      {renderPrimaryActionButton()}
      {onWishlistToggle ? (
        <Button
          variant={isWishlisted ? 'primary' : 'secondary'}
          size={actionSize}
          disabled={isWishlistPending}
          className={isWishlisted ? activeUtilityButtonClass : iconButtonClass}
          onClick={(event) => {
            stopCardNavigation(event);
            void onWishlistToggle(detailProduct ?? product);
          }}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
        >
          <Heart className={`h-3.5 w-3.5 min-[480px]:h-4 min-[480px]:w-4 sm:h-[18px] sm:w-[18px] ${isWishlisted ? 'fill-current' : ''}`} />
        </Button>
      ) : null}
      <Button
        variant={isCompared ? 'primary' : 'secondary'}
        size={actionSize}
        className={isCompared ? activeUtilityButtonClass : iconButtonClass}
        onClick={(event) => {
          stopCardNavigation(event);
          toggleCompare(product.id);
        }}
        aria-label={`Toggle compare for ${product.name}`}
      >
        <Scale className="h-3.5 w-3.5 min-[480px]:h-4 min-[480px]:w-4 sm:h-[18px] sm:w-[18px]" />
      </Button>
    </motion.div>
  );


  const renderAvailabilityBadge = (placement: 'media' | 'inline'): JSX.Element => (
    <Badge
      className={cn(
        'shrink-0',
        cardMicroMotionClassName,
        placement === 'media' && isCardPopActive ? 'scale-[1.045]' : 'scale-100',
        placement === 'media'
          ? 'flex h-[1.4rem] items-center px-2 py-0 text-[7.5px] font-semibold leading-none tracking-[0.01em] shadow-[0_10px_24px_rgba(16,185,129,0.16)] min-[390px]:h-[1.45rem] min-[390px]:px-2.5 min-[390px]:text-[8px] min-[480px]:h-[1.55rem] min-[480px]:px-3 min-[480px]:text-[8.75px] sm:h-auto sm:px-4 sm:py-1.5 sm:text-[12px]'
          : !isCondensed &&
              (shouldUseTouchCardSummaryLayout
                ? 'px-3 py-1.5 text-[12px] font-semibold tracking-[0.01em] min-[390px]:px-4 min-[390px]:py-2 min-[390px]:text-[14px] min-[480px]:px-5 min-[480px]:text-[15px] sm:px-4 sm:py-1.5 sm:text-[12px]'
                : 'px-2 py-1 text-[9px] font-semibold tracking-[0.01em] min-[390px]:px-2.5 min-[390px]:py-1 min-[390px]:text-[9.5px] min-[480px]:px-3.5 min-[480px]:py-1 min-[480px]:text-[11px] sm:px-4 sm:py-1.5 sm:text-[12px]'),
        stockCount > 0 ? 'bg-emerald-100 text-emerald-400' : 'bg-rose-100 text-rose-400'
      )}
      variant={stockCount > 0 ? 'success' : 'danger'}
    >
      {stockCount > 0 ? 'In Stock' : 'Out of Stock'}
    </Badge>
  );

  const renderStatusBadges = (compact = false, trailing?: JSX.Element | null, showAvailability = true): JSX.Element | null => {
    const hasInlineBadges =
      showAvailability || product.condition === 'used' || Boolean(product.isFlashDeal) || product.discountPercentage > 0 || Boolean(trailing);

    if (!hasInlineBadges) {
      return null;
    }

    const merchandiseBadgeClass =
      'whitespace-nowrap border border-amber-400/35 bg-amber-100 px-1.5 py-0.5 text-[7px] leading-none text-amber-700 min-[390px]:px-2 min-[390px]:text-[8.25px] min-[480px]:px-2.5 min-[480px]:py-0.5 min-[480px]:text-[9px] sm:px-2.5 sm:py-1 sm:text-[11px]';

    return (
      <motion.div
        variants={foregroundItemVariants}
        className={cn(
          'flex items-center justify-between gap-1.5 min-[480px]:gap-2.5',
          cardMicroMotionClassName,
          isCardPopActive ? 'translate-y-0 scale-[1.01] will-change-transform' : 'translate-y-0 scale-100',
          !compact &&
            (shouldUseTouchCardSummaryLayout
              ? 'min-h-[1.1rem] min-[390px]:min-h-[1.22rem] min-[480px]:min-h-[1.5rem] sm:min-h-[2.05rem]'
              : 'min-h-[1.25rem] min-[390px]:min-h-[1.35rem] min-[480px]:min-h-[1.5rem] sm:min-h-[2.05rem]')
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1 min-[480px]:gap-1.5 sm:gap-2">
          {showAvailability ? renderAvailabilityBadge('inline') : null}
          {product.condition === 'used' ? (
            <Badge variant="warning" className={merchandiseBadgeClass}>
              Used Item
            </Badge>
          ) : null}
          {product.isFlashDeal ? (
            <Badge variant="warning" className={merchandiseBadgeClass}>
              Flash Deal
            </Badge>
          ) : null}
          {product.discountPercentage > 0 ? (
            <Badge className="whitespace-nowrap bg-transparent px-1 py-0.5 text-[7px] font-semibold leading-none text-slate-700 min-[390px]:px-1.5 min-[390px]:text-[8.25px] min-[480px]:px-2 min-[480px]:py-0.5 min-[480px]:text-[9px] sm:px-2 sm:py-1 sm:text-[11px]">
              {product.discountPercentage}% OFF
            </Badge>
          ) : null}
        </div>
        {trailing}
      </motion.div>
    );
  };

  const renderOptionsFallback = (): JSX.Element => (
    <div className="grid gap-2" aria-label="Loading product options">
      {Array.from({ length: 3 }, (_, index) => (
        <span key={index} className="h-9 rounded-xl bg-white/10" />
      ))}
    </div>
  );

  const renderOptionsPanelContent = (): JSX.Element => (
    <Suspense fallback={renderOptionsFallback()}>
      <ProductCardDefaultOptions
        detailProduct={detailProduct}
        variantGroups={variantGroups}
        selectedOptions={selectedOptions}
        selectedVariantIndex={selectedVariantIndex}
        isOptionsLoading={isOptionsLoading}
        hasOptionsError={hasOptionsError}
        isCompact={isCompact}
        onRetryLoad={handleRetryOptionsLoad}
        onVariantCardSelect={handleVariantCardSelect}
        onVariantOptionSelect={handleVariantOptionSelect}
      />
    </Suspense>
  );

  const renderImmersiveOptionPanelContent = (): JSX.Element => (
    <Suspense fallback={renderOptionsFallback()}>
      <ProductCardImmersiveOptions
        detailProduct={detailProduct}
        variantGroups={variantGroups}
        selectedOptions={selectedOptions}
        selectedVariantIndex={selectedVariantIndex}
        isOptionsLoading={isOptionsLoading}
        hasOptionsError={hasOptionsError}
        tone={isTouchPreviewMode ? 'light' : 'dark'}
        onRetryLoad={handleRetryOptionsLoad}
        onVariantCardSelect={handleVariantCardSelect}
        onVariantOptionSelect={handleVariantOptionSelect}
      />
    </Suspense>
  );
  const renderImmersiveOptionActions = (): JSX.Element => (
    <motion.div
      layout={shouldMeasureLayout ? 'position' : false}
      variants={immersiveActionTrayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="pointer-events-auto relative mt-auto shrink-0 overflow-hidden border-t border-white/10 bg-[#0b1220] px-2.5 pb-1.5 pt-1.5 shadow-[0_-8px_18px_rgba(2,6,23,0.2)] sm:px-3 sm:pb-2 sm:pt-2"
      onClick={(event) => {
        stopCardNavigation(event);
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/18" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]"
        initial={reduceMotion ? false : { x: '-58%', opacity: 0 }}
        animate={reduceMotion ? undefined : { x: ['-58%', '58%', '-58%'], opacity: [0, 0.65, 0] }}
        transition={reduceMotion ? undefined : { duration: 2.8, ease: cinematicEase, repeat: Infinity, repeatDelay: 0.9 }}
      />
      <div className={cn(actionRowClassName, 'relative')}>
        <motion.div className="min-w-0 flex-[1.3]" variants={immersiveActionItemVariants} whileTap={immersiveActionTap}>
          <Button
            size="sm"
            className={cn(
              primaryActionButtonClassName,
              'border-[#e3b812] bg-[#ddba19] shadow-[0_6px_14px_rgba(38,31,12,0.18)] hover:bg-[#e5c528] hover:shadow-[0_10px_18px_rgba(38,31,12,0.22)]'
            )}
            onClick={handleAddToCart}
            isLoading={isAddingToCart}
            loadingLabel="Adding..."
            disabled={stockCount <= 0}
          >
            <span className="min-w-0 truncate text-center">{primaryActionLabel}</span>
          </Button>
        </motion.div>
        {onWishlistToggle ? (
          <motion.div className="shrink-0" variants={immersiveActionItemVariants} whileTap={immersiveActionTap}>
            <Button
              variant="secondary"
              size="sm"
              className={isWishlisted ? immersiveActiveUtilityButtonClass : immersiveUtilityButtonClass}
              onClick={(event) => {
                stopCardNavigation(event);
                void onWishlistToggle(detailProduct ?? product);
              }}
              disabled={isWishlistPending}
              aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              aria-pressed={isWishlisted}
            >
              <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </Button>
          </motion.div>
        ) : null}
        <motion.div className="shrink-0" variants={immersiveActionItemVariants} whileTap={immersiveActionTap}>
          <Button
            variant="secondary"
            size="sm"
            className={isCompared ? immersiveActiveUtilityButtonClass : immersiveUtilityButtonClass}
            onClick={(event) => {
              stopCardNavigation(event);
              toggleCompare(product.id);
            }}
            aria-label={`Toggle compare for ${product.name}`}
          >
            <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  const renderDefaultOptionScene = (presentation: 'card' | 'mobile-sheet' = 'card'): JSX.Element => {
    const isMobileSheet = presentation === 'mobile-sheet';
    const shouldUseFastMobileSheetMotion = isMobileSheet && fastMotion && !systemReduceMotion;
    const mobileSheetTransition = systemReduceMotion
      ? { duration: 0 }
      : shouldUseFastMobileSheetMotion
        ? {
            duration: 0.22,
            ease: [0.16, 1, 0.3, 1] as const
          }
      : {
          duration: 0.58,
          ease: [0.16, 1, 0.3, 1] as const
        };
    const mobileSheetExitTransition = systemReduceMotion
      ? { duration: 0 }
      : shouldUseFastMobileSheetMotion
        ? {
            duration: 0.16,
            ease: [0.32, 0, 0.67, 0] as const
          }
      : {
          duration: 0.38,
          ease: [0.32, 0, 0.67, 0] as const
        };
    const mobileSheetContentTransition = systemReduceMotion
      ? { duration: 0 }
      : shouldUseFastMobileSheetMotion
        ? { duration: 0.12, ease: cinematicEase }
        : { duration: 0.24, ease: cinematicEase };

    return (
      <motion.div
        key="product-card-default-option-scene"
        data-testid="product-card-option-scene"
        initial={
          systemReduceMotion
            ? false
            : isMobileSheet
              ? { opacity: 0, y: shouldUseFastMobileSheetMotion ? 56 : 150 }
              : reduceMotion
                ? false
                : { opacity: 0.98, y: -10, scaleY: 0.12 }
        }
        animate={isMobileSheet ? { opacity: 1, y: mobileSheetPullY } : { opacity: 1, y: 0, scaleY: 1 }}
        exit={
          systemReduceMotion
            ? undefined
            : isMobileSheet
              ? { opacity: 0, y: shouldUseFastMobileSheetMotion ? 64 : 150, transition: mobileSheetExitTransition }
              : reduceMotion
                ? undefined
                : { opacity: 0, y: -8, scaleY: 0.12 }
        }
        transition={isMobileSheet ? (isDefaultOptionDragging && mobileSheetPullY > 0 ? { duration: 0 } : mobileSheetTransition) : defaultOptionSceneTransition}
        drag={isMobileSheet || shouldEnableDefaultOptionDrag ? 'y' : false}
        dragControls={defaultOptionDragControls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={{ top: 0, bottom: isMobileSheet ? 120 : shouldEnableDefaultOptionDrag ? 92 : 0 }}
        dragElastic={isMobileSheet ? 0.045 : 0.08}
        dragTransition={{ bounceStiffness: 170, bounceDamping: 30, power: 0.06, timeConstant: 180 }}
        dragDirectionLock
        onDragStart={() => {
          setIsDefaultOptionDragging(true);
        }}
        onDragEnd={(event, info) => {
          if (isMobileSheet) {
            setIsDefaultOptionDragging(false);
            if (info.offset.y > 76 || info.velocity.y > 720) {
              setIsOptionsPanelOpen(false);
            }
            return;
          }

          handleDefaultOptionDragEnd(event, info);
	        }}
	        className={cn(
	          'product-card-dark-surface product-card-option-scene [--product-card-select-bar-height:1.9rem] pointer-events-none flex min-h-0 flex-col overflow-hidden text-white min-[390px]:[--product-card-select-bar-height:2rem] min-[480px]:[--product-card-select-bar-height:2.15rem] [backface-visibility:hidden] sm:[--product-card-select-bar-height:2.25rem]',
	          isMobileSheet
	            ? 'fixed inset-x-3 bottom-[calc(3.65rem+env(safe-area-inset-bottom))] z-[82] h-[min(68dvh,31rem)] max-h-[min(68dvh,31rem)] rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,#eef7f6_0%,#edf6f5_52%,#f7fbfa_100%)] text-slate-800 shadow-[0_24px_70px_rgba(0,0,0,0.38)] will-change-transform'
	            : 'absolute inset-0 z-[5] origin-top rounded-none bg-[linear-gradient(180deg,#111827_0%,#0f172a_42%,#0b1120_100%)] shadow-[0_-24px_52px_rgba(2,6,23,0.3)] will-change-transform'
	        )}
	        style={{ transformOrigin: isMobileSheet ? 'bottom center' : 'top center' }}
	      >
	        <div
	          className={cn('pointer-events-auto flex min-h-0 flex-col', isMobileSheet ? 'h-full max-h-[min(68dvh,31rem)]' : 'h-full flex-1')}
	          onClick={(event) => {
	            stopCardNavigation(event);
	          }}
        >
        <motion.div
          className={cn(
            'product-card-option-header relative z-[2] flex shrink-0 flex-col overflow-hidden border-b border-white/10 shadow-[0_16px_30px_rgba(15,23,42,0.16)]',
            isMobileSheet ? 'rounded-t-[28px] border-slate-200/80 bg-[linear-gradient(180deg,#f7fbfa_0%,#e8f3f2_100%)] text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.1)]' : 'bg-[#111827]/95'
          )}
          initial={reduceMotion || isMobileSheet ? false : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion || isMobileSheet ? undefined : { opacity: 1, y: 0 }}
          transition={isMobileSheet ? mobileSheetContentTransition : defaultOptionContentTransition}
        >
          <div
            className={cn(
              defaultOptionOpenBarClassName,
              defaultSelectOptionBarSizingClassName,
              defaultSelectOptionBarRadiusClassName,
              defaultSelectOptionBarSurfaceClassName,
              'w-full border-x-0 border-t-0',
              shouldEnableDefaultOptionDrag && !isMobileSheet && 'touch-none cursor-grab select-none active:cursor-grabbing',
              isMobileSheet && '!h-10 !min-h-10 touch-none cursor-grab select-none rounded-t-[28px] border-x-0 border-t-0 bg-[linear-gradient(180deg,#f8fbfb_0%,#edf7f6_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] active:cursor-grabbing'
            )}
            onPointerDown={handleDefaultOptionDragStart}
          >
	            {isMobileSheet ? (
	              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-2 z-[1] mx-auto h-1 w-12 rounded-full bg-slate-300/70" />
	            ) : null}
	            {renderSelectOptionBarContent()}
	          </div>
	          <div
	            className={cn(
	              defaultOptionStatusRowClassName,
	              isMobileSheet && 'border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#eef7f6_100%)] text-slate-700',
	              shouldShowCompletedActions && 'relative overflow-hidden'
	            )}
	          >
            {shouldShowCompletedActions ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.46),transparent)]"
              />
            ) : null}
            {shouldShowCompletedActions ? (
              <div className="relative grid w-full grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 min-[480px]:grid-cols-[2rem_minmax(0,1fr)] min-[480px]:gap-2.5">
                <button
                  type="button"
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full shadow-[0_5px_12px_rgba(18,17,16,0.16)] transition-[background-color,color,box-shadow,border-color] duration-200 min-[480px]:h-8 min-[480px]:w-8',
                    isMobileSheet
                      ? 'border border-slate-200/85 bg-white/88 text-slate-700 hover:border-slate-300 hover:bg-white'
                      : 'border border-white/24 bg-[#111827]/78 text-white hover:border-white/45 hover:bg-[#172033]'
                  )}
                  aria-label="Back to option selection"
                  onClick={handleCompletedSelectionBack}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0 text-left">
                  <p className={cn('max-w-full truncate text-[12.5px] font-semibold leading-4 drop-shadow-[0_1px_1px_rgba(15,23,42,0.08)] min-[480px]:text-[13.5px] sm:text-sm', isMobileSheet ? 'text-slate-800' : 'text-white')}>
                    {immersiveOptionStatus}
                  </p>
                  <div
                    className="mt-1 flex max-w-full items-baseline gap-1.5 whitespace-nowrap"
                    aria-label={`Selected price ${formatCurrency(displayPrice)}`}
                  >
                    <span className="font-mono text-[11.5px] font-semibold leading-none tracking-normal text-[#d8a918] min-[480px]:text-[12.5px] sm:text-[13px]">
                      {formatCurrency(displayPrice)}
                    </span>
                    {product.comparePrice ? (
                      <span className={cn('max-w-[5.5rem] overflow-hidden text-ellipsis font-mono text-[8.5px] leading-none line-through min-[480px]:max-w-[6.75rem] min-[480px]:text-[9.5px] sm:max-w-[7.25rem] sm:text-[10px]', isMobileSheet ? 'text-slate-500/70' : 'text-white/48')}>
                        {formatCurrency(product.comparePrice)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <p className={cn(defaultOptionStatusLabelClassName, 'px-0', isMobileSheet && 'text-slate-700')}>{immersiveOptionStatus}</p>
            )}
          </div>
        </motion.div>

	        <motion.div
	          className="relative min-h-0 flex-1 overflow-hidden"
	          variants={isMobileSheet ? undefined : defaultOptionRevealVariants}
          initial={isMobileSheet ? false : 'hidden'}
          animate={isMobileSheet ? undefined : 'visible'}
          exit={isMobileSheet ? undefined : 'exit'}
          transition={isMobileSheet ? mobileSheetContentTransition : defaultOptionContentTransition}
          style={{ transformOrigin: 'top center' }}
        >
	          <div
	            ref={defaultOptionsScrollRef}
	            className={cn(
	              'h-full overflow-y-auto overscroll-contain scroll-smooth px-3 pt-1.5 min-[480px]:px-3.5 min-[480px]:pt-2 sm:px-4 sm:pt-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [scroll-padding-block:1rem] [&::-webkit-scrollbar]:hidden',
	              isMobileSheet && 'h-full max-h-none touch-pan-y px-4 pt-3 min-[480px]:px-5 min-[480px]:pt-4',
	              shouldShowCompletedActions ? 'pb-2 min-[480px]:pb-2.5 sm:pb-3' : 'pb-3 min-[480px]:pb-3.5 sm:pb-4'
	            )}
            onPointerDown={isMobileSheet ? handleMobileSheetContentPointerDown : undefined}
            onPointerMove={isMobileSheet ? handleMobileSheetContentPointerMove : undefined}
            onPointerUp={isMobileSheet ? finishMobileSheetContentPull : undefined}
            onPointerCancel={isMobileSheet ? finishMobileSheetContentPull : undefined}
          >
            {renderImmersiveOptionPanelContent()}
          </div>
          {!shouldShowCompletedActions ? (
            <>
              <div className={cn('product-card-option-fade-top pointer-events-none absolute inset-x-0 top-0', isMobileSheet ? 'h-7 bg-[linear-gradient(180deg,rgba(238,247,246,0.96),rgba(238,247,246,0))]' : 'h-3 bg-[linear-gradient(180deg,rgba(17,24,39,0.82),rgba(17,24,39,0))]')} />
              <div className={cn('product-card-option-fade-bottom pointer-events-none absolute inset-x-0 bottom-0', isMobileSheet ? 'h-12 bg-[linear-gradient(180deg,rgba(247,251,250,0),rgba(247,251,250,0.96))]' : 'h-4 bg-[linear-gradient(180deg,rgba(11,17,32,0),rgba(11,17,32,0.74))]')} />
            </>
          ) : null}
        </motion.div>

	        {shouldShowCompletedActions ? renderImmersiveOptionActions() : null}
      </div>
    </motion.div>
    );
  };

  const renderMobileDefaultOptionPortal = (): JSX.Element | null => {
    if (!isTouchPreviewMode || isCondensed || !isOptionsPanelOpen || typeof document === 'undefined') {
      return null;
    }

    return createPortal(
      <div
        className={cn('fixed inset-0 z-[80] lg:hidden', isOptionsPanelOpen ? 'pointer-events-auto' : 'pointer-events-none')}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {isOptionsPanelOpen ? (
          <button
            type="button"
            className="absolute inset-0 touch-none bg-[radial-gradient(circle_at_50%_84%,rgba(216,169,24,0.12),transparent_32%),rgba(2,6,23,0.58)] backdrop-blur-[1px]"
            aria-label="Close product options"
            onClick={(event) => {
              event.stopPropagation();
              setIsOptionsPanelOpen(false);
            }}
            onPointerDown={handleMobileSheetBackdropPointerDown}
            onPointerMove={handleMobileSheetBackdropPointerMove}
            onPointerUp={finishMobileSheetBackdropPull}
            onPointerCancel={finishMobileSheetBackdropPull}
          />
        ) : null}
        <AnimatePresence>{isOptionsPanelOpen ? renderDefaultOptionScene('mobile-sheet') : null}</AnimatePresence>
      </div>,
      document.body
    );
  };

  const renderDefaultOptionsDockSpacer = (): JSX.Element => (
    <div aria-hidden="true" className="pointer-events-none relative z-[3] shrink-0 overflow-visible">
      <div className={cn(defaultSelectOptionBarFrameClassName, defaultSelectOptionBarSizingClassName, defaultSelectOptionBarRadiusClassName, 'flex opacity-0')} />
    </div>
  );

  const renderOptionsDock = (): JSX.Element | null => {
    const shouldUseFloatingCompactPanel = isCompact;
    const compactPanelOffsetClass = shouldShowCompletedActions ? 'bottom-[3.35rem] sm:bottom-[3.75rem]' : 'bottom-0';

    if (!shouldRenderOptionsDock) {
      if (shouldReserveOptionsDockSpace) {
        return renderDefaultOptionsDockSpacer();
      }

      return null;
    }

    if (!isCondensed && isOptionsPanelOpen) {
      return null;
    }

    return (
      <AnimatePresence initial={false}>
        <motion.div
          key="product-card-options-dock"
          layout={!isCompact && shouldMeasureLayout}
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 22 }}
          transition={sceneTransition}
          className={cn(
            'pointer-events-auto z-[3]',
            isCompact && isOptionsPanelOpen
              ? 'absolute inset-0 flex flex-col justify-end overflow-hidden'
              : cn(
                  'relative shrink-0',
                  isCompact
                    ? 'mt-auto min-h-[4.5rem] overflow-visible pt-0 sm:min-h-[4.75rem]'
                    : isCondensed
                      ? 'mt-auto overflow-hidden pt-4'
                      : '-mt-3 overflow-visible min-[390px]:-mt-3.5 min-[480px]:-mt-4 sm:-mt-4'
                )
          )}
          onPointerDown={handleProductControlPointerDown}
          onPointerUp={stopProductControlPointerPropagation}
          onPointerCancel={stopProductControlPointerPropagation}
        >
          <AnimatePresence initial={false}>
            {isOptionsPanelOpen ? (
              <motion.div
                key="product-card-options-panel"
                initial={
                  reduceMotion
                    ? false
                    : shouldUseFloatingCompactPanel
                      ? { opacity: 0, y: 34, scale: 0.97 }
                      : { opacity: 0, height: 0, y: 48, scaleY: 0.92, marginBottom: 0 }
                }
                animate={
                  shouldUseFloatingCompactPanel
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 1, height: 'auto', y: 0, scaleY: 1, marginBottom: shouldShowCompletedActions ? 12 : 0 }
                }
                exit={
                  reduceMotion
                    ? undefined
                    : shouldUseFloatingCompactPanel
                      ? { opacity: 0, y: 26, scale: 0.98 }
                      : { opacity: 0, height: 0, y: 34, scaleY: 0.94, marginBottom: 0 }
                }
                transition={optionsDrawerTransition}
                className={cn(
                  'z-[2] overflow-hidden',
                  shouldUseFloatingCompactPanel ? `absolute inset-x-0 ${compactPanelOffsetClass}` : 'relative'
                )}
                style={{ transformOrigin: 'bottom center' }}
                onClick={(event) => {
                  stopCardNavigation(event);
                }}
              >
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 38, scale: 0.975 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: 28, scale: 0.98 }}
                  transition={optionsDrawerContentTransition}
                  className={cn(
                    'relative overflow-hidden border border-slate-900/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] text-white shadow-[0_28px_48px_rgba(2,6,23,0.34)] sm:shadow-[0_36px_62px_rgba(2,6,23,0.42)]',
                    shouldUseFloatingCompactPanel ? 'flex h-[12rem] flex-col rounded-[20px] sm:h-[12.5rem] sm:rounded-[22px]' : 'rounded-[22px] sm:rounded-[26px]'
                  )}
                >
                  <div className="pointer-events-none absolute inset-x-5 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),rgba(250,204,21,0)_68%)] opacity-80" />
                  <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                    <span className="h-1 w-16 rounded-full bg-white/12" />
                  </div>
                  <div className={cn('shrink-0 border-b border-white/10', shouldUseFloatingCompactPanel ? 'px-3 py-2.5 sm:px-3.5 sm:py-3' : 'px-3.5 py-3.5 sm:px-4 sm:py-4')}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={cn('font-medium uppercase text-slate-400', shouldUseFloatingCompactPanel ? 'text-[9px] tracking-[0.22em]' : 'text-[10px] tracking-[0.24em]')}>
                          Select Options
                        </p>
                        <p className={cn('font-semibold text-white', shouldUseFloatingCompactPanel ? 'mt-0.5 line-clamp-1 text-xs' : 'mt-1 text-sm')}>{selectionPrompt}</p>
                      </div>
                      <button
                        type="button"
                        className={cn(
                          'rounded-full border border-white/10 font-medium uppercase tracking-[0.18em] text-slate-300 transition-colors hover:border-white/20 hover:text-white',
                          shouldUseFloatingCompactPanel ? 'px-2.5 py-1 text-[9px]' : 'px-3 py-1 text-[10px]'
                        )}
                        onClick={handleOptionsPanelHide}
                      >
                        Hide
                      </button>
                    </div>
                    <div className={cn('flex flex-wrap items-center gap-2 text-slate-400', shouldUseFloatingCompactPanel ? 'mt-2 text-[10.5px]' : 'mt-3 text-xs')}>
                      <span>Price {formatCurrency(displayPrice)}</span>
                      <span>•</span>
                      <span>{getStockLabel(stockCount)}</span>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'overflow-y-auto overscroll-contain scroll-smooth [scroll-padding-block:1rem]',
                      shouldUseFloatingCompactPanel ? 'min-h-0 flex-1 px-3 py-3 sm:px-3.5 sm:py-3.5' : 'max-h-[14.5rem] px-3.5 py-4 sm:max-h-[17.5rem] sm:px-4 sm:py-5'
                    )}
                  >
                    {renderOptionsPanelContent()}
                    {detailProduct && !isSelectionComplete ? (
                      <p className={cn('text-slate-400', shouldUseFloatingCompactPanel ? 'mt-2 text-[10.5px] leading-4' : 'mt-4 text-xs leading-5')}>
                        Complete the full option set to unlock the bottom action buttons.
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {shouldShowCompletedActions ? (
            renderCompletedActionRow()
          ) : isOptionsPanelOpen ? null : (
            <motion.button
              layout={!isCompact && shouldMeasureLayout}
              type="button"
              className={cn(
                'relative z-[1] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isCondensed
                  ? 'flex w-full items-center justify-between gap-3 rounded-[20px] border border-slate-900/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] px-3.5 py-3 text-left text-white shadow-[0_22px_38px_rgba(2,6,23,0.3)] sm:rounded-[24px] sm:px-4 sm:py-3.5 sm:shadow-[0_28px_48px_rgba(2,6,23,0.34)]'
                  : cn(
                      defaultSelectOptionBarFrameClassName,
                      defaultSelectOptionBarSizingClassName,
                      defaultSelectOptionBarRadiusClassName,
                      defaultSelectOptionBarSurfaceClassName,
                      defaultSelectOptionBarInteractiveClassName,
                      'flex items-center justify-center border-x-0 px-3.5 text-center text-white hover:translate-y-0 min-[480px]:px-5 sm:px-6'
                    )
              )}
              onPointerDown={handleProductControlPointerDown}
              onPointerUp={stopProductControlPointerPropagation}
              onPointerCancel={stopProductControlPointerPropagation}
              onMouseEnter={preloadProductCardOptions}
              onFocus={preloadProductCardOptions}
              onTouchStart={preloadProductCardOptions}
              onClick={handleSelectOptionsToggle}
              aria-label="Select options"
            >
              {isCondensed ? (
                <>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold text-white">Select Options</span>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{optionTriggerStatus}</span>
                  </span>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-amber-200">
                    {isTouchPreviewMode ? (isOptionsPanelOpen ? 'Hide' : 'Tap') : 'Click'}
                  </span>
                </>
              ) : (
                renderSelectOptionBarContent()
              )}
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderCompactVariantPreview = (): JSX.Element | null => {
    if (isOptionsLoading && !detailProduct) {
      return (
        <div className="mt-5 flex items-center gap-3">
          <span className="h-9 w-9 rounded-full bg-slate-100" />
          <span className="h-9 w-9 rounded-full bg-slate-100" />
          <span className="h-9 w-9 rounded-full bg-slate-100" />
        </div>
      );
    }

    if (!detailProduct || detailProduct.productType !== 'standard' || !detailProduct.variants.length || !variantGroups.length) {
      return null;
    }

    const colorGroup = variantGroups.find((group) => group.presentation === 'swatch');
    if (!colorGroup) {
      return null;
    }

    return (
      <div className="mt-5 flex flex-wrap items-center gap-3.5">
        {colorGroup.options.slice(0, 5).map((option) => {
          const swatchColor = getVariantOptionColor(detailProduct.variants, option);
          const isSelected = selectedOptions[colorGroup.key] === option;

          return (
            <button
              key={`compact-preview-${colorGroup.key}-${option}`}
              type="button"
              className={cn(
                'h-9 w-9 rounded-full border transition-colors duration-200 ease-out',
                isSelected ? 'border-[#d8a918]' : 'border-slate-200'
              )}
              style={{ backgroundColor: swatchColor ?? '#94a3b8' }}
              aria-label={`Select ${colorGroup.label} ${option}`}
              aria-pressed={isSelected}
              onClick={(event) => {
                handleVariantOptionSelect(event, colorGroup.key, option);
              }}
            >
              <span className="sr-only">{option}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderCompactListOptionStage = (): JSX.Element => (
    <div className="relative h-full min-h-0 overflow-hidden">
      <motion.div
        initial={false}
        animate={{ opacity: isOptionsPanelOpen ? 0 : 1, y: isOptionsPanelOpen && !reduceMotion ? -6 : 0 }}
        transition={optionsDrawerContentTransition}
        className="flex h-full flex-col justify-start px-5 pb-16 pt-11 sm:px-6 sm:pt-12"
      >
        {renderPriceBlock(true)}
        {renderCompactVariantPreview()}
      </motion.div>

      <AnimatePresence initial={false}>
        {isOptionsPanelOpen ? (
          <motion.div
            key="compact-list-options-panel"
            initial={reduceMotion ? false : { x: 42, opacity: 0, borderTopLeftRadius: 26, borderBottomLeftRadius: 26 }}
            animate={{ x: 0, opacity: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
            exit={reduceMotion ? undefined : { x: 42, opacity: 0, borderTopLeftRadius: 26, borderBottomLeftRadius: 26 }}
            transition={optionsDrawerTransition}
            className="product-card-dark-surface absolute inset-0 z-[4] flex min-h-0 flex-col overflow-hidden rounded-r-[22px] border-l border-white/10 bg-[linear-gradient(180deg,#0c1324_0%,#091120_100%)] text-white shadow-[0_26px_52px_rgba(8,13,28,0.28)] sm:rounded-r-[28px]"
            onClick={(event) => {
              stopCardNavigation(event);
            }}
          >
            <div className="shrink-0 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.02em] text-white">Select Options</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">{optionTriggerStatus}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/12 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/68 transition-colors hover:border-white/24 hover:text-white"
                  onClick={handleOptionsPanelHide}
                >
                  Hide
                </button>
              </div>
            </div>

            <div
              ref={compactOptionsScrollRef}
              className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-5 pt-1 sm:px-6 [scroll-padding-block:1rem]', shouldShowCompletedActions ? 'pb-2 sm:pb-3' : 'pb-8 sm:pb-10')}
            >
              {renderOptionsPanelContent()}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] h-7 bg-[linear-gradient(180deg,rgba(12,19,36,0.95),rgba(12,19,36,0))]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(180deg,rgba(12,19,36,0),rgba(12,19,36,0.92))]" />

            <AnimatePresence initial={false}>
              {shouldShowCompletedActions ? (
                <motion.div
                  key="compact-list-actions"
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: 14 }}
                  transition={optionsDrawerContentTransition}
                  className="shrink-0 border-t border-white/10 bg-[linear-gradient(180deg,rgba(12,19,36,0.1),rgba(12,19,36,0.86))] px-5 py-4 backdrop-blur sm:px-6"
                >
                  {renderCompletedActionRow()}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!isOptionsPanelOpen ? (
        <button
          type="button"
          className="product-card-dark-surface absolute bottom-0 right-0 z-[3] rounded-tl-[18px] bg-[#111827] px-5 py-3 text-left text-white shadow-[0_16px_34px_rgba(2,6,23,0.28)] transition-[background-color,box-shadow,transform] duration-300 ease-out hover:bg-[#172033] sm:rounded-tl-[22px] sm:px-6"
          onPointerDown={handleProductControlPointerDown}
          onPointerUp={stopProductControlPointerPropagation}
          onPointerCancel={stopProductControlPointerPropagation}
          onClick={handleSelectOptionsToggle}
          aria-label="Select options"
        >
          <span className="block text-[11px] font-semibold leading-4 tracking-[0.01em]">Select Options</span>
          <span className="block text-[9px] font-medium uppercase tracking-[0.28em] text-white/64">{optionTriggerStatus}</span>
        </button>
      ) : null}
    </div>
  );

  const renderPriceBlock = (showStockMessage: boolean): JSX.Element => (
    <motion.div
      layout={shouldMeasureLayout}
      transition={sceneTransition}
      variants={foregroundItemVariants}
      className={cn(
        cardMicroMotionClassName,
        isCardPopActive ? '-translate-y-px scale-[1.018] will-change-transform' : 'translate-y-0 scale-100'
      )}
    >
      <div
          className={cn(
            isCondensed
              ? 'flex flex-nowrap items-baseline gap-1.5 whitespace-nowrap min-[480px]:gap-2'
            : shouldUseTouchCardSummaryLayout
              ? 'flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 min-[390px]:gap-x-3 min-[480px]:gap-x-4 sm:gap-x-2.5'
              : 'flex min-w-0 flex-nowrap items-baseline gap-x-1 overflow-hidden whitespace-nowrap min-[390px]:gap-x-1.5 min-[480px]:gap-x-2 sm:gap-x-2.5'
          )}
        >
        <span
          className={cn(
            'min-w-0 shrink font-mono font-semibold leading-none tracking-[-0.035em]',
            isCondensed
              ? 'text-[0.92rem] text-gold min-[480px]:text-[1rem] sm:text-[1.28rem]'
              : shouldUseTouchCardSummaryLayout
                ? 'text-[1.62rem] text-[#d5b041] min-[390px]:text-[2rem] min-[480px]:text-[2.25rem] sm:text-[1.42rem]'
                : 'text-[0.76rem] text-[#d5b041] min-[390px]:text-[0.92rem] min-[480px]:text-[1rem] sm:text-[1.42rem]'
          )}
        >
          {formatCurrency(displayPrice)}
        </span>
        {product.comparePrice ? (
          <span
            className={cn(
              'inline-block overflow-hidden text-ellipsis whitespace-nowrap font-normal leading-none text-[var(--product-card-copy-compare)] line-through',
              isCondensed
                ? 'text-[10px] min-[480px]:text-[11px] sm:text-sm'
              : shouldUseTouchCardSummaryLayout
                  ? 'max-w-[6.5rem] text-[0.78rem] min-[390px]:max-w-[8rem] min-[390px]:text-[0.95rem] min-[480px]:max-w-[10rem] min-[480px]:text-[1.05rem] sm:max-w-[7rem] sm:text-[0.76rem]'
                  : 'max-w-[2.4rem] shrink-0 text-[0.42rem] min-[390px]:max-w-[3.15rem] min-[390px]:text-[0.5rem] min-[480px]:max-w-[3.8rem] min-[480px]:text-[0.56rem] sm:max-w-[7rem] sm:text-[0.76rem]'
            )}
          >
            {formatCurrency(product.comparePrice)}
          </span>
        ) : null}
      </div>
      {showStockMessage ? (
        <p className="mt-1.5 text-[11px] leading-4 text-[var(--product-card-copy-muted)] sm:mt-2 sm:text-xs sm:leading-5">
          {stockCount > 0 ? `${stockCount.toLocaleString()} ready to order right now` : 'Currently unavailable to order'}
        </p>
      ) : null}
    </motion.div>
  );

  return (
    <>
    <div
      ref={(node) => {
        inViewRef.current = node;
      }}
      className={cn(
        `product-card-shell group flex ${cardHeightClass} ${isCondensed ? 'h-full' : ''} cursor-pointer flex-col overflow-hidden border border-slate-200/80 bg-white shadow-none transform-gpu transition-[transform,border-color,background-color] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/20 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none sm:shadow-none ${cardRadiusClass}`,
        isCardPopActive
          ? 'translate-y-0 scale-[1.01] min-[480px]:scale-[1.012] sm:scale-[1.014]'
          : !isTouchPreviewMode
            ? 'translate-y-0 scale-100'
            : 'translate-y-0 scale-100 opacity-100',
        isTouchCardMotionActive ? touchCardActiveClass : ''
      )}
      role="link"
      tabIndex={0}
      aria-label={`Open details for ${product.name}`}
      onClick={goToProduct}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={handleCardMouseEnter}
      onMouseMove={handleCardMouseMove}
      onMouseLeave={handleCardMouseLeave}
      onFocus={handleCardFocus}
      onBlur={handleCardBlur}
      onPointerDown={handleCardPointerDown}
      onTouchStart={handleCardTouchStart}
    >
      <motion.div className={cn('flex h-full min-h-0 flex-1', isCompact ? 'flex-col sm:flex-row' : 'flex-col')}>
        <div className={cn('product-card-media-surface relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfd_70%,#ffffff_100%)]', mediaShellClass)}>
          <div className="product-card-media-wash pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.98),rgba(255,255,255,0.72)_34%,rgba(255,255,255,0.08)_72%,rgba(255,255,255,0)_100%)]" />
          <div className="product-card-media-shadow pointer-events-none absolute inset-x-8 bottom-4 h-16 rounded-full bg-slate-500/8 blur-3xl" />
          <div
            className={cn(
              'product-card-media-active-wash pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(255,255,255,0.7),rgba(255,255,255,0.08)_62%,rgba(255,255,255,0)_82%)] transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isCardSceneActive ? 'opacity-100' : 'opacity-0'
            )}
          />
          <div
            className={cn(
              'product-card-media-gold-glow pointer-events-none absolute inset-x-10 bottom-6 h-28 rounded-full bg-[#f7ecc1]/70 blur-3xl transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isCardSceneActive ? 'opacity-100' : 'opacity-0'
            )}
          />
          <div className="pointer-events-none absolute inset-0 z-[1] [transform:translateZ(20px)] [transform-style:preserve-3d]">
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: isCardSceneActive ? 1 : 0 }}
              transition={sceneTransition}
            >
              <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.44)_38%,rgba(255,255,255,0.84)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.82),rgba(255,255,255,0)_54%)]" />
            </motion.div>
            <motion.div
              className="absolute inset-y-[-8%] -left-1/3 w-1/2 rotate-[18deg] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.24)_50%,rgba(255,255,255,0)_100%)] blur-2xl mix-blend-screen"
              initial={false}
              animate={
                isCardSceneActive
                  ? {
                      x: ['-18%', '165%'],
                      opacity: [0, 0.16, 0]
                    }
                  : {
                      x: '-32%',
                      opacity: 0
                    }
              }
              transition={
                isCardSceneActive
                  ? {
                      duration: 1.05,
                      ease: cinematicEase
                    }
                  : {
                      duration: 0.35,
                      ease: cinematicEase
                    }
              }
            />
          </div>

          <Link
            to={brandHref}
            aria-label={`Browse ${productBrand} products`}
            className={brandLogoBadgeClassName}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {hasBrandLogo ? (
              <>
                <span className="flex h-[68%] w-[82%] items-center justify-center overflow-hidden">
                  <ProgressiveImage
                    src={product.brandLogoUrl}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    width={96}
                    height={48}
                    className="product-card-brand-logo"
                    onLoad={handleBrandLogoLoad}
                    onError={() => {
                      setHasBrandLogoError(true);
                    }}
                  />
                </span>
                <span className="sr-only">{productBrand}</span>
              </>
            ) : (
              <span className="text-[7px] font-medium uppercase tracking-[0.12em] text-slate-700 min-[480px]:text-[8px] min-[480px]:tracking-[0.16em] sm:text-[10px] sm:tracking-[0.24em]">{productBrand}</span>
            )}
          </Link>

          {shouldShowMediaAvailabilityBadge ? (
            <div className="pointer-events-none absolute right-2 top-2 z-[2] min-[390px]:right-2.5 min-[390px]:top-2.5 min-[480px]:right-3 min-[480px]:top-3 sm:right-3 sm:top-3 lg:right-4 lg:top-4">
              {renderAvailabilityBadge('media')}
            </div>
          ) : null}

          {availablePreviewImages.length && !hasImageError ? (
            <div
              className={cn(
                'relative z-[1] flex h-full items-center justify-center overflow-hidden',
                isCondensed ? 'px-1 pt-3 sm:px-2 sm:pt-6' : 'px-3 pt-8 min-[390px]:px-3.5 min-[390px]:pt-8 min-[480px]:px-4 min-[480px]:pt-9 sm:px-2 sm:pt-8'
              )}
            >
              <div className="relative h-full w-full">
                {renderedPreviewImages.map(({ image, imageIndex }) => {
                  const isActiveImage = imageIndex === safeActiveImageIndex;

                  return (
                    <div
                      key={image.url}
                      className={cn(
                        'absolute inset-0 flex translate-x-0 translate-y-0 items-center justify-center px-1 pb-4 pt-2 transition-opacity duration-[640ms] ease-[cubic-bezier(0.22,1,0.36,1)] min-[480px]:px-1.5 min-[480px]:pb-4 min-[480px]:pt-2 sm:px-3 sm:pb-3 sm:pt-3',
                        isActiveImage ? 'opacity-100' : 'pointer-events-none opacity-0'
                      )}
                    >
                      <ProgressiveImage
                        src={image.url}
                        srcSet={image.srcSet}
                        alt={isActiveImage ? image.alt ?? product.name : ''}
                        aria-hidden={!isActiveImage}
                        loading="lazy"
                        decoding="async"
                        sizes={image.sizes ?? '(max-width: 767px) 46vw, (min-width: 1280px) 22vw, 44vw'}
                        className={cn(
                          'h-[92%] w-[92%] object-contain object-center transform-gpu transition-[opacity,transform] duration-[640ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none min-[480px]:h-[94%] min-[480px]:w-[94%] sm:h-[90%] sm:w-[90%]',
                          isActiveImage && isCardPopActive
                            ? '-translate-y-1 scale-[1.055] will-change-transform min-[480px]:scale-[1.06] sm:scale-[1.065]'
                            : 'translate-y-0 scale-100 will-change-[opacity]',
                          !isActiveImage && 'pointer-events-none opacity-0'
                        )}
                        onError={() => {
                          setFailedImageUrls((current) => ({ ...current, [image.url]: true }));
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="relative z-[1] flex h-full items-center justify-center px-3 py-3 min-[480px]:px-4 min-[480px]:py-4 sm:px-6 sm:py-5">
              <div
                className={cn(
                  'flex translate-y-0 scale-100 flex-col items-center gap-3 text-center transition-colors duration-[780ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                  isCardSceneActive ? 'brightness-105' : ''
                )}
              >
                <div className="product-card-empty-icon flex h-11 w-11 items-center justify-center rounded-xl bg-white/85 text-slate-400 shadow-sm ring-1 ring-slate-200/70 min-[480px]:h-14 min-[480px]:w-14 min-[480px]:rounded-2xl sm:h-16 sm:w-16">
                  <ImageOff className="h-4 w-4 min-[480px]:h-5 min-[480px]:w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                </div>
                <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-slate-500 min-[480px]:text-[9px] sm:text-[11px]">Image coming soon</p>
              </div>
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex flex-1 overflow-hidden rounded-b-[22px] min-[480px]:rounded-b-[24px] sm:rounded-b-[28px]">
          <motion.div
            key="product-card-summary-scene"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={sceneTransition}
            className={cn(
              'product-card-summary-surface pointer-events-none relative flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#ffffff_62%,#faf8f6_100%)]',
              isCompact || isFeatured
                ? contentPaddingClass
                : contentPaddingClass,
              shouldReserveOptionsDockSpace && 'pb-0 sm:pb-0'
            )}
          >
            {!isCompact && !isFeatured ? (
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-white/75 shadow-[0_1px_0_rgba(15,23,42,0.05)]" />
            ) : null}
            {!isCompact && !isFeatured ? renderOptionsDock() : null}
            <motion.div
              className="pointer-events-none min-h-0 flex-1 overflow-hidden [transform:translateZ(20px)] [transform-style:preserve-3d]"
              initial={false}
              animate={reduceMotion ? undefined : { y: 0 }}
              transition={sceneTransition}
            >
              <motion.div
                layout={shouldMeasureLayout}
                className="pointer-events-none flex h-full min-h-0 flex-1 flex-col"
                initial={false}
                animate={isCardSceneActive ? 'active' : 'rest'}
                transition={sceneTransition}
                variants={foregroundContainerVariants}
              >
                {!isCompact
                  ? renderStatusBadges(
                      false,
                      null,
                      !shouldShowMediaAvailabilityBadge
                    )
                  : null}

                {isCompact ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-3.5 sm:gap-5 lg:flex-row lg:items-stretch lg:justify-between">
                    <motion.div layout={shouldMeasureLayout} transition={sceneTransition} variants={foregroundItemVariants} className="min-w-0 flex-1">
                      {renderStatusBadges(
                        true,
                        displayColorVariants.length > 1 ? <ProductCardSwatches displayColorVariants={displayColorVariants} mode="compact" /> : null
                      )}
                      <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
                        <h3
                          className={cn(
                            'line-clamp-2 min-h-[2.45rem] font-semibold tracking-[-0.02em] text-[1.05rem] leading-[1.16] text-[var(--product-card-copy-title)] sm:min-h-[3.25rem] sm:text-[1.45rem]',
                            cardMicroMotionClassName,
                            cardTextLiftClassName
                          )}
                        >
                          {product.name}
                        </h3>
                        <p className="line-clamp-2 max-w-[46rem] text-[12px] leading-5 text-[var(--product-card-copy-body)] sm:text-sm sm:leading-6">{product.shortDescription}</p>
                        <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--product-card-detail-chip-text)] sm:gap-2 sm:text-xs">
                          {compactDetails.map((detail) => (
                            <span key={detail} className="rounded-full bg-[var(--product-card-detail-chip-background)] px-2.5 py-1 sm:px-3">
                              {detail}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    <div className="pointer-events-auto relative w-full border-t border-slate-200/80 pt-3 sm:pt-4 lg:w-[420px] lg:shrink-0 lg:self-stretch lg:border-l lg:border-t-0 lg:pt-0 xl:w-[640px] 2xl:w-[820px]">
                      {renderCompactListOptionStage()}
                    </div>
                  </div>
                ) : isFeatured ? (
                  <motion.div layout={shouldMeasureLayout} transition={sceneTransition} variants={foregroundItemVariants} className="mt-3 flex flex-1 flex-col sm:mt-4">
                    <div className="space-y-2.5 sm:space-y-3">
                      <h3
                        className={cn(
                          'line-clamp-2 font-semibold tracking-[-0.02em] text-[1.05rem] leading-[1.16] text-[var(--product-card-copy-title)] sm:text-[1.45rem]',
                          cardMicroMotionClassName,
                          cardTextLiftClassName
                        )}
                      >
                        {product.name}
                      </h3>
                      <p className="line-clamp-2 text-[12px] leading-5 text-[var(--product-card-copy-body)] sm:text-sm sm:leading-6">{product.shortDescription}</p>
                      <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--product-card-detail-chip-text)] sm:gap-2 sm:text-xs">
                        {compactDetails.map((detail) => (
                          <span key={detail} className="rounded-full bg-[var(--product-card-detail-chip-background)] px-2.5 py-1 sm:px-3">
                            {detail}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4">{renderPriceBlock(true)}</div>
                  </motion.div>
                ) : (
                  <motion.div
                    layout={shouldMeasureLayout}
                    transition={sceneTransition}
                    variants={foregroundItemVariants}
                    className={cn(
                      'flex min-h-0 flex-1 flex-col sm:mt-2',
                      shouldUseTouchCardSummaryLayout ? 'mt-5 min-[390px]:mt-6 min-[480px]:mt-7 sm:mt-2' : 'mt-1.5 min-[390px]:mt-2 min-[480px]:mt-2.5 sm:mt-2'
                    )}
                  >
                    <div
                        className={cn(
                          'min-h-0 overflow-hidden',
                        shouldUseTouchCardSummaryLayout ? 'space-y-4 min-[390px]:space-y-5 min-[480px]:space-y-6 sm:space-y-2.5' : 'space-y-1 min-[390px]:space-y-1.5 sm:space-y-2'
                      )}
                    >
                      <div
                        className={cn(
                          'flex min-w-0 items-start justify-between gap-2 min-[480px]:gap-2.5 sm:gap-3',
                          shouldUseTouchCardSummaryLayout ? 'min-h-[2.1rem] min-[390px]:min-h-[2.5rem] min-[480px]:min-h-[3rem] sm:min-h-[2.25rem]' : 'min-h-[1.65rem] min-[390px]:min-h-[1.85rem] min-[480px]:min-h-[2.15rem] sm:min-h-[2.25rem]'
                        )}
                      >
                        <h3
                          className={cn(
                            'line-clamp-2 min-w-0 flex-1 font-semibold tracking-[-0.03em] text-[var(--product-card-copy-title)]',
                            cardMicroMotionClassName,
                            cardTextLiftClassName,
                            shouldUseTouchCardSummaryLayout
                              ? 'text-[1.45rem] leading-[1.08] min-[390px]:text-[1.75rem] min-[480px]:text-[2rem] sm:text-[1.26rem]'
                              : 'text-[0.78rem] leading-[1.08] min-[390px]:text-[0.94rem] min-[480px]:text-[1.05rem] sm:text-[1.26rem]'
                          )}
                        >
                          {product.name}
                        </h3>
                        {displayColorVariants.length > 1 ? <ProductCardSwatches displayColorVariants={displayColorVariants} mode="title" /> : null}
                      </div>
                      <p
                        className={cn(
                          'max-w-[24rem] text-[var(--product-card-copy-body)]',
                          shouldUseTouchCardSummaryLayout
                            ? 'line-clamp-2 min-h-[2.7rem] text-[0.98rem] leading-[1.38] min-[390px]:min-h-[3.1rem] min-[390px]:text-[1.08rem] min-[480px]:min-h-[3.6rem] min-[480px]:text-[1.2rem] sm:min-h-[2.12rem] sm:text-[12px] sm:leading-[1.42]'
                            : 'hidden sm:line-clamp-2 sm:block sm:min-h-[2.12rem] sm:text-[12px] sm:leading-[1.42]'
                        )}
                      >
                        {product.shortDescription}
                      </p>
                    </div>

                    <div
                      className={cn(
                        'mt-auto shrink-0 sm:pt-0',
                        shouldUseTouchCardSummaryLayout ? 'pt-7 min-[390px]:pt-8 min-[480px]:pt-10 sm:pt-0' : 'pt-2 min-[390px]:pt-2.5 sm:pt-3.5'
                      )}
                    >
                      {renderPriceBlock(false)}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>

            {!isCompact && isFeatured ? renderOptionsDock() : null}
          </motion.div>

          <AnimatePresence initial={false}>
            {!isCondensed && isOptionsPanelOpen && !isTouchPreviewMode ? renderDefaultOptionScene() : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
    {renderMobileDefaultOptionPortal()}
    </>
  );
};

export const ProductCard = memo(ProductCardComponent);
ProductCard.displayName = 'ProductCard';
