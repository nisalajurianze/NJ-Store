import { useDeferredValue, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge, Button, DatePicker, Input, Modal } from '@njstore/ui';
import { formatCurrency } from '@njstore/utils';
import toast from 'react-hot-toast';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService } from '../../services/adminService';
import { AdminDataGrid } from '../../components/ui/AdminDataGrid';
import { AdminSearchBar } from '../../components/ui/AdminSearchBar';
import { AdminControlPanel, AdminInlineNotice, AdminPageHeader, AdminStatGrid, adminFormFieldClassName } from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';

interface CouponPerformance {
  orderCount: number;
  revenueGenerated: number;
  discountTotal: number;
}

interface CouponRecord {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping' | 'bogo';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  restrictToEmail?: string;
  appliesToCategories?: string[];
  appliesToBrands?: string[];
  perUserLimit?: number;
  isFirstOrderOnly?: boolean;
  autoApply?: boolean;
  bogo?: {
    buyQuantity: number;
    getQuantity: number;
  };
  usageLimit: number;
  usedCount: number;
  isActive?: boolean;
  expiryDate: string;
  performance?: CouponPerformance;
}

interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
}

interface BrandRecord {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

interface ListQueryResult<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const optionalEmailField = z.string().trim().email('Enter a valid email address').or(z.literal(''));

const couponSchema = z.object({
  code: z.string().trim().min(3).max(20),
  type: z.enum(['percentage', 'fixed', 'free_shipping', 'bogo']),
  value: z.coerce.number().min(0),
  minOrderValue: z.string().optional(),
  maxDiscount: z.string().optional(),
  restrictToEmail: optionalEmailField,
  appliesToCategories: z.array(z.string()).default([]),
  appliesToBrands: z.array(z.string()).default([]),
  perUserLimit: z.coerce.number().int().min(1),
  isFirstOrderOnly: z.boolean().default(false),
  autoApply: z.boolean().default(false),
  bogoBuyQuantity: z.coerce.number().int().min(1).default(1),
  bogoGetQuantity: z.coerce.number().int().min(1).default(1),
  usageLimit: z.coerce.number().int().min(1),
  expiryDate: z.string().min(1),
  isActive: z.boolean().optional()
});

type CouponFormValues = z.infer<typeof couponSchema>;

const couponsTableGridClass =
  'grid min-w-[1320px] grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)_minmax(0,0.8fr)_minmax(0,0.72fr)_minmax(0,0.82fr)_minmax(0,1fr)_minmax(0,0.72fr)_minmax(0,0.54fr)_minmax(220px,1fr)] items-center gap-4 lg:min-w-0 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,0.68fr)_minmax(0,0.76fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.96fr)_minmax(0,0.68fr)_minmax(0,0.5fr)_minmax(220px,0.94fr)] lg:gap-3';

const getCouponPerformance = (coupon: CouponRecord): CouponPerformance => ({
  orderCount: coupon.performance?.orderCount ?? 0,
  revenueGenerated: coupon.performance?.revenueGenerated ?? 0,
  discountTotal: coupon.performance?.discountTotal ?? 0
});

const generateCouponCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
};

const flattenCategories = (items: CategoryNode[]): Array<{ id: string; name: string }> =>
  items.flatMap((item) => [{ id: item.id, name: item.name }, ...(item.children ? flattenCategories(item.children) : [])]);

const couponOptionPageSize = 50;

const loadCouponBrandOptions = async (): Promise<ListQueryResult<BrandRecord>> => {
  const firstPage = (await adminService.brands({
    includeInactive: true,
    sort: 'sortOrder',
    limit: couponOptionPageSize
  })) as ListQueryResult<BrandRecord>;

  const totalPages = firstPage.pagination?.totalPages ?? 1;
  if (totalPages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      adminService.brands({
        includeInactive: true,
        sort: 'sortOrder',
        limit: couponOptionPageSize,
        page: index + 2
      }) as Promise<ListQueryResult<BrandRecord>>
    )
  );

  return {
    data: [firstPage, ...remainingPages].flatMap((page) => page.data ?? []),
    pagination: firstPage.pagination
  };
};

