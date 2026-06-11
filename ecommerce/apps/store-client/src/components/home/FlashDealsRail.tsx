import { lazy, Suspense, useMemo } from 'react';
import type { ProductCardDto, ProductDetailDto } from '@njstore/types';
import { ArrowRight, TimerReset } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, Card, SectionHeading, Skeleton } from '@njstore/ui';
import { getCountdownParts, useCountdown } from '../../hooks/useCountdown';
import { STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME, STOREFRONT_PRODUCT_GRID_CLASSNAME } from '../product/productCardLayout';
import { RevealSection } from './RevealSection';

const FlashDealProductCard = lazy(async () => ({
  default: (await import('../product/ProductCard')).ProductCard
}));

interface FlashDealsRailProps {
  products: ProductCardDto[];
  isLoading: boolean;
  pendingWishlistProductId?: string | null;
  isWishlisted: (productId: string) => boolean;
  onWishlistToggle: (product: ProductCardDto | ProductDetailDto) => void | Promise<unknown>;
}

const formatFlashDeadline = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const renderFlashDeadlineBar = (
  deadline: string | null,
  label: string,
  countdownParts: ReturnType<typeof getCountdownParts>,
  unitLabels: string[]
): JSX.Element | null => {
  if (!deadline || !countdownParts) {
    return null;
  }

  return (
    <div
      className="flash-deadline-bar relative isolate z-[2] max-w-full overflow-hidden rounded-[16px] px-2.5 py-2 text-white min-[480px]:px-3"
      aria-label={`Flash deal countdown ends ${deadline}`}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,232,155,0.82),transparent)]" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(217,169,54,0.12))]" />

      <div className="relative z-[1] flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="flash-deadline-icon flex h-5 w-5 shrink-0 items-center justify-center rounded-full min-[480px]:h-[1.375rem] min-[480px]:w-[1.375rem]">
            <TimerReset className="h-3 w-3 min-[480px]:h-3.5 min-[480px]:w-3.5" aria-hidden="true" />
          </span>
          <p className="flash-deadline-label min-w-0 truncate text-[7px] font-semibold uppercase leading-none tracking-[0.13em] min-[390px]:text-[7.5px] min-[480px]:text-[8px] min-[480px]:tracking-[0.17em] sm:text-[8.5px]">
            {label}
          </p>
        </div>
        <div className="flash-deadline-pill flex shrink-0 items-center gap-1 rounded-full px-2 py-1">
          {countdownParts.map((part, index) => (
            <span key={part.label} className="flash-deadline-value whitespace-nowrap font-mono text-[9px] font-semibold leading-none min-[390px]:text-[10px] sm:text-[11px]">
              {part.value}
              <span className="flash-deadline-unit ml-0.5 font-sans text-[6px] font-semibold uppercase min-[390px]:text-[6.5px] sm:text-[7px]">
                {unitLabels[index]}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const FlashDealsRail = ({
  products,
  isLoading,
  pendingWishlistProductId,
  isWishlisted,
  onWishlistToggle
}: FlashDealsRailProps): JSX.Element => {
  const { t } = useTranslation();
  const { now } = useCountdown({ enabled: products.length > 0 });

  const nextFlashDeadline = useMemo(() => {
    const upcomingDeadlines = products
      .map((product) => product.flashDealEndsAt)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((value) => !Number.isNaN(value.getTime()) && value.getTime() > now)
      .sort((left, right) => left.getTime() - right.getTime());

    return upcomingDeadlines[0]?.toISOString();
  }, [now, products]);

  const countdown = useMemo(() => getCountdownParts(nextFlashDeadline, now), [nextFlashDeadline, now]);

  return (
    <RevealSection className="page-shell py-6 sm:py-8 lg:py-10">
      <SectionHeading
        eyebrow={t('flashDeals.eyebrow')}
        title={t('flashDeals.title')}
        size="compact"
        description={t('flashDeals.description')}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {countdown ? (
              <div className="rounded-full border border-gold/20 bg-gold/10 px-4 py-2 text-xs text-gold">
                {t('flashDeals.endsIn')} {countdown.map((part, index) => `${part.value}${[t('flashDeals.unitDays'), t('flashDeals.unitHours'), t('flashDeals.unitMinutes'), t('flashDeals.unitSeconds')][index]}`).join(' ')}
              </div>
            ) : null}
            <Link to="/shop?flashDeal=true">
              <Button variant="secondary">
                {t('flashDeals.viewAll')} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        }
      />
      <div className={`mt-4 sm:mt-6 ${STOREFRONT_PRODUCT_GRID_CLASSNAME}`}>
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className={STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME} />
            ))
          : products.length
            ? products.map((product) => {
                const productCountdown = getCountdownParts(product.flashDealEndsAt, now);
                const unitLabels = [
                  t('flashDeals.unitDays'),
                  t('flashDeals.unitHours'),
                  t('flashDeals.unitMinutes'),
                  t('flashDeals.unitSeconds')
                ];

                return (
                  <div key={product.id} className="flex min-w-0 flex-col gap-2.5 p-0 sm:gap-3">
                    {renderFlashDeadlineBar(
                      formatFlashDeadline(product.flashDealEndsAt),
                      t('flashDeals.endsSoon'),
                      productCountdown,
                      unitLabels
                    )}
                    <Suspense fallback={<Skeleton className={STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME} />}>
                      <FlashDealProductCard
                        product={product}
                        isWishlisted={isWishlisted(product.id)}
                        isWishlistPending={pendingWishlistProductId === product.id}
                        onWishlistToggle={onWishlistToggle}
                      />
                    </Suspense>
                  </div>
                );
              })
            : (
                <Card className="col-span-2 rounded-[22px] p-5 text-center sm:rounded-[28px] sm:p-8 md:col-span-2 xl:col-span-4">
                  <p className="text-sm uppercase tracking-[0.28em] text-gold">{t('flashDeals.emptyEyebrow')}</p>
                  <h3 className="mt-3 font-display text-[1.45rem] text-white sm:mt-4 sm:text-[2rem]">{t('flashDeals.emptyTitle')}</h3>
                  <p className="mt-2.5 text-[13px] leading-5 text-gray-400 sm:mt-3 sm:text-sm sm:leading-6">
                    {t('flashDeals.emptyDescription')}
                  </p>
                </Card>
              )}
      </div>
    </RevealSection>
  );
};
