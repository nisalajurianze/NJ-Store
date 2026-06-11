import type { ReactNode } from 'react';
import { MobileDrawer } from '@njstore/ui';
import { X } from 'lucide-react';
import { cn } from '@njstore/utils/cn';

interface ShopFilterDrawersProps {
  mobileFilterOpen: boolean;
  desktopFilterOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const ShopFilterDrawers = ({
  mobileFilterOpen,
  desktopFilterOpen,
  onClose,
  children
}: ShopFilterDrawersProps): JSX.Element => (
  <>
    <MobileDrawer isOpen={mobileFilterOpen} onClose={onClose} title="Filters">
      {children}
    </MobileDrawer>

    <div
      aria-hidden={!desktopFilterOpen}
      className={cn('pointer-events-none fixed inset-0 z-40 hidden lg:block', desktopFilterOpen && 'pointer-events-auto')}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-dark/55 backdrop-blur-[2px] transition-opacity duration-300',
          desktopFilterOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={cn(
          'catalog-panel-shell absolute left-4 top-[5.1rem] bottom-4 w-[min(340px,calc(100vw-2rem))] rounded-[30px] border border-white/10 shadow-[0_24px_48px_rgba(0,0,0,0.32)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          desktopFilterOpen ? 'translate-x-0 opacity-100' : '-translate-x-[108%] opacity-0'
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-gold/85">Catalog</p>
              <p className="mt-1 text-sm font-medium text-white">Filters</p>
            </div>
            <button type="button" aria-label="Close filters" className="catalog-close-button flex h-10 w-10 items-center justify-center rounded-full" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5">{desktopFilterOpen ? children : null}</div>
        </div>
      </aside>
    </div>
  </>
);
