import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Boxes, Pencil, Plus, RotateCcw } from 'lucide-react';
import { Badge, Button, Card } from '@njstore/ui';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminSearchBar } from '../../components/ui/AdminSearchBar';
import { AdminControlPanel, AdminInlineNotice, AdminPageHeader, AdminStatGrid } from '../../components/ui/AdminSurface';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService, type AdminProductMutationPayload } from '../../services/adminService';
import { getApiErrorMessage } from '../../utils/apiError';
import { type ListQueryResult, type ProductRecord } from './products/productFormModel';

type InventoryViewFilter = 'all' | 'low_stock' | 'out_of_stock' | 'inactive';

interface InventoryRow {
  id: string;
  product: ProductRecord;
  productId: string;
  productName: string;
  brand: string;
  categoryName: string;
  sku: string;
  stock: number;
  variantIndex: number | null;
  variantLabel: string;
  variantCount: number;
  isActive: boolean;
  isBundle: boolean;
  isEditable: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

const inventoryPageSize = 50;
const lowStockThreshold = 5;

const wholeNumberFormatter = new Intl.NumberFormat('en-LK', {
  maximumFractionDigits: 0
});

const filterOptions: Array<{ value: InventoryViewFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'inactive', label: 'Inactive' }
];

const parseInventoryViewFilter = (value: string | null): InventoryViewFilter => {
  if (value === 'low_stock' || value === 'out_of_stock' || value === 'inactive') {
    return value;
  }

  return 'all';
};

const parsePositivePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const getVariantLabel = (variant: ProductRecord['variants'][number]): string => {
  const attributes = (variant.attributes ?? [])
    .map((attribute) => [attribute.name, attribute.value].filter(Boolean).join(': '))
    .filter(Boolean);
  const labelParts = [variant.color, variant.storage, variant.model, ...attributes].filter(Boolean);
  return labelParts.join(' / ') || 'Default variant';
};

const getRowStatus = (row: InventoryRow): { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' } => {
  if (!row.isActive) {
    return { label: 'Inactive', variant: 'default' };
  }

  if (row.isOutOfStock) {
    return { label: 'Out of stock', variant: 'danger' };
  }

  if (row.isLowStock) {
    return { label: 'Low stock', variant: 'warning' };
  }

  return { label: 'Healthy', variant: 'success' };
};

const flattenInventoryRows = (products: ProductRecord[]): InventoryRow[] =>
  products.flatMap((product): InventoryRow[] => {
    const baseRow = {
      product,
      productId: product._id,
      productName: product.name,
      brand: product.brand,
      categoryName: product.category?.name ?? 'Unassigned category',
      isActive: product.isActive,
      isBundle: product.productType === 'bundle'
    };

    if (product.productType === 'bundle') {
      const stock = product.stock ?? 0;

      return [
        {
          ...baseRow,
          id: `${product._id}-bundle`,
          sku: product.sku,
          stock,
          variantIndex: null,
          variantLabel: `${product.bundleItems?.length ?? 0} bundled item${(product.bundleItems?.length ?? 0) === 1 ? '' : 's'}`,
          variantCount: product.bundleItems?.length ?? 0,
          isEditable: false,
          isLowStock: stock > 0 && stock < lowStockThreshold,
          isOutOfStock: stock <= 0
        }
      ];
    }

    if (!product.variants.length) {
      return [
        {
          ...baseRow,
          id: `${product._id}-no-variant`,
          sku: product.sku,
          stock: 0,
          variantIndex: null,
          variantLabel: 'No variants configured',
          variantCount: 0,
          isEditable: false,
          isLowStock: false,
          isOutOfStock: true
        }
      ];
    }

    return product.variants.map<InventoryRow>((variant, variantIndex) => ({
      ...baseRow,
      id: `${product._id}-${variant.sku || variantIndex}`,
      sku: variant.sku,
      stock: variant.stock,
      variantIndex,
      variantLabel: getVariantLabel(variant),
      variantCount: product.variants.length,
      isEditable: true,
      isLowStock: variant.stock > 0 && variant.stock < lowStockThreshold,
      isOutOfStock: variant.stock <= 0
    }));
  });

