import { GitCompareArrows } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@njstore/ui';
import { useCompare } from '../../context/CompareContext';

export const CompareBar = (): JSX.Element | null => {
  const location = useLocation();
  const { items, clearCompare } = useCompare();

  if (items.length < 2 || location.pathname.startsWith('/compare')) {
    return null;
  }

  return (
    <div className="fixed inset-x-2 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-[70] max-[360px]:inset-x-1 sm:inset-x-auto sm:left-1/2 sm:bottom-[calc(4.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 lg:bottom-4 lg:z-40">
      <div className="theme-floating-surface flex min-w-0 items-center justify-between gap-1.5 rounded-[22px] border border-white/10 px-2.5 py-2 shadow-[0_18px_38px_rgba(0,0,0,0.28)] backdrop-blur-xl max-[360px]:gap-1 max-[360px]:px-2 sm:gap-3 sm:rounded-[24px] sm:px-5 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="hidden shrink-0 rounded-full bg-gold/15 p-2 text-gold min-[360px]:inline-flex sm:p-2.5">
            <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white min-[390px]:text-sm">Compare Products</p>
            <p className="hidden truncate text-xs leading-5 text-gray-400 min-[390px]:block">
              {items.length} items selected<span className="hidden min-[420px]:inline"> for side-by-side comparison.</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link to="/compare" className="min-w-0">
            <Button size="sm" className="h-8 whitespace-nowrap px-2 text-[11px] min-[390px]:px-3 min-[390px]:text-xs sm:h-9 sm:px-3.5 sm:text-[13px]">Open Compare</Button>
          </Link>
          <Button size="sm" variant="secondary" className="h-8 whitespace-nowrap px-2 text-[11px] min-[390px]:px-3 min-[390px]:text-xs sm:h-9 sm:px-3.5 sm:text-[13px]" onClick={clearCompare}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};
