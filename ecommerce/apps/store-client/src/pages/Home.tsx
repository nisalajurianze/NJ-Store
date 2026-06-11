import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type PropsWithChildren } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck, Star, Truck } from 'lucide-react';
import { SectionHeading, Skeleton } from '@njstore/ui';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { useInView } from '../hooks/useInView';
import { useFastMotionPreference } from '../hooks/useFastMotionPreference';
import { useWishlist } from '../hooks/useWishlist';
import { homeService } from '../services/homeService';
import { newsletterService } from '../services/newsletterService';
import { productService } from '../services/productService';
import { STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME, STOREFRONT_PRODUCT_GRID_CLASSNAME } from '../components/product/productCardLayout';
import { HeroSection } from '../components/home/HeroSection';
import { NewsletterBanner } from '../components/home/NewsletterBanner';
import { RevealSection } from '../components/home/RevealSection';
import { getApiErrorMessage } from '../utils/apiError';
import { recoverFromChunkLoadError, withChunkRecovery } from '../utils/chunkRecovery';
import { toast } from '../utils/lazyToast';
import { dedupeByStableKey } from '../utils/productList';

const homeSectionQueryOptions = {
  staleTime: 5 * 60_000,
  refetchOnMount: false
} as const;
const shouldRenderDeferredSectionsImmediately = import.meta.env.MODE === 'test';
const DEFERRED_HOME_SECTION_FAST_ROOT_MARGIN = '960px 0px';
const DEFERRED_HOME_SECTION_DEFAULT_ROOT_MARGIN = '720px 0px';
let homeProductCardPromise: Promise<typeof import('../components/product/ProductCard')> | null = null;
const preloadHomeProductCard = (): Promise<typeof import('../components/product/ProductCard')> => {
  homeProductCardPromise ??= withChunkRecovery(() => import('../components/product/ProductCard'), 'home-product-card');
  return homeProductCardPromise;
};
const HomeProductCard = lazy(async () => ({
  default: (await preloadHomeProductCard()).ProductCard
}));

let adSlotGridPromise: Promise<typeof import('../components/home/AdSlotGrid')> | null = null;
const preloadAdSlotGrid = (): Promise<typeof import('../components/home/AdSlotGrid')> => {
  adSlotGridPromise ??= withChunkRecovery(() => import('../components/home/AdSlotGrid'), 'home-ad-slot-grid');
  return adSlotGridPromise;
};
const LazyAdSlotGrid = lazy(async () => ({
  default: (await preloadAdSlotGrid()).AdSlotGrid
}));

let brandCarouselPromise: Promise<typeof import('../components/home/BrandCarousel')> | null = null;
const preloadBrandCarousel = (): Promise<typeof import('../components/home/BrandCarousel')> => {
  brandCarouselPromise ??= withChunkRecovery(() => import('../components/home/BrandCarousel'), 'home-brand-carousel');
  return brandCarouselPromise;
};
const LazyBrandCarousel = lazy(async () => ({
  default: (await preloadBrandCarousel()).BrandCarousel
}));

let featuredCarouselPromise: Promise<typeof import('../components/home/FeaturedCarousel')> | null = null;
const preloadFeaturedCarousel = (): Promise<typeof import('../components/home/FeaturedCarousel')> => {
  featuredCarouselPromise ??= withChunkRecovery(() => import('../components/home/FeaturedCarousel'), 'home-featured-carousel');
  return featuredCarouselPromise;
};
const LazyFeaturedCarousel = lazy(async () => ({
  default: (await preloadFeaturedCarousel()).FeaturedCarousel
}));

let featurePromoPromise: Promise<typeof import('../components/home/FeaturePromo')> | null = null;
const preloadFeaturePromo = (): Promise<typeof import('../components/home/FeaturePromo')> => {
  featurePromoPromise ??= withChunkRecovery(() => import('../components/home/FeaturePromo'), 'home-feature-promo');
  return featurePromoPromise;
};
const LazyFeaturePromo = lazy(async () => ({
  default: (await preloadFeaturePromo()).FeaturePromo
}));

