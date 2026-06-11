import { Card } from '@njstore/ui';
import type { CartDto } from '@njstore/types';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';

interface CartSummaryProps {
  cart: CartDto | null;
}

export const CartSummary = ({ cart }: CartSummaryProps): JSX.Element => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormatter();
  const itemCount = cart?.itemCount ?? 0;

  return (
    <Card className="overflow-hidden rounded-[18px] bg-white/[0.04] p-0 shadow-[0_14px_34px_rgba(0,0,0,0.2)] sm:rounded-[20px]">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">{t('cart.summary.eyebrow')}</p>
            <h3 className="mt-1.5 font-display text-[1.12rem] leading-tight text-white sm:text-[1.2rem]">{t('cart.summary.title')}</h3>
          </div>
          <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-2 font-mono text-sm text-gray-200">
            {itemCount}
          </span>
        </div>
        <p className="mt-3 max-w-[17rem] text-xs leading-5 text-gray-400">{t('cart.summary.description')}</p>
        <dl className="mt-4 divide-y divide-white/10 text-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2.5 first:pt-0">
            <dt className="text-gray-300">{t('cart.summary.items')}</dt>
            <dd className="font-mono text-gray-100">{itemCount}</dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-2.5">
            <dt className="text-gray-300">{t('cart.summary.subtotal')}</dt>
            <dd className="whitespace-nowrap text-right font-mono text-[15px] font-semibold text-white">{formatCurrency(cart?.subtotal ?? 0)}</dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(9rem,auto)] items-start gap-4 pb-0 pt-2.5">
            <dt className="text-gray-300">{t('cart.summary.shipping')}</dt>
            <dd className="text-right text-sm leading-5 text-gray-400">{t('cart.summary.shippingPending')}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
};
