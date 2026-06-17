import { Skeleton } from '@njstore/ui';
import { LogoLoader } from '../layout/LogoLoader';

export type ShopProductViewMode = 'grid' | 'list';

export const ProductSkeletonGrid = (): JSX.Element => (
  <LogoLoader />
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

export const ProductLoadMoreSkeletons = (): JSX.Element => (
  <LogoLoader />
);
