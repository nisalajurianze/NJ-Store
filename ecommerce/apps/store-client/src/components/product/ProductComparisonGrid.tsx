import { Fragment, useMemo } from 'react';
import type { ProductComparisonDto } from '@njstore/types';
import { cn } from '@njstore/utils/cn';
import { Button, Card } from '@njstore/ui';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { ProgressiveImage } from '../media/ProgressiveImage';

interface ProductComparisonGridProps {
  products: ProductComparisonDto[];
  onRemove?: (productId: string) => void;
}

const normalizeSpecKey = (key: string): string => key.trim().toLowerCase();

const getComparisonSpecKeys = (products: ProductComparisonDto[]): string[] => {
  const seen = new Set<string>();

  return products.flatMap((product) =>
    product.specifications.flatMap((spec) => {
      const trimmedKey = spec.key.trim();

      if (!trimmedKey) {
        return [];
      }

      const normalizedKey = normalizeSpecKey(trimmedKey);

      if (seen.has(normalizedKey)) {
        return [];
      }

      seen.add(normalizedKey);
      return [trimmedKey];
    })
  );
};

const buildSpecificationLookup = (product: ProductComparisonDto): Map<string, string> =>
  new Map(
    product.specifications.flatMap((spec) => {
      const trimmedKey = spec.key.trim();
      const trimmedValue = spec.value.trim();

      if (!trimmedKey || !trimmedValue) {
        return [];
      }

      return [[normalizeSpecKey(trimmedKey), trimmedValue] as const];
    })
  );

const placeholderValue = '—';

export const ProductComparisonGrid = ({ products, onRemove }: ProductComparisonGridProps): JSX.Element => {
  const { formatCurrency } = useCurrencyFormatter();

  const comparisonSpecKeys = useMemo(() => getComparisonSpecKeys(products), [products]);
  const productSpecLookups = useMemo(() => products.map(buildSpecificationLookup), [products]);
  const comparisonRows = useMemo(
    () => [
      {
        label: 'Rating',
        values: products.map((product) => `${product.ratings.average.toFixed(1)} / 5`)
      },
      ...comparisonSpecKeys.map((specKey) => ({
        label: specKey,
        values: productSpecLookups.map((lookup) => lookup.get(normalizeSpecKey(specKey)) ?? placeholderValue)
      }))
    ],
    [comparisonSpecKeys, productSpecLookups, products]
  );

  const renderBrandBadge = (product: ProductComparisonDto): JSX.Element => (
    product.brandLogoUrl ? (
      <span className="mt-3 inline-flex h-9 max-w-28 items-center justify-center rounded-2xl border border-white/10 bg-white px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
        <ProgressiveImage
          src={product.brandLogoUrl}
          alt={`${product.brand} logo`}
          loading="lazy"
          decoding="async"
          sizes="96px"
          className="max-h-5 max-w-[5.5rem] object-contain"
        />
      </span>
    ) : (
      <p className="mt-2 text-sm text-gray-400">{product.brand}</p>
    )
  );

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:hidden">
        {products.map((product, productIndex) => (
          <Card key={product.id} className="h-full rounded-3xl p-6">
            <div className="flex h-full flex-col">
              <div>
                <h3 className="font-display text-2xl text-white">{product.name}</h3>
                {renderBrandBadge(product)}
                <p className="mt-4 font-mono text-gold">{formatCurrency(product.price)}</p>
                {product.comparePrice ? <p className="text-xs text-gray-500 line-through">{formatCurrency(product.comparePrice)}</p> : null}
              </div>

              <div className="mt-6 flex-1 space-y-3 text-sm text-gray-300">
                {comparisonRows.map((row) => (
                  <div
                    key={`${product.id}-${row.label}`}
                    className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-start gap-3 border-b border-white/6 pb-3 last:border-b-0 last:pb-0"
                  >
                    <span className="text-gray-400">{row.label}</span>
                    <span className={cn('break-words text-right text-white', row.values[productIndex] === placeholderValue && 'text-gray-500')}>
                      {row.values[productIndex]}
                    </span>
                  </div>
                ))}
              </div>

              {onRemove ? (
                <Button variant="secondary" className="mt-6 w-full" onClick={() => onRemove(product.id)}>
                  Remove
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[58rem] gap-4"
            style={{
              gridTemplateColumns: `minmax(10rem, 12rem) repeat(${Math.max(products.length, 1)}, minmax(15rem, 1fr))`
            }}
          >
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
              Details
            </div>

            {products.map((product) => (
              <Card key={product.id} className="flex h-full rounded-3xl p-6">
                <div className="flex h-full w-full flex-col">
                  <div>
                    <h3 className="font-display text-2xl text-white">{product.name}</h3>
                    {renderBrandBadge(product)}
                    <p className="mt-4 font-mono text-gold">{formatCurrency(product.price)}</p>
                    {product.comparePrice ? <p className="text-xs text-gray-500 line-through">{formatCurrency(product.comparePrice)}</p> : null}
                  </div>

                  {onRemove ? (
                    <Button variant="secondary" className="mt-6 w-full" onClick={() => onRemove(product.id)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}

            {comparisonRows.map((row) => (
              <Fragment key={row.label}>
                <div className="flex items-center rounded-[1.6rem] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-medium text-gray-300">
                  {row.label}
                </div>

                {row.values.map((value, valueIndex) => (
                  <div
                    key={`${row.label}-${products[valueIndex]?.id ?? valueIndex}`}
                    className="flex items-center justify-end rounded-[1.6rem] border border-white/10 bg-white/[0.04] px-5 py-4 text-right text-sm leading-6 text-white"
                  >
                    <span className={cn('break-words', value === placeholderValue && 'text-gray-500')}>{value}</span>
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
