import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CartProductSnapshotDto, ProductCardDto, ProductDetailDto } from '@njstore/types';
import { ArrowRight, Bookmark, ExternalLink, ImageOff, Minus, Plus, ShoppingCart, Sparkles, Trash2, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, SectionHeading, Tooltip } from '@njstore/ui';
import { formatEstimatedDeliveryWindow } from '@njstore/utils/businessDays';
import { analytics } from '../analytics/analytics';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { CartSummary } from '../components/cart/CartSummary';
import { StoreBreadcrumbs } from '../components/layout/StoreBreadcrumbs';
import { ProductCard } from '../components/product/ProductCard';
import { STOREFRONT_PRODUCT_GRID_CLASSNAME } from '../components/product/productCardLayout';
import { findPreferredVariantIndex } from '../components/product/productVariantUtils';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { useImageFallback } from '../hooks/useImageFallback';
import { useWishlist } from '../hooks/useWishlist';
import { productService } from '../services/productService';
import { siteConfigService } from '../services/siteConfigService';
import { isKnownUnavailableDemoAsset } from '../utils/imageAssets';
import { toast } from '../utils/lazyToast';

const CART_ACTION_TOOLTIP_CLASSNAME = 'bottom-auto top-[calc(100%+0.5rem)]';
const CART_UPSELL_ACTION_TOOLTIP_CLASSNAME = 'bottom-auto left-auto right-[calc(100%+0.65rem)] top-1/2 -translate-y-1/2 translate-x-0';

const resolveUpsellVariantIndex = (product: ProductDetailDto): number | undefined => {
  const variants = product.variants ?? [];

  if (product.productType === 'bundle' || variants.length === 0) {
    return undefined;
  }

  return findPreferredVariantIndex(variants);
};

