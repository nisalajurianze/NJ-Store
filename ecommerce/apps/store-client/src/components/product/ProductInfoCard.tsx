import type { ReactNode } from 'react';
import type { ProductDetailDto, ProductVariantDto } from '@njstore/types';
import { Badge, Card, StarRating } from '@njstore/ui';
import { ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isKnownUnavailableDemoAsset } from '../../utils/imageAssets';
import { ProgressiveImage } from '../media/ProgressiveImage';
import { VariantSelector } from './VariantSelector';
import type { VariantAttributeGroup, VariantAttributeKey, VariantSelection } from './productVariantUtils';

interface ProductInfoCardProps {
  product: ProductDetailDto;
  hasBrandLogo: boolean;
  averageRatingLabel: string;
  displayPrice: number;
  formatCurrency: (value: number) => string;
  selectedVariant?: ProductVariantDto;
  variantIndex?: number;
  variantGroups: VariantAttributeGroup[];
  selectedOptions: VariantSelection;
  sanitizedDescription: string;
  stockCount: number;
  buyActions: ReactNode;
  onBrandLogoError: () => void;
  onSelectVariantOption: (key: VariantAttributeKey, option: string) => void;
  onSelectVariantIndex: (index: number) => void;
}

export const ProductInfoCard = ({
  product,
  hasBrandLogo,
  averageRatingLabel,
  displayPrice,
  formatCurrency,
  selectedVariant,
  variantIndex,
  variantGroups,
  selectedOptions,
  sanitizedDescription,
  stockCount,
  buyActions,
  onBrandLogoError,
  onSelectVariantOption,
  onSelectVariantIndex
}: ProductInfoCardProps): JSX.Element => {
  const { t } = useTranslation();
  const comparePrice = product.comparePrice && product.comparePrice > displayPrice ? product.comparePrice : undefined;
  const savingsPercentage = comparePrice ? Math.max(1, Math.round(((comparePrice - displayPrice) / comparePrice) * 100)) : 0;

  return (
    <aside className="product-detail-sticky-panel space-y-4 xl:sticky">
      <Card className="rounded-[24px] border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.03))] p-4 shadow-[0_22px_70px_rgba(2,6,23,0.28)] sm:rounded-[26px] sm:p-5">
        <div className="mb-4 border-b border-white/10 pb-4">
          <div className="product-detail-heading-badges flex flex-wrap items-center gap-2.5">
            <p className="product-detail-eyebrow text-[11px] font-medium uppercase text-gold/90">{t('product.heading.eyebrow')}</p>
            {product.isBestSeller ? <Badge className="product-detail-status-badge product-detail-status-badge-warning" variant="warning">{t('product.badges.bestSeller')}</Badge> : null}
            {product.isFeatured ? <Badge className="product-detail-status-badge product-detail-status-badge-info" variant="info">{t('product.badges.featured')}</Badge> : null}
            <Badge className={`product-detail-status-badge ${stockCount > 0 ? 'product-detail-status-badge-success' : 'product-detail-status-badge-danger'}`} variant={stockCount > 0 ? 'success' : 'danger'}>
              {stockCount > 0 ? t('product.badges.inStock') : t('product.badges.outOfStock')}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 w-[5.75rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-1.5 shadow-[0_7px_16px_rgba(15,23,42,0.08)] backdrop-blur">
              {hasBrandLogo ? (
                <>
                  <span className="flex h-[68%] w-[82%] max-w-[4.75rem] items-center justify-center overflow-hidden">
                    <ProgressiveImage
                      src={product.brandLogoUrl}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      width={96}
                      height={48}
                      className="product-card-brand-logo product-card-brand-logo-badge"
                      onError={onBrandLogoError}
                    />
                  </span>
                  <span className="sr-only">{product.brand}</span>
                </>
              ) : (
                <span className="truncate text-sm font-semibold uppercase text-gold">{product.brand}</span>
              )}
            </span>
            <h1 className="min-w-0 flex-1 font-display text-[1.7rem] leading-[1.04] text-white sm:text-[1.95rem]">{product.name}</h1>
          </div>
          <p className="mt-2 text-[14px] leading-6 text-gray-400">{product.shortDescription}</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <StarRating value={product.ratings.average} />
              <span className="text-sm font-medium text-white">{averageRatingLabel}</span>
              <span className="text-sm text-gray-400">({product.ratings.count.toLocaleString()} {t('product.rating.reviews')})</span>
            </div>
          </div>
          <div className="min-w-0 sm:text-right">
            <p className="font-semibold text-[1.78rem] leading-none text-white sm:text-[1.95rem]">{formatCurrency(displayPrice)}</p>
            {comparePrice ? <p className="mt-2 text-sm text-gray-500 line-through">{formatCurrency(comparePrice)}</p> : null}
            {savingsPercentage > 0 ? <p className="mt-2 text-sm font-medium text-emerald-300">{t('product.pricing.saveToday', { percentage: savingsPercentage })}</p> : null}
          </div>
        </div>

        {product.productType === 'standard' && product.variants.length ? (
          <VariantSelector
            groups={variantGroups}
            onSelectOption={onSelectVariantOption}
            onSelectVariant={onSelectVariantIndex}
            selectedOptions={selectedOptions}
            selectedVariant={selectedVariant}
            selectedVariantIndex={variantIndex}
            variants={product.variants}
          />
        ) : null}

        {product.productType === 'bundle' && product.bundleItems.length ? (
          <div className="mt-6 rounded-[24px] border border-gold/15 bg-gold/5 p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold">{t('product.bundle.includes')}</p>
            <div className="mt-4 grid gap-3">
              {product.bundleItems.map((bundleItem) => (
                <Link
                  key={`${bundleItem.product}-${bundleItem.sku}`}
                  to={`/product/${bundleItem.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-gold/30 hover:bg-white/[0.05]"
                >
                  {bundleItem.image && !isKnownUnavailableDemoAsset(bundleItem.image.url) ? (
                    <ProgressiveImage
                      src={bundleItem.image.url}
                      alt={bundleItem.image.alt ?? bundleItem.name}
                      className="h-14 w-14 rounded-xl object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/10 text-gray-500">
                      <ImageOff className="h-4 w-4" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{bundleItem.name}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {t('product.bundle.qty')} {bundleItem.quantity}
                      {bundleItem.variantLabel ? ` · ${bundleItem.variantLabel}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className="prose prose-sm prose-invert mt-5 max-h-[9.5rem] max-w-none overflow-y-auto border-t border-white/10 pt-4 pr-2 text-[13.5px] leading-6 text-gray-300 [&_p]:my-0 [&_p]:leading-6"
          dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
        />

        {buyActions}
      </Card>
    </aside>
  );
};
