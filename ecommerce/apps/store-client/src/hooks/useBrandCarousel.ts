import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject, type TransitionEvent } from 'react';
import type { BrandDto } from '@njstore/types';
import { useCarouselTimer } from './useCarouselTimer';

const BRAND_AUTOSCROLL_MS = 3200;
const BRAND_SWIPE_THRESHOLD_PX = 42;
const BRAND_LOOP_REPEAT_COUNT = 5;

interface UseBrandCarouselValue {
  brandCarouselRef: RefObject<HTMLDivElement>;
  visibleBrands: BrandDto[];
  carouselItems: BrandDto[];
  isTrackAnimating: boolean;
  trackStyle: CSSProperties;
  failedLogoIds: Record<string, true>;
  handleBrandLogoError: (brandId: string) => void;
  moveBrandCarousel: (direction: 'left' | 'right') => void;
  pauseBrandCarousel: () => void;
  resumeBrandCarouselAfterBlur: () => void;
  handleBrandTrackTransitionEnd: (event: TransitionEvent<HTMLDivElement>) => void;
  beginBrandSwipe: (clientX: number, pointerId: number) => void;
  completeBrandSwipe: (clientX?: number, pointerId?: number) => void;
}

export const useBrandCarousel = (brands: BrandDto[]): UseBrandCarouselValue => {
  const visibleBrands = useMemo(() => brands.slice(0, 12), [brands]);
  const carouselItems = useMemo(() => {
    if (visibleBrands.length <= 1) {
      return visibleBrands;
    }

    return Array.from({ length: BRAND_LOOP_REPEAT_COUNT }, () => visibleBrands).flat();
  }, [visibleBrands]);
  const [brandCarouselIndex, setBrandCarouselIndex] = useState(0);
  const [isTrackAnimating, setIsTrackAnimating] = useState(false);
  const [failedLogoIds, setFailedLogoIds] = useState<Record<string, true>>({});
  const brandResumeTimerRef = useRef<number | null>(null);
  const brandCarouselRef = useRef<HTMLDivElement>(null);
  const brandAutoScrollPausedRef = useRef(false);
  const brandTrackAnimatingRef = useRef(false);
  const brandQueuedDirectionRef = useRef<'left' | 'right' | null>(null);
  const brandSwipeStartXRef = useRef<number | null>(null);
  const brandSwipePointerIdRef = useRef<number | null>(null);

  const clearBrandResumeTimer = (): void => {
    if (brandResumeTimerRef.current !== null) {
      window.clearTimeout(brandResumeTimerRef.current);
      brandResumeTimerRef.current = null;
    }
  };

  const pauseBrandCarousel = (): void => {
    clearBrandResumeTimer();
    brandAutoScrollPausedRef.current = true;
  };

  const scheduleBrandCarouselResume = (delay = 2200): void => {
    clearBrandResumeTimer();
    brandResumeTimerRef.current = window.setTimeout(() => {
      brandAutoScrollPausedRef.current = false;
      brandResumeTimerRef.current = null;
    }, delay);
  };

  const runBrandCarouselStep = (direction: 'left' | 'right'): void => {
    if (visibleBrands.length <= 1) {
      return;
    }

    setIsTrackAnimating(true);
    setBrandCarouselIndex((current) => current + (direction === 'left' ? -1 : 1));
  };

  const moveBrandCarousel = (direction: 'left' | 'right'): void => {
    if (visibleBrands.length <= 1) {
      return;
    }

    pauseBrandCarousel();
    if (brandTrackAnimatingRef.current) {
      brandQueuedDirectionRef.current = direction;
      scheduleBrandCarouselResume();
      return;
    }

    runBrandCarouselStep(direction);
    scheduleBrandCarouselResume();
  };

  const handleBrandTrackTransitionEnd = (event: TransitionEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') {
      return;
    }

    let resetIndex: number | null = null;
    if (visibleBrands.length > 1) {
      const segmentSize = visibleBrands.length;
      if (brandCarouselIndex < segmentSize) {
        resetIndex = brandCarouselIndex + segmentSize * 2;
      } else if (brandCarouselIndex >= segmentSize * (BRAND_LOOP_REPEAT_COUNT - 1)) {
        resetIndex = brandCarouselIndex - segmentSize * 2;
      }
    }

    setIsTrackAnimating(false);

    if (resetIndex !== null) {
      setBrandCarouselIndex(resetIndex);
    }

    const queuedDirection = brandQueuedDirectionRef.current;
    if (queuedDirection) {
      brandQueuedDirectionRef.current = null;
      window.setTimeout(() => {
        runBrandCarouselStep(queuedDirection);
      }, 0);
    }
  };

  const beginBrandSwipe = (clientX: number, pointerId?: number): void => {
    pauseBrandCarousel();
    brandSwipeStartXRef.current = clientX;
    brandSwipePointerIdRef.current = pointerId ?? null;
  };

  const completeBrandSwipe = (clientX?: number, pointerId?: number): void => {
    if (
      brandSwipeStartXRef.current === null ||
      (pointerId !== undefined && brandSwipePointerIdRef.current !== null && brandSwipePointerIdRef.current !== pointerId)
    ) {
      return;
    }

    const deltaX = (clientX ?? brandSwipeStartXRef.current) - brandSwipeStartXRef.current;
    brandSwipeStartXRef.current = null;
    brandSwipePointerIdRef.current = null;

    if (Math.abs(deltaX) >= BRAND_SWIPE_THRESHOLD_PX) {
      moveBrandCarousel(deltaX > 0 ? 'left' : 'right');
      return;
    }

    scheduleBrandCarouselResume(900);
  };

  const handleBrandLogoError = (brandId: string): void => {
    setFailedLogoIds((current) => (current[brandId] ? current : { ...current, [brandId]: true }));
  };

  useEffect(() => {
    if (!visibleBrands.length) {
      setBrandCarouselIndex(0);
      setIsTrackAnimating(false);
      brandTrackAnimatingRef.current = false;
      brandQueuedDirectionRef.current = null;
      setFailedLogoIds({});
      return;
    }

    const centeredLoopStartIndex = visibleBrands.length > 1 ? visibleBrands.length * Math.floor(BRAND_LOOP_REPEAT_COUNT / 2) : 0;
    setBrandCarouselIndex((current) => {
      if (visibleBrands.length <= 1) {
        return 0;
      }

      if (current < visibleBrands.length || current >= visibleBrands.length * (BRAND_LOOP_REPEAT_COUNT - 1)) {
        return centeredLoopStartIndex;
      }

      return current;
    });
    setIsTrackAnimating(false);
    brandTrackAnimatingRef.current = false;
    brandQueuedDirectionRef.current = null;
    setFailedLogoIds({});
  }, [visibleBrands]);

  useEffect(() => {
    brandTrackAnimatingRef.current = isTrackAnimating;
  }, [isTrackAnimating]);

  useCarouselTimer({
    delay: BRAND_AUTOSCROLL_MS,
    enabled: visibleBrands.length > 1,
    activeElementRef: brandCarouselRef,
    onTick: () => {
      if (brandAutoScrollPausedRef.current || brandTrackAnimatingRef.current) {
        return;
      }

      runBrandCarouselStep('right');
    }
  });

  useEffect(
    () => () => {
      clearBrandResumeTimer();
      brandQueuedDirectionRef.current = null;
      brandSwipeStartXRef.current = null;
      brandSwipePointerIdRef.current = null;
    },
    []
  );

  const trackStyle: CSSProperties =
    visibleBrands.length > 1
      ? {
          transform: `translate3d(calc(-1 * ${brandCarouselIndex} * (var(--brand-slide-width) + var(--brand-slide-gap))), 0, 0)`
        }
      : { transform: 'translate3d(0, 0, 0)' };

  return {
    brandCarouselRef,
    visibleBrands,
    carouselItems,
    isTrackAnimating,
    trackStyle,
    failedLogoIds,
    handleBrandLogoError,
    moveBrandCarousel,
    pauseBrandCarousel,
    resumeBrandCarouselAfterBlur: () => scheduleBrandCarouselResume(500),
    handleBrandTrackTransitionEnd,
    beginBrandSwipe,
    completeBrandSwipe
  };
};
