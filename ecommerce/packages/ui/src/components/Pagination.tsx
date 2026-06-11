import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@njstore/utils/cn';
import { Button } from './Button.js';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

const buildPaginationRange = (page: number, totalPages: number): number[] => {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export const Pagination = ({ page, totalPages, onPageChange, disabled = false, className }: PaginationProps): JSX.Element | null => {
  if (totalPages <= 1) {
    return null;
  }

  const safePage = Math.min(Math.max(1, page), totalPages);
  const pages = buildPaginationRange(safePage, totalPages);

  return (
    <nav className={cn('flex flex-wrap items-center justify-between gap-3', className)} aria-label="Pagination">
      <p className="text-sm leading-6 text-gray-400">
        Page {safePage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={cn(
                'flex h-9 min-w-9 items-center justify-center rounded-xl border px-2 text-sm font-medium transition-colors',
                pageNumber === safePage
                  ? 'border-gold/30 bg-gold/15 text-gold'
                  : 'border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/15 hover:bg-white/[0.07] hover:text-white'
              )}
              disabled={disabled}
              aria-current={pageNumber === safePage ? 'page' : undefined}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
};
