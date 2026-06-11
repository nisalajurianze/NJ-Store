import { useRef, type ReactNode, type WheelEvent as ReactWheelEvent } from 'react';
import { cn } from '@njstore/utils';

export interface AdminDataGridProps {
  headers: string[];
  gridClassName: string;
  hasRows: boolean;
  emptyMessage: string;
  children: ReactNode;
  bodyClassName?: string;
}

export const AdminDataGrid = ({
  headers,
  gridClassName,
  hasRows,
  emptyMessage,
  children,
  bodyClassName
}: AdminDataGridProps): JSX.Element => {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const handleHeaderWheel = (event: ReactWheelEvent<HTMLDivElement>): void => {
    const scrollArea = scrollAreaRef.current;

    if (!scrollArea || event.ctrlKey) {
      return;
    }

    const deltaY =
      event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2
          ? event.deltaY * scrollArea.clientHeight
          : event.deltaY;

    if (deltaY === 0) {
      return;
    }

    const maxScrollTop = scrollArea.scrollHeight - scrollArea.clientHeight;
    if (maxScrollTop <= 0) {
      return;
    }

    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, scrollArea.scrollTop + deltaY));
    if (nextScrollTop === scrollArea.scrollTop) {
      return;
    }

    scrollArea.scrollTop = nextScrollTop;
    event.preventDefault();
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-col lg:flex-1">
      <div className="admin-data-grid-shell relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,27,48,0.95),rgba(11,20,36,0.95))] shadow-[0_18px_34px_rgba(0,0,0,0.18)] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.06),transparent_26%)] after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-white/10">
        <div
          ref={scrollAreaRef}
          data-admin-grid-scroll="true"
          className="admin-scrollbar h-full max-w-full overflow-auto overscroll-x-contain [scrollbar-gutter:stable]"
        >
          <div className="flex min-h-full min-w-full flex-col">
            <div
              data-admin-grid-header="true"
              onWheel={handleHeaderWheel}
              className={cn(
                gridClassName,
                'admin-data-grid-header sticky top-0 z-10 border-b border-white/10 bg-[#182844]/95 px-5 py-3.5 text-left text-[11px] uppercase tracking-[0.22em] text-gray-400 backdrop-blur-xl sm:px-6 [touch-action:pan-y]'
              )}
            >
              {headers.map((header) => (
                <div key={header}>{header}</div>
              ))}
            </div>

            <div className={cn('relative flex-1 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]', bodyClassName)}>
              {hasRows ? (
                children
              ) : (
                <div className="flex min-h-[240px] items-center justify-center px-6 py-12">
                  <div className="max-w-md rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-8 text-center text-sm leading-6 text-gray-400">
                    {emptyMessage}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
