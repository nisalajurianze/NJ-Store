import { Skeleton } from '@njstore/ui';

export const AdminLoader = (): JSX.Element => (
  <div className="page-shell py-12">
    <div className="grid gap-6 lg:grid-cols-4">
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-96 rounded-3xl lg:col-span-4" />
    </div>
  </div>
);
