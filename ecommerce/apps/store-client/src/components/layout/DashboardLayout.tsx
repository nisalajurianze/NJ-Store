import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button, MobileDrawer } from '@njstore/ui';
import { cn } from '@njstore/utils/cn';
import { useLocation } from 'react-router-dom';
import { AccountContent } from './AccountContent';
import { AccountSidebar } from './AccountSidebar';
import { accountNavItems, getAccountTabFromPath } from './accountPanelConfig';

export const DashboardLayout = (): JSX.Element => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [accountMenuTopOffset, setAccountMenuTopOffset] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const activeItem = accountNavItems.find((item) => item.key === getAccountTabFromPath(location.pathname)) ?? accountNavItems[0];
  const isDesktopViewport = viewportWidth >= 1024;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let resizeFrameId: number | null = null;

    const syncViewportWidth = (): void => {
      const nextViewportWidth = window.innerWidth;
      setViewportWidth((currentViewportWidth) =>
        currentViewportWidth === nextViewportWidth ? currentViewportWidth : nextViewportWidth
      );
    };

    const scheduleSyncViewportWidth = (): void => {
      if (resizeFrameId !== null) {
        return;
      }

      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        syncViewportWidth();
      });
    };

    syncViewportWidth();
    window.addEventListener('resize', scheduleSyncViewportWidth);

    return () => {
      window.removeEventListener('resize', scheduleSyncViewportWidth);
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let resizeFrameId: number | null = null;

    const syncAccountMenuTopOffset = (): void => {
      const storeHeader = document.querySelector<HTMLElement>('[data-testid="store-header"]');
      const nextTopOffset = storeHeader?.getBoundingClientRect().height ?? 0;

      setAccountMenuTopOffset((currentTopOffset) =>
        Math.abs(currentTopOffset - nextTopOffset) < 1 ? currentTopOffset : Math.round(nextTopOffset)
      );
    };

    const scheduleSyncAccountMenuTopOffset = (): void => {
      if (resizeFrameId !== null) {
        return;
      }

      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        syncAccountMenuTopOffset();
      });
    };

    syncAccountMenuTopOffset();
    window.addEventListener('resize', scheduleSyncAccountMenuTopOffset);

    let resizeObserver: ResizeObserver | null = null;
    const storeHeader = document.querySelector<HTMLElement>('[data-testid="store-header"]');
    if (storeHeader && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleSyncAccountMenuTopOffset);
      resizeObserver.observe(storeHeader);
    }

    return () => {
      window.removeEventListener('resize', scheduleSyncAccountMenuTopOffset);
      resizeObserver?.disconnect();
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
    };
  }, []);

  useEffect(() => {
    if (isDesktopViewport) {
      setMobileMenuOpen(false);
      return;
    }

    setDesktopMenuOpen(false);
  }, [isDesktopViewport]);

  useEffect(() => {
    if (!desktopMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setDesktopMenuOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [desktopMenuOpen]);

  const closeAccountPanel = (): void => {
    setDesktopMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const toggleAccountPanel = (): void => {
    if (isDesktopViewport) {
      setDesktopMenuOpen((current) => !current);
      return;
    }

    setMobileMenuOpen(true);
  };

  return (
    <div className="page-shell page-nav-gap pb-4 lg:pb-6">
      <div className="flex flex-col gap-4 lg:min-h-[calc(100vh-6.8rem)]">
        <div
          data-testid="account-menu-bar"
          className="glass-card sticky z-30 flex min-w-0 items-center justify-between gap-3 rounded-[22px] px-3.5 py-2.5 !shadow-none transition-[top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-4 sm:!shadow-none"
          style={{ top: `${accountMenuTopOffset}px` }}
        >
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.28em] text-gold">Account Menu</p>
            <p className="mt-1 truncate text-[13px] font-medium text-white">{activeItem.label}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 shrink-0 gap-2 rounded-full px-3 text-[13px]"
            aria-expanded={isDesktopViewport ? desktopMenuOpen : mobileMenuOpen}
            onClick={toggleAccountPanel}
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
            Sections
          </Button>
        </div>

        <AccountContent className="lg:flex-1" />
      </div>

      <MobileDrawer isOpen={mobileMenuOpen} onClose={closeAccountPanel} title="Account navigation">
        <AccountSidebar
          onNavigate={closeAccountPanel}
          className="!border-none !bg-transparent !p-0 !shadow-none"
        />
      </MobileDrawer>

      <div
        aria-hidden={!desktopMenuOpen}
        className={cn('pointer-events-none fixed inset-0 z-40 hidden lg:block', desktopMenuOpen && 'pointer-events-auto')}
      >
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-0 bg-dark/55 backdrop-blur-[2px] transition-opacity duration-300',
            desktopMenuOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={closeAccountPanel}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Account navigation"
          className={cn(
            'catalog-panel-shell absolute left-4 top-[5.1rem] bottom-4 w-[min(340px,calc(100vw-2rem))] rounded-[30px] border border-white/10 shadow-[0_24px_48px_rgba(0,0,0,0.32)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            desktopMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-[108%] opacity-0'
          )}
        >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-gold/85">Account</p>
                <p className="mt-1 text-sm font-medium text-white">Navigation</p>
              </div>
              <button
                type="button"
                aria-label="Close account navigation"
                className="catalog-close-button flex h-10 w-10 items-center justify-center rounded-full"
                onClick={closeAccountPanel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5">
              <AccountSidebar
                onNavigate={closeAccountPanel}
                className="!h-auto !rounded-none !border-none !bg-transparent !p-0 !shadow-none"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
