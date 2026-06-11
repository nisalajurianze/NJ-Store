import { type ReactNode, useId } from 'react';
import { cn } from '@njstore/utils/cn';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export const Tooltip = ({ content, children, className, contentClassName }: TooltipProps): JSX.Element => {
  const tooltipId = useId();

  return (
    <span className={cn('group/tooltip relative inline-flex', className)}>
      <span aria-describedby={tooltipId}>{children}</span>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          'theme-dark-surface pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-50 hidden max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 whitespace-normal rounded-lg border border-white/10 bg-[#09111f] px-3 py-2 text-center text-xs font-medium text-[#f8fafc] opacity-0 shadow-xl transition-opacity group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 lg:[@media(hover:hover)]:block sm:whitespace-nowrap',
          contentClassName
        )}
      >
        {content}
      </span>
    </span>
  );
};
