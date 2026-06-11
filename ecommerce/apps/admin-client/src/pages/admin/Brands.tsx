import { useDeferredValue, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { ImagePlus, Upload } from 'lucide-react';
import { z } from 'zod';
import type { BrandDto, ImageAsset } from '@njstore/types';
import { Badge, Button, Input, Modal, Textarea } from '@njstore/ui';
import toast from 'react-hot-toast';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService } from '../../services/adminService';
import { AdminDataGrid } from '../../components/ui/AdminDataGrid';
import { AdminSearchBar } from '../../components/ui/AdminSearchBar';
import {
  AdminControlPanel,
  AdminInlineNotice,
  AdminPageHeader,
  AdminStatGrid,
  adminFormFieldClassName
} from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';

interface ListQueryResult<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type SortMode = 'sortOrder' | 'name';

type BrandRecord = BrandDto;

const brandSchema = z.object({
  name: z.string().trim().min(2, 'Enter a brand name').max(120, 'Keep the brand name within 120 characters'),
  description: z.string().trim().max(500, 'Keep the description within 500 characters').optional(),
  sortOrder: z.coerce.number().int().min(0, 'Sort order cannot be negative').default(0),
  isActive: z.boolean().default(true),
  logoUrl: z.string().trim().url('Use a valid logo URL').optional().or(z.literal('')),
  logoPublicId: z.string().trim().optional(),
  logoAlt: z.string().trim().max(120, 'Keep the alt text within 120 characters').optional()
});

type BrandFormValues = z.infer<typeof brandSchema>;

const buildDefaults = (brand?: BrandRecord): BrandFormValues => ({
  name: brand?.name ?? '',
  description: brand?.description ?? '',
  sortOrder: brand?.sortOrder ?? 0,
  isActive: brand?.isActive ?? true,
  logoUrl: brand?.logo?.url ?? '',
  logoPublicId: brand?.logo?.publicId ?? '',
  logoAlt: brand?.logo?.alt ?? ''
});

const buildLogoPayload = (values: BrandFormValues): ImageAsset | undefined => {
  const url = values.logoUrl?.trim();
  const publicId = values.logoPublicId?.trim();

  if (!url || !publicId) {
    return undefined;
  }

  return {
    url,
    publicId,
    alt: values.logoAlt?.trim() || undefined
  };
};

const brandsTableGridClass =
  'grid min-w-[980px] grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.82fr)_minmax(236px,1.1fr)] items-start gap-4 lg:min-w-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.68fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(236px,1.02fr)] lg:gap-3';

