import { Card, Skeleton } from '@njstore/ui';

export const ProductDetailSkeleton = (): JSX.Element => (
  <div className="page-shell page-nav-gap pb-0" aria-busy="true">
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Skeleton className="h-4 w-12 rounded-full" />
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-4 w-16 rounded-full" />
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-4 w-28 rounded-full" />
    </div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
      <div className="space-y-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-12 w-3/4 rounded-[20px]" />
          <Skeleton className="h-5 w-full rounded-full" />
          <Skeleton className="h-5 w-5/6 rounded-full" />
        </div>

        <Card className="overflow-visible rounded-[32px] border-0 bg-transparent p-0 shadow-none backdrop-blur-0">
          <div className="grid gap-4 lg:grid-cols-[104px_minmax(0,1fr)] lg:items-start lg:gap-5">
            <div className="order-2 flex gap-3 overflow-x-auto px-2 py-2 lg:order-1 lg:max-h-[460px] lg:flex-col lg:px-0 lg:py-0 lg:pr-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-20 w-20 shrink-0 rounded-2xl" />
              ))}
            </div>
            <div className="order-1 lg:order-2">
              <Skeleton className="h-[420px] rounded-[32px]" />
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-[32px] p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-11 w-24 rounded-full" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
            <Skeleton className="h-24 rounded-[24px]" />
            <Skeleton className="h-36 rounded-[24px]" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-11 w-28 rounded-xl" />
              <Skeleton className="h-11 w-40 rounded-xl" />
              <Skeleton className="h-11 w-36 rounded-xl" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[32px] p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-[24px]" />
            <Skeleton className="h-24 rounded-[24px]" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  </div>
);