const CartLoadingState = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className="page-shell page-nav-gap pb-0" aria-busy="true">
      <SectionHeading title={t('cart.loading.title')} description={t('cart.loading.description')} size="compact" />
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_332px] xl:gap-6">
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="rounded-[24px] p-4 sm:p-5">
              <div className="animate-pulse">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-white/10 sm:h-16 sm:w-16" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-40 rounded-full bg-white/10" />
                      <div className="h-3 w-24 rounded-full bg-white/10" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                    <div className="h-10 w-28 rounded-lg bg-white/10" />
                    <div className="h-9 w-24 rounded-lg bg-white/10" />
                    <div className="h-9 w-20 rounded-lg bg-white/10" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-3 xl:sticky xl:top-24 xl:self-start">
          <Card className="rounded-[24px] p-5">
            <div className="animate-pulse space-y-3">
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="h-6 w-40 rounded-full bg-white/10" />
              <div className="h-3 w-48 rounded-full bg-white/10" />
            </div>
          </Card>
          <Card className="rounded-[24px] p-5">
            <div className="animate-pulse space-y-3">
              <div className="h-3 w-20 rounded-full bg-white/10" />
              <div className="h-5 w-36 rounded-full bg-white/10" />
              <div className="h-3 w-52 rounded-full bg-white/10" />
              <div className="h-3 w-full rounded-full bg-white/10" />
              <div className="h-3 w-full rounded-full bg-white/10" />
            </div>
          </Card>
          <div className="h-11 rounded-xl bg-white/10 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export const Cart = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const wishlist = useWishlist();
  const { cart, loading, addItem, removeItem, updateItem } = useCart();
  const { formatCurrency } = useCurrencyFormatter();
  const { isImageFailed: isCartImageFailed, markImageFailed: markCartImageFailed } = useImageFallback();
  const { isImageFailed: isUpsellImageFailed, markImageFailed: markUpsellImageFailed } = useImageFallback();
  const [pendingSaveForLaterItemId, setPendingSaveForLaterItemId] = useState<string | null>(null);
  const [pendingUpsellProductId, setPendingUpsellProductId] = useState<string | null>(null);
  const trackedCartSignatureRef = useRef<string | null>(null);
  const hasCartItems = Boolean(cart?.items.length);
  const isInitialCartLoad = loading && !hasCartItems;

  const siteConfigQuery = useQuery({
    queryKey: ['site-config'],
    queryFn: () => siteConfigService.get(),
    staleTime: 5 * 60_000
  });

  const upsellProductsQuery = useQuery({
    queryKey: [
      'cart-upsells',
      cart?.items.map((item) => `${item.product.id}:${item.quantity}:${item.variantIndex ?? 'base'}`).join(',') ?? ''
    ],
    enabled: hasCartItems,
    queryFn: async () => {
      if (!cart?.items.length) {
        return { data: [] as ProductCardDto[] };
      }

      return productService.upsell({
        items: cart.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          variantIndex: item.variantIndex
        })),
        limit: 3
      });
    },
    staleTime: 30_000
  });

  const recentlyViewedQuery = useQuery({
    queryKey: ['cart', 'recently-viewed', user?.id],
    queryFn: () => productService.recentlyViewed(),
    enabled: Boolean(user),
    staleTime: 60_000
  });

  const estimatedDeliveryDays = useMemo(() => {
    const shippingRates = siteConfigQuery.data?.shippingRates;
    if (!shippingRates?.length) {
      return '2-5';
    }

    return shippingRates.find((rate) => rate.city.toLowerCase() === 'default')?.days ?? shippingRates[0].days ?? '2-5';
  }, [siteConfigQuery.data]);

  const estimatedDeliveryWindow = useMemo(() => formatEstimatedDeliveryWindow(estimatedDeliveryDays), [estimatedDeliveryDays]);
  const recentlyViewedProducts = useMemo(() => {
    if (user) {
      return (recentlyViewedQuery.data?.data ?? []).slice(0, 3);
    }

    if (typeof productService.getLocalRecentlyViewed !== 'function') {
      return [];
    }

    return productService.getLocalRecentlyViewed().slice(0, 3);
  }, [recentlyViewedQuery.data?.data, user]);

  useEffect(() => {
    if (!cart?.items.length) {
      return;
    }

    const signature = `${cart.id}:${cart.itemCount}:${cart.subtotal}`;
    if (trackedCartSignatureRef.current === signature) {
      return;
    }

    trackedCartSignatureRef.current = signature;
    analytics.trackCartViewed(cart);
  }, [cart]);

  if (isInitialCartLoad) {
    return <CartLoadingState />;
  }

  const handleUpsellAddToCart = async (product: ProductCardDto): Promise<void> => {
    setPendingUpsellProductId(product.id);
    try {
      const detail = (await productService.detail(product.slug)).data;
      const variantIndex = resolveUpsellVariantIndex(detail);

      await addItem({
        productId: detail.id || product.id,
        quantity: 1,
        variantIndex,
        product: detail
      });
      analytics.trackAddToCart({
        product: detail,
        quantity: 1,
        price: detail.price,
        origin: 'cart_upsell'
      });
      toast.success(t('cart.toast.added'));
    } catch {
      toast.error(t('cart.toast.addError'));
    } finally {
      setPendingUpsellProductId(null);
    }
  };

  const handleSaveForLater = async (itemId: string, product: CartProductSnapshotDto): Promise<void> => {
    if (!user) {
      toast.error(t('cart.toast.signInForWishlist'));
      navigate('/auth/login', { state: { from: '/cart' } });
      return;
    }

    setPendingSaveForLaterItemId(itemId);

    try {
      if (!wishlist.isWishlisted(product.id)) {
        await wishlist.toggleWishlist(product);
      }
      await removeItem(itemId);
      analytics.trackRemoveFromCart({
        product,
        quantity: 1,
        price: product.price,
        origin: 'save_for_later'
      });
      toast.success(t('cart.toast.movedToWishlist'));
    } catch {
      toast.error(t('cart.toast.moveError'));
    } finally {
      setPendingSaveForLaterItemId(null);
    }
  };

  if (!hasCartItems) {
    return (
      <div className="page-shell page-nav-gap pb-0">
        <StoreBreadcrumbs items={[{ label: t('cart.breadcrumb') }]} />
        <section data-testid="cart-empty-state" className="relative mx-auto max-w-5xl px-5 py-10 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute inset-x-6 top-5 h-40 rounded-full bg-gradient-to-r from-gold/20 via-cyan-400/10 to-emerald-400/10 blur-3xl" />
          <div className="relative mx-auto max-w-xl text-center">
            <div className="mx-auto w-full max-w-[300px] text-gray-200">
              <svg viewBox="-10 0 250 180" role="img" aria-label={t('cart.empty.illustrationAlt')} className="h-auto w-full">
                <defs>
                  <linearGradient id="cart-shell" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d4af37" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#f3d479" stopOpacity="0.55" />
                  </linearGradient>
                </defs>
                <rect x="28" y="48" width="190" height="82" rx="20" fill="none" stroke="url(#cart-shell)" strokeWidth="6" />
                <path d="M34 58 L12 30" stroke="#d4af37" strokeWidth="6" strokeLinecap="round" />
                <circle cx="84" cy="148" r="14" fill="#0f172a" stroke="#d4af37" strokeWidth="5" />
                <circle cx="188" cy="148" r="14" fill="#0f172a" stroke="#d4af37" strokeWidth="5" />
                <path d="M74 72 h121" stroke="#d4af37" strokeOpacity="0.6" strokeWidth="5" strokeLinecap="round" />
                <path d="M74 92 h121" stroke="#d4af37" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" />
                <path d="M74 112 h92" stroke="#d4af37" strokeOpacity="0.32" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="mt-4 font-display text-[2rem] leading-tight text-white sm:text-[2.25rem]">{t('cart.empty.title')}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-300">
              {t('cart.empty.description')}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/shop">
                <Button size="lg">{t('cart.empty.primaryCta')}</Button>
              </Link>
              <Link to={user ? '/dashboard/wishlist' : '/auth/login'} state={user ? undefined : { from: '/dashboard/wishlist' }}>
                <Button variant="secondary" size="lg">
                  {user ? t('cart.empty.secondaryCtaSignedIn') : t('cart.empty.secondaryCtaSignedOut')}
                </Button>
              </Link>
            </div>
            <div className="mx-auto mt-8 grid max-w-lg gap-3 text-center sm:max-w-none sm:grid-cols-3 sm:text-left">
              {[
                {
                  title: t('cart.empty.highlightQuoteTitle'),
                  description: t('cart.empty.highlightQuoteDescription')
                },
                {
                  title: t('cart.empty.highlightPricingTitle'),
                  description: t('cart.empty.highlightPricingDescription')
                },
                {
                  title: t('cart.empty.highlightWishlistTitle'),
                  description: t('cart.empty.highlightWishlistDescription')
                }
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-2 text-xs leading-5 text-gray-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {recentlyViewedProducts.length ? (
          <section className="mt-10">
            <SectionHeading
              eyebrow={t('cart.recent.eyebrow')}
              title={t('cart.recent.title')}
              description={t('cart.recent.description')}
              size="compact"
            />
            <div className={`mt-5 ${STOREFRONT_PRODUCT_GRID_CLASSNAME}`}>
              {recentlyViewedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlist.isWishlisted(product.id)}
                  isWishlistPending={wishlist.pendingProductId === product.id}
                  onWishlistToggle={wishlist.toggleWishlist}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  const cartData = cart;
  if (!cartData) {
    return <CartLoadingState />;
  }

  const handleQuantityChange = async (item: (typeof cartData.items)[number], nextQuantity: number): Promise<void> => {
    const safeQuantity = Math.max(1, nextQuantity);

    try {
      await updateItem(item.id, safeQuantity);
      analytics.trackCartQuantityUpdated({
        product: item.product,
        previousQuantity: item.quantity,
        nextQuantity: safeQuantity,
        unitPrice: item.lineTotal / Math.max(item.quantity, 1)
      });
    } catch {
      toast.error(t('cart.toast.quantityError'));
    }
  };

  const handleRemoveItem = async (item: (typeof cartData.items)[number]): Promise<void> => {
    try {
      await removeItem(item.id);
      analytics.trackRemoveFromCart({
        product: item.product,
        quantity: item.quantity,
        price: item.lineTotal / Math.max(item.quantity, 1),
        origin: 'cart'
      });
    } catch {
      toast.error(t('cart.toast.removeError'));
    }
  };

  return (
    <div className="page-shell page-nav-gap pb-0">
      <StoreBreadcrumbs items={[{ label: t('cart.breadcrumb') }]} />
      <div className="rounded-[20px] border border-white/10 bg-white/[0.035] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="font-display text-[1.18rem] leading-tight text-white sm:text-[1.38rem]">{t('cart.heading.title')}</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400 sm:text-[13px]">{t('cart.heading.description')}</p>
        </div>
        <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-medium text-gray-300 sm:mt-0">
          {cartData.itemCount} {t('cart.summary.items')}
        </span>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
        <div className="space-y-3.5">
          {cartData.items.map((item) => {
            const rawCartImageUrl = item.product.images?.[0]?.url ?? item.product.thumbnail?.url;
            const cartImageUrl = rawCartImageUrl && !isKnownUnavailableDemoAsset(rawCartImageUrl) ? rawCartImageUrl : undefined;
            const showCartImage = Boolean(cartImageUrl && !isCartImageFailed(cartImageUrl));

            return (
              <Card key={item.id} className="rounded-[22px] p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center sm:h-24 sm:w-24">
                      {showCartImage ? (
                        <img
                          src={cartImageUrl}
                          alt={item.product.name}
                          loading="lazy"
                          decoding="async"
                          width={96}
                          height={96}
                          className="max-h-full max-w-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.24)]"
                          onError={(event) => {
                            const failedUrl = event.currentTarget.currentSrc || event.currentTarget.src;
                            markCartImageFailed(failedUrl);
                          }}
                        />
                      ) : (
                        <ImageOff className="h-7 w-7 text-gray-500" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link to={`/product/${item.product.slug}`} className="hover:underline">
                        <h3 className="line-clamp-2 font-display text-[1.05rem] leading-snug text-white transition-colors hover:text-gold sm:text-[1.16rem]">
                          {item.product.name}
                        </h3>
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-xs text-gray-400 sm:text-sm">{item.product.brand}</p>
                        <span className="font-mono text-sm text-gold sm:text-[15px]">{formatCurrency(item.lineTotal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                    <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.045]">
                      <button
                        type="button"
                        className="flex h-10 w-9 items-center justify-center rounded-l-xl text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                        onClick={() => void handleQuantityChange(item, Math.max(1, item.quantity - 1))}
                        disabled={loading || item.quantity <= 1}
                        aria-label={t('cart.actions.decreaseQuantity', { productName: item.product.name })}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="flex h-10 min-w-[2.5rem] items-center justify-center border-x border-white/10 px-2 font-mono text-sm text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex h-10 w-9 items-center justify-center rounded-r-xl text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                        onClick={() => void handleQuantityChange(item, item.quantity + 1)}
                        disabled={loading}
                        aria-label={t('cart.actions.increaseQuantity', { productName: item.product.name })}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <Tooltip content={t('cart.actions.saveForLater')} contentClassName={CART_ACTION_TOOLTIP_CLASSNAME}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-10 w-10 px-0"
                        aria-label={t('cart.actions.saveForLater')}
                        onClick={() => void handleSaveForLater(item.id, item.product)}
                        isLoading={pendingSaveForLaterItemId === item.id}
                        disabled={loading}
                      >
                        <Bookmark className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Tooltip>
                    <Tooltip content={t('cart.actions.remove')} contentClassName={CART_ACTION_TOOLTIP_CLASSNAME}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 px-0 text-gray-400 hover:text-red-200"
                        aria-label={t('cart.actions.remove')}
                        onClick={() => void handleRemoveItem(item)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </Card>
            );
          })}

          {upsellProductsQuery.data?.data.length ? (
            <Card className="rounded-[22px] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('cart.upsell.eyebrow')}
                  </p>
                  <p className="mt-1.5 text-[13px] text-gray-300 sm:text-sm">{t('cart.upsell.description')}</p>
                </div>
                <Tooltip content={t('cart.upsell.viewCatalog')} contentClassName={CART_ACTION_TOOLTIP_CLASSNAME}>
                  <Link to="/shop">
                    <Button variant="secondary" size="sm" className="h-10 w-10 px-0" aria-label={t('cart.upsell.viewCatalog')}>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Link>
                </Tooltip>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upsellProductsQuery.data.data.map((product) => {
                  const rawImageUrl = product.thumbnail?.url ?? product.previewImages?.[0]?.url;
                  const imageUrl = rawImageUrl && !isKnownUnavailableDemoAsset(rawImageUrl) ? rawImageUrl : undefined;
                  const showImage = Boolean(imageUrl && !isUpsellImageFailed(imageUrl));

                  return (
                    <article key={product.id} className="transform-gpu rounded-[18px] border border-white/10 bg-white/[0.03] p-3 transition-[transform,border-color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.004] motion-safe:hover:border-white/16 motion-safe:hover:bg-white/[0.045] motion-safe:hover:will-change-transform motion-reduce:transform-none motion-reduce:transition-none">
                      <div className="flex items-center gap-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center">
                          {showImage ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                              width={64}
                              height={64}
                              className="max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)]"
                              onError={() => markUpsellImageFailed(imageUrl)}
                            />
                          ) : (
                            <ImageOff className="h-5 w-5 text-gray-500" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link to={`/product/${product.slug}`} className="text-sm font-medium text-white transition-colors hover:text-gold">
                            <span className="block line-clamp-2">{product.name}</span>
                          </Link>
                          <p className="mt-1 text-xs text-gray-400">{product.brand}</p>
                          <p className="mt-1.5 font-mono text-sm text-gold">{formatCurrency(product.price)}</p>
                        </div>
                        <Tooltip content={t('cart.upsell.addAccessory')} contentClassName={CART_UPSELL_ACTION_TOOLTIP_CLASSNAME}>
                          <Button
                            className="h-10 w-10 px-0"
                            size="sm"
                            aria-label={t('cart.upsell.addAccessory')}
                            onClick={() => void handleUpsellAddToCart(product)}
                            isLoading={pendingUpsellProductId === product.id}
                            disabled={loading}
                          >
                            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </Tooltip>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>
        <div className="space-y-2.5 xl:sticky xl:top-24 xl:self-start">
          <Card className="rounded-[18px] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.2)] sm:rounded-[20px] sm:p-5">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              {t('cart.delivery.eyebrow')}
            </p>
            <p className="mt-2 font-display text-[1.18rem] leading-tight text-white sm:text-[1.28rem]">{estimatedDeliveryWindow}</p>
            <p className="mt-2 text-xs leading-5 text-gray-300 sm:text-[13px]">
              {t('cart.delivery.descriptionPrefix')}{' '}
              <span className="font-medium text-white">{estimatedDeliveryDays}</span>{' '}
              {t('cart.delivery.descriptionSuffix')}
            </p>
          </Card>
          <CartSummary cart={cartData} />
          <Link to="/checkout" className="block">
            <Button className="h-11 w-full rounded-[16px] text-sm font-semibold shadow-[0_12px_26px_rgba(212,175,55,0.18)]" size="md">
              {t('cart.delivery.continue')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
