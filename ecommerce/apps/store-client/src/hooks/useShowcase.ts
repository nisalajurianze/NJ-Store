import { useEffect, useRef, useState } from 'react';
import { useCarouselTimer } from './useCarouselTimer';

const SHOWCASE_PRODUCT_AUTOSCROLL_MS = 4200;

interface UseShowcaseOptions {
  productCount: number;
}

interface UseShowcaseValue {
  showcaseIndex: number;
  showcaseTransitionDirection: 'left' | 'right';
  pauseShowcaseCarousel: () => void;
  scheduleShowcaseCarouselResume: (delay?: number) => void;
  moveShowcase: (direction: 'left' | 'right') => void;
}

export const useShowcase = ({ productCount }: UseShowcaseOptions): UseShowcaseValue => {
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [showcaseTransitionDirection, setShowcaseTransitionDirection] = useState<'left' | 'right'>('right');
  const showcaseResumeTimerRef = useRef<number | null>(null);
  const showcaseAutoScrollPausedRef = useRef(false);

  useEffect(() => {
    if (!productCount) {
      setShowcaseIndex(0);
      return;
    }

    setShowcaseIndex((current) => (current >= productCount ? 0 : current));
  }, [productCount]);

  useCarouselTimer({
    delay: SHOWCASE_PRODUCT_AUTOSCROLL_MS,
    enabled: productCount > 1,
    allowCoarsePointer: true,
    allowLowMemory: true,
    onTick: () => {
      if (showcaseAutoScrollPausedRef.current) {
        return;
      }

      setShowcaseTransitionDirection('right');
      setShowcaseIndex((current) => (current + 1) % productCount);
    }
  });

  useEffect(
    () => () => {
      if (showcaseResumeTimerRef.current !== null) {
        window.clearTimeout(showcaseResumeTimerRef.current);
      }
    },
    []
  );

  const pauseShowcaseCarousel = (): void => {
    if (showcaseResumeTimerRef.current !== null) {
      window.clearTimeout(showcaseResumeTimerRef.current);
      showcaseResumeTimerRef.current = null;
    }

    showcaseAutoScrollPausedRef.current = true;
  };

  const scheduleShowcaseCarouselResume = (delay = 1200): void => {
    if (showcaseResumeTimerRef.current !== null) {
      window.clearTimeout(showcaseResumeTimerRef.current);
    }

    showcaseResumeTimerRef.current = window.setTimeout(() => {
      showcaseAutoScrollPausedRef.current = false;
      showcaseResumeTimerRef.current = null;
    }, delay);
  };

  const moveShowcase = (direction: 'left' | 'right'): void => {
    if (productCount <= 1) {
      return;
    }

    setShowcaseTransitionDirection(direction);
    setShowcaseIndex((current) => {
      if (direction === 'left') {
        return current === 0 ? productCount - 1 : current - 1;
      }

      return (current + 1) % productCount;
    });
  };

  return {
    showcaseIndex,
    showcaseTransitionDirection,
    pauseShowcaseCarousel,
    scheduleShowcaseCarouselResume,
    moveShowcase
  };
};
