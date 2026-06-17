import { Skeleton } from '@njstore/ui';
import { cn } from '@njstore/utils/cn';
import { STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME, STOREFRONT_PRODUCT_GRID_CLASSNAME } from '../product/productCardLayout';

export type ShopProductViewMode = 'grid' | 'list';

export const ProductSkeletonGrid = ({ viewMode, muted = false }: { viewMode: ShopProductViewMode; muted?: boolean }): JSX.Element => (
  <div
    className={cn(
      viewMode === 'list' ? 'grid gap-3.5 sm:gap-4' : STOREFRONT_PRODUCT_GRID_CLASSNAME,
      muted && 'opacity-75'
    )}
  >
    {Array.from({ length: viewMode === 'list' ? 6 : 12 }, (_, index) => (
      <Skeleton
        key={index}
        className={cn(
          viewMode === 'list' ? 'h-[248px] rounded-[22px] sm:h-[272px] sm:rounded-[30px]' : STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME
        )}
      />
    ))}
  </div>
);

export const SearchSuggestionSkeletonList = (): JSX.Element => (
  <div className="space-y-2 p-3">
    {Array.from({ length: 4 }, (_, index) => (
      <div key={index} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="mt-2 h-3 w-24 rounded-full" />
      </div>
    ))}
  </div>
);

export const ProductLoadMoreSkeletons = ({ viewMode }: { viewMode: ShopProductViewMode }): JSX.Element => (
  <div
    className={cn(
      'mt-4 sm:mt-5',
      viewMode === 'list' ? 'grid gap-3.5 sm:gap-4' : STOREFRONT_PRODUCT_GRID_CLASSNAME
    )}
  >
    {Array.from({ length: viewMode === 'list' ? 2 : 4 }, (_, index) => (
      <Skeleton
        key={index}
        className={cn(
          viewMode === 'list' ? 'h-[248px] rounded-[22px] sm:h-[272px] sm:rounded-[30px]' : STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME
        )}
      />
    ))}
  </div>
);