const escapeCsvValue = (value: string | number | boolean): string => `"${String(value).replaceAll('"', '""')}"`;

const downloadCouponsCsv = (coupons: CouponRecord[]): void => {
  const header = [
    'Code',
    'Type',
    'Value',
    'Minimum Order',
    'Max Discount',
    'Usage Limit',
    'Used Count',
    'Restrict To Email',
    'Paid Orders',
    'Revenue Generated',
    'Discount Total',
    'Expiry Date',
    'Active'
  ];
  const rows = coupons.map((coupon) => {
    const performance = getCouponPerformance(coupon);
    return [
      coupon.code,
      coupon.type,
      coupon.type === 'percentage' ? `${coupon.value}%` : coupon.type === 'free_shipping' ? 'Free shipping' : formatCurrency(coupon.value),
      coupon.minOrderValue ? formatCurrency(coupon.minOrderValue) : '',
      coupon.maxDiscount ? formatCurrency(coupon.maxDiscount) : '',
      coupon.usageLimit,
      coupon.usedCount,
      coupon.restrictToEmail ?? '',
      performance.orderCount,
      performance.revenueGenerated,
      performance.discountTotal,
      new Date(coupon.expiryDate).toISOString(),
      coupon.isActive === false ? 'No' : 'Yes'
    ].map(escapeCsvValue);
  });

  const csv = [header.map(escapeCsvValue).join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `njstore-coupons-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
};

const buildDefaults = (coupon?: CouponRecord): CouponFormValues => ({
  code: coupon?.code ?? '',
  type: coupon?.type ?? 'percentage',
  value: coupon?.value ?? 10,
  minOrderValue: coupon?.minOrderValue ? String(coupon.minOrderValue) : '',
  maxDiscount: coupon?.maxDiscount ? String(coupon.maxDiscount) : '',
  restrictToEmail: coupon?.restrictToEmail ?? '',
  appliesToCategories: coupon?.appliesToCategories ?? [],
  appliesToBrands: coupon?.appliesToBrands ?? [],
  perUserLimit: coupon?.perUserLimit ?? 1,
  isFirstOrderOnly: coupon?.isFirstOrderOnly ?? false,
  autoApply: coupon?.autoApply ?? false,
  bogoBuyQuantity: coupon?.bogo?.buyQuantity ?? 1,
  bogoGetQuantity: coupon?.bogo?.getQuantity ?? 1,
  usageLimit: coupon?.usageLimit ?? 100,
  expiryDate: coupon?.expiryDate ? new Date(coupon.expiryDate).toISOString().slice(0, 10) : '',
  isActive: coupon?.isActive ?? true
});

export const Coupons = (): JSX.Element => {
  const { hasPermissions } = useAdminPermissions();
  const coupons = useQuery<ListQueryResult<CouponRecord>>({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => (await adminService.coupons()) as ListQueryResult<CouponRecord>
  });
  const categories = useQuery<ListQueryResult<CategoryNode>>({
    queryKey: ['admin', 'categories', 'coupon-form'],
    queryFn: async () => (await adminService.categories()) as ListQueryResult<CategoryNode>
  });
  const brands = useQuery<ListQueryResult<BrandRecord>>({
    queryKey: ['admin', 'brands', 'coupon-form'],
    queryFn: loadCouponBrandOptions
  });
  const [editingCoupon, setEditingCoupon] = useState<CouponRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const canWriteCoupons = hasPermissions('coupon:write');
  const canDeleteCoupons = hasPermissions('coupon:delete');
  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: buildDefaults()
  });
  const watchedCouponType = form.watch('type');
  const couponItems = coupons.data?.data ?? [];
  const categoryOptions = flattenCategories(categories.data?.data ?? []);
  const brandOptions = useMemo(
    () => (brands.data?.data ?? []).slice().sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [brands.data?.data]
  );
  const activeCoupons = couponItems.filter((coupon) => coupon.isActive !== false);
  const freeShippingCoupons = couponItems.filter((coupon) => coupon.type === 'free_shipping');
  const bogoCoupons = couponItems.filter((coupon) => coupon.type === 'bogo');
  const firstOrderCoupons = couponItems.filter((coupon) => coupon.isFirstOrderOnly);
  const restrictedCoupons = couponItems.filter((coupon) => Boolean(coupon.restrictToEmail));
  const usageTotal = couponItems.reduce((sum, coupon) => sum + coupon.usedCount, 0);
  const attributedRevenueTotal = couponItems.reduce((sum, coupon) => sum + getCouponPerformance(coupon).revenueGenerated, 0);
  const filteredCoupons = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();
    if (!query) {
      return couponItems;
    }

    return couponItems.filter((coupon) =>
      [
        coupon.code,
        coupon.type,
        coupon.isActive === false ? 'inactive' : 'active',
        coupon.expiryDate,
        String(coupon.value),
        String(coupon.minOrderValue ?? ''),
        String(coupon.usedCount),
        String(coupon.usageLimit),
        String(coupon.perUserLimit ?? ''),
        coupon.restrictToEmail ?? '',
        coupon.isFirstOrderOnly ? 'first order' : '',
        coupon.autoApply ? 'auto apply' : '',
        String(coupon.bogo?.buyQuantity ?? ''),
        String(coupon.bogo?.getQuantity ?? ''),
        String(getCouponPerformance(coupon).orderCount),
        String(getCouponPerformance(coupon).revenueGenerated)
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [couponItems, deferredSearchTerm]);

  const openCreateModal = (): void => {
    if (!canWriteCoupons) {
      return;
    }
    setEditingCoupon(null);
    form.reset(buildDefaults());
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: CouponRecord): void => {
    if (!canWriteCoupons) {
      return;
    }
    setEditingCoupon(coupon);
    form.reset(buildDefaults(coupon));
    setIsModalOpen(true);
  };

  const closeModal = (): void => {
    setEditingCoupon(null);
    setIsModalOpen(false);
    form.reset(buildDefaults());
  };

  const handleGenerateCode = (): void => {
    form.setValue('code', generateCouponCode(), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
  };

  const setCouponSelection = (field: 'appliesToCategories' | 'appliesToBrands', values: string[]): void => {
    form.setValue(field, values, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Coupons"
        description="Promotions, thresholds, discount caps, and lifecycle controls arranged in the same daily-operations layout as the rest of the admin workspace."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => downloadCouponsCsv(filteredCoupons)} disabled={filteredCoupons.length === 0}>
              Export CSV
            </Button>
            {canWriteCoupons ? (
              <Button onClick={openCreateModal}>Add Coupon</Button>
            ) : (
              <Badge variant="default" className="bg-white/[0.06] text-gray-300">
                Read Only
              </Badge>
            )}
          </div>
        }
        meta={[
          {
            label: 'Coupon library',
            value: couponItems.length.toLocaleString(),
            support: 'Promotions currently returned by the live coupon feed.',
            tone: 'blue'
          },
          {
            label: 'Active promos',
            value: activeCoupons.length.toLocaleString(),
            support: canWriteCoupons
              ? 'You can create, pause, target, and export coupon campaigns here.'
              : 'This account can review campaigns and export the current list.',
            tone: canWriteCoupons ? 'gold' : 'slate'
          }
        ]}
      />

      <AdminStatGrid
        items={[
          {
            label: 'Total coupons',
            value: couponItems.length.toLocaleString(),
            support: 'All campaigns loaded into this view.',
            tone: 'slate'
          },
          {
            label: 'Active',
            value: activeCoupons.length.toLocaleString(),
            support: 'Campaigns that are currently redeemable.',
            tone: activeCoupons.length > 0 ? 'emerald' : 'slate'
          },
          {
            label: 'Usage total',
            value: usageTotal.toLocaleString(),
            support: 'Redemptions recorded across the loaded campaigns.',
            tone: 'blue'
          },
          {
            label: 'Targeted',
            value: restrictedCoupons.length.toLocaleString(),
            support: 'Coupons locked to a single customer email.',
            tone: restrictedCoupons.length > 0 ? 'gold' : 'slate'
          },
          {
            label: 'Revenue',
            value: formatCurrency(attributedRevenueTotal),
            support: 'Paid-order revenue currently attributed to these coupon codes.',
            tone: attributedRevenueTotal > 0 ? 'emerald' : 'slate'
          },
          {
            label: 'Free shipping',
            value: freeShippingCoupons.length.toLocaleString(),
            support: 'Campaigns that waive delivery pricing.',
            tone: 'gold'
          },
          {
            label: 'BOGO',
            value: bogoCoupons.length.toLocaleString(),
            support: 'Buy-one-get-one style promotions configured in this workspace.',
            tone: bogoCoupons.length > 0 ? 'blue' : 'slate'
          },
          {
            label: 'First order',
            value: firstOrderCoupons.length.toLocaleString(),
            support: 'Promotions reserved for first completed orders.',
            tone: firstOrderCoupons.length > 0 ? 'emerald' : 'slate'
          }
        ]}
      />

      <AdminControlPanel>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search coupons by code, type, email target, status, expiry, or value"
            label="Search coupons"
            resultCount={filteredCoupons.length}
            totalCount={couponItems.length}
          />
          {searchTerm ? (
            <div className="flex items-stretch xl:justify-end">
              <Button type="button" size="sm" variant="secondary" className="w-full justify-center xl:w-auto" onClick={() => setSearchTerm('')}>
                Clear search
              </Button>
            </div>
          ) : null}
        </div>
        <AdminInlineNotice>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            {filteredCoupons.length ? 'Campaigns ready' : 'No matches'}
          </span>
          <p>Search narrows the list instantly while export, create, pause, restore, and email targeting stay available from the same workspace.</p>
        </AdminInlineNotice>
      </AdminControlPanel>

      <AdminDataGrid
        headers={['Code', 'Type', 'Value', 'Min Order', 'Usage', 'Performance', 'Expiry', 'Active', 'Actions']}
        gridClassName={couponsTableGridClass}
        hasRows={filteredCoupons.length > 0}
        emptyMessage="No coupons matched the current search."
      >
        {filteredCoupons.map((coupon) => {
          const performance = getCouponPerformance(coupon);

          return (
            <div
              key={coupon._id ?? coupon.code}
              className={`${couponsTableGridClass} border-b border-white/5 px-5 py-4 text-sm text-gray-300 last:border-b-0 sm:px-6`}
            >
              <div className="space-y-1">
                <p className="font-medium text-white">{coupon.code}</p>
                <p className="text-xs text-gray-500">
                  {coupon.restrictToEmail
                    ? `Only ${coupon.restrictToEmail}`
                    : coupon.isFirstOrderOnly
                      ? coupon.autoApply
                        ? 'First-order auto discount'
                        : 'First-order discount'
                    : coupon.type === 'free_shipping'
                      ? 'Shipping incentive'
                      : coupon.type === 'bogo'
                        ? `Buy ${coupon.bogo?.buyQuantity ?? 1}, get ${coupon.bogo?.getQuantity ?? 1}`
                      : 'Discount campaign'}
                </p>
              </div>
              <div>
                <Badge
                  variant={coupon.type === 'free_shipping' ? 'info' : coupon.type === 'fixed' ? 'warning' : coupon.type === 'bogo' ? 'success' : 'default'}
                  className="capitalize"
                >
                  {coupon.type.replace('_', ' ')}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">
                  {coupon.type === 'percentage'
                    ? `${coupon.value}%`
                    : coupon.type === 'free_shipping'
                      ? 'Free shipping'
                      : coupon.type === 'bogo'
                        ? `Buy ${coupon.bogo?.buyQuantity ?? 1}, get ${coupon.bogo?.getQuantity ?? 1}`
                      : formatCurrency(coupon.value)}
                </p>
                <p className="text-xs text-gray-500">{coupon.maxDiscount ? `Cap ${formatCurrency(coupon.maxDiscount)}` : 'No max cap'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">{coupon.minOrderValue ? formatCurrency(coupon.minOrderValue) : '-'}</p>
                <p className="text-xs text-gray-500">
                  {coupon.appliesToCategories?.length || coupon.appliesToBrands?.length
                    ? `${coupon.appliesToCategories?.length ?? 0} categories • ${coupon.appliesToBrands?.length ?? 0} brands`
                    : 'Threshold'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">
                  {coupon.usedCount} / {coupon.usageLimit}
                </p>
                <p className="text-xs text-gray-500">
                  Per user {coupon.perUserLimit ?? 1}
                  {coupon.isFirstOrderOnly ? ' • First order' : ''}
                  {coupon.autoApply ? ' • Auto' : ''}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">{formatCurrency(performance.revenueGenerated)}</p>
                <p className="text-xs text-gray-500">
                  {performance.orderCount} paid {performance.orderCount === 1 ? 'order' : 'orders'} • Disc {formatCurrency(performance.discountTotal)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">{new Date(coupon.expiryDate).toLocaleDateString()}</p>
                <p className="text-xs text-gray-500">Expiry date</p>
              </div>
              <div>
                <Badge variant={coupon.isActive === false ? 'danger' : 'success'}>{coupon.isActive === false ? 'No' : 'Yes'}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {canWriteCoupons ? (
                  <Button size="sm" variant="secondary" onClick={() => openEditModal(coupon)}>
                    Edit
                  </Button>
                ) : null}
                {coupon.isActive !== false && canDeleteCoupons ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await adminService.deleteCoupon(coupon._id);
                        toast.success('Coupon deactivated');
                        await coupons.refetch();
                      } catch (error) {
                        toast.error(getApiErrorMessage(error, 'Unable to deactivate this coupon right now.'));
                      }
                    }}
                  >
                    Deactivate
                  </Button>
                ) : null}
                {coupon.isActive === false && canWriteCoupons ? (
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await adminService.updateCoupon(coupon._id, { isActive: true });
                        toast.success('Coupon reactivated');
                        await coupons.refetch();
                      } catch (error) {
                        toast.error(getApiErrorMessage(error, 'Unable to reactivate this coupon right now.'));
                      }
                    }}
                  >
                    Reactivate
                  </Button>
                ) : null}
                {!canWriteCoupons && !canDeleteCoupons ? <span className="text-xs text-gray-500">Read-only access</span> : null}
              </div>
            </div>
          );
        })}
      </AdminDataGrid>

      <Modal isOpen={isModalOpen} title={editingCoupon ? 'Edit Coupon' : 'Create Coupon'} onClose={closeModal}>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(async (values) => {
            const payload = {
              code: values.code.trim().toUpperCase(),
              type: values.type,
              value: values.type === 'free_shipping' || values.type === 'bogo' ? 0 : values.value,
              minOrderValue: values.minOrderValue ? Number(values.minOrderValue) : null,
              maxDiscount: values.maxDiscount ? Number(values.maxDiscount) : null,
              restrictToEmail: values.restrictToEmail?.trim() ? values.restrictToEmail.trim().toLowerCase() : null,
              appliesToCategories: values.appliesToCategories,
              appliesToBrands: values.appliesToBrands,
              perUserLimit: values.perUserLimit,
              isFirstOrderOnly: values.isFirstOrderOnly,
              autoApply: values.autoApply,
              usageLimit: values.usageLimit,
              expiryDate: new Date(values.expiryDate).toISOString(),
              isActive: Boolean(values.isActive),
              ...(values.type === 'bogo'
                ? {
                    bogo: {
                      buyQuantity: values.bogoBuyQuantity,
                      getQuantity: values.bogoGetQuantity
                    }
                  }
                : {})
            };

            try {
              if (editingCoupon) {
                await adminService.updateCoupon(editingCoupon._id, payload);
                toast.success('Coupon updated');
              } else {
                await adminService.createCoupon(payload);
                toast.success('Coupon created');
              }

              closeModal();
              await coupons.refetch();
            } catch (error) {
              toast.error(getApiErrorMessage(error, 'Unable to save this coupon right now.'));
            }
          })}
        >
          <section className="space-y-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <div className="border-b border-white/10 pb-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Promotion setup</p>
              <h3 className="mt-2 font-display text-[1.35rem] text-white">Coupon Details</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="flex w-full flex-col gap-2.5 text-sm text-gray-300 md:col-span-2 xl:col-span-3" htmlFor="coupon-code">
                <span className="font-medium text-gray-200">Code</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input id="coupon-code" className={`${adminFormFieldClassName} min-w-0 flex-1`} {...form.register('code')} />
                  <Button type="button" variant="secondary" className="shrink-0" onClick={handleGenerateCode}>
                    Generate Code
                  </Button>
                </div>
                {form.formState.errors.code?.message ? <span className="text-xs leading-5 text-red-400">{form.formState.errors.code.message}</span> : null}
              </label>
              <label className="flex flex-col gap-2 text-sm text-gray-300">
                <span>Type</span>
                <select className={adminFormFieldClassName} {...form.register('type')}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                  <option value="free_shipping">Free Shipping</option>
                  <option value="bogo">BOGO</option>
                </select>
              </label>
              <Input
                label={watchedCouponType === 'percentage' ? 'Value (%)' : watchedCouponType === 'fixed' ? 'Value' : 'Value'}
                type="number"
                {...form.register('value', { valueAsNumber: true })}
                error={form.formState.errors.value?.message}
                disabled={watchedCouponType === 'free_shipping' || watchedCouponType === 'bogo'}
              />
              <Input label="Minimum Order Value" type="number" {...form.register('minOrderValue')} error={form.formState.errors.minOrderValue?.message} />
              <Input label="Max Discount" type="number" {...form.register('maxDiscount')} error={form.formState.errors.maxDiscount?.message} />
              <Input label="Restrict to Email" type="email" {...form.register('restrictToEmail')} error={form.formState.errors.restrictToEmail?.message} />
              <Input
                label="Per-user Limit"
                type="number"
                {...form.register('perUserLimit', { valueAsNumber: true })}
                error={form.formState.errors.perUserLimit?.message}
              />
              <Input
                label="Usage Limit"
                type="number"
                {...form.register('usageLimit', { valueAsNumber: true })}
                error={form.formState.errors.usageLimit?.message}
              />
              <DatePicker label="Expiry Date" {...form.register('expiryDate')} error={form.formState.errors.expiryDate?.message} />
              <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                <input type="checkbox" {...form.register('isActive')} />
                Active
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                <input type="checkbox" {...form.register('isFirstOrderOnly')} />
                First-order only
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                <input type="checkbox" {...form.register('autoApply')} />
                Auto apply
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2 text-sm text-gray-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Categories</span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-gold hover:text-gold-light"
                      onClick={() => setCouponSelection('appliesToCategories', categoryOptions.map((category) => category.id))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-gray-400 hover:text-white"
                      onClick={() => setCouponSelection('appliesToCategories', [])}
                    >
                      Clear
                    </button>
                  </span>
                </div>
                <select
                  aria-label="Categories"
                  className={`${adminFormFieldClassName} h-auto min-h-[144px] py-3`}
                  multiple
                  {...form.register('appliesToCategories')}
                >
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">Leave empty to let the coupon work across all categories.</span>
              </div>
              <div className="flex flex-col gap-2 text-sm text-gray-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Brands</span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-gold hover:text-gold-light"
                      onClick={() => setCouponSelection('appliesToBrands', brandOptions.map((brand) => brand.id))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-gray-400 hover:text-white"
                      onClick={() => setCouponSelection('appliesToBrands', [])}
                    >
                      Clear
                    </button>
                  </span>
                </div>
                <select
                  aria-label="Brands"
                  className={`${adminFormFieldClassName} h-auto min-h-[144px] py-3`}
                  multiple
                  {...form.register('appliesToBrands')}
                >
                  {brandOptions.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}{!brand.isActive ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">Leave empty to keep the coupon brand-agnostic.</span>
              </div>
            </div>

            {watchedCouponType === 'bogo' ? (
              <div className="grid gap-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4 md:grid-cols-2">
                <Input
                  label="Buy Quantity"
                  type="number"
                  {...form.register('bogoBuyQuantity', { valueAsNumber: true })}
                  error={form.formState.errors.bogoBuyQuantity?.message}
                />
                <Input
                  label="Get Quantity"
                  type="number"
                  {...form.register('bogoGetQuantity', { valueAsNumber: true })}
                  error={form.formState.errors.bogoGetQuantity?.message}
                />
              </div>
            ) : null}
          </section>

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-1">
            {canWriteCoupons ? (
              <Button type="submit" isLoading={form.formState.isSubmitting}>
                {editingCoupon ? 'Save Changes' : 'Create Coupon'}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
