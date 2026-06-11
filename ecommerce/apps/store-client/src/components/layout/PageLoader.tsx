import { Skeleton } from '@njstore/ui';

export const PageLoader = (): JSX.Element => (
  <div className="page-shell page-nav-gap min-h-[calc(100svh+12rem)] pb-0 lg:min-h-[calc(100svh+10rem)]">
    <div className="grid gap-6 lg:grid-cols-3">
      <Skeleton className="h-40 rounded-3xl lg:col-span-2" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl lg:col-span-3" />
    </div>
  </div>
);
