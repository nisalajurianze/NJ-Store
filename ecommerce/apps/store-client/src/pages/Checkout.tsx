import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import type { CartItemDto, CouponApplicationDto } from '@njstore/types';
import { Clock3, FileCheck2, Gift, ImageOff, ShieldCheck, TicketPercent } from 'lucide-react';
import { Button, Card, Input, ProgressStepper, SectionHeading, Textarea } from '@njstore/ui';
import { useNavigate } from 'react-router-dom';
import { analytics } from '../analytics/analytics';
import { StoreBreadcrumbs } from '../components/layout/StoreBreadcrumbs';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { couponService } from '../services/couponService';
import { orderService } from '../services/orderService';
import { siteConfigService } from '../services/siteConfigService';
import { getApiErrorMessage } from '../utils/apiError';
import { isKnownUnavailableDemoAsset } from '../utils/imageAssets';
import { toast } from '../utils/lazyToast';

const checkoutSchema = z.object({
  couponCode: z.string().optional(),
  loyaltyPointsToRedeem: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? 0 : value),
    z.coerce.number().int().min(0)
  ),
  orderNotes: z.string().max(500).optional()
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

const CheckoutLoadingState = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className="page-shell page-nav-gap pb-0" aria-busy="true">
      <SectionHeading title={t('checkout.loading.title')} description={t('checkout.loading.description')} />
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="rounded-[30px] p-5 sm:p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-32 rounded-full bg-white/10" />
                <div className="h-3 w-64 rounded-full bg-white/10" />
                <div className="grid gap-3 md:grid-cols-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-24 rounded-2xl bg-white/10" />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="rounded-[30px] p-5 sm:p-6 xl:sticky xl:top-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-40 rounded-full bg-white/10" />
            <div className="h-3 w-56 rounded-full bg-white/10" />
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-3 w-full rounded-full bg-white/10" />
              ))}
            </div>
            <div className="h-11 rounded-xl bg-white/10" />
          </div>
        </Card>
      </div>
    </div>
  );
};

const calculateTaxPreview = (
  t: TFunction<'translation'>,
  subtotal: number,
  shippingFee: number,
  discount: number,
  taxSettings:
    | {
        enabled?: boolean;
        label?: string;
        rate?: number;
      }
    | undefined
): { amount: number; label: string } => {
  const preTaxTotal = Math.max(subtotal + shippingFee - discount, 0);
  const rate = taxSettings?.enabled ? Math.max(taxSettings.rate ?? 0, 0) : 0;

  return {
    amount: rate > 0 ? Math.round(preTaxTotal * (rate / 100)) : 0,
    label: `${taxSettings?.label?.trim() || t('checkout.summary.taxFallback')}${rate > 0 ? ` (${rate}%)` : ''}`
  };
};

const getCartItemVariantLabel = (item: CartItemDto): string | undefined => {
  if (item.variantIndex === undefined) {
    return undefined;
  }

  const variant = item.product.variants?.[item.variantIndex];
  if (!variant) {
    return undefined;
  }

  const customSegments = (variant.attributes ?? []).map((attribute) => `${attribute.name}: ${attribute.value}`);
  const segments = [variant.color, variant.storage, variant.model, ...customSegments].filter((value): value is string => Boolean(value));
  return segments.length ? segments.join(' / ') : variant.sku;
};

