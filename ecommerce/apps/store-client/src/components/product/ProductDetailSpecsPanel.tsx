import type { ProductDetailDto } from '@njstore/types';
import { Badge, Card } from '@njstore/ui';
import { ShieldCheck, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProductDetailSpecsPanelProps {
  product: ProductDetailDto;
}

export const ProductDetailSpecsPanel = ({ product }: ProductDetailSpecsPanelProps): JSX.Element => {
  const { t } = useTranslation();

  return (
    <section className="mt-5">
      <Card className="rounded-[24px] border-white/[0.08] bg-white/[0.035] p-5 sm:rounded-[26px] sm:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[20px] border border-white/10 bg-black/10 p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold">
                <Truck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-semibold text-white">{t('product.support.deliveryTitle')}</p>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-400">{t('product.support.deliveryDescription')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-black/10 p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-semibold text-white">{product.warranty ?? t('product.support.warrantyFallback')}</p>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-400">{t('product.support.warrantyDescription')}</p>
              </div>
            </div>
          </div>
        </div>

        {product.specifications.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {product.specifications.map((specification) => (
              <div key={`${specification.key}-${specification.value}`} className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase text-gray-500">{specification.key}</p>
                <p className="mt-2 text-[15px] font-semibold leading-6 text-white">{specification.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {product.tags.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        ) : null}
      </Card>
    </section>
  );
};
