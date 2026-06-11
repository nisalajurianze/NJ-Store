import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  type TouchEvent as ReactTouchEvent
} from 'react';
import type { BannerDto, BannerShowcaseFeatureItemDto, ImageAsset, ProductCardDto } from '@njstore/types';
import {
  BatteryCharging,
  Camera,
  ChevronLeft,
  ChevronRight,
  Cpu,
  HardDrive,
  MemoryStick,
  MonitorSmartphone,
  Recycle,
  RefreshCw,
  ShieldCheck,
  Speaker,
  Sparkles,
  Star,
  Truck,
  Wifi
} from 'lucide-react';
import { Button, Card, Skeleton } from '@njstore/ui';
import { cn } from '@njstore/utils/cn';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useImageFallback } from '../../hooks/useImageFallback';
import { useFastMotionPreference } from '../../hooks/useFastMotionPreference';
import { useShowcase } from '../../hooks/useShowcase';
import { isKnownUnavailableDemoAsset } from '../../utils/imageAssets';
import { ProgressiveImage } from '../media/ProgressiveImage';

import {
  SHOWCASE_PREVIEW_AUTOSCROLL_MS,
  SHOWCASE_PREVIEW_KICKOFF_DELAY,
  SHOWCASE_PREVIEW_RESET_DELAY,
  appendBannerVersion,
  getBrandLogoShapeFromName,
  getUniqueShowcaseProducts,
  normalizeBrandLabel,
  normalizeHeroCornerImageSize,
  resolveHeroCornerImageEnabled,
  resolveProductRatings,
  type BrandLogoShape,
  type ProductPreviewImage
} from './heroSectionConstants';

const setHighImageFetchPriority = (node: HTMLImageElement | null): void => {
  node?.setAttribute('fetchpriority', 'high');
};
const MOBILE_HERO_IMAGE_SIZES = '(max-width: 639px) 68vw, (max-width: 1023px) 42vw, (min-width: 1280px) 18rem, 14.5rem';
const MOBILE_SHOWCASE_IMAGE_SIZES = '(max-width: 639px) 44vw, (max-width: 1023px) 38vw, (min-width: 1280px) 22vw, 18vw';
const HERO_VISUAL_IMAGE_WIDTHS = [360, 640, 960, 1280] as const;
const SHOWCASE_SWIPE_INTENT_PX = 8;
const SHOWCASE_SWIPE_TRIGGER_PX = 42;
const SHOWCASE_CLICK_SUPPRESSION_MS = 220;

type ShowcaseSwipeState = {
  id: number;
  source: 'pointer' | 'touch';
  startX: number;
  startY: number;
};

type ShowcaseTouchPoint = {
  identifier: number;
  clientX: number;
  clientY: number;
};

const replaceCloudinaryUploadTransform = (url: string, transform: string): string => {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  const [prefix, suffix] = url.split('/upload/', 2);
  if (!prefix || !suffix) {
    return url;
  }

  const versionedAssetMatch = suffix.match(/(?:^|\/)(v\d+\/.*)$/);
  const assetPath = versionedAssetMatch?.[1] ?? suffix.replace(/^\/+/, '');
  return `${prefix}/upload/${transform}/${assetPath}`;
};

const getHeroBackgroundUrl = (url: string, isMobilePerformanceMode: boolean): string =>
  replaceCloudinaryUploadTransform(url, isMobilePerformanceMode ? 'f_auto,q_auto,w_960' : 'f_auto,q_auto,w_1920');

const getHeroBadgeImageUrl = (url: string, isMobilePerformanceMode: boolean): string =>
  replaceCloudinaryUploadTransform(url, isMobilePerformanceMode ? 'f_auto,q_auto,w_128' : 'f_auto,q_auto,w_256');

const getHeroVisualFallbackUrl = (url: string, isMobilePerformanceMode: boolean): string =>
  replaceCloudinaryUploadTransform(url, isMobilePerformanceMode ? 'f_auto,q_auto,w_640' : 'f_auto,q_auto,w_960');

const buildCloudinaryImageSrcSet = (url: string, widths: readonly number[]): string =>
  widths.map((width) => `${replaceCloudinaryUploadTransform(url, `f_auto,q_auto,w_${width}`)} ${width}w`).join(', ');

const isInteractiveShowcaseTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && Boolean(target.closest('a, button, input, select, textarea, [role="button"]'));

const showcaseFeatureIcons = {
  camera: Camera,
  memory: MemoryStick,
  storage: HardDrive,
  battery: BatteryCharging,
  display: MonitorSmartphone,
  chip: Cpu,
  audio: Speaker,
  connectivity: Wifi
} as const;



interface HeroCornerImageBadgeProps {
  image: ImageAsset;
  imageUrl: string;
  imageSize: number;
  positionClassName: string;
  fallbackAlt: string;
  onError: (imageUrl: string) => void;
}

const HeroCornerImageBadge = memo(
  ({ image, imageUrl, imageSize, positionClassName, fallbackAlt, onError }: HeroCornerImageBadgeProps): JSX.Element => (
    <div className={`absolute z-[3] ${positionClassName}`}>
      <ProgressiveImage
        src={imageUrl}
        alt={image.alt ?? fallbackAlt}
        loading="lazy"
        decoding="async"
        className="h-auto w-auto object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.24)] transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:scale-110"
        style={{
          width: imageSize,
          maxWidth: imageSize,
          maxHeight: imageSize
        }}
        onError={() => {
          onError(image.url);
        }}
      />
    </div>
  )
);

HeroCornerImageBadge.displayName = 'HeroCornerImageBadge';

interface MobileHeroCornerImageBadgeProps {
  image: ImageAsset;
  imageUrl: string;
  imageSize: number;
  positionClassName: string;
  onError: (imageUrl: string) => void;
}

const MobileHeroCornerImageBadge = memo(
  ({ image, imageUrl, imageSize, positionClassName, onError }: MobileHeroCornerImageBadgeProps): JSX.Element => {
    const mobileImageSize = Math.min(Math.max(Math.round(imageSize * 0.46), 34), 62);

    return (
      <div className={`pointer-events-none absolute z-[3] ${positionClassName}`}>
        <ProgressiveImage
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="h-auto w-auto object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.24)]"
          style={{
            width: mobileImageSize,
            maxWidth: mobileImageSize,
            maxHeight: mobileImageSize
          }}
          onError={() => {
            onError(image.url);
          }}
        />
      </div>
    );
  }
);

MobileHeroCornerImageBadge.displayName = 'MobileHeroCornerImageBadge';

interface ShowcaseSidebarProps {
  productCount: number;
  featureItems: BannerShowcaseFeatureItemDto[];
  onMove: (direction: 'left' | 'right') => void;
}

interface ShowcaseControlsProps {
  onMove: (direction: 'left' | 'right') => void;
}

const ShowcaseControls = memo(({ onMove }: ShowcaseControlsProps): JSX.Element => (
  <div className="absolute right-1 top-1 z-[4] inline-flex rounded-full border border-white/75 bg-white/80 p-0.5 shadow-[0_10px_22px_rgba(15,23,42,0.045)] backdrop-blur-[12px] sm:right-1.5 sm:top-1.5 sm:p-1 lg:hidden">
    <button
      type="button"
      aria-label="Previous showcase product"
      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 sm:h-8 sm:w-8"
      onClick={(event) => {
        event.stopPropagation();
        onMove('left');
      }}
    >
      <ChevronLeft className="h-3.5 w-3.5" />
    </button>
    <button
      type="button"
      aria-label="Next showcase product"
      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 sm:h-8 sm:w-8"
      onClick={(event) => {
        event.stopPropagation();
        onMove('right');
      }}
    >
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  </div>
));

ShowcaseControls.displayName = 'ShowcaseControls';

