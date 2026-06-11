import { Copy } from 'lucide-react';
import { Badge, Button } from '@njstore/ui';
import { AdminDataGrid } from '../../../components/ui/AdminDataGrid';
import type { ProductRecord } from './productFormModel';

const productTableGridClass =
  'grid min-w-[920px] grid-cols-[minmax(0,1.5fr)_minmax(0,0.95fr)_minmax(0,0.72fr)_minmax(0,1fr)_minmax(236px,1.04fr)] items-start gap-4 lg:min-w-0 lg:grid-cols-[minmax(0,1.46fr)_minmax(0,0.94fr)_minmax(0,0.72fr)_minmax(0,0.96fr)_minmax(236px,1.04fr)] lg:gap-3';

interface ProductListTableProps {
  filteredProducts: ProductRecord[];
  canWriteProducts: boolean;
  canDeleteProducts: boolean;
  onOpenEditModal: (product: ProductRecord) => void;
  onDuplicateProduct: (product: ProductRecord) => void;
  onOpenHistoryModal: (product: ProductRecord) => void;
  onDeactivateProduct: (product: ProductRecord) => void;
  onRestoreProduct: (product: ProductRecord) => void;
  onDeleteProduct: (product: ProductRecord) => void;
}

export const ProductListTable = ({
  filteredProducts,
  canWriteProducts,
  canDeleteProducts,
  onOpenEditModal,
  onDuplicateProduct,
  onOpenHistoryModal,
  onDeactivateProduct,
  onRestoreProduct,
  onDeleteProduct
}: ProductListTableProps): JSX.Element => (
  <AdminDataGrid
    headers={['Product', 'Brand & SKU', 'Price', 'Visibility', 'Actions']}
    gridClassName={productTableGridClass}
    hasRows={filteredProducts.length > 0}
    emptyMessage="No products matched that search."
  >
    {filteredProducts.map((product) => {
      const isScheduled = Boolean(product.publishAt && new Date(product.publishAt).getTime() > Date.now());

      return (
        <div key={product._id ?? product.name} className={`${productTableGridClass} border-b border-white/5 px-5 py-4 text-sm text-gray-300 last:border-b-0 sm:px-6`}>
          <div className="space-y-1">
            <p className="font-medium leading-6 text-white">{product.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">{product.category?.name ?? 'Unassigned category'}</p>
              <Badge variant={product.productType === 'bundle' ? 'info' : 'default'} className="capitalize">
                {product.productType ?? 'standard'}
              </Badge>
              <Badge variant={product.condition === 'used' ? 'warning' : 'default'}>
                {product.condition === 'used' ? 'Used item' : 'Brand new'}
              </Badge>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-white">{product.brand}</p>
            <p className="font-mono text-xs text-gray-500">{product.sku}</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-white">LKR {product.price.toLocaleString()}</p>
            {product.comparePrice ? (
              <p className="text-xs text-gray-500 line-through">LKR {product.comparePrice.toLocaleString()}</p>
            ) : (
              <p className="text-xs text-gray-500">Base price</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={product.isActive ? 'success' : 'danger'}>{product.isActive ? 'Active' : 'Inactive'}</Badge>
            {isScheduled ? (
              <span className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-100">
                Scheduled for {new Date(product.publishAt!).toLocaleDateString()}
              </span>
            ) : null}
            {product.isFeatured ? <Badge variant="info">Featured</Badge> : null}
            {product.isBestSeller ? <Badge>Best Seller</Badge> : null}
            {product.isFlashDeal ? <Badge variant="warning">Flash Deal</Badge> : null}
            {product.isFlashDeal && product.flashDealEndsAt ? (
              <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
                Ends {new Date(product.flashDealEndsAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
          <div className="grid w-full max-w-[236px] grid-cols-2 gap-2">
            {product.isActive ? (
              <>
                {canWriteProducts ? (
                  <Button size="sm" variant="secondary" className="justify-center" onClick={() => onOpenEditModal(product)}>
                    Edit
                  </Button>
                ) : null}
                {canWriteProducts ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="justify-center"
                    title="Duplicate as inactive copy"
                    onClick={() => void onDuplicateProduct(product)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" className="col-span-2 justify-center" onClick={() => onOpenHistoryModal(product)}>
                  History
                </Button>
                {canDeleteProducts ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="col-span-2 justify-center"
                    onClick={() => void onDeactivateProduct(product)}
                  >
                    Deactivate
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                {canWriteProducts ? (
                  <Button size="sm" variant="secondary" className="justify-center" onClick={() => onOpenEditModal(product)}>
                    Edit
                  </Button>
                ) : null}
                {canWriteProducts ? (
                  <Button
                    size="sm"
                    className={`${canDeleteProducts ? 'justify-center' : 'col-span-2 justify-center'}`}
                    onClick={() => void onRestoreProduct(product)}
                  >
                    Restore
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" className="col-span-2 justify-center" onClick={() => onOpenHistoryModal(product)}>
                  History
                </Button>
                {canDeleteProducts ? (
                  <Button size="sm" variant="danger" className="col-span-2 justify-center" onClick={() => void onDeleteProduct(product)}>
                    Delete Permanently
                  </Button>
                ) : null}
              </>
            )}
            {!canWriteProducts && !canDeleteProducts ? <p className="col-span-2 text-xs text-gray-500">Read-only access</p> : null}
          </div>
        </div>
      );
    })}
  </AdminDataGrid>
);
