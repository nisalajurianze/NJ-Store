/**
 * useResultsToolbar — encapsulates the sticky toolbar show/hide scroll behavior.
 *
 * Extracted from Shop.tsx to reduce the main component's cognitive load.
 */
import { useEffect, useRef, useState } from 'react';
import {
  getResultsToolbarTopOffset,
  RESULTS_TOOLBAR_MIN_COLLAPSE_OFFSET,
  RESULTS_TOOLBAR_REOPEN_SCROLL_GRACE_DISTANCE,
  RESULTS_TOOLBAR_RESET_SCROLL_Y,
  RESULTS_TOOLBAR_SCROLL_DELTA
} from './shopPageModel';

export interface UseResultsToolbarReturn {
  /** Whether the full toolbar is expanded */
  isResultsToolbarOpen: boolean;
  /** Whether the user has scrolled past the toolbar's sticky zone */
  hasScrolledPastResultsToolbar: boolean;
  /** The current dynamic top offset (px) for the sticky toolbar */
  resultsToolbarTopOffset: number;
  /** Ref to attach to the toolbar container element */
  resultsHeaderRef: React.RefObject<HTMLDivElement>;
  /** Collapse the toolbar (scroll-down hide) */
  collapseResultsToolbar: () => void;
  /** Expand the toolbar (manual user tap) */
  expandResultsToolbar: () => void;
}

export const useResultsToolbar = (onCollapse?: () => void): UseResultsToolbarReturn => {
  const [isResultsToolbarOpen, setIsResultsToolbarOpen] = useState(true);
  const [hasScrolledPastResultsToolbar, setHasScrolledPastResultsToolbar] = useState(false);
  const [resultsToolbarTopOffset, setResultsToolbarTopOffset] = useState(() =>
    getResultsToolbarTopOffset(typeof window === 'undefined' ? 1280 : window.innerWidth)
  );

  const resultsHeaderRef = useRef<HTMLDivElement>(null);
  const isResultsToolbarOpenRef = useRef(true);
  const hasScrolledPastResultsToolbarRef = useRef(false);
  const resultsToolbarTopOffsetRef = useRef(resultsToolbarTopOffset);
  const lastWindowScrollYRef = useRef(0);
  const lastManualToolbarExpandScrollYRef = useRef<number | null>(null);

  const setResultsToolbarVisibility = (nextOpen: boolean): void => {
    if (isResultsToolbarOpenRef.current === nextOpen) {
      return;
    }

    isResultsToolbarOpenRef.current = nextOpen;
    setIsResultsToolbarOpen(nextOpen);
  };

  const setHasScrolledPastResultsToolbarVisibility = (nextHasScrolledPast: boolean): void => {
    if (hasScrolledPastResultsToolbarRef.current === nextHasScrolledPast) {
      return;
    }

    hasScrolledPastResultsToolbarRef.current = nextHasScrolledPast;
    setHasScrolledPastResultsToolbar(nextHasScrolledPast);
  };

  const collapseResultsToolbar = (): void => {
    lastManualToolbarExpandScrollYRef.current = null;
    setResultsToolbarVisibility(false);
    onCollapse?.();
  };

  const expandResultsToolbar = (): void => {
    lastManualToolbarExpandScrollYRef.current =
      typeof window === 'undefined' ? 0 : Math.max(window.scrollY, 0);
    setResultsToolbarVisibility(true);
  };

  // Sync the CSS top offset when the viewport or store header resizes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let resizeFrameId: number | null = null;

    const syncResultsToolbarTopOffset = (): void => {
      const nextTopOffset = getResultsToolbarTopOffset(window.innerWidth);
      if (Math.abs(resultsToolbarTopOffsetRef.current - nextTopOffset) < 1) {
        return;
      }

      resultsToolbarTopOffsetRef.current = nextTopOffset;
      setResultsToolbarTopOffset(nextTopOffset);
    };

    const scheduleSyncResultsToolbarTopOffset = (): void => {
      if (resizeFrameId !== null) {
        return;
      }

      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        syncResultsToolbarTopOffset();
      });
    };

    syncResultsToolbarTopOffset();
    window.addEventListener('resize', scheduleSyncResultsToolbarTopOffset);

    let resizeObserver: ResizeObserver | null = null;
    const storeHeader = document.querySelector<HTMLElement>('[data-testid="store-header"]');
    if (storeHeader && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleSyncResultsToolbarTopOffset);
      resizeObserver.observe(storeHeader);
    }

    return () => {
      window.removeEventListener('resize', scheduleSyncResultsToolbarTopOffset);
      resizeObserver?.disconnect();
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
    };
  }, []);

  // Auto-hide toolbar on scroll-down, re-show on scroll-up or returning to top
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let scrollFrameId: number | null = null;

    const syncResultsToolbar = (): void => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const scrollDelta = currentScrollY - lastWindowScrollYRef.current;

      const resultsHeaderStickyTop = resultsToolbarTopOffsetRef.current;
      const resultsHeaderViewportTop =
        resultsHeaderRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const hasEnteredStickyZone =
        resultsHeaderViewportTop <= resultsHeaderStickyTop + 2 ||
        currentScrollY >= RESULTS_TOOLBAR_MIN_COLLAPSE_OFFSET;
      const isScrollingDown = scrollDelta > RESULTS_TOOLBAR_SCROLL_DELTA;

      setHasScrolledPastResultsToolbarVisibility(hasEnteredStickyZone);

      if (currentScrollY <= RESULTS_TOOLBAR_RESET_SCROLL_Y || !hasEnteredStickyZone) {
        lastManualToolbarExpandScrollYRef.current = null;
        if (!isResultsToolbarOpenRef.current) {
          setResultsToolbarVisibility(true);
        }
        lastWindowScrollYRef.current = currentScrollY;
        return;
      }

      const manualExpandScrollY = lastManualToolbarExpandScrollYRef.current;
      if (
        manualExpandScrollY !== null &&
        currentScrollY <= manualExpandScrollY + RESULTS_TOOLBAR_REOPEN_SCROLL_GRACE_DISTANCE
      ) {
        lastWindowScrollYRef.current = currentScrollY;
        return;
      }

      if (manualExpandScrollY !== null) {
        lastManualToolbarExpandScrollYRef.current = null;
      }

      if (isScrollingDown && isResultsToolbarOpenRef.current) {
        collapseResultsToolbar();
      }

      lastWindowScrollYRef.current = currentScrollY;
    };

    const scheduleSyncResultsToolbar = (): void => {
      if (scrollFrameId !== null) {
        return;
      }

      scrollFrameId = window.requestAnimationFrame(() => {
        scrollFrameId = null;
        syncResultsToolbar();
      });
    };

    syncResultsToolbar();
    window.addEventListener('scroll', scheduleSyncResultsToolbar, { passive: true });

    return () => {
      window.removeEventListener('scroll', scheduleSyncResultsToolbar);

      if (scrollFrameId !== null) {
        window.cancelAnimationFrame(scrollFrameId);
      }
    };
  }, []);

  return {
    isResultsToolbarOpen,
    hasScrolledPastResultsToolbar,
    resultsToolbarTopOffset,
    resultsHeaderRef,
    collapseResultsToolbar,
    expandResultsToolbar
  };
};