const ShowcaseSidebar = memo(({ productCount, featureItems, onMove }: ShowcaseSidebarProps): JSX.Element | null => {
  if (productCount <= 1 && !featureItems.length) {
    return null;
  }

  return (
    <div className={`flex h-full min-h-[14rem] flex-col items-stretch justify-start sm:min-h-[18rem] lg:min-h-[16.75rem] lg:justify-start ${productCount > 1 ? 'pt-10 sm:pt-12 lg:pt-0' : ''}`}>
      {productCount > 1 ? (
        <div className="hidden shrink-0 self-end rounded-full border border-white/75 bg-white/72 p-1 shadow-[0_10px_22px_rgba(15,23,42,0.045)] backdrop-blur-[12px] lg:mr-0.5 lg:inline-flex lg:-translate-y-1">
          <button
            type="button"
            aria-label="Previous showcase product"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            onClick={(event) => {
              event.stopPropagation();
              onMove('left');
            }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next showcase product"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            onClick={(event) => {
              event.stopPropagation();
              onMove('right');
            }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="hidden h-10 lg:block" />
      )}

      {featureItems.length ? (
        <div className="w-full rounded-[1.15rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.64),rgba(248,250,252,0.88))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_14px_28px_rgba(15,23,42,0.03)] backdrop-blur-[14px] sm:rounded-[1.45rem] sm:px-4 sm:py-3.5 lg:mt-2 lg:translate-y-2 lg:rounded-[1.3rem] lg:px-3.5 lg:py-2.5">
          {featureItems.map((item, index) => {
            const Icon = showcaseFeatureIcons[item.icon] ?? Sparkles;

            return (
              <div
                key={`${item.icon}-${item.label}-${item.value}`}
                className={`${index > 0 ? 'mt-2 border-t border-slate-200/75 pt-2 sm:mt-3 sm:pt-3 lg:mt-2.5 lg:pt-2.5' : ''} flex items-start gap-2 sm:gap-3 lg:gap-2.5`}
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[0.7rem] bg-gold/12 text-gold sm:h-6 sm:w-6 sm:rounded-[0.95rem]">
                  <Icon className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[0.56rem] uppercase tracking-[0.16em] text-slate-500 sm:text-[0.62rem] sm:tracking-[0.2em] lg:text-[0.56rem] lg:tracking-[0.14em]">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-[0.78rem] font-semibold leading-[1.08] text-slate-800 sm:text-[0.9rem] sm:leading-[1.12] lg:text-[0.8rem]">
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
});

ShowcaseSidebar.displayName = 'ShowcaseSidebar';

interface ShowcaseMetaChip {
  icon: typeof ShieldCheck;
  label: string;
}

interface RenderedShowcasePreviewImage {
  image: ProductPreviewImage;
  imageIndex: number;
}

interface ShowcaseBottomProps {
  product: ProductCardDto;
  descriptionText: string;
  metaChips: ShowcaseMetaChip[];
  formatCurrency: (amount: number) => string;
}

const ShowcaseBottom = memo(({ product, descriptionText, metaChips, formatCurrency }: ShowcaseBottomProps): JSX.Element => {
  const showcaseSavingsAmount = product.comparePrice && product.comparePrice > product.price ? product.comparePrice - product.price : 0;

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-slate-200/70 pt-2 sm:mt-3 sm:gap-2.5 sm:pt-3 lg:mt-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
        <div className="min-w-0 px-0.5 py-0.5 sm:px-1 sm:py-1">
          <div className="flex min-h-[3.6rem] flex-col justify-end sm:min-h-[4.4rem]">
            <div className="min-h-[1.45rem] sm:min-h-[2.1rem]">
              <h2 className="max-w-[10.75rem] line-clamp-1 font-display text-[1rem] leading-[1.12] tracking-normal text-slate-900 sm:max-w-[16rem] sm:line-clamp-2 sm:text-[1.12rem] lg:max-w-[18rem]">
                {product.name}
              </h2>
            </div>
            <div className="mt-1 min-h-[1.7rem] sm:min-h-[1.45rem]">
              <p className="max-w-[11.5rem] line-clamp-2 text-[0.62rem] leading-[0.9rem] text-slate-600 sm:max-w-[16rem] sm:text-[0.64rem] sm:leading-[0.95rem] lg:max-w-[22rem]">
                {descriptionText}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-[5.6rem] px-0.5 py-0.5 text-right sm:px-1 sm:py-1">
          <div className="flex min-h-[3.6rem] flex-col items-end justify-end sm:min-h-[4.4rem]">
            <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
              <span className="font-mono text-[0.86rem] leading-none text-gold sm:text-[1rem]">{formatCurrency(product.price)}</span>
              {showcaseSavingsAmount > 0 ? (
                <span className="text-[0.5rem] text-slate-500 line-through sm:text-[0.64rem]">
                  {formatCurrency(product.comparePrice ?? 0)}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 flex min-h-[0.9rem] justify-end sm:mt-1 sm:min-h-[1.35rem]">
              {showcaseSavingsAmount > 0 ? (
                <span className="rounded-full border border-gold/15 bg-gold/10 px-1.5 py-0.5 font-mono text-[0.44rem] uppercase tracking-[0.04em] text-gold sm:px-2.5 sm:py-1 sm:text-[0.56rem] sm:tracking-[0.08em]">
                  Save {formatCurrency(showcaseSavingsAmount)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-0 rounded-[0.95rem] border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,0.64),rgba(248,250,252,0.86))] px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:rounded-[1.2rem] sm:px-3 sm:py-2">
        {metaChips.map(({ icon: Icon, label }, index) => (
          <span
            key={label}
            className={`${index > 0 ? 'border-l border-slate-200/75 pl-1 sm:pl-3' : ''} inline-flex min-h-[1.6rem] items-center justify-center gap-1 px-1 py-0.5 text-[0.52rem] leading-[0.72rem] text-slate-700 sm:min-h-[2rem] sm:gap-2 sm:px-2 sm:py-1.5 sm:text-[0.66rem]`}
          >
            <Icon className="h-2.5 w-2.5 text-gold sm:h-3 sm:w-3" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
});

ShowcaseBottom.displayName = 'ShowcaseBottom';

interface ShowcasePanelProps {
  product: ProductCardDto;
  productCount: number;
  transitionDirection: 'left' | 'right';
  previewImages: RenderedShowcasePreviewImage[];
  safeActiveImageIndex: number;
  supportText: string;
  descriptionText: string;
  featureItems: BannerShowcaseFeatureItemDto[];
  metaChips: ShowcaseMetaChip[];
  formatCurrency: (amount: number) => string;
  onMove: (direction: 'left' | 'right') => void;
  onPreviewStart: () => void;
  onPreviewEnd: () => void;
  onImageError: (imageUrl: string) => void;
  isMobilePerformanceMode: boolean;
}

const ShowcasePanel = memo(
  ({
    product,
    productCount,
    transitionDirection,
    previewImages,
    safeActiveImageIndex,
    supportText,
    descriptionText,
    featureItems,
    metaChips,
    formatCurrency,
    onMove,
    onPreviewStart,
    onPreviewEnd,
    onImageError,
    isMobilePerformanceMode
  }: ShowcasePanelProps): JSX.Element => {
    const [isBrandLogoFailed, setIsBrandLogoFailed] = useState(false);
    const showcaseBrandLabel = normalizeBrandLabel(product.brand);
    const showcaseBrandQueryValue = product.brandSlug?.trim() || showcaseBrandLabel;
    const [brandLogoShape, setBrandLogoShape] = useState<BrandLogoShape>(() => getBrandLogoShapeFromName(showcaseBrandLabel));

    useEffect(() => {
      setIsBrandLogoFailed(false);
      setBrandLogoShape(getBrandLogoShapeFromName(showcaseBrandLabel));
    }, [product.id, showcaseBrandLabel]);

    const showcaseBrandLogo = product.brandLogoUrl && !isBrandLogoFailed ? product.brandLogoUrl : undefined;
    const showcaseBrandHref = `/shop?brand=${encodeURIComponent(showcaseBrandQueryValue)}`;
    const showcaseBrandBadgeClassName =
      brandLogoShape === 'square'
        ? 'w-[2.95rem] sm:w-[3.9rem]'
        : brandLogoShape === 'wide'
          ? 'w-[4rem] sm:w-[4.95rem]'
          : 'w-[3.55rem] sm:w-[4.45rem]';

    const handleShowcaseBrandLogoLoad = (event: SyntheticEvent<HTMLImageElement>): void => {
      const image = event.currentTarget;
      const aspectRatio = image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 2;
      const nextShape: BrandLogoShape = aspectRatio < 1.45 ? 'square' : aspectRatio > 3.2 ? 'wide' : 'compact';

      setBrandLogoShape((current) => (current === nextShape ? current : nextShape));
    };

    const hasSidebar = productCount > 1 || featureItems.length > 0;
    const hasPreviewImages = previewImages.length > 0;
    const previewTransitionClassName = isMobilePerformanceMode ? 'duration-300' : 'duration-[1200ms]';

    return (
      <div
        key={product.id}
        className={`showcase-panel-enter ${
          transitionDirection === 'left' ? 'showcase-panel-enter-left' : 'showcase-panel-enter-right'
        } group/showcase relative flex h-full flex-col`}
        onMouseEnter={onPreviewStart}
        onMouseLeave={onPreviewEnd}
        onFocus={onPreviewStart}
        onBlur={onPreviewEnd}
      >
        {productCount > 1 ? <ShowcaseControls onMove={onMove} /> : null}

        <div className="relative z-[1] flex h-full flex-col gap-2.5 sm:gap-3 lg:gap-2.5">
          <div
            className={`grid min-h-0 gap-2 sm:gap-3 ${
              hasSidebar
                ? 'grid-cols-[minmax(0,1.06fr)_minmax(7.15rem,0.94fr)] items-stretch sm:grid-cols-[minmax(0,1.08fr)_minmax(10rem,0.92fr)] lg:grid-cols-[minmax(0,1.02fr)_minmax(10rem,0.92fr)] lg:gap-3'
                : ''
            }`}
          >
            <div
              className={`relative min-h-[14rem] overflow-hidden pt-0.5 sm:min-h-[18rem] sm:pt-1 lg:min-h-[16.75rem] lg:overflow-visible ${
                hasSidebar ? 'pr-2 sm:pr-3 lg:pr-4' : ''
              }`}
            >
              {hasSidebar ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 right-0 top-7 w-px bg-[linear-gradient(180deg,rgba(226,232,240,0),rgba(226,232,240,0.98)_16%,rgba(226,232,240,0.98)_84%,rgba(226,232,240,0))] sm:top-10 lg:bottom-3 lg:top-6"
                />
              ) : null}
              <div className="pointer-events-none absolute left-[12%] top-[14%] h-12 w-12 rounded-full bg-slate-200/55 blur-3xl opacity-70 transition-opacity duration-500 group-hover/showcase:opacity-95" />
              <div className="pointer-events-none absolute inset-x-[14%] bottom-[8%] h-10 rounded-full bg-gold/12 blur-3xl opacity-80 transition-opacity duration-500 group-hover/showcase:opacity-100" />
              <Link
                to={showcaseBrandHref}
                aria-label={`Browse ${showcaseBrandLabel} products`}
                className={cn(
                  'absolute left-1 top-1 z-[2] flex h-5 items-center justify-center overflow-hidden rounded-[0.8rem] border border-white/70 bg-white/85 px-1.5 py-0.5 shadow-[0_7px_16px_rgba(15,23,42,0.06)] backdrop-blur-[14px] transition-transform duration-200 hover:-translate-y-0.5 sm:left-1.5 sm:top-1.5 sm:h-7 sm:rounded-[1.05rem] sm:px-2.5 lg:left-0 lg:top-0',
                  showcaseBrandBadgeClassName
                )}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                {showcaseBrandLogo ? (
                  <>
                    <span className="flex h-[68%] w-[82%] items-center justify-center overflow-hidden">
                      <img
                        src={showcaseBrandLogo}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="product-card-brand-logo"
                        style={{ width: 'auto', height: 'auto' }}
                        onLoad={handleShowcaseBrandLogoLoad}
                        onError={() => {
                          setIsBrandLogoFailed(true);
                        }}
                      />
                    </span>
                    <span className="sr-only">{showcaseBrandLabel}</span>
                  </>
                ) : (
                  <span className="text-[0.42rem] font-medium uppercase tracking-[0.1em] text-slate-600 sm:text-[0.54rem] sm:tracking-[0.18em]">
                    {showcaseBrandLabel}
                  </span>
                )}
              </Link>

              {hasPreviewImages ? (
                <div className="pointer-events-none absolute inset-0">
                  {previewImages.map(({ image, imageIndex }) => {
                    const isActiveImage = imageIndex === safeActiveImageIndex;

                    return (
                      <div
                        key={image.url}
                        className={`absolute inset-0 flex items-center justify-center px-5 py-6 sm:px-6 sm:py-8 lg:px-4 lg:py-5 transition-[opacity,transform] ${previewTransitionClassName} ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isActiveImage ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
                        }`}
                      >
                        <div className="flex h-[10.25rem] w-[10.25rem] max-w-full shrink-0 items-center justify-center sm:h-[12.75rem] sm:w-[12.75rem] lg:h-[14.35rem] lg:w-[14.35rem] lg:translate-y-7">
                          <img
                            src={image.url}
                            srcSet={image.srcSet}
                            sizes={isMobilePerformanceMode ? MOBILE_SHOWCASE_IMAGE_SIZES : image.sizes}
                            alt={isActiveImage ? image.alt ?? product.name : ''}
                            aria-hidden={!isActiveImage}
                            loading={isActiveImage && !isMobilePerformanceMode ? 'eager' : 'lazy'}
                            ref={isActiveImage && !isMobilePerformanceMode ? setHighImageFetchPriority : undefined}
                            decoding="async"
                            width={288}
                            height={288}
                            className={`h-full w-full object-contain object-center transition-[transform,opacity] ${previewTransitionClassName} ease-[cubic-bezier(0.16,1,0.3,1)] ${
                              isActiveImage
                                ? isMobilePerformanceMode
                                  ? 'scale-[1]'
                                  : 'scale-[1] group-hover/showcase:scale-[1.018]'
                                : 'scale-[0.97]'
                            }`}
                            onError={() => {
                              onImageError(image.url);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5 py-6 sm:px-6 sm:py-8 lg:px-4 lg:py-5">
                  <div className="relative flex max-w-[10.75rem] flex-col items-center text-center sm:max-w-[12rem] lg:max-w-[12rem]">
                    <div className="pointer-events-none absolute left-1/2 top-[2.8rem] h-24 w-24 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.78),rgba(255,255,255,0)_72%)] blur-sm lg:h-28 lg:w-28" />
                    <div className="relative flex h-[10.25rem] w-[10.25rem] max-w-full shrink-0 items-center justify-center text-slate-300 transition-transform duration-300 group-hover/showcase:-translate-y-1 group-hover/showcase:scale-[1.02] sm:h-[12.75rem] sm:w-[12.75rem] lg:h-[14.35rem] lg:w-[14.35rem] lg:translate-y-7">
                      <Sparkles className="h-14 w-14 sm:h-16 sm:w-16 lg:h-[5rem] lg:w-[5rem]" />
                    </div>
                    <p className="mt-2 text-[0.52rem] font-medium uppercase tracking-[0.18em] text-slate-400 sm:mt-4 sm:text-[0.58rem] sm:tracking-[0.22em]">
                      {showcaseBrandLabel}
                    </p>
                    <p className="mt-1.5 max-w-[10.75rem] text-[0.68rem] leading-[1.05rem] text-slate-500 sm:mt-2 sm:max-w-[12rem] sm:text-[0.74rem] sm:leading-[1.2rem] lg:max-w-[13rem]">
                      {supportText}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <ShowcaseSidebar productCount={productCount} featureItems={featureItems} onMove={onMove} />
          </div>

          <ShowcaseBottom product={product} descriptionText={descriptionText} metaChips={metaChips} formatCurrency={formatCurrency} />
        </div>
      </div>
    );
  }
);

ShowcasePanel.displayName = 'ShowcasePanel';

interface MobileHeroSpotlightPosterProps {
  product?: ProductCardDto;
  productHref?: string;
  visualImage?: ProductPreviewImage;
  topRightBadge?: { image: ImageAsset; imageUrl: string; imageSize: number };
  bottomLeftBadge?: { image: ImageAsset; imageUrl: string; imageSize: number };
  bottomRightBadge?: { image: ImageAsset; imageUrl: string; imageSize: number };
  formatCurrency: (amount: number) => string;
  onImageError: (imageUrl: string) => void;
  imageSizes: string;
}

const MobileHeroSpotlightPoster = memo(
  ({
    product,
    productHref,
    visualImage,
    topRightBadge,
    bottomLeftBadge,
    bottomRightBadge,
    formatCurrency,
    onImageError,
    imageSizes
  }: MobileHeroSpotlightPosterProps): JSX.Element | null => {
    const navigate = useNavigate();

    if (!product || !productHref) {
      return null;
    }

    return (
      <Card
        role="link"
        tabIndex={0}
        aria-label={`Open mobile hero spotlight ${product.name}`}
        className="page-enter group relative h-[18.75rem] cursor-pointer overflow-hidden rounded-[1.1rem] border border-white/10 bg-[linear-gradient(145deg,#252f38_0%,#1a212a_52%,#111821_100%)] p-0 shadow-[0_18px_34px_rgba(3,10,26,0.2)] transition-[transform,border-color,box-shadow] duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1420] sm:h-[21rem] sm:rounded-[1.35rem] md:h-[21.75rem] lg:hidden"
        onClick={() => {
          navigate(productHref);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) {
            return;
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            navigate(productHref);
          }
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.18),rgba(255,255,255,0)_44%),radial-gradient(circle_at_22%_86%,rgba(212,175,55,0.1),rgba(212,175,55,0)_25%)]" />
        <div className="pointer-events-none absolute inset-x-8 bottom-16 h-24 rounded-full bg-black/35 blur-2xl" />

        <div className="pointer-events-none absolute left-5 top-5 z-[3] flex max-w-[72%] items-center rounded-full border border-white/14 bg-slate-950/[0.26] px-5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:left-6 sm:top-6 sm:px-6 sm:py-2.5">
          <span className="truncate font-display text-[1.18rem] leading-none tracking-normal text-[rgba(255,255,255,0.96)] drop-shadow-[0_1px_2px_rgba(2,6,23,0.36)] sm:text-[1.28rem]">
            {product.name}
          </span>
        </div>

        {topRightBadge ? (
          <MobileHeroCornerImageBadge
            image={topRightBadge.image}
            imageUrl={topRightBadge.imageUrl}
            imageSize={topRightBadge.imageSize}
            positionClassName="right-4 top-4"
            onError={onImageError}
          />
        ) : (
          <div className="pointer-events-none absolute right-3 top-3 z-[3] flex h-[4.9rem] w-[4.9rem] rotate-[-10deg] items-center justify-center bg-[#115eff] text-center font-display text-[1.18rem] leading-none tracking-normal text-[#f6dc35] drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)] [clip-path:polygon(50%_0%,61%_34%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_34%)] sm:right-5 sm:top-4 sm:h-[5.7rem] sm:w-[5.7rem] sm:text-[1.38rem]">
            New
          </div>
        )}
        {bottomLeftBadge ? (
          <MobileHeroCornerImageBadge
            image={bottomLeftBadge.image}
            imageUrl={bottomLeftBadge.imageUrl}
            imageSize={bottomLeftBadge.imageSize}
            positionClassName="bottom-5 left-5 sm:bottom-6 sm:left-6"
            onError={onImageError}
          />
        ) : null}
        {bottomRightBadge ? (
          <MobileHeroCornerImageBadge
            image={bottomRightBadge.image}
            imageUrl={bottomRightBadge.imageUrl}
            imageSize={bottomRightBadge.imageSize}
            positionClassName="bottom-5 right-5 sm:bottom-6 sm:right-6"
            onError={onImageError}
          />
        ) : null}

        <div className="relative z-[1] flex h-full items-center justify-center px-5 pb-[4.95rem] pt-[4.6rem] sm:px-7 sm:pb-[5.55rem] sm:pt-[5rem]">
          {visualImage ? (
            <img
              src={visualImage.url}
              srcSet={visualImage.srcSet}
              alt=""
              aria-hidden="true"
              loading="eager"
              ref={setHighImageFetchPriority}
              decoding="async"
              width={320}
              height={320}
              sizes={imageSizes}
              className="max-h-[11.1rem] w-auto max-w-[86%] object-contain object-center drop-shadow-[0_24px_38px_rgba(0,0,0,0.32)] transition-transform duration-500 ease-out group-hover:scale-[1.015] sm:max-h-[13rem] sm:max-w-[82%]"
              onError={() => {
                onImageError(visualImage.url);
              }}
            />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-[1.6rem] border border-white/12 bg-white/[0.06] text-gold shadow-[0_20px_34px_rgba(0,0,0,0.2)]">
              <Sparkles className="h-12 w-12" />
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 z-[3] flex -translate-x-1/2 items-center justify-center rounded-full border border-gold/18 bg-slate-950/18 px-5 py-2 font-mono text-[0.92rem] font-semibold leading-none tracking-normal text-gold shadow-[0_14px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:bottom-7 sm:px-6 sm:py-2.5 sm:text-[1rem]">
          {formatCurrency(product.price)}
        </div>
      </Card>
    );
  }
);

MobileHeroSpotlightPoster.displayName = 'MobileHeroSpotlightPoster';

interface HeroSectionProps {
  banner?: BannerDto | null;
  featuredItems: ProductCardDto[];
  flashDealItems: ProductCardDto[];
  formatCurrency: (amount: number) => string;
  isLoading?: boolean;
}

export const HeroSection = ({ banner, featuredItems, flashDealItems, formatCurrency, isLoading = false }: HeroSectionProps): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobilePerformanceMode = useFastMotionPreference();
  const [showcaseActiveImageIndex, setShowcaseActiveImageIndex] = useState(0);
  const [isShowcasePreviewActive, setIsShowcasePreviewActive] = useState(false);
  const showcasePreloadedImageUrlsRef = useRef<Record<string, true>>({});
  const showcasePreviewResetTimeoutRef = useRef<number | null>(null);
  const showcaseSwipeRef = useRef<ShowcaseSwipeState | null>(null);
  const suppressShowcaseClickRef = useRef(false);
  const showcaseClickSuppressionTimeoutRef = useRef<number | null>(null);
  const { failedImageUrls, markImageFailed } = useImageFallback();

  const heroShowcaseProducts = useMemo(() => {
    const curatedProducts = banner?.showcaseProducts ?? [];
    if (curatedProducts.length) {
      return curatedProducts.slice(0, 8);
    }

    return getUniqueShowcaseProducts(flashDealItems, featuredItems).slice(0, 4);
  }, [banner?.showcaseProducts, featuredItems, flashDealItems]);

  const showcase = useShowcase({
    productCount: heroShowcaseProducts.length
  });

  const currentShowcaseProduct = heroShowcaseProducts[showcase.showcaseIndex] ?? heroShowcaseProducts[0];
  const showcasePreviewImages = useMemo<ProductPreviewImage[]>(() => {
    const images =
      currentShowcaseProduct?.previewImages?.length
        ? currentShowcaseProduct.previewImages
        : currentShowcaseProduct?.thumbnail
          ? [currentShowcaseProduct.thumbnail]
          : [];

    return images.filter(
      (image, index, items) =>
        !isKnownUnavailableDemoAsset(image.url) &&
        !failedImageUrls[image.url] &&
        items.findIndex((candidate) => candidate.url === image.url) === index
    );
  }, [currentShowcaseProduct?.previewImages, currentShowcaseProduct?.thumbnail, failedImageUrls]);

  const heroSpotlightProduct = banner?.heroSpotlightProduct;
  const heroSpotlightPreviewImages = useMemo<ProductPreviewImage[]>(() => {
    const images =
      heroSpotlightProduct?.previewImages?.length
        ? heroSpotlightProduct.previewImages
        : heroSpotlightProduct?.thumbnail
          ? [heroSpotlightProduct.thumbnail]
          : [];

    return images.filter(
      (image, index, items) =>
        !isKnownUnavailableDemoAsset(image.url) &&
        !failedImageUrls[image.url] &&
        items.findIndex((candidate) => candidate.url === image.url) === index
    );
  }, [failedImageUrls, heroSpotlightProduct?.previewImages, heroSpotlightProduct?.thumbnail]);

  useEffect(() => {
    setShowcaseActiveImageIndex(0);
    setIsShowcasePreviewActive(false);
    if (showcasePreviewResetTimeoutRef.current !== null) {
      window.clearTimeout(showcasePreviewResetTimeoutRef.current);
      showcasePreviewResetTimeoutRef.current = null;
    }
  }, [currentShowcaseProduct?.id, currentShowcaseProduct?.previewImages, currentShowcaseProduct?.thumbnail?.url]);

  useEffect(
    () => () => {
      if (showcasePreviewResetTimeoutRef.current !== null) {
        window.clearTimeout(showcasePreviewResetTimeoutRef.current);
      }

      if (showcaseClickSuppressionTimeoutRef.current !== null) {
        window.clearTimeout(showcaseClickSuppressionTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!isShowcasePreviewActive || showcasePreviewImages.length <= 1) {
      return;
    }

    let intervalId: number | undefined;
    const kickoffId = window.setTimeout(() => {
      setShowcaseActiveImageIndex((current) => {
        if (showcasePreviewImages.length <= 1) {
          return 0;
        }

        return current === 0 ? 1 : current;
      });

      intervalId = window.setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }

        setShowcaseActiveImageIndex((current) => {
          if (showcasePreviewImages.length <= 1) {
            return 0;
          }

          return (current + 1) % showcasePreviewImages.length;
        });
      }, SHOWCASE_PREVIEW_AUTOSCROLL_MS);
    }, SHOWCASE_PREVIEW_KICKOFF_DELAY);

    return () => {
      window.clearTimeout(kickoffId);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [isShowcasePreviewActive, showcasePreviewImages.length]);

  useEffect(() => {
    if (!showcasePreviewImages.length && showcaseActiveImageIndex !== 0) {
      setShowcaseActiveImageIndex(0);
      return;
    }

    if (showcaseActiveImageIndex > showcasePreviewImages.length - 1) {
      setShowcaseActiveImageIndex(0);
    }
  }, [showcaseActiveImageIndex, showcasePreviewImages.length]);

  useEffect(() => {
    if (
      !isShowcasePreviewActive ||
      typeof window === 'undefined' ||
      typeof window.Image === 'undefined' ||
      showcasePreviewImages.length <= 1
    ) {
      return;
    }

    const nextImage = showcasePreviewImages[(showcaseActiveImageIndex + 1) % showcasePreviewImages.length];
    if (!nextImage?.url || showcasePreloadedImageUrlsRef.current[nextImage.url]) {
      return;
    }

    showcasePreloadedImageUrlsRef.current[nextImage.url] = true;
    const preloader = new window.Image();
    preloader.decoding = 'async';
    preloader.src = nextImage.url;

    return () => {
      preloader.onload = null;
      preloader.onerror = null;
    };
  }, [isShowcasePreviewActive, showcaseActiveImageIndex, showcasePreviewImages]);

  const safeShowcaseActiveImageIndex = showcasePreviewImages.length
    ? Math.min(showcaseActiveImageIndex, showcasePreviewImages.length - 1)
    : 0;
  const renderedShowcasePreviewImages = useMemo<RenderedShowcasePreviewImage[]>(() => {
    if (isMobilePerformanceMode && showcasePreviewImages.length <= 1) {
      const activeImage = showcasePreviewImages[safeShowcaseActiveImageIndex];
      return activeImage ? [{ image: activeImage, imageIndex: safeShowcaseActiveImageIndex }] : [];
    }

    if (showcasePreviewImages.length <= 2) {
      return showcasePreviewImages.map((image, imageIndex) => ({ image, imageIndex }));
    }

    const nextImageIndex = (safeShowcaseActiveImageIndex + 1) % showcasePreviewImages.length;
    return [safeShowcaseActiveImageIndex, nextImageIndex].map((imageIndex) => ({
      image: showcasePreviewImages[imageIndex]!,
      imageIndex
    }));
  }, [isMobilePerformanceMode, safeShowcaseActiveImageIndex, showcasePreviewImages]);

  const handleShowcasePreviewStart = (): void => {
    if (showcasePreviewResetTimeoutRef.current !== null) {
      window.clearTimeout(showcasePreviewResetTimeoutRef.current);
      showcasePreviewResetTimeoutRef.current = null;
    }

    setIsShowcasePreviewActive(true);
  };

  const handleShowcasePreviewEnd = (): void => {
    setIsShowcasePreviewActive(false);
    if (showcasePreviewResetTimeoutRef.current !== null) {
      window.clearTimeout(showcasePreviewResetTimeoutRef.current);
    }

    showcasePreviewResetTimeoutRef.current = window.setTimeout(() => {
      setShowcaseActiveImageIndex(0);
      showcasePreviewResetTimeoutRef.current = null;
    }, SHOWCASE_PREVIEW_RESET_DELAY);
  };

  const suppressNextShowcaseClick = (): void => {
    suppressShowcaseClickRef.current = true;
    if (showcaseClickSuppressionTimeoutRef.current !== null) {
      window.clearTimeout(showcaseClickSuppressionTimeoutRef.current);
    }

    showcaseClickSuppressionTimeoutRef.current = window.setTimeout(() => {
      suppressShowcaseClickRef.current = false;
      showcaseClickSuppressionTimeoutRef.current = null;
    }, SHOWCASE_CLICK_SUPPRESSION_MS);
  };

  const startShowcaseSwipe = (source: ShowcaseSwipeState['source'], id: number, startX: number, startY: number): void => {
    if (showcaseSwipeRef.current) {
      return;
    }

    showcaseSwipeRef.current = {
      id,
      source,
      startX,
      startY
    };

    showcase.pauseShowcaseCarousel();
    handleShowcasePreviewStart();
  };

  const updateShowcaseSwipe = (
    source: ShowcaseSwipeState['source'],
    id: number,
    currentX: number,
    currentY: number,
    preventDefault: () => void
  ): void => {
    const swipe = showcaseSwipeRef.current;
    if (!swipe || swipe.source !== source || swipe.id !== id) {
      return;
    }

    const deltaX = currentX - swipe.startX;
    const deltaY = currentY - swipe.startY;
    if (Math.abs(deltaX) > SHOWCASE_SWIPE_INTENT_PX && Math.abs(deltaX) > Math.abs(deltaY)) {
      preventDefault();
    }
  };

  const finishShowcaseSwipe = (source: ShowcaseSwipeState['source'], id: number, currentX: number, currentY: number): void => {
    const swipe = showcaseSwipeRef.current;
    if (!swipe || swipe.source !== source || swipe.id !== id) {
      return;
    }

    showcaseSwipeRef.current = null;

    const deltaX = currentX - swipe.startX;
    const deltaY = currentY - swipe.startY;
    const isSwipe = Math.abs(deltaX) >= SHOWCASE_SWIPE_TRIGGER_PX && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;

    if (isSwipe) {
      suppressNextShowcaseClick();
      showcase.moveShowcase(deltaX < 0 ? 'right' : 'left');
    }

    handleShowcasePreviewEnd();
    showcase.scheduleShowcaseCarouselResume();
  };

  const cancelShowcaseSwipe = (source: ShowcaseSwipeState['source'], id: number): void => {
    const swipe = showcaseSwipeRef.current;
    if (!swipe || swipe.source !== source || swipe.id !== id) {
      return;
    }

    showcaseSwipeRef.current = null;
    handleShowcasePreviewEnd();
    showcase.scheduleShowcaseCarouselResume();
  };

  const getTouchAt = (touches: ReactTouchEvent<HTMLDivElement>['touches'], index: number): ShowcaseTouchPoint | undefined => {
    const touch = typeof touches.item === 'function' ? touches.item(index) : touches[index];
    return touch ?? undefined;
  };

  const getChangedTouch = (touches: ReactTouchEvent<HTMLDivElement>['touches'], identifier: number): ShowcaseTouchPoint | undefined => {
    for (let index = 0; index < touches.length; index += 1) {
      const touch = getTouchAt(touches, index);
      if (touch?.identifier === identifier) {
        return touch;
      }
    }

    return undefined;
  };

  const handleShowcasePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (heroShowcaseProducts.length <= 1 || isInteractiveShowcaseTarget(event.target)) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    startShowcaseSwipe('pointer', event.pointerId, event.clientX, event.clientY);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleShowcasePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    updateShowcaseSwipe('pointer', event.pointerId, event.clientX, event.clientY, () => event.preventDefault());
  };

  const handleShowcasePointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const swipe = showcaseSwipeRef.current;
    if (!swipe || swipe.source !== 'pointer' || swipe.id !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishShowcaseSwipe('pointer', event.pointerId, event.clientX, event.clientY);
  };

  const handleShowcasePointerCancel = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const swipe = showcaseSwipeRef.current;
    if (!swipe || swipe.source !== 'pointer' || swipe.id !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    cancelShowcaseSwipe('pointer', event.pointerId);
  };

  const handleShowcaseTouchStart = (event: ReactTouchEvent<HTMLDivElement>): void => {
    if (heroShowcaseProducts.length <= 1 || event.touches.length !== 1 || isInteractiveShowcaseTarget(event.target)) {
      return;
    }

    const touch = getTouchAt(event.touches, 0);
    if (!touch) {
      return;
    }

    startShowcaseSwipe('touch', touch.identifier, touch.clientX, touch.clientY);
  };

  const handleShowcaseTouchMove = (event: ReactTouchEvent<HTMLDivElement>): void => {
    const swipe = showcaseSwipeRef.current;
    if (!swipe || swipe.source !== 'touch') {
      return;
    }

    const touch = getChangedTouch(event.touches, swipe.id);
    if (!touch) {
      return;
    }

    updateShowcaseSwipe('touch', swipe.id, touch.clientX, touch.clientY, () => undefined);
  };

  const handleShowcaseTouchEnd = (event: ReactTouchEvent<HTMLDivElement>): void => {
    const swipe = showcaseSwipeRef.current;
    if (!swipe || swipe.source !== 'touch') {
      return;
    }

    const touch = getChangedTouch(event.changedTouches, swipe.id);
    if (!touch) {
      cancelShowcaseSwipe('touch', swipe.id);
      return;
    }

    finishShowcaseSwipe('touch', swipe.id, touch.clientX, touch.clientY);
  };

  const handleShowcaseTouchCancel = (): void => {
    const swipe = showcaseSwipeRef.current;
    if (!swipe || swipe.source !== 'touch') {
      return;
    }

    cancelShowcaseSwipe('touch', swipe.id);
  };

  const heroBackgroundImageUrl =
    banner?.backgroundImage?.url && !isKnownUnavailableDemoAsset(banner.backgroundImage.url)
      ? appendBannerVersion(getHeroBackgroundUrl(banner.backgroundImage.url, isMobilePerformanceMode), banner.updatedAt)
      : undefined;
  const heroTopRightImage = banner?.heroCornerImage;
  const heroTopRightImageUrl = heroTopRightImage?.url
    ? appendBannerVersion(getHeroBadgeImageUrl(heroTopRightImage.url, isMobilePerformanceMode), banner?.updatedAt)
    : undefined;
  const heroTopRightImageEnabled = resolveHeroCornerImageEnabled(banner?.heroCornerImageEnabled);
  const heroTopRightImageSize = normalizeHeroCornerImageSize(banner?.heroCornerImageSize);
  const heroBottomLeftImage = banner?.heroBottomLeftImage;
  const heroBottomLeftImageUrl = heroBottomLeftImage?.url
    ? appendBannerVersion(getHeroBadgeImageUrl(heroBottomLeftImage.url, isMobilePerformanceMode), banner?.updatedAt)
    : undefined;
  const heroBottomLeftImageEnabled = resolveHeroCornerImageEnabled(banner?.heroBottomLeftImageEnabled);
  const heroBottomLeftImageSize = normalizeHeroCornerImageSize(banner?.heroBottomLeftImageSize);
  const heroBottomRightImage = banner?.heroBottomRightImage;
  const heroBottomRightImageUrl = heroBottomRightImage?.url
    ? appendBannerVersion(getHeroBadgeImageUrl(heroBottomRightImage.url, isMobilePerformanceMode), banner?.updatedAt)
    : undefined;
  const heroBottomRightImageEnabled = resolveHeroCornerImageEnabled(banner?.heroBottomRightImageEnabled);
  const heroBottomRightImageSize = normalizeHeroCornerImageSize(banner?.heroBottomRightImageSize);
  const heroSurfaceStyle: CSSProperties & Record<'--hero-surface-image', string> = {
    '--hero-surface-image': heroBackgroundImageUrl
      ? `linear-gradient(140deg, rgba(7, 14, 27, 0.88), rgba(7, 14, 27, 0.68)), url(${heroBackgroundImageUrl})`
      : 'linear-gradient(145deg, rgba(5, 12, 28, 1), rgba(8, 18, 38, 1) 58%, rgba(7, 12, 22, 1))',
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };

  const heroVisualImage = heroSpotlightPreviewImages[0];
  const heroVisualImageUrl = heroVisualImage?.url ? getHeroVisualFallbackUrl(heroVisualImage.url, isMobilePerformanceMode) : undefined;
  const heroVisualImageSrcSet = heroVisualImage?.url ? heroVisualImage.srcSet ?? buildCloudinaryImageSrcSet(heroVisualImage.url, HERO_VISUAL_IMAGE_WIDTHS) : undefined;
  const heroVisualImageSizes =
    isMobilePerformanceMode
      ? MOBILE_HERO_IMAGE_SIZES
      : heroVisualImage?.sizes ?? '(max-width: 1023px) 92vw, (min-width: 1280px) 18rem, 14.5rem';
  const heroSpotlightTitle = heroSpotlightProduct?.name ?? 'Premium storefront picks';
  const heroSpotlightProductHref = heroSpotlightProduct?.slug ? `/product/${heroSpotlightProduct.slug}` : undefined;
  const currentShowcaseRatings = resolveProductRatings(currentShowcaseProduct?.ratings);
  const heroSupportItems = [
    {
      icon: ShieldCheck,
      label: 'Official stock',
      detail: 'Brand-backed warranty on curated devices.'
    },
    {
      icon: Truck,
      label: 'Islandwide delivery',
      detail: 'Fast dispatch to major cities and islandwide routes.'
    },
    {
      icon: RefreshCw,
      label: 'Quote-first checkout',
      detail: 'Get pricing guidance before you commit to the order.'
    }
  ] as const;

  const automaticShowcaseFeatureItems = useMemo<BannerShowcaseFeatureItemDto[]>(() => {
    if (!currentShowcaseProduct) {
      return [];
    }

    const availability = currentShowcaseProduct.stock > 0 ? `${currentShowcaseProduct.stock} in stock` : 'Quote on request';
    const rating = currentShowcaseRatings.count > 0 ? `${currentShowcaseRatings.average.toFixed(1)} stars` : 'New arrival';
    const momentum =
      currentShowcaseProduct.discountPercentage > 0
        ? `${currentShowcaseProduct.discountPercentage}% off`
        : currentShowcaseProduct.isBestSeller
          ? 'Best seller'
          : currentShowcaseProduct.isFeatured
            ? 'Featured now'
            : 'Store pick';

    return [
      { icon: 'storage', label: 'Availability', value: availability },
      { icon: 'display', label: 'Customer rating', value: rating },
      { icon: 'chip', label: 'Momentum', value: momentum }
    ];
  }, [
    currentShowcaseProduct?.discountPercentage,
    currentShowcaseProduct?.isBestSeller,
    currentShowcaseProduct?.isFeatured,
    currentShowcaseProduct?.stock,
    currentShowcaseRatings.average,
    currentShowcaseRatings.count
  ]);

  const configuredShowcaseFeatureItems = useMemo(
    () => (banner?.showcaseFeatureGroups ?? []).find((group) => group.productId === currentShowcaseProduct?.id)?.items ?? [],
    [banner?.showcaseFeatureGroups, currentShowcaseProduct?.id]
  );
  const showcaseFeatureItems = configuredShowcaseFeatureItems.length ? configuredShowcaseFeatureItems : automaticShowcaseFeatureItems;
  const showcaseSupportText =
    currentShowcaseRatings.count > 0
      ? `${currentShowcaseRatings.average.toFixed(1)} stars • ${currentShowcaseRatings.count} reviews`
      : 'Freshly curated';
  const showcaseDescriptionText = currentShowcaseProduct?.shortDescription?.trim() || showcaseSupportText;
  const showcaseMetaChips = useMemo<ShowcaseMetaChip[]>(
    () =>
      currentShowcaseProduct
        ? [
            { icon: ShieldCheck, label: 'Official warranty' },
            { icon: Star, label: 'Store pick' },
            { icon: Truck, label: currentShowcaseProduct.stock > 0 ? 'Islandwide delivery' : 'Quote-first support' }
          ]
        : [],
    [currentShowcaseProduct?.stock]
  );

  const openCurrentShowcaseProduct = (): void => {
    if (!currentShowcaseProduct?.slug) {
      return;
    }

    navigate(`/product/${currentShowcaseProduct.slug}`);
  };

  const handleShowcaseClick = (): void => {
    if (suppressShowcaseClickRef.current) {
      return;
    }

    openCurrentShowcaseProduct();
  };

  const topRightBadge =
    heroTopRightImageEnabled &&
    heroTopRightImage?.url &&
    heroTopRightImageUrl &&
    !isKnownUnavailableDemoAsset(heroTopRightImage.url) &&
    !failedImageUrls[heroTopRightImage.url]
      ? {
          image: heroTopRightImage,
          imageUrl: heroTopRightImageUrl,
          imageSize: heroTopRightImageSize
        }
      : undefined;
  const bottomLeftBadge =
    heroBottomLeftImageEnabled &&
    heroBottomLeftImage?.url &&
    heroBottomLeftImageUrl &&
    !isKnownUnavailableDemoAsset(heroBottomLeftImage.url) &&
    !failedImageUrls[heroBottomLeftImage.url]
      ? {
          image: heroBottomLeftImage,
          imageUrl: heroBottomLeftImageUrl,
          imageSize: heroBottomLeftImageSize
        }
      : undefined;
  const bottomRightBadge =
    heroBottomRightImageEnabled &&
    heroBottomRightImage?.url &&
    heroBottomRightImageUrl &&
    !isKnownUnavailableDemoAsset(heroBottomRightImage.url) &&
    !failedImageUrls[heroBottomRightImage.url]
      ? {
          image: heroBottomRightImage,
          imageUrl: heroBottomRightImageUrl,
          imageSize: heroBottomRightImageSize
        }
      : undefined;

  return (
    <section className="page-shell py-1.5 sm:py-4 lg:py-4">
      <div className="w-full sm:rounded-[1.5rem] sm:border sm:border-white/[0.05] sm:bg-white/[0.02] sm:p-2.5 sm:shadow-[0_22px_48px_rgba(3,10,26,0.18)] lg:p-3">
        <div className="grid items-start gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(18.25rem,1fr)] lg:items-stretch xl:grid-cols-[minmax(0,1.84fr)_minmax(18.75rem,1fr)]">
          <div
            className="theme-hero-surface page-enter relative isolate overflow-hidden rounded-[1rem] border border-[rgba(255,255,255,0.1)] p-2 shadow-[0_12px_26px_rgba(0,0,0,0.16)] sm:rounded-[1.35rem] sm:p-4 sm:shadow-[0_20px_44px_rgba(0,0,0,0.22)] lg:flex lg:h-full lg:flex-col lg:p-4"
            style={heroSurfaceStyle}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.14),transparent_24%),radial-gradient(circle_at_68%_36%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(104deg,rgba(7,14,27,0.9)_0%,rgba(7,14,27,0.8)_38%,rgba(7,14,27,0.42)_68%,rgba(7,14,27,0.22)_100%)]" />
            <div className="pointer-events-none absolute left-[58%] top-[18%] hidden h-44 w-44 rounded-full bg-gold/10 blur-3xl lg:block" />

            <div className="relative z-[1] grid gap-2 sm:gap-3.5 lg:h-full lg:grid-rows-[minmax(0,1fr)_auto]">
              <div className="grid gap-2 sm:gap-3.5 lg:h-full lg:grid-cols-[minmax(0,1.02fr)_minmax(15.5rem,0.98fr)] lg:items-stretch lg:gap-4 xl:grid-cols-[minmax(0,1.04fr)_minmax(17rem,0.96fr)]">
                <div className="max-w-[30rem] p-1 sm:p-3 lg:flex lg:h-full lg:flex-col">
                  <div className="flex h-full flex-col gap-2.5 sm:gap-5">
                    <span className="hero-badge-shimmer inline-flex max-w-max self-start items-center gap-1.5 rounded-full border border-gold/20 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(212,175,55,0.06))] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-gold shadow-[0_8px_18px_rgba(212,175,55,0.1)] sm:gap-2.5 sm:px-3.5 sm:py-1.5 sm:text-[10px] sm:tracking-[0.28em] sm:shadow-[0_10px_24px_rgba(212,175,55,0.12)]">
                      <Sparkles className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                      {banner?.campaignLabel ?? 'NJ Store'}
                    </span>
                    <div className="space-y-2 sm:space-y-3.5">
                      <h1 className="max-w-[20rem] font-display text-[1.28rem] leading-[1.02] text-[rgba(255,255,255,0.98)] drop-shadow-[0_3px_14px_rgba(2,6,23,0.42)] [text-wrap:balance] sm:max-w-[24.5rem] sm:text-[2.02rem] sm:leading-[0.92] lg:max-w-[23.5rem] lg:text-[2.2rem] xl:max-w-[24.5rem] xl:text-[2.35rem]">
                        {banner?.title ?? t('hero.title')}
                      </h1>
                      <p className="line-clamp-2 max-w-[22rem] text-[11px] leading-[1.05rem] text-[rgba(232,238,247,0.88)] drop-shadow-[0_2px_10px_rgba(2,6,23,0.34)] [text-wrap:pretty] sm:max-w-[24.5rem] sm:text-[13.5px] sm:leading-6">
                        {banner?.subtitle ?? t('hero.subtitle')}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5 sm:max-w-[24.5rem] sm:gap-2.5 sm:pt-1">
                      <Link to={banner?.ctaUrl ?? '/shop'} className="inline-flex shrink-0">
                        <Button size="sm" className="h-9 w-full justify-center rounded-full px-2.5 text-[12px] sm:h-11 sm:px-4 sm:text-[13px]">
                          {banner?.ctaText ?? t('cta.shop')}
                        </Button>
                      </Link>
                      <Link to="/shop?condition=used" className="inline-flex shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="inline-flex h-9 w-full items-center justify-center rounded-full border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.05)] px-2.5 text-[12px] text-[rgba(255,255,255,0.94)] transition-colors hover:border-[rgba(255,255,255,0.76)] hover:bg-[rgba(255,255,255,0.12)] hover:text-[rgba(255,255,255,0.98)] sm:h-11 sm:px-4 sm:text-[13px]"
                        >
                          {t('cta.usedItems')}
                        </Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5 sm:max-w-[25rem] sm:gap-2.5 sm:pt-1 lg:mt-auto">
                      {[
                        {
                          icon: ShieldCheck,
                          label: banner?.accentText?.trim() || 'Official warranty on curated devices'
                        },
                        { icon: Recycle, label: 'Quality used devices' }
                      ].map(({ icon: Icon, label }) => (
                        <div
                          key={label}
                          className="flex min-h-[2.7rem] items-center gap-1.5 rounded-[0.75rem] border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] px-2 py-1.5 shadow-[0_8px_16px_rgba(0,0,0,0.08)] sm:min-h-[4.5rem] sm:gap-3 sm:rounded-[1rem] sm:px-3.5 sm:py-3 sm:shadow-[0_14px_28px_rgba(0,0,0,0.12)]"
                        >
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/18 bg-gold/10 text-gold sm:h-9 sm:w-9">
                            <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                          </span>
                          <span className="line-clamp-2 text-[9.5px] font-medium leading-[0.875rem] text-[rgba(240,244,250,0.86)] [text-wrap:balance] sm:text-[11px] sm:leading-5">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block">
                  {heroSpotlightProductHref ? (
                    <Link
                      to={heroSpotlightProductHref}
                      aria-label={`Open hero spotlight ${heroSpotlightProduct?.name ?? 'product'}`}
                      className="group relative flex h-full min-h-[18.75rem] items-center justify-center overflow-hidden rounded-[1.45rem] border border-[rgba(255,255,255,0.12)] bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.14),rgba(255,255,255,0.04)_54%,rgba(255,255,255,0)_76%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(7,14,27,0.1))] p-3.5 shadow-[0_20px_42px_rgba(0,0,0,0.16)] backdrop-blur-md transition-transform duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_28px_54px_rgba(0,0,0,0.22)]"
                    >
                      <div className="pointer-events-none absolute inset-x-[18%] top-[18%] h-24 rounded-full bg-gold/10 blur-3xl transition-opacity duration-300 motion-safe:group-hover:opacity-90" />
                      <div className="pointer-events-none absolute inset-x-[20%] bottom-[22%] h-20 rounded-full bg-white/10 blur-3xl transition-opacity duration-300 motion-safe:group-hover:opacity-90" />

                      <div className="absolute left-4 top-4 z-[3] max-w-[13rem] rounded-[1rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(7,14,27,0.3)] px-3 py-2 backdrop-blur-md transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1">
                        <p className="line-clamp-2 font-display text-[1rem] leading-tight text-[rgba(255,255,255,0.96)]">{heroSpotlightTitle}</p>
                      </div>
                      {topRightBadge ? (
                        <HeroCornerImageBadge
                          image={topRightBadge.image}
                          imageUrl={topRightBadge.imageUrl}
                          imageSize={topRightBadge.imageSize}
                          positionClassName="right-4 top-4"
                          fallbackAlt="Top right hero badge"
                          onError={markImageFailed}
                        />
                      ) : null}
                      {bottomLeftBadge ? (
                        <HeroCornerImageBadge
                          image={bottomLeftBadge.image}
                          imageUrl={bottomLeftBadge.imageUrl}
                          imageSize={bottomLeftBadge.imageSize}
                          positionClassName="bottom-4 left-4"
                          fallbackAlt="Bottom left hero badge"
                          onError={markImageFailed}
                        />
                      ) : null}
                      {bottomRightBadge ? (
                        <HeroCornerImageBadge
                          image={bottomRightBadge.image}
                          imageUrl={bottomRightBadge.imageUrl}
                          imageSize={bottomRightBadge.imageSize}
                          positionClassName="bottom-4 right-4"
                          fallbackAlt="Bottom right hero badge"
                          onError={markImageFailed}
                        />
                      ) : null}

                      <div className="relative z-[1] flex h-[14.5rem] w-[14.5rem] items-center justify-center xl:h-[15.5rem] xl:w-[15.5rem]">
                        {heroVisualImage ? (
                          <img
                            src={heroVisualImageUrl}
                            srcSet={heroVisualImageSrcSet}
                            alt={heroVisualImage.alt ?? heroSpotlightProduct?.name ?? 'Featured product'}
                            loading="eager"
                            ref={setHighImageFetchPriority}
                            decoding="async"
                            width={288}
                            height={288}
                            sizes={heroVisualImageSizes}
                            className="h-full w-full object-contain object-center drop-shadow-[0_30px_48px_rgba(0,0,0,0.42)] transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
                            onError={() => {
                              markImageFailed(heroVisualImage.url);
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] text-gold shadow-[0_24px_40px_rgba(0,0,0,0.24)] transition-transform duration-300 ease-out motion-safe:group-hover:scale-105">
                            <Sparkles className="h-14 w-14" />
                          </div>
                        )}
                      </div>

                      {heroSpotlightProduct ? (
                        <div className="absolute bottom-5 left-1/2 z-[3] -translate-x-1/2 rounded-full border border-gold/25 bg-[rgba(7,14,27,0.34)] px-3 py-2 backdrop-blur-md transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1">
                          <span className="font-mono text-[0.96rem] text-gold">{formatCurrency(heroSpotlightProduct.price)}</span>
                        </div>
                      ) : null}
                    </Link>
                  ) : (
                    <div className="relative flex h-full min-h-[18.75rem] items-center justify-center overflow-hidden rounded-[1.45rem] border border-[rgba(255,255,255,0.12)] bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.14),rgba(255,255,255,0.04)_54%,rgba(255,255,255,0)_76%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(7,14,27,0.1))] p-3.5 shadow-[0_20px_42px_rgba(0,0,0,0.16)] backdrop-blur-md">
                      <div className="pointer-events-none absolute inset-x-[18%] top-[18%] h-24 rounded-full bg-gold/10 blur-3xl" />
                      <div className="pointer-events-none absolute inset-x-[20%] bottom-[22%] h-20 rounded-full bg-white/10 blur-3xl" />

                      <div className="absolute left-4 top-4 z-[3] max-w-[13rem] rounded-[1rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(7,14,27,0.3)] px-3 py-2 backdrop-blur-md">
                        <p className="line-clamp-2 font-display text-[1rem] leading-tight text-[rgba(255,255,255,0.96)]">{heroSpotlightTitle}</p>
                      </div>
                      {topRightBadge ? (
                        <HeroCornerImageBadge
                          image={topRightBadge.image}
                          imageUrl={topRightBadge.imageUrl}
                          imageSize={topRightBadge.imageSize}
                          positionClassName="right-4 top-4"
                          fallbackAlt="Top right hero badge"
                          onError={markImageFailed}
                        />
                      ) : null}
                      {bottomLeftBadge ? (
                        <HeroCornerImageBadge
                          image={bottomLeftBadge.image}
                          imageUrl={bottomLeftBadge.imageUrl}
                          imageSize={bottomLeftBadge.imageSize}
                          positionClassName="bottom-4 left-4"
                          fallbackAlt="Bottom left hero badge"
                          onError={markImageFailed}
                        />
                      ) : null}
                      {bottomRightBadge ? (
                        <HeroCornerImageBadge
                          image={bottomRightBadge.image}
                          imageUrl={bottomRightBadge.imageUrl}
                          imageSize={bottomRightBadge.imageSize}
                          positionClassName="bottom-4 right-4"
                          fallbackAlt="Bottom right hero badge"
                          onError={markImageFailed}
                        />
                      ) : null}

                      <div className="relative z-[1] flex h-[14.5rem] w-[14.5rem] items-center justify-center xl:h-[15.5rem] xl:w-[15.5rem]">
                        {heroVisualImage ? (
                          <img
                            src={heroVisualImageUrl}
                            srcSet={heroVisualImageSrcSet}
                            alt={heroVisualImage.alt ?? heroSpotlightProduct?.name ?? 'Featured product'}
                            loading="eager"
                            ref={setHighImageFetchPriority}
                            decoding="async"
                            width={288}
                            height={288}
                            sizes={heroVisualImageSizes}
                            className="h-full w-full object-contain object-center drop-shadow-[0_30px_48px_rgba(0,0,0,0.42)] transition-transform duration-500 ease-out"
                            onError={() => {
                              markImageFailed(heroVisualImage.url);
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] text-gold shadow-[0_24px_40px_rgba(0,0,0,0.24)]">
                            <Sparkles className="h-14 w-14" />
                          </div>
                        )}
                      </div>

                      {heroSpotlightProduct ? (
                        <div className="absolute bottom-5 left-1/2 z-[3] -translate-x-1/2 rounded-full border border-gold/25 bg-[rgba(7,14,27,0.34)] px-3 py-2 backdrop-blur-md">
                          <span className="font-mono text-[0.96rem] text-gold">{formatCurrency(heroSpotlightProduct.price)}</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {heroSupportItems.map(({ icon: Icon, label, detail }) => (
                  <div
                    key={label}
                    className="rounded-[0.75rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(7,14,27,0.24)] p-1.5 backdrop-blur-md sm:rounded-[1rem] sm:p-2.5"
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/14 text-gold sm:h-8 sm:w-8">
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                      <p className="line-clamp-2 text-[7.5px] font-semibold uppercase leading-[0.7rem] tracking-[0.12em] text-[rgba(232,238,247,0.68)] sm:text-[10px] sm:leading-normal sm:tracking-[0.22em]">
                        {label}
                      </p>
                    </div>
                    <p className="mt-1.5 hidden text-[10.5px] leading-4 text-[rgba(255,255,255,0.82)] sm:mt-2 sm:block sm:text-[11px] sm:leading-5">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <MobileHeroSpotlightPoster
            product={heroSpotlightProduct}
            productHref={heroSpotlightProductHref}
            visualImage={heroVisualImage}
            topRightBadge={topRightBadge}
            bottomLeftBadge={bottomLeftBadge}
            bottomRightBadge={bottomRightBadge}
            formatCurrency={formatCurrency}
            onImageError={markImageFailed}
            imageSizes={heroVisualImageSizes}
          />
          {!heroSpotlightProduct && isLoading ? (
            <Card
              aria-hidden="true"
              className="home-showcase-card-surface page-enter h-[18.75rem] overflow-hidden rounded-[1.1rem] border border-white/10 bg-[linear-gradient(145deg,#252f38_0%,#1a212a_52%,#111821_100%)] p-0 shadow-[0_18px_34px_rgba(3,10,26,0.2)] sm:h-[21rem] sm:rounded-[1.35rem] md:h-[21.75rem] lg:hidden"
            >
              <div className="flex h-full flex-col justify-between p-5">
                <Skeleton className="h-10 w-2/3 rounded-full" />
                <Skeleton className="mx-auto h-40 w-40 rounded-[2rem] sm:h-48 sm:w-48" />
                <Skeleton className="mx-auto h-8 w-28 rounded-full" />
              </div>
            </Card>
          ) : null}

          {currentShowcaseProduct ? (
            <Card
              role="link"
              tabIndex={0}
              aria-label={`Open ${currentShowcaseProduct.name}`}
              className="home-showcase-card-surface page-enter group cursor-pointer select-none touch-pan-y overflow-hidden rounded-[1.1rem] border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,252,245,0.98)_56%,rgba(247,250,252,1)_100%)] p-0 shadow-[0_10px_22px_rgba(15,23,42,0.05)] transition-[transform,border-color,box-shadow] duration-500 ease-out hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_20px_38px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:rounded-[2rem] sm:shadow-[0_18px_38px_rgba(15,23,42,0.06)] sm:hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)] lg:h-full lg:min-h-[21.75rem]"
              bodyClassName="h-full"
              onClick={handleShowcaseClick}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) {
                  return;
                }

                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openCurrentShowcaseProduct();
                }
              }}
              onMouseEnter={showcase.pauseShowcaseCarousel}
              onMouseLeave={() => showcase.scheduleShowcaseCarouselResume()}
              onPointerDown={handleShowcasePointerDown}
              onPointerMove={handleShowcasePointerMove}
              onPointerUp={handleShowcasePointerUp}
              onPointerCancel={handleShowcasePointerCancel}
              onTouchStart={handleShowcaseTouchStart}
              onTouchMove={handleShowcaseTouchMove}
              onTouchEnd={handleShowcaseTouchEnd}
              onTouchCancel={handleShowcaseTouchCancel}
            >
              <div className="relative flex h-[25.75rem] flex-col overflow-hidden p-2 min-[430px]:h-[25rem] sm:h-auto sm:min-h-[18.5rem] sm:p-4 lg:h-full lg:min-h-[21.75rem] lg:px-4 lg:pb-3.5 lg:pt-3.5">
                <div className="pointer-events-none absolute inset-x-8 top-0 h-10 rounded-full bg-gold/10 blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-80 sm:h-16" />
                <ShowcasePanel
                  product={currentShowcaseProduct}
                  productCount={heroShowcaseProducts.length}
                  transitionDirection={showcase.showcaseTransitionDirection}
                  previewImages={renderedShowcasePreviewImages}
                  safeActiveImageIndex={safeShowcaseActiveImageIndex}
                  supportText={showcaseSupportText}
                  descriptionText={showcaseDescriptionText}
                  featureItems={showcaseFeatureItems}
                  metaChips={showcaseMetaChips}
                  formatCurrency={formatCurrency}
                  onMove={showcase.moveShowcase}
                  onPreviewStart={handleShowcasePreviewStart}
                  onPreviewEnd={handleShowcasePreviewEnd}
                  onImageError={markImageFailed}
                  isMobilePerformanceMode={isMobilePerformanceMode}
                />
              </div>
            </Card>
          ) : isLoading ? (
            <Card
              aria-hidden="true"
              className="home-showcase-card-surface page-enter h-[25.75rem] overflow-hidden rounded-[1.1rem] border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,252,245,0.98)_56%,rgba(247,250,252,1)_100%)] p-0 shadow-[0_10px_22px_rgba(15,23,42,0.05)] min-[430px]:h-[25rem] sm:h-auto sm:min-h-[18.5rem] sm:rounded-[2rem] lg:h-full lg:min-h-[21.75rem]"
            >
              <div className="flex h-full flex-col justify-between p-4">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="mx-auto h-48 w-48 rounded-[2rem] sm:h-52 sm:w-52" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-2/3 rounded-full" />
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-10 w-full rounded-[1rem]" />
                </div>
              </div>
            </Card>
          ) : (
            <div className="hidden" />
          )}
        </div>
      </div>
    </section>
  );
};
