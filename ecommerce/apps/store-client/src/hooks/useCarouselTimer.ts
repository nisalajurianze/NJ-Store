import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseCarouselTimerOptions {
  delay: number;
  enabled?: boolean;
  onTick: () => void;
  respectReducedMotion?: boolean;
  allowCoarsePointer?: boolean;
  allowLowMemory?: boolean;
  activeElementRef?: RefObject<Element>;
  activeRootMargin?: string;
}

const shouldReduceCarouselMotion = ({
  allowCoarsePointer,
  allowLowMemory
}: {
  allowCoarsePointer: boolean;
  allowLowMemory: boolean;
}): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  const navigatorHints = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };

  return (
    Boolean(navigatorHints.connection?.saveData) ||
    (!allowLowMemory && typeof navigatorHints.deviceMemory === 'number' && navigatorHints.deviceMemory <= 4) ||
    (!allowCoarsePointer && window.matchMedia('(hover: none)').matches) ||
    (!allowCoarsePointer && window.matchMedia('(pointer: coarse)').matches) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
};

export const useCarouselTimer = ({
  delay,
  enabled = true,
  onTick,
  respectReducedMotion = true,
  allowCoarsePointer = false,
  allowLowMemory = false,
  activeElementRef,
  activeRootMargin = '120px 0px'
}: UseCarouselTimerOptions): void => {
  const onTickRef = useRef(onTick);
  const [isActiveElementVisible, setIsActiveElementVisible] = useState(true);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!activeElementRef) {
      setIsActiveElementVisible(true);
      return;
    }

    const activeElement = activeElementRef.current;
    if (!activeElement || typeof IntersectionObserver === 'undefined') {
      setIsActiveElementVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsActiveElementVisible(Boolean(entry?.isIntersecting));
      },
      { rootMargin: activeRootMargin, threshold: 0.01 }
    );

    observer.observe(activeElement);

    return () => {
      observer.disconnect();
    };
  }, [activeElementRef, activeRootMargin, enabled]);

  useEffect(() => {
    if (!enabled || !isActiveElementVisible) {
      return;
    }

    if (respectReducedMotion && shouldReduceCarouselMotion({ allowCoarsePointer, allowLowMemory })) {
      return;
    }

    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      onTickRef.current();
    }, delay);

    return () => {
      window.clearInterval(timer);
    };
  }, [allowCoarsePointer, allowLowMemory, delay, enabled, isActiveElementVisible, respectReducedMotion]);
};