let flashDealsRailPromise: Promise<typeof import('../components/home/FlashDealsRail')> | null = null;
const preloadFlashDealsRail = (): Promise<typeof import('../components/home/FlashDealsRail')> => {
  flashDealsRailPromise ??= withChunkRecovery(() => import('../components/home/FlashDealsRail'), 'home-flash-deals-rail');
  return flashDealsRailPromise;
};
const LazyFlashDealsRail = lazy(async () => ({
  default: (await preloadFlashDealsRail()).FlashDealsRail
}));

const DeferredHomeSection = ({
  children,
  minHeight = 320,
  onWarmup
}: PropsWithChildren<{ minHeight?: number; onWarmup?: () => void }>): JSX.Element => {
  const fastMotion = useFastMotionPreference();
  const { ref, inView } = useInView({
    rootMargin: fastMotion ? DEFERRED_HOME_SECTION_FAST_ROOT_MARGIN : DEFERRED_HOME_SECTION_DEFAULT_ROOT_MARGIN,
    threshold: 0.01,
    triggerOnce: true,
    deferWhileScrolling: false
  });
  const [shouldRender, setShouldRender] = useState(() => shouldRenderDeferredSectionsImmediately);

  useEffect(() => {
    if (inView) {
      onWarmup?.();
      setShouldRender(true);
    }
  }, [inView, onWarmup]);

  const deferredStyle = useMemo<CSSProperties & { containIntrinsicSize?: string }>(
    () => ({
      contentVisibility: 'auto',
      containIntrinsicSize: `${minHeight}px`,
      ...(fastMotion || !shouldRender ? { minHeight } : {})
    }),
    [fastMotion, minHeight, shouldRender]
  );

  return (
    <div
      ref={(node) => {
        ref.current = node;
      }}
      style={deferredStyle}
    >
      {shouldRender ? children : null}
    </div>
  );
};