export const Brands = (): JSX.Element => {
  const { hasPermissions } = useAdminPermissions();
  const canWriteBrands = hasPermissions('brand:write');
  const canDeleteBrands = hasPermissions('brand:delete');
  const [editingBrand, setEditingBrand] = useState<BrandRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('sortOrder');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const brands = useQuery<ListQueryResult<BrandRecord>>({
    queryKey: ['admin', 'brands', deferredSearchTerm, showInactive, sortMode],
    queryFn: async () =>
      (await adminService.brands({
        search: deferredSearchTerm.trim() || undefined,
        includeInactive: showInactive,
        sort: sortMode,
        limit: 50
      })) as ListQueryResult<BrandRecord>
  });

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: buildDefaults()
  });

  const brandItems = brands.data?.data ?? [];
  const activeCount = brandItems.filter((brand) => brand.isActive).length;
  const inactiveCount = brandItems.filter((brand) => !brand.isActive).length;
  const totalLinkedProducts = brandItems.reduce((sum, brand) => sum + (brand.productCount ?? 0), 0);
  const watchedLogoUrl = form.watch('logoUrl');
  const watchedLogoAlt = form.watch('logoAlt');

  const openCreateModal = (): void => {
    if (!canWriteBrands) {
      return;
    }

    setEditingBrand(null);
    form.reset(buildDefaults());
    setIsModalOpen(true);
  };

  const openEditModal = (brand: BrandRecord): void => {
    if (!canWriteBrands) {
      return;
    }

    setEditingBrand(brand);
    form.reset(buildDefaults(brand));
    setIsModalOpen(true);
  };

  const closeModal = (): void => {
    setEditingBrand(null);
    setIsModalOpen(false);
    form.reset(buildDefaults());
  };

  const handleToggleActive = async (brand: BrandRecord): Promise<void> => {
    if (!canWriteBrands) {
      return;
    }

    try {
      await adminService.updateBrand(brand.id, { isActive: !brand.isActive });
      toast.success(brand.isActive ? 'Brand deactivated' : 'Brand activated');
      await brands.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update brand status right now.'));
    }
  };

  const handleDeleteBrand = async (brand: BrandRecord): Promise<void> => {
    if (!canDeleteBrands) {
      return;
    }

    if (
      !window.confirm(
        `Delete "${brand.name}" permanently? If products are still linked to it, the API will safely block this action.`
      )
    ) {
      return;
    }

    try {
      await adminService.deleteBrand(brand.id);
      toast.success('Brand deleted');
      await brands.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to delete this brand right now.'));
    }
  };

  const handleUploadLogo = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploadingLogo(true);
      const uploaded = await adminService.uploadBrandLogo(file, form.getValues('logoAlt'));
      form.setValue('logoUrl', uploaded.data.url, { shouldDirty: true, shouldValidate: true });
      form.setValue('logoPublicId', uploaded.data.publicId, { shouldDirty: true });
      form.setValue('logoAlt', uploaded.data.alt ?? file.name, { shouldDirty: true });
      toast.success('Brand logo uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to upload this brand logo right now.'));
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Brands"
        description="Create and manage brand records, logos, storefront visibility, and the brand order used across merchandising and filtering."
        action={
          canWriteBrands ? (
            <Button onClick={openCreateModal}>Add Brand</Button>
          ) : (
            <Badge variant="default" className="bg-white/[0.06] text-gray-300">
              Read Only
            </Badge>
          )
        }
        meta={[
          {
            label: 'Brand library',
            value: (brands.data?.pagination?.total ?? brandItems.length).toLocaleString(),
            support: 'Every brand currently available to admin staff.',
            tone: 'blue'
          },
          {
            label: 'Linked products',
            value: totalLinkedProducts.toLocaleString(),
            support: totalLinkedProducts > 0 ? 'Products currently mapped into the live brand catalog.' : 'No products are mapped yet.',
            tone: totalLinkedProducts > 0 ? 'gold' : 'slate'
          }
        ]}
      />

      <AdminStatGrid
        items={[
          {
            label: 'Total brands',
            value: brandItems.length.toLocaleString(),
            support: 'Visible in this admin query result.',
            tone: 'slate'
          },
          {
            label: 'Active',
            value: activeCount.toLocaleString(),
            support: 'Brands that can appear on the storefront.',
            tone: activeCount > 0 ? 'emerald' : 'slate'
          },
          {
            label: 'Inactive',
            value: inactiveCount.toLocaleString(),
            support: inactiveCount > 0 ? 'Hidden from the storefront until reactivated.' : 'No inactive brands right now.',
            tone: inactiveCount > 0 ? 'rose' : 'slate'
          },
          {
            label: 'Linked products',
            value: totalLinkedProducts.toLocaleString(),
            support: 'Product count across the listed brands.',
            tone: totalLinkedProducts > 0 ? 'gold' : 'slate'
          }
        ]}
      />

      <AdminControlPanel>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(220px,0.24fr)_minmax(220px,0.24fr)]">
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search brands by name or description"
            label="Search brands"
            resultCount={brandItems.length}
            totalCount={brands.data?.pagination?.total ?? brandItems.length}
          />
          <div className="flex items-stretch">
            <Button type="button" variant="secondary" className="w-full justify-center" onClick={() => setShowInactive((value) => !value)}>
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </Button>
          </div>
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="font-medium text-gray-200">Sort brands</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className={adminFormFieldClassName}
            >
              <option value="sortOrder">Sort order</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>

        <AdminInlineNotice>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            {showInactive ? 'All brand states' : 'Active storefront brands'}
          </span>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            {sortMode === 'sortOrder' ? 'Manual merchandising sort' : 'Alphabetical sort'}
          </span>
          <p>
            {brandItems.length} brand{brandItems.length === 1 ? '' : 's'} match the current search and visibility filters.
          </p>
        </AdminInlineNotice>
      </AdminControlPanel>

      <AdminDataGrid
        headers={['Brand', 'Status', 'Sort', 'Products', 'Actions']}
        gridClassName={brandsTableGridClass}
        hasRows={brandItems.length > 0}
        emptyMessage="No brands matched that search."
      >
        {brandItems.map((brand) => (
          <div key={brand.id} className={`${brandsTableGridClass} border-b border-white/5 px-5 py-4 text-sm text-gray-300 last:border-b-0 sm:px-6`}>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#111d33]/85">
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt={brand.logo?.alt ?? `${brand.name} logo`} className="h-10 w-auto max-w-[80%] object-contain" loading="lazy" decoding="async" />
                ) : (
                  <span className="text-lg font-semibold uppercase tracking-[0.24em] text-gray-400">{brand.name.slice(0, 2)}</span>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-medium leading-6 text-white">{brand.name}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">{brand.slug}</p>
                {brand.description ? <p className="line-clamp-2 text-xs leading-5 text-gray-400">{brand.description}</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={brand.isActive ? 'success' : 'danger'}>{brand.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>

            <div className="space-y-1">
              <p className="font-medium text-white">#{brand.sortOrder}</p>
              <p className="text-xs text-gray-500">Merchandising order</p>
            </div>

            <div className="space-y-1">
              <p className="font-medium text-white">{(brand.productCount ?? 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">Linked products</p>
            </div>

            <div className="grid w-full max-w-[236px] grid-cols-2 gap-2">
              {canWriteBrands ? (
                <>
                  <Button size="sm" variant="secondary" className="justify-center" onClick={() => openEditModal(brand)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" className="justify-center" onClick={() => void handleToggleActive(brand)}>
                    {brand.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </>
              ) : null}
              {canDeleteBrands ? (
                <Button size="sm" variant="danger" className="col-span-2 justify-center" onClick={() => void handleDeleteBrand(brand)}>
                  Delete
                </Button>
              ) : null}
              {!canWriteBrands && !canDeleteBrands ? <p className="col-span-2 text-xs text-gray-500">Read-only access</p> : null}
            </div>
          </div>
        ))}
      </AdminDataGrid>

      <Modal
        isOpen={isModalOpen}
        title={editingBrand ? 'Edit Brand' : 'Create Brand'}
        onClose={closeModal}
        size="lg"
        bodyClassName="p-0"
      >
        <form
          className="flex flex-col"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              const payload = {
                name: values.name.trim(),
                description: values.description?.trim() || undefined,
                sortOrder: values.sortOrder,
                isActive: values.isActive,
                logo: buildLogoPayload(values)
              };

              if (editingBrand) {
                await adminService.updateBrand(editingBrand.id, payload);
                toast.success('Brand updated');
              } else {
                await adminService.createBrand(payload);
                toast.success('Brand created');
              }

              closeModal();
              await brands.refetch();
            } catch (error) {
              toast.error(getApiErrorMessage(error, 'Unable to save this brand right now.'));
            }
          })}
        >
          <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:px-6">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">{editingBrand ? 'Brand editor' : 'New brand'}</p>
            <p className="mt-1.5 max-w-3xl text-sm text-gray-400">
              Manage the brand label, active storefront visibility, logo asset, and the order used for storefront merchandising.
            </p>
          </div>

          <div className="grid gap-4 px-4 py-5 sm:px-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Brand Name" placeholder="Apple" {...form.register('name')} error={form.formState.errors.name?.message} />
              <Input
                label="Sort Order"
                type="number"
                placeholder="0"
                {...form.register('sortOrder', { valueAsNumber: true })}
                error={form.formState.errors.sortOrder?.message}
              />
            </div>

            <Textarea
              label="Description"
              placeholder="Premium electronics brand with flagship phones, tablets, and accessories."
              {...form.register('description')}
              error={form.formState.errors.description?.message}
            />

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-300">
              <input className="mt-1 h-4 w-4 rounded border-white/20 bg-dark-light text-gold focus:ring-gold/30" type="checkbox" {...form.register('isActive')} />
              <span>
                <span className="block font-medium text-white">Active storefront brand</span>
                <span className="mt-1 block text-xs text-gray-400">Inactive brands stay available in admin but are hidden from the store homepage and filters.</span>
              </span>
            </label>

            <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
              <div className="border-b border-white/10 pb-3.5">
                <h3 className="font-display text-[1.45rem] leading-tight text-white">Brand Logo</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">Upload a fresh logo or paste an existing image asset if the brand already lives in your media library.</p>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#111d33]/85">
                  {watchedLogoUrl ? (
                    <img src={watchedLogoUrl} alt={watchedLogoAlt || 'Brand logo preview'} className="h-40 w-full object-contain p-4" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-gray-500">
                      <ImagePlus className="h-5 w-5" />
                      Upload or paste a logo to preview it here.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input label="Logo URL" placeholder="https://..." {...form.register('logoUrl')} error={form.formState.errors.logoUrl?.message} />
                    <div className="flex items-end">
                      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleUploadLogo(event)} />
                      <Button type="button" variant="secondary" className="h-12 min-w-[148px] justify-center" onClick={() => logoInputRef.current?.click()} isLoading={isUploadingLogo}>
                        <Upload className="h-4 w-4" />
                        Upload Logo
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Asset Public ID" placeholder="njstore/brands/apple" {...form.register('logoPublicId')} error={form.formState.errors.logoPublicId?.message} />
                    <Input label="Alt Text" placeholder="Apple logo" {...form.register('logoAlt')} error={form.formState.errors.logoAlt?.message} />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">{editingBrand ? 'Save Brand' : 'Create Brand'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
