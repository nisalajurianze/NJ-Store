import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@njstore/utils/cn';

export interface TableShellProps {
  caption?: string;
  header: ReactNode;
  body: ReactNode;
  className?: string;
  scrollContainerClassName?: string;
  tableClassName?: string;
  stickyHeader?: boolean;
}

export const TableShell = ({
  caption,
  header,
  body,
  className,
  scrollContainerClassName,
  tableClassName,
  stickyHeader = false
}: PropsWithChildren<TableShellProps>): JSX.Element => (
  <div
    className={cn(
      'max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_18px_38px_rgba(0,0,0,0.18)]',
      className
    )}
  >
    <div className={cn('relative max-w-full overflow-x-auto overscroll-x-contain', scrollContainerClassName)}>
      <table className={cn('w-full min-w-full divide-y divide-white/10', tableClassName)}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead
          className={cn(
            'bg-white/5',
            stickyHeader &&
              'sticky top-0 z-10 bg-[#334361] shadow-[0_1px_0_rgba(255,255,255,0.08)] [&_th]:bg-[#334361]'
          )}
        >
          {header}
        </thead>
        <tbody className="divide-y divide-white/5">{body}</tbody>
      </table>
    </div>
  </div>
);
