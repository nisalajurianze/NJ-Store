import { cn } from '@njstore/utils/cn';

export interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps): JSX.Element => (
  <div
    className={cn('animate-pulse rounded-2xl bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]', className)}
    aria-hidden="true"
  />
);
