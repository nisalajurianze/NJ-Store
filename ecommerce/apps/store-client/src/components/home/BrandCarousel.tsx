import type { PointerEvent } from 'react';
import type { BrandDto } from '@njstore/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SectionHeading, Skeleton } from '@njstore/ui';
import { useBrandCarousel } from '../../hooks/useBrandCarousel';
import { ProgressiveImage } from '../media/ProgressiveImage';
import { RevealSection } from './RevealSection';

interface BrandCarouselProps {
  brands: BrandDto[];
  isLoading: boolean;
}

export const BrandCarousel = ({ brands, isLoading }: BrandCarouselProps): JSX.Element => {
  const { t } = useTranslation();
  const {
    brandCarouselRef,
    visibleBrands,
    carouselItems,
    isTrackAnimating,
    trackStyle,
    failedLogoIds,
    handleBrandLogoError,
    moveBrandCarousel,
    pauseBrandCarousel,
    resumeBrandCarouselAfterBlur,
    handleBrandTrackTransitionEnd,
    beginBrandSwipe,
    completeBrandSwipe
  } = useBrandCarousel(brands);

  return (
    <RevealSection className="page-shell py-5 sm:py-8 lg:py-10">
      <div className="brand-carousel-heading">
        <SectionHeading
          eyebrow={t('brands.eyebrow')}
          title={t('brands.title')}
          size="compact"
          description={t('brands.description')}
        />
      </div>
      <div className="brand-carousel-shell mt-4 sm:mt-6">
        <button
          type="button"
          aria-label={t('brands.scrollLeft')}
          className="brand-carousel-control brand-carousel-control--left"
          onClick={() => moveBrandCarousel('left')}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label={t('brands.scrollRight')}
          className="brand-carousel-control brand-carousel-control--right"
          onClick={() => moveBrandCarousel('right')}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
        <div className="brand-carousel-fade brand-carousel-fade--left" aria-hidden="true" />
        <div className="brand-carousel-fade brand-carousel-fade--right" aria-hidden="true" />
        <div
          ref={brandCarouselRef}
          className="brand-carousel-viewport"
          onFocus={pauseBrandCarousel}
          onBlur={resumeBrandCarouselAfterBlur}
          onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
            if (event.pointerType === 'mouse') {
              return;
            }

            beginBrandSwipe(event.clientX, event.pointerId);
          }}
          onPointerUp={(event: PointerEvent<HTMLDivElement>) => {
            if (event.pointerType === 'mouse') {
              return;
            }

            completeBrandSwipe(event.clientX, event.pointerId);
          }}
          onPointerCancel={(event: PointerEvent<HTMLDivElement>) => {
            if (event.pointerType === 'mouse') {
              return;
            }

            completeBrandSwipe(undefined, event.pointerId);
          }}
        >
          {isLoading ? (
            <div className="brand-carousel-track">
              {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[4.8rem] w-[10.75rem] rounded-[24px]" />)}
            </div>
          ) : visibleBrands.length ? (
            <div
              className={`brand-carousel-track ${isTrackAnimating ? 'is-animating' : ''}`}
              style={trackStyle}
              onTransitionEnd={handleBrandTrackTransitionEnd}
            >
              {carouselItems.map((brand, index) => {
                const brandLogo = failedLogoIds[brand.id] ? undefined : brand.logoUrl;
                return (
                  <Link
                    key={`${brand.id}-${index}`}
                    to={`/shop?brand=${encodeURIComponent(brand.slug)}`}
                    className="brand-carousel-slide"
                    data-carousel-slide
                    aria-label={t('brands.shopProducts', { brandName: brand.name })}
                  >
                    <div className="brand-logo-shell flex h-[4.8rem] w-[10.75rem] items-center justify-center px-5 transition-[transform,opacity] hover:-translate-y-1">
                      <div className="brand-logo-frame">
                        {brandLogo ? (
                          <ProgressiveImage
                            src={brandLogo}
                            alt={`${brand.name} logo`}
                            className="brand-logo-image"
                            loading="lazy"
                            onError={() => handleBrandLogoError(brand.id)}
                          />
                        ) : (
                          <span className="brand-logo-fallback text-base font-semibold uppercase tracking-[0.24em]">{brand.name}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[4.8rem] items-center rounded-[24px] border border-dashed border-white/10 px-6 text-sm text-gray-500">
              {t('brands.empty')}
            </div>
          )}
        </div>
      </div>
    </RevealSection>
  );
};
