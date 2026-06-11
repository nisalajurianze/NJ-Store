import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShoppingBag, X } from 'lucide-react';
import type { ImageAsset } from '@njstore/types';
import { useCart } from '../../context/CartContext';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { ProgressiveImage } from '../media/ProgressiveImage';

const AUTO_DISMISS_MS = 7000;

const resolveCartNoticeImage = (
  product: NonNullable<ReturnType<typeof useCart>['recentlyAddedItem']>['product'],
  variantIndex?: number
): ImageAsset | undefined => {
  const selectedVariant = variantIndex !== undefined ? product.variants?.[variantIndex] : undefined;
  return selectedVariant?.images?.[0] ?? product.thumbnail ?? product.previewImages?.[0] ?? product.images?.[0];
};

const resolveVariantLabel = (
  product: NonNullable<ReturnType<typeof useCart>['recentlyAddedItem']>['product'],
  variantIndex?: number
): string | undefined => {
  const selectedVariant = variantIndex !== undefined ? product.variants?.[variantIndex] : undefined;
  if (!selectedVariant) {
    return undefined;
  }

  return [selectedVariant.color, selectedVariant.storage, selectedVariant.model]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' / ');
};

export const CartAddDrawer = (): JSX.Element | null => {
  const { cart, recentlyAddedItem, dismissRecentlyAddedItem } = useCart();
  const { formatCurrency } = useCurrencyFormatter();

  useEffect(() => {
    if (!recentlyAddedItem) {
      return undefined;
    }

    const timer = window.setTimeout(dismissRecentlyAddedItem, AUTO_DISMISS_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [dismissRecentlyAddedItem, recentlyAddedItem]);

  const itemImage = useMemo(
    () => (recentlyAddedItem ? resolveCartNoticeImage(recentlyAddedItem.product, recentlyAddedItem.variantIndex) : undefined),
    [recentlyAddedItem]
  );
  const variantLabel = useMemo(
    () => (recentlyAddedItem ? resolveVariantLabel(recentlyAddedItem.product, recentlyAddedItem.variantIndex) : undefined),
    [recentlyAddedItem]
  );

  if (!recentlyAddedItem) {
    return null;
  }

  const unitPrice =
    recentlyAddedItem.variantIndex !== undefined
      ? recentlyAddedItem.product.variants?.[recentlyAddedItem.variantIndex]?.price ?? recentlyAddedItem.product.price
      : recentlyAddedItem.product.price;
  const cartItemCount = cart?.itemCount ?? cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? recentlyAddedItem.quantity;

  return (
    <aside
      className="page-enter fixed inset-x-3 top-[calc(4.65rem+env(safe-area-inset-top))] z-[90] mx-auto max-w-[27rem] rounded-[1.35rem] border border-white/12 bg-[linear-gradient(145deg,rgba(11,17,29,0.98),rgba(19,27,40,0.96))] p-3.5 text-white shadow-[0_18px_42px_rgba(0,0,0,0.3)] backdrop-blur-md transition-[opacity,transform] duration-300 sm:inset-x-auto sm:right-5 sm:top-24 sm:w-[25.5rem] sm:p-4 sm:shadow-[0_24px_60px_rgba(0,0,0,0.36)] sm:backdrop-blur-xl lg:z-40"
      role="region"
      aria-label="Added to cart"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] border border-white/12 bg-white/[0.06] sm:h-[4.5rem] sm:w-[4.5rem]">
          {itemImage ? (
            <ProgressiveImage
              src={itemImage.url}
              srcSet={itemImage.srcSet}
              sizes="4.5rem"
              alt={itemImage.alt ?? recentlyAddedItem.product.name}
              loading="lazy"
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <ShoppingBag className="h-6 w-6 text-gold" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Added to cart
              </p>
              <h2 className="mt-1 line-clamp-1 text-sm font-semibold leading-5 text-white sm:text-[0.98rem]">
                {recentlyAddedItem.product.name}
              </h2>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-gray-300 transition-colors duration-200 hover:bg-white/[0.12] hover:text-white"
              aria-label="Close added to cart panel"
              onClick={dismissRecentlyAddedItem}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-gray-300">
            {variantLabel ? <span className="line-clamp-1">{variantLabel}</span> : null}
            <span>Qty {recentlyAddedItem.quantity}</span>
            <span className="font-mono text-gold">{formatCurrency(unitPrice)}</span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-white/[0.045] px-3 py-2">
            <span className="text-xs text-gray-300">
              {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in cart
            </span>
            <Link
              to="/cart"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-gold px-3.5 text-xs font-semibold text-dark transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(212,175,55,0.22)]"
              onClick={dismissRecentlyAddedItem}
            >
              View Cart
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
};