export const Home = (): JSX.Element => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatCurrency } = useCurrencyFormatter();
  const wishlist = useWishlist();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
  const cachedGuestHomeFeed = useMemo(() => (user ? undefined : homeService.readCachedFeed()), [user]);
  const warmHomeProductCards = useCallback((): void => {
    void preloadHomeProductCard().catch((error) => recoverFromChunkLoadError(error, 'warm-home-product-card'));
  }, []);
  const warmFlashDealsRail = useCallback((): void => {
    void preloadFlashDealsRail().catch((error) => recoverFromChunkLoadError(error, 'warm-flash-deals-rail'));
    void preloadHomeProductCard().catch((error) => recoverFromChunkLoadError(error, 'warm-flash-product-card'));
  }, []);
  const warmFeaturedCarousel = useCallback((): void => {
    void preloadFeaturedCarousel().catch((error) => recoverFromChunkLoadError(error, 'warm-featured-carousel'));
    void preloadHomeProductCard().catch((error) => recoverFromChunkLoadError(error, 'warm-featured-product-card'));
  }, []);
  const warmAdSlotGrid = useCallback((): void => {
    void preloadAdSlotGrid().catch((error) => recoverFromChunkLoadError(error, 'warm-ad-slot-grid'));
  }, []);
  const warmFeaturePromo = useCallback((): void => {
    void preloadFeaturePromo().catch((error) => recoverFromChunkLoadError(error, 'warm-feature-promo'));
  }, []);
  const warmBrandCarousel = useCallback((): void => {
    void preloadBrandCarousel().catch((error) => recoverFromChunkLoadError(error, 'warm-brand-carousel'));
  }, []);
  const trustBadges = [
    { icon: ShieldCheck, label: t('home.trust.secure.label'), detail: t('home.trust.secure.detail') },
    { icon: Star, label: t('home.trust.warranty.label'), detail: t('home.trust.warranty.detail') },
    { icon: Truck, label: t('home.trust.delivery.label'), detail: t('home.trust.delivery.detail') },
    { icon: RefreshCw, label: t('home.trust.returns.label'), detail: t('home.trust.returns.detail') }
  ];
  const homeStats = [t('home.stats.customers'), t('home.stats.reviews'), t('home.stats.stock'), t('home.stats.newsletter')];

  const homeFeedQuery = useQuery({
    queryKey: ['home-feed', user?.id ?? 'guest'],
    queryFn: async () => {
      const response = await homeService.feed();
      if (!user) {
        homeService.writeCachedFeed(response.data);
      }
      return response;
    },
    initialData: cachedGuestHomeFeed ? { data: cachedGuestHomeFeed.data } : undefined,
    initialDataUpdatedAt: cachedGuestHomeFeed?.cachedAt,
    ...homeSectionQueryOptions
  });

  const homeFeed = homeFeedQuery.data?.data;
  const activeHeroBanner = homeFeed?.banner?.isActive ? homeFeed.banner : null;
  const featuredItems = homeFeed?.featured ?? [];
  const latestItems = homeFeed?.latest ?? [];
  const flashDealItems = homeFeed?.flashDeals ?? [];
  const wantedItems = homeFeed?.wantedProducts ?? [];
  const brands = homeFeed?.brands ?? [];
  const recentItems = useMemo(
    () =>
      dedupeByStableKey(user ? homeFeed?.recentlyViewed ?? [] : productService.getLocalRecentlyViewed(), (item) => item.id ?? item.slug),
    [homeFeed?.recentlyViewed, user]
  );

  const handleNewsletterSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!newsletterEmail.trim()) {
      toast.error(t('home.toast.enterEmail'));
      return;
    }

    try {
      setIsNewsletterSubmitting(true);
      await newsletterService.subscribe({
        email: newsletterEmail.trim(),
        source: 'home-page'
      });
      toast.success(t('home.toast.subscribed'));
      setNewsletterEmail('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('home.toast.subscribeError')));
    } finally {
      setIsNewsletterSubmitting(false);
    }
  };

  return (
    <div className="has-mobile-tabs">
      <HeroSection
        banner={activeHeroBanner}
        featuredItems={featuredItems}
        flashDealItems={flashDealItems}
        formatCurrency={formatCurrency}
        isLoading={homeFeedQuery.isPending}
      />

      <DeferredHomeSection minHeight={flashDealItems.length ? 520 : 260} onWarmup={warmFlashDealsRail}>
        <Suspense fallback={null}>
          <LazyFlashDealsRail
            products={flashDealItems}
            isLoading={homeFeedQuery.isPending}
            pendingWishlistProductId={wishlist.pendingProductId}
            isWishlisted={wishlist.isWishlisted}
            onWishlistToggle={wishlist.toggleWishlist}
          />
        </Suspense>
      </DeferredHomeSection>

      <DeferredHomeSection minHeight={560} onWarmup={warmFeaturedCarousel}>
        <Suspense fallback={null}>
          <LazyFeaturedCarousel
            products={featuredItems}
            pendingWishlistProductId={wishlist.pendingProductId}
            isWishlisted={wishlist.isWishlisted}
            onWishlistToggle={wishlist.toggleWishlist}
          />
        </Suspense>
      </DeferredHomeSection>

      {wantedItems.length ? (
        <DeferredHomeSection minHeight={560} onWarmup={warmHomeProductCards}>
          <RevealSection className="page-shell py-6 sm:py-8 lg:py-10">
            <SectionHeading
              eyebrow={t('home.wanted.eyebrow')}
              title={t('home.wanted.title')}
              size="compact"
              description={t('home.wanted.description')}
            />
            <div className={`mt-4 sm:mt-6 ${STOREFRONT_PRODUCT_GRID_CLASSNAME}`}>
              {wantedItems.slice(0, 4).map((product) => (
                <Suspense key={product.id} fallback={<Skeleton className={STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME} />}>
                  <HomeProductCard
                    product={product}
                    isWishlisted={wishlist.isWishlisted(product.id)}
                    isWishlistPending={wishlist.pendingProductId === product.id}
                    onWishlistToggle={wishlist.toggleWishlist}
                  />
                </Suspense>
              ))}
            </div>
          </RevealSection>
        </DeferredHomeSection>
      ) : null}

      <DeferredHomeSection minHeight={360} onWarmup={warmAdSlotGrid}>
        <Suspense fallback={null}>
          <LazyAdSlotGrid slots={activeHeroBanner?.adSlots} />
        </Suspense>
      </DeferredHomeSection>

      <DeferredHomeSection minHeight={560} onWarmup={warmHomeProductCards}>
        <RevealSection className="page-shell py-6 sm:py-8 lg:py-10">
          <SectionHeading
            eyebrow={t('home.latest.eyebrow')}
            title={t('home.latest.title')}
            size="compact"
            description={t('home.latest.description')}
          />
          <div className={`mt-4 sm:mt-6 ${STOREFRONT_PRODUCT_GRID_CLASSNAME}`}>
            {latestItems.length
              ? latestItems.map((product) => (
                  <Suspense key={product.id} fallback={<Skeleton className={STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME} />}>
                    <HomeProductCard
                      product={product}
                      isWishlisted={wishlist.isWishlisted(product.id)}
                      isWishlistPending={wishlist.pendingProductId === product.id}
                      onWishlistToggle={wishlist.toggleWishlist}
                    />
                  </Suspense>
                ))
              : Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className={STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME} />
                ))}
          </div>
        </RevealSection>
      </DeferredHomeSection>

      <DeferredHomeSection minHeight={420} onWarmup={warmFeaturePromo}>
        <Suspense fallback={null}>
          <LazyFeaturePromo promo={activeHeroBanner?.featurePromo} />
        </Suspense>
      </DeferredHomeSection>

      <DeferredHomeSection minHeight={220} onWarmup={warmBrandCarousel}>
        <Suspense fallback={null}>
          <LazyBrandCarousel brands={brands} isLoading={homeFeedQuery.isPending} />
        </Suspense>
      </DeferredHomeSection>

      {recentItems.length ? (
        <DeferredHomeSection minHeight={560} onWarmup={warmHomeProductCards}>
          <RevealSection className="page-shell py-8 lg:py-10">
            <SectionHeading
              eyebrow={t('home.recent.eyebrow')}
              title={t('home.recent.title')}
              size="compact"
              description={t('home.recent.description')}
            />
            <div className={`mt-6 ${STOREFRONT_PRODUCT_GRID_CLASSNAME}`}>
              {recentItems.slice(0, 4).map((product) => (
                <Suspense key={product.id} fallback={<Skeleton className={STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME} />}>
                  <HomeProductCard
                    product={product}
                    isWishlisted={wishlist.isWishlisted(product.id)}
                    isWishlistPending={wishlist.pendingProductId === product.id}
                    onWishlistToggle={wishlist.toggleWishlist}
                  />
                </Suspense>
              ))}
            </div>
          </RevealSection>
        </DeferredHomeSection>
      ) : null}

      <DeferredHomeSection minHeight={260}>
        <RevealSection className="page-shell py-4 lg:py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {trustBadges.map(({ icon: Icon, label, detail }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 rounded-[1.05rem] border border-white/10 bg-white/[0.03] p-3 text-center sm:p-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[0.9rem] bg-gold/10">
                  <Icon className="h-4 w-4 text-gold" />
                </div>
                <p className="text-[13px] font-medium text-white">{label}</p>
                <p className="text-[11px] leading-[1rem] text-gray-500">{detail}</p>
              </div>
            ))}
          </div>
        </RevealSection>
      </DeferredHomeSection>

      <DeferredHomeSection minHeight={120}>
        <RevealSection className="page-shell py-2">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-[1.25rem] border border-white/8 bg-white/[0.02] px-6 py-3">
            {homeStats.map((item) => (
              <span key={item} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="h-1 w-1 rounded-full bg-gold" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </RevealSection>
      </DeferredHomeSection>

      <DeferredHomeSection minHeight={360}>
        <NewsletterBanner
          email={newsletterEmail}
          isSubmitting={isNewsletterSubmitting}
          onEmailChange={setNewsletterEmail}
          onSubmit={handleNewsletterSubmit}
        />
      </DeferredHomeSection>
    </div>
  );
};