export const Checkout = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { cart, loading, clearCart } = useCart();
  const { formatCurrency } = useCurrencyFormatter();
  const [discount, setDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponApplicationDto | null>(null);
  const [validatedSnapshot, setValidatedSnapshot] = useState<{
    code: string;
    subtotal: number;
  } | null>(null);
  const [couponResetHint, setCouponResetHint] = useState<string | null>(null);
  const trackedCheckoutSignatureRef = useRef<string | null>(null);
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      couponCode: '',
      loyaltyPointsToRedeem: 0,
      orderNotes: ''
    }
  });
  const siteConfig = useQuery({
    queryKey: ['site-config'],
    queryFn: () => siteConfigService.get()
  });

  const subtotal = cart?.subtotal ?? 0;
  const quotationItems = cart?.items ?? [];
  const couponCode = form.watch('couponCode')?.trim() ?? '';
  const requestedLoyaltyPoints = Math.max(0, Math.trunc(Number(form.watch('loyaltyPointsToRedeem') ?? 0) || 0));
  const availableLoyaltyPoints = Math.max(0, Math.trunc(Number(user?.loyaltyPoints ?? 0) || 0));
  const shippingPreview = useMemo(() => ({ fee: 0, label: t('checkout.shipping.chosenAfterQuotation') }), [t]);
  const maxLoyaltyPoints = Math.min(availableLoyaltyPoints, Math.floor(Math.max(subtotal + shippingPreview.fee - discount, 0)));
  const loyaltyDiscount = Math.min(requestedLoyaltyPoints, maxLoyaltyPoints);
  const estimatedTax = calculateTaxPreview(t, subtotal, shippingPreview.fee, discount + loyaltyDiscount, siteConfig.data?.taxSettings);
  const estimatedTotal = Math.max(subtotal + shippingPreview.fee - discount - loyaltyDiscount, 0) + estimatedTax.amount;
  const isEmailVerified = Boolean(user?.isEmailVerified);
  const canCreateQuotation = Boolean(cart?.items.length);
  const quotationValidityDays = siteConfig.data?.quotationExpiryDays ?? 7;
  const quotationExpiryLabel = useMemo(() => {
    const quotationExpiryDate = new Date();
    quotationExpiryDate.setDate(quotationExpiryDate.getDate() + quotationValidityDays);
    return quotationExpiryDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  }, [quotationValidityDays]);
  const checkoutSteps = useMemo(
    () => [t('checkout.steps.cart'), t('checkout.steps.checkout'), t('checkout.steps.quotation')],
    [t]
  );

  const resetCouponState = (hint?: string): void => {
    setAppliedCoupon(null);
    setDiscount(0);
    setValidatedSnapshot(null);
    setCouponResetHint(hint ?? null);
  };

  useEffect(() => {
    if (!validatedSnapshot) {
      return;
    }

    const normalizedCurrentCode = couponCode.toUpperCase();
    if (
      normalizedCurrentCode !== validatedSnapshot.code ||
      subtotal !== validatedSnapshot.subtotal
    ) {
      resetCouponState(
        normalizedCurrentCode !== validatedSnapshot.code
          ? t('checkout.coupon.resetCodeChanged')
          : t('checkout.coupon.resetCartChanged')
      );
    }
  }, [couponCode, subtotal, t, validatedSnapshot]);

  useEffect(() => {
    if (!cart?.items.length) {
      return;
    }

    const signature = `${cart.id}:${cart.itemCount}:${cart.subtotal}`;
    if (trackedCheckoutSignatureRef.current === signature) {
      return;
    }

    trackedCheckoutSignatureRef.current = signature;
    analytics.trackCheckoutStarted(cart);
  }, [cart]);

  useEffect(() => {
    if (requestedLoyaltyPoints > maxLoyaltyPoints) {
      form.setValue('loyaltyPointsToRedeem', maxLoyaltyPoints, { shouldValidate: true });
    }
  }, [form, maxLoyaltyPoints, requestedLoyaltyPoints]);

  if (loading && !cart?.items.length) {
    return <CheckoutLoadingState />;
  }

  if (!cart?.items.length) {
    return (
      <div className="page-shell page-nav-gap pb-0">
        <SectionHeading title={t('checkout.empty.heading')} description={t('checkout.empty.description')} />
        <Card className="mt-8 rounded-[30px] p-6 sm:p-7">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold">{t('checkout.empty.eyebrow')}</p>
          <h2 className="mt-3 font-display text-[1.8rem] leading-tight text-white sm:text-[2.1rem]">{t('checkout.empty.title')}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
            {t('checkout.empty.body')}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/shop')}>{t('checkout.empty.browseProducts')}</Button>
            <Button variant="secondary" onClick={() => navigate('/cart')}>
              {t('checkout.empty.openCart')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell page-nav-gap pb-0">
      <StoreBreadcrumbs items={[{ label: t('checkout.steps.cart'), to: '/cart' }, { label: t('checkout.steps.checkout') }]} />
      <div className="rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-4 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">{t('checkout.hero.quotationFirstTitle')}</p>
        <h1 className="mt-1.5 font-display text-[1.35rem] leading-tight text-white sm:text-[1.65rem]">{t('checkout.heading.title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">{t('checkout.heading.description')}</p>
      </div>
      <form
        className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]"
        onSubmit={form.handleSubmit(
          async (values) => {
            if (!cart?.items.length) {
              toast.error(t('checkout.toast.emptyCart'));
              return;
            }

            try {
              const response = await orderService.createQuotation({
                items: quotationItems.map((item) => ({
                  productId: item.product.id,
                  quantity: item.quantity,
                  variantIndex: item.variantIndex
                })),
                couponCode: values.couponCode?.trim() || undefined,
                ...(loyaltyDiscount > 0 ? { loyaltyPointsToRedeem: loyaltyDiscount } : {}),
                notes: values.orderNotes?.trim() || undefined
              });
              try {
                analytics.trackQuotationCreated(response.data);
              } catch (analyticsError) {
                // Checkout should stay resilient even if analytics receives a partial payload.
                console.warn('Unable to track quotation analytics', analyticsError);
              }
              toast.success(t('checkout.toast.quotationCreated'));
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['dashboard', 'orders'] }),
                queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview-orders'] }),
                queryClient.invalidateQueries({ queryKey: ['dashboard', 'order', response.data.id] })
              ]);
              resetCouponState();
              await clearCart();
              navigate(`/dashboard/orders/${response.data.id}`);
            } catch (error) {
              toast.error(getApiErrorMessage(error, t('checkout.toast.createError')));
            }
          },
          () => {
            toast.error(t('checkout.toast.reviewDetails'));
          }
        )}
      >
        <div className="space-y-5">
          <Card className="rounded-[24px] p-4 sm:p-5">
            <ProgressStepper steps={checkoutSteps} currentStep={1} className="mx-auto mb-5 max-w-xl" />
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: t('checkout.progress.cartReviewedTitle'),
                  description: t('checkout.progress.cartReviewedDescription'),
                  icon: ShieldCheck,
                  className: 'border-gold/20 bg-gold/8'
                },
                {
                  title: t('checkout.progress.detailsTitle'),
                  description: t('checkout.progress.detailsDescription'),
                  icon: TicketPercent,
                  className: 'border-gold bg-gold/12'
                },
                {
                  title: t('checkout.progress.quotationReadyTitle'),
                  description: t('checkout.progress.quotationReadyDescription', { days: quotationValidityDays }),
                  icon: FileCheck2,
                  className: 'border-white/10 bg-white/5'
                }
              ].map((step) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className={`rounded-2xl border p-4 ${step.className}`}>
                    <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
                    <p className="mt-3 text-sm font-medium text-white">{step.title}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-400">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-[24px] p-4 sm:p-5">
            <SectionHeading title={t('checkout.next.heading')} description={t('checkout.next.description')} size="compact" />
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-gray-300">
              <p className="font-medium text-white">{t('checkout.next.title')}</p>
              <div className="mt-3 space-y-2">
                <p>{t('checkout.next.stepOne')}</p>
                <p>{t('checkout.next.stepTwo')}</p>
                <p>{t('checkout.next.stepThree')}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] p-4 sm:p-5">
            <SectionHeading
              title={t('checkout.summary.itemsEyebrow')}
              description={t('checkout.summary.itemsReadySuffix')}
              size="compact"
            />
            <div className="mt-4 space-y-3">
              {quotationItems.map((item) => {
                const rawImageUrl = item.product.images?.[0]?.url ?? item.product.thumbnail?.url;
                const imageUrl = rawImageUrl && !isKnownUnavailableDemoAsset(rawImageUrl) ? rawImageUrl : undefined;
                const variantLabel = getCartItemVariantLabel(item);

                return (
                  <div key={item.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                    <div className="flex h-16 w-16 items-center justify-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          aria-hidden="true"
                          className="max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)]"
                          loading="lazy"
                          decoding="async"
                          width={64}
                          height={64}
                        />
                      ) : (
                        <ImageOff className="h-5 w-5 text-gray-500" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium text-white">{item.product.name}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {item.product.brand} · {t('checkout.summary.qty')} {item.quantity}
                        {variantLabel ? ` · ${variantLabel}` : ''}
                      </p>
                    </div>
                    <p className="font-mono text-sm text-gold sm:text-right">{formatCurrency(item.lineTotal)}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-[24px] p-4 sm:p-5">
            <SectionHeading title={t('checkout.coupon.heading')} description={t('checkout.coupon.description')} size="compact" />
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Input label={t('checkout.coupon.codeLabel')} {...form.register('couponCode')} placeholder="SAVE10" />
              <Button
                type="button"
                variant="secondary"
                isLoading={isApplyingCoupon}
                loadingLabel={t('checkout.coupon.checking')}
                disabled={loading || !couponCode || subtotal <= 0}
                onClick={async () => {
                  if (!couponCode) {
                    toast.error(t('checkout.coupon.enterCode'));
                    return;
                  }
                  try {
                    setIsApplyingCoupon(true);
                    const result = await couponService.apply({
                      code: couponCode,
                      subtotal,
                      shippingFee: shippingPreview.fee,
                      items: cart.items.map((item) => ({
                        productId: item.product.id,
                        quantity: item.quantity,
                        variantIndex: item.variantIndex
                      }))
                    });
                    setCouponResetHint(null);
                    setDiscount(result.discount);
                    setAppliedCoupon(result);
                    setValidatedSnapshot({
                      code: result.code.toUpperCase(),
                      subtotal
                    });
                    toast.success(t('checkout.coupon.appliedSuccess', { code: result.code }));
                  } catch (error) {
                    resetCouponState();
                    toast.error(getApiErrorMessage(error, t('checkout.coupon.validateError')));
                  } finally {
                    setIsApplyingCoupon(false);
                  }
                }}
              >
                {t('checkout.coupon.validate')}
              </Button>
            </div>
            {appliedCoupon ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">
                      {t('checkout.coupon.appliedLabelPrefix')} <span className="text-emerald-300">{appliedCoupon.code}</span> {t('checkout.coupon.appliedLabelSuffix')}
                    </p>
                    <p className="text-sm text-gray-300">
                      {t('checkout.coupon.youSavePrefix')} {formatCurrency(appliedCoupon.discount)} {t('checkout.coupon.youSaveMiddle')}{' '}
                      <span className="text-white">{formatCurrency(estimatedTotal)}</span>.
                    </p>
                    {appliedCoupon.freeShipping ? <p className="text-xs text-emerald-300">{t('checkout.coupon.freeShippingIncluded')}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setValue('couponCode', '');
                      resetCouponState();
                    }}
                  >
                    {t('checkout.coupon.remove')}
                  </Button>
                </div>
              </div>
            ) : (
              <p className={`mt-3 text-xs leading-5 ${couponResetHint ? 'text-[var(--checkout-warning-text,rgba(253,230,138,0.88))]' : 'text-gray-500'}`}>
                {couponResetHint ?? t('checkout.coupon.helper')}
              </p>
            )}

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                    <Gift className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{t('checkout.loyalty.heading')}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-400">{t('checkout.loyalty.description')}</p>
                  </div>
                </div>
                <p className="font-mono text-sm text-gold">{t('checkout.loyalty.balance', { points: availableLoyaltyPoints })}</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Input
                  type="number"
                  min={0}
                  max={maxLoyaltyPoints}
                  label={t('checkout.loyalty.pointsLabel')}
                  disabled={maxLoyaltyPoints <= 0}
                  {...form.register('loyaltyPointsToRedeem', { valueAsNumber: true })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={maxLoyaltyPoints <= 0}
                  onClick={() => form.setValue('loyaltyPointsToRedeem', maxLoyaltyPoints, { shouldValidate: true })}
                >
                  {t('checkout.loyalty.useMax')}
                </Button>
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500">
                {maxLoyaltyPoints > 0
                  ? t('checkout.loyalty.helper', {
                      maxPoints: maxLoyaltyPoints,
                      amount: formatCurrency(loyaltyDiscount)
                    })
                  : t('checkout.loyalty.noPoints')}
              </p>
            </div>

            <div className="mt-5">
              <Textarea
                label={t('checkout.notes.label')}
                {...form.register('orderNotes')}
                placeholder={t('checkout.notes.placeholder')}
              />
            </div>
          </Card>
        </div>

        <Card className="rounded-[24px] p-4 sm:p-5 xl:sticky xl:top-6">
          <SectionHeading
            title={t('checkout.summary.heading')}
            description={user ? t('checkout.summary.requestingAs', { email: user.email }) : t('checkout.summary.signIn')}
            size="compact"
          />
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{t('checkout.summary.itemsEyebrow')}</p>
                <p className="mt-1.5 text-sm text-gray-300">
                  {quotationItems.length} {quotationItems.length === 1 ? t('checkout.summary.itemSingular') : t('checkout.summary.itemPlural')}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white">
                {quotationItems.reduce((sum, item) => sum + item.quantity, 0)} {t('checkout.summary.units')}
              </span>
            </div>
          </div>
          {!isEmailVerified ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm leading-6 text-gray-300">
              <p className="font-medium text-white">{t('checkout.verification.title')}</p>
              <p className="mt-1">
                {t('checkout.verification.descriptionPrefix')} <span className="text-white">{user?.email}</span> {t('checkout.verification.descriptionSuffix')}
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-4"
                onClick={() => {
                  navigate('/dashboard/security?section=verification');
                }}
              >
                {t('checkout.verification.cta')}
              </Button>
            </div>
          ) : null}

          <div className="mt-5 space-y-3 text-sm text-gray-300">
            <div className="flex justify-between gap-4">
              <span>{t('checkout.summary.payment')}</span>
              <span className="text-right text-white">{t('checkout.payment.chosenAfterQuotation')}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>{t('checkout.summary.fulfilment')}</span>
              <span className="text-right text-white">{t('checkout.shipping.chosenAfterQuotation')}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('checkout.summary.subtotal')}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>{t('checkout.summary.shipping')}</span>
              <span className="text-right">{shippingPreview.label}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('checkout.summary.discount')}</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
            {loyaltyDiscount > 0 ? (
              <div className="flex justify-between">
                <span>{t('checkout.summary.loyalty')}</span>
                <span>-{formatCurrency(loyaltyDiscount)}</span>
              </div>
            ) : null}
            {estimatedTax.amount > 0 ? (
              <div className="flex justify-between">
                <span>{estimatedTax.label}</span>
                <span>{formatCurrency(estimatedTax.amount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-white/10 pt-3 text-base text-white">
              <span>{t('checkout.summary.quotationTotal')}</span>
              <span>{formatCurrency(estimatedTotal)}</span>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('checkout.timer.eyebrow')}
            </p>
            <p className="mt-2 text-white">{t('checkout.timer.validFor', { days: quotationValidityDays, date: quotationExpiryLabel })}</p>
            <p className="mt-1 text-xs leading-5 text-gray-400">{t('checkout.timer.description')}</p>
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            isLoading={form.formState.isSubmitting}
            disabled={loading || !canCreateQuotation}
          >
            {t('checkout.actions.createQuotation')}
          </Button>
          <p className="mt-3 text-xs leading-5 text-[var(--checkout-warning-text,rgba(253,230,138,0.88))]">
            {t('checkout.actions.helper')}
          </p>
        </Card>
      </form>
    </div>
  );
};
