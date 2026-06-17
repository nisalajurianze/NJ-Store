import type { Key, RefObject } from 'react';
import type { ProductCardDto } from '@njstore/types';
import { cn } from '@njstore/utils/cn';
import { ProductCard } from '../../components/product/ProductCard';
import { STOREFRONT_PRODUCT_GRID_CLASSNAME } from '../../components/product/productCardLayout';
import { ProductLoadMoreSkeletons, ProductSkeletonGrid } from '../../components/shop/ShopSkeletons';
import type { ViewMode } from './shopPageModel';

interface ShopWishlistState {
  pendingProductId?: string | null;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (product: ProductCardDto) => void | Promise<unknown>;
}

interface ShopVirtualRow {
  key: Key;
  index: number;
  start: number;
}

interface ShopVirtualizerState {
  getTotalSize: () => number;
  options: {
    scrollMargin?: number;
  };
}

interface ShopVirtualizationConfig {
  columns: number;
}

interface ShopProductResultsProps {
  isInitialProductLoad: boolean;
  isLoadingMore: boolean;
  viewMode: ViewMode;
  productListRef: RefObject<HTMLDivElement>;
  shouldVirtualizeResults: boolean;
  productRowVirtualizer: ShopVirtualizerState;
  virtualProductRows: ShopVirtualRow[];
  virtualizationConfig: ShopVirtualizationConfig;
  renderedProductRows: ProductCardDto[];
  wishlist: ShopWishlistState;
}

export const ShopProductResults = ({
  isInitialProductLoad,
  isLoadingMore,
  viewMode,
  productListRef,
  shouldVirtualizeResults,
  productRowVirtualizer,
  virtualProductRows,
  virtualizationConfig,
  renderedProductRows,
  wishlist
}: ShopProductResultsProps): JSX.Element => (
  <>
    <div className="relative">
      {isInitialProductLoad ? (
        <ProductSkeletonGrid viewMode={viewMode} />
      ) : (
        <div
          ref={productListRef}
          data-testid="shop-product-list"
          data-virtualized={shouldVirtualizeResults ? 'true' : 'false'}
          className={cn(
            shouldVirtualizeResults
              ? 'relative w-full overflow-hidden'
              : viewMode === 'list'
                ? 'flex flex-col gap-3.5 sm:gap-4'
                : STOREFRONT_PRODUCT_GRID_CLASSNAME
          )}
          style={
            shouldVirtualizeResults
              ? {
                  height: productRowVirtualizer.getTotalSize(),
                  contain: 'strict'
                }
              : undefined
          }
        >
          {shouldVirtualizeResults
            ? virtualProductRows.map((virtualRow) => {
                const rowStartProductIndex = virtualRow.index * virtualizationConfig.columns;
                const rowProducts = renderedProductRows.slice(rowStartProductIndex, rowStartProductIndex + virtualizationConfig.columns);

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    className={cn(
                      'absolute left-0 top-0 w-full',
                      viewMode === 'list' ? 'flex flex-col gap-3.5 sm:gap-4' : STOREFRONT_PRODUCT_GRID_CLASSNAME
                    )}
                    style={{
                      transform: `translateY(${virtualRow.start - (productRowVirtualizer.options.scrollMargin ?? 0)}px)`
                    }}
                  >
                    {rowProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        size={viewMode === 'list' ? 'compact' : 'default'}
                        isWishlisted={wishlist.isWishlisted(product.id)}
                        isWishlistPending={wishlist.pendingProductId === product.id}
                        onWishlistToggle={wishlist.toggleWishlist}
                      />
                    ))}
                  </div>
                );
              })
            : renderedProductRows.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  size={viewMode === 'list' ? 'compact' : 'default'}
                  isWishlisted={wishlist.isWishlisted(product.id)}
                  isWishlistPending={wishlist.pendingProductId === product.id}
                  onWishlistToggle={wishlist.toggleWishlist}
                />
              ))}
        </div>
      )}
    </div>

    {!isInitialProductLoad && isLoadingMore ? <ProductLoadMoreSkeletons viewMode={viewMode} /> : null}
  </>
);
