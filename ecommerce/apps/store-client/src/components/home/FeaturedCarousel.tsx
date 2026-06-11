import type { ProductCardDto, ProductDetailDto } from '@njstore/types';
import { lazy, Suspense, useMemo } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, SectionHeading, Skeleton } from '@njstore/ui';
import { useFeaturedCarousel } from '../../hooks/useFeaturedCarousel';
import {
  STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME,
  STOREFRONT_PRODUCT_CAROUSEL_SLIDE_CLASSNAME,
  STOREFRONT_PRODUCT_GRID_CLASSNAME
} from '../product/productCardLayout';
import { RevealSection } from './RevealSection';

const FeaturedProductCard = lazy(async () => ({
  default: (await import('../product/ProductCard')).ProductCard
}));

interface FeaturedCarouselProps {
  products: ProductCardDto[];
  pendingWishlistProductId?: string | null;
  isWishlisted: (productId: string) => boolean;
  onWishlistToggle: (product: ProductCardDto | ProductDetailDto) => void | Promise<unknown>;
}

export const FeaturedCarousel = ({
  products,
  pendingWishlistProductId,
  isWishlisted,
  onWishlistToggle
}: FeaturedCarouselProps): JSX.Element => {
  const { t } = useTranslation();
  const {
    featuredCarouselRef,
    isTouchFeaturedCarousel,
    isTouchFeaturedCarouselControlsVisible,
    beginFeaturedCarouselInteraction,
    beginFeaturedCardInteraction,
    endFeaturedCardInteraction,
    pauseFeaturedCarousel,
    resumeFeaturedCarousel,
    moveFeaturedCarousel,
    finalizeFeaturedCarouselInteraction,
    handleFeaturedCarouselScroll
  } = useFeaturedCarousel(products.length);

  const carouselItems = useMemo(() => (products.length > 1 ? [...products, ...products, ...products] : products), [products]);
  const hasControls = products.length > 1 && (!isTouchFeaturedCarousel || isTouchFeaturedCarouselControlsVisible);

  return (
    <RevealSection className="page-shell py-6 sm:py-8 lg:py-10">
      <SectionHeading
        eyebrow={t('featured.eyebrow')}
        title={t('featured.title')}
        size="compact"
        description={t('featured.description')}
        action={
          <Link to="/shop">
            <Button variant="secondary">
              {t('featured.viewAll')} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="featured-carousel-shell mt-4 sm:mt-6">
        {products.length ? (
          <>
            {hasControls ? (
              <>
                <button
                  type="button"
                  aria-label={t('featured.scrollLeft')}
                  className="featured-carousel-control featured-carousel-control--left"
                  onClick={() => moveFeaturedCarousel('left')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label={t('featured.scrollRight')}
                  className="featured-carousel-control featured-carousel-control--right"
                  onClick={() => moveFeaturedCarousel('right')}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
            <div
              ref={featuredCarouselRef}
              className="featured-carousel-viewport"
              onMouseEnter={pauseFeaturedCarousel}
              onMouseLeave={resumeFeaturedCarousel}
              onFocus={pauseFeaturedCarousel}
              onBlur={(event) => {
                if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
                  return;
                }

                resumeFeaturedCarousel();
              }}
              onScroll={handleFeaturedCarouselScroll}
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse') {
                  return;
                }

                beginFeaturedCarouselInteraction();
              }}
              onPointerUp={finalizeFeaturedCarouselInteraction}
              onPointerCancel={finalizeFeaturedCarouselInteraction}
            >
              {carouselItems.map((product, index) => (
                <div
                  key={`${product.id}-${index}`}
                  className={STOREFRONT_PRODUCT_CAROUSEL_SLIDE_CLASSNAME}
                  data-carousel-slide
                  onMouseEnter={pauseFeaturedCarousel}
                  onMouseLeave={resumeFeaturedCarousel}
                  onFocus={pauseFeaturedCarousel}
                  onBlur={(event) => {
                    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
                      return;
                    }

                    resumeFeaturedCarousel();
                  }}
                >
                  <Suspense fallback={<Skeleton className={STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME} />}>
                    <FeaturedProductCard
                      product={product}
                      isWishlisted={isWishlisted(product.id)}
                      isWishlistPending={pendingWishlistProductId === product.id}
                      onWishlistToggle={onWishlistToggle}
                      onInteractionStart={beginFeaturedCardInteraction}
                      onInteractionEnd={endFeaturedCardInteraction}
                    />
                  </Suspense>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={STOREFRONT_PRODUCT_GRID_CLASSNAME}>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className={STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME} />
            ))}
          </div>
        )}
      </div>
    </RevealSection>
  );
};