export const Inventory = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermissions } = useAdminPermissions();
  const canWriteProducts = hasPermissions('product:write');
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
  const [filter, setFilter] = useState<InventoryViewFilter>(() => parseInventoryViewFilter(searchParams.get('filter')));
  const [productPage, setProductPage] = useState(() => parsePositivePage(searchParams.get('page')));
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [restoringProductId, setRestoringProductId] = useState<string | null>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const highlightedProductId = searchParams.get('edit');

  const products = useQuery<ListQueryResult<ProductRecord>>({
    queryKey: ['admin', 'inventory-products', { page: productPage, search: deferredSearchTerm }],
    queryFn: async () =>
      (await adminService.products<ProductRecord>({
        page: productPage,
        limit: inventoryPageSize,
        search: deferredSearchTerm.trim() || undefined,
        includeInactive: true
      })) as ListQueryResult<ProductRecord>
  });

  const productItems = products.data?.data ?? [];
  const inventoryRows = useMemo(() => flattenInventoryRows(productItems), [productItems]);
  const filteredRows = useMemo(
    () =>
      inventoryRows.filter((row) => {
        if (filter === 'low_stock') {
          return row.isLowStock;
        }

        if (filter === 'out_of_stock') {
          return row.isOutOfStock;
        }

        if (filter === 'inactive') {
          return !row.isActive;
        }

        return true;
      }),
    [filter, inventoryRows]
  );
  const stats = useMemo(
    () => ({
      totalUnits: inventoryRows.reduce((sum, row) => sum + row.stock, 0),
      lowStock: inventoryRows.filter((row) => row.isLowStock).length,
      outOfStock: inventoryRows.filter((row) => row.isOutOfStock).length,
      inactive: inventoryRows.filter((row) => !row.isActive).length
    }),
    [inventoryRows]
  );
  const pagination = products.data?.pagination;
  const totalProducts = pagination?.total ?? productItems.length;
  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.page ?? productPage;
  const currentLimit = pagination?.limit ?? inventoryPageSize;
  const pageStart = totalProducts > 0 ? (currentPage - 1) * currentLimit + 1 : 0;
  const pageEnd = totalProducts > 0 ? Math.min(pageStart + productItems.length - 1, totalProducts) : 0;

  useEffect(() => {
    setSearchTerm((current) => {
      const nextSearchTerm = searchParams.get('q') ?? '';
      return current === nextSearchTerm ? current : nextSearchTerm;
    });
    setFilter((current) => {
      const nextFilter = parseInventoryViewFilter(searchParams.get('filter'));
      return current === nextFilter ? current : nextFilter;
    });
    setProductPage((current) => {
      const nextPage = parsePositivePage(searchParams.get('page'));
      return current === nextPage ? current : nextPage;
    });
  }, [searchParams]);

  const handleSearchChange = (value: string): void => {
    setSearchTerm(value);
    setProductPage(1);
  };

  const handleFilterChange = (nextFilter: InventoryViewFilter): void => {
    setFilter(nextFilter);
    setProductPage(1);
  };

  const updateVariantStock = async (row: InventoryRow, nextStock: number): Promise<void> => {
    if (!canWriteProducts || row.variantIndex === null || !row.isEditable) {
      return;
    }

    const normalizedStock = Math.max(0, Math.floor(nextStock));
    const nextVariants: AdminProductMutationPayload['variants'] = row.product.variants.map((variant, index) => ({
      ...variant,
      stock: index === row.variantIndex ? normalizedStock : variant.stock
    }));

    try {
      setPendingRowId(row.id);
      await adminService.updateProduct(row.productId, { variants: nextVariants });
      toast.success('Stock updated');
      await products.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update stock right now.'));
    } finally {
      setPendingRowId(null);
    }
  };

  const handleSetStock = async (row: InventoryRow): Promise<void> => {
    const nextStockValue = window.prompt(`Set stock for ${row.productName} (${row.variantLabel})`, String(row.stock));

    if (nextStockValue === null) {
      return;
    }

    const nextStock = Number(nextStockValue);
    if (!Number.isInteger(nextStock) || nextStock < 0) {
      toast.error('Enter a whole stock number.');
      return;
    }

    await updateVariantStock(row, nextStock);
  };

  const handleRestoreProduct = async (product: ProductRecord): Promise<void> => {
    if (!canWriteProducts) {
      return;
    }

    try {
      setRestoringProductId(product._id);
      await adminService.updateProduct(product._id, { isActive: true });
      toast.success('Product restored');
      await products.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to restore this product right now.'));
    } finally {
      setRestoringProductId(null);
    }
  };

  const openProductEditor = (productId: string): void => {
    navigate(`/dashboard/products?view=all&edit=${productId}`);
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Inventory"
        title="Inventory"
        description="Track stock, low-stock variants, inactive products, and restock work from one clean workspace."
      />

      <AdminStatGrid
        items={[
          {
            label: 'Loaded units',
            value: wholeNumberFormatter.format(stats.totalUnits),
            support: `${wholeNumberFormatter.format(inventoryRows.length)} stock rows on this page.`,
            tone: 'gold'
          },
          {
            label: 'Low stock',
            value: wholeNumberFormatter.format(stats.lowStock),
            support: 'Variants below the safety threshold.',
            tone: stats.lowStock > 0 ? 'rose' : 'emerald',
            onClick: () => handleFilterChange('low_stock')
          },
          {
            label: 'Out of stock',
            value: wholeNumberFormatter.format(stats.outOfStock),
            support: 'Rows that need immediate restock or review.',
            tone: stats.outOfStock > 0 ? 'rose' : 'slate',
            onClick: () => handleFilterChange('out_of_stock')
          },
          {
            label: 'Inactive',
            value: wholeNumberFormatter.format(stats.inactive),
            support: 'Products hidden from the live storefront.',
            tone: stats.inactive > 0 ? 'blue' : 'slate',
            onClick: () => handleFilterChange('inactive')
          }
        ]}
      />

      <AdminControlPanel>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <AdminSearchBar
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search inventory by product, brand, category, SKU, or variant"
            label="Search inventory"
            resultCount={filteredRows.length}
            totalCount={inventoryRows.length}
          />
          <div className="flex flex-wrap items-end gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFilterChange(option.value)}
                className={`h-11 rounded-full border px-4 text-xs font-medium uppercase tracking-[0.14em] transition ${
                  filter === option.value
                    ? 'border-gold/30 bg-gold text-dark'
                    : 'border-white/10 bg-white/[0.045] text-gray-300 hover:border-white/20 hover:bg-white/[0.075] hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <AdminInlineNotice>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            Showing {pageStart}-{pageEnd}
          </span>
          <p>
            {wholeNumberFormatter.format(totalProducts)} products are available across inventory pages. Bundle stock is derived from bundled items, so open the product editor for bundle changes.
          </p>
        </AdminInlineNotice>
      </AdminControlPanel>

      <Card className="rounded-[26px] p-4 sm:p-5">
        {products.isLoading ? (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`inventory-skeleton-${index}`} className="h-[168px] animate-pulse rounded-[20px] border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        ) : products.isError ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
            <div>
              <AlertTriangle className="mx-auto h-8 w-8 text-red-300" />
              <p className="mt-3 font-display text-xl text-white">Inventory could not load</p>
              <p className="mt-2 text-sm text-gray-400">Try again once the admin API is reachable.</p>
              <Button variant="secondary" className="mt-4" onClick={() => void products.refetch()}>
                Retry
              </Button>
            </div>
          </div>
        ) : filteredRows.length ? (
          <div data-admin-grid-scroll="true" className="max-h-[calc(100vh-22rem)] min-h-[420px] overflow-y-auto pr-1">
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredRows.map((row) => {
                const status = getRowStatus(row);
                const isPending = pendingRowId === row.id;
                const isHighlighted = highlightedProductId === row.productId;

                return (
                  <article
                    key={row.id}
                    className={`rounded-[20px] border p-4 shadow-[0_10px_22px_rgba(0,0,0,0.12)] transition ${
                      isHighlighted ? 'border-gold/35 bg-gold/[0.08]' : 'border-white/10 bg-white/[0.035] hover:border-white/16 hover:bg-white/[0.055]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-lg leading-tight text-white">{row.productName}</p>
                        <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-gray-500">
                          {row.categoryName} / {row.brand || 'Unbranded'}
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-200">{row.variantLabel}</p>
                        <p className="mt-1 font-mono text-xs text-gray-500">{row.sku}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={row.isBundle ? 'info' : 'default'}>{row.isBundle ? 'Bundle' : `${row.variantCount} variants`}</Badge>
                          <Badge variant={row.isActive ? 'success' : 'danger'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                      </div>
                      <div className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-right">
                        <p className="font-display text-3xl leading-none text-white">{wholeNumberFormatter.format(row.stock)}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">units</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {canWriteProducts && row.isEditable ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => void updateVariantStock(row, row.stock + 1)} isLoading={isPending}>
                            <Plus className="h-3.5 w-3.5" />
                            1
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => void updateVariantStock(row, row.stock + 5)} isLoading={isPending}>
                            <Plus className="h-3.5 w-3.5" />
                            5
                          </Button>
                          <Button size="sm" onClick={() => void handleSetStock(row)} isLoading={isPending}>
                            Set stock
                          </Button>
                        </>
                      ) : null}
                      {!row.isEditable ? (
                        <Button size="sm" variant="secondary" onClick={() => openProductEditor(row.productId)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      ) : null}
                      {canWriteProducts && !row.isActive ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleRestoreProduct(row.product)}
                          isLoading={restoringProductId === row.productId}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </Button>
                      ) : null}
                      {row.isEditable ? (
                        <Button size="sm" variant="ghost" onClick={() => openProductEditor(row.productId)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit product
                        </Button>
                      ) : null}
                      {!canWriteProducts ? <span className="text-xs text-gray-500">Read-only access</span> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
            <div>
              <Boxes className="mx-auto h-8 w-8 text-gold" />
              <p className="mt-3 font-display text-xl text-white">No inventory rows found</p>
              <p className="mt-2 text-sm text-gray-400">Try a different search or inventory filter.</p>
            </div>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={currentPage <= 1} onClick={() => setProductPage((page) => Math.max(1, page - 1))}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={currentPage >= totalPages} onClick={() => setProductPage((page) => page + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
};
