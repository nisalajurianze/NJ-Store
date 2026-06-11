import { useEffect, useState, type RefObject } from 'react';
import { subscribeToMediaQueryChange } from '../utils/mediaQuery';

interface UseScrollSpyOptions {
  targetRef: RefObject<HTMLElement>;
  enabled?: boolean;
  threshold?: number;
  mobileMediaQuery?: string;
}

export const useScrollSpy = ({
  targetRef,
  enabled = true,
  threshold = 0.01,
  mobileMediaQuery = '(max-width: 1023px)'
}: UseScrollSpyOptions): boolean => {
  const [isTargetOutOfView, setIsTargetOutOfView] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setIsTargetOutOfView(false);
      return;
    }

    const mobileQuery = window.matchMedia(mobileMediaQuery);
    let isMobileViewport = mobileQuery.matches;

    const syncVisibility = (isTargetVisible: boolean): void => {
      if (!isMobileViewport) {
        setIsTargetOutOfView(false);
        return;
      }

      setIsTargetOutOfView(!isTargetVisible);
    };

    const handleViewportChange = (): void => {
      isMobileViewport = mobileQuery.matches;

      if (!isMobileViewport) {
        setIsTargetOutOfView(false);
      }
    };

    const target = targetRef.current;
    let observer: IntersectionObserver | null = null;
    let fallbackFrameId: number | null = null;

    const fallbackScrollHandler = (): void => {
      if (!target) {
        setIsTargetOutOfView(false);
        return;
      }

      const rect = target.getBoundingClientRect();
      syncVisibility(rect.top < window.innerHeight && rect.bottom > 0);
    };

    const scheduleFallbackScrollHandler = (): void => {
      if (fallbackFrameId !== null) {
        return;
      }

      fallbackFrameId = window.requestAnimationFrame(() => {
        fallbackFrameId = null;
        fallbackScrollHandler();
      });
    };

    if (target && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => syncVisibility(Boolean(entry?.isIntersecting)), {
        root: null,
        threshold
      });
      observer.observe(target);
    } else {
      fallbackScrollHandler();
      window.addEventListener('scroll', scheduleFallbackScrollHandler, { passive: true });
      window.addEventListener('resize', scheduleFallbackScrollHandler);
    }

    const unsubscribeViewportChange = subscribeToMediaQueryChange(mobileQuery, handleViewportChange);

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', scheduleFallbackScrollHandler);
      window.removeEventListener('resize', scheduleFallbackScrollHandler);

      if (fallbackFrameId !== null) {
        window.cancelAnimationFrame(fallbackFrameId);
      }

      unsubscribeViewportChange();
    };
  }, [enabled, mobileMediaQuery, targetRef, threshold]);

  return isTargetOutOfView;
};
