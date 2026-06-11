import { useEffect, useRef, useState, type RefObject } from 'react';
import { subscribeToMediaQueryChange } from '../utils/mediaQuery';
import { useCarouselTimer } from './useCarouselTimer';

const FEATURED_STEP_TRANSITION_MS = 420;
const FEATURED_AUTOSCROLL_MS = 2800;
const FEATURED_INTERACTION_SETTLE_MS = 140;

const getHorizontalScrollAmount = (viewport: HTMLElement): number => {
  const firstSlide = viewport.querySelector<HTMLElement>('[data-carousel-slide]');
  const slideWidth = firstSlide?.getBoundingClientRect().width ?? 176;
  const computedStyles = window.getComputedStyle(viewport);
  const gapValue = computedStyles.columnGap || computedStyles.gap || '16';
  const gap = Number.parseFloat(gapValue);

  return slideWidth + (Number.isFinite(gap) ? gap : 16);
};

const scrollViewportTo = (viewport: HTMLElement, left: number, behavior: ScrollBehavior = 'smooth'): void => {
  if (typeof viewport.scrollTo === 'function') {
    viewport.scrollTo({ left, behavior });
    return;
  }

  viewport.scrollLeft = left;
};

interface UseFeaturedCarouselValue {
  featuredCarouselRef: RefObject<HTMLDivElement>;
  isTouchFeaturedCarousel: boolean;
  isTouchFeaturedCarouselControlsVisible: boolean;
  beginFeaturedCarouselInteraction: () => void;
  beginFeaturedCardInteraction: () => void;
  endFeaturedCardInteraction: () => void;
  pauseFeaturedCarousel: () => void;
  resumeFeaturedCarousel: () => void;
  moveFeaturedCarousel: (direction: 'left' | 'right') => void;
  finalizeFeaturedCarouselInteraction: () => void;
  handleFeaturedCarouselScroll: () => void;
}

export const useFeaturedCarousel = (itemCount: number): UseFeaturedCarouselValue => {
  const [isTouchFeaturedCarousel, setIsTouchFeaturedCarousel] = useState(false);
  const [isTouchFeaturedCarouselControlsVisible, setIsTouchFeaturedCarouselControlsVisible] = useState(false);
  const featuredCarouselRef = useRef<HTMLDivElement>(null);
  const featuredResumeTimerRef = useRef<number | null>(null);
  const featuredStepTimerRef = useRef<number | null>(null);
  const featuredInteractionSettleTimerRef = useRef<number | null>(null);
  const featuredAutoScrollPausedRef = useRef(false);
  const featuredLoopWidthRef = useRef(0);
  const featuredPointerActiveRef = useRef(false);
  const featuredCardInteractionHeldRef = useRef(false);
  const featuredScrollSnapInlineRef = useRef<string | null>(null);

  const clearFeaturedStepTimer = (): void => {
    if (featuredStepTimerRef.current !== null) {
      window.clearTimeout(featuredStepTimerRef.current);
      featuredStepTimerRef.current = null;
    }
  };

  const clearFeaturedResumeTimer = (): void => {
    if (featuredResumeTimerRef.current !== null) {
      window.clearTimeout(featuredResumeTimerRef.current);
      featuredResumeTimerRef.current = null;
    }
  };

  const clearFeaturedInteractionSettleTimer = (): void => {
    if (featuredInteractionSettleTimerRef.current !== null) {
      window.clearTimeout(featuredInteractionSettleTimerRef.current);
      featuredInteractionSettleTimerRef.current = null;
    }
  };

  const disableFeaturedScrollSnap = (viewport: HTMLDivElement): void => {
    if (featuredScrollSnapInlineRef.current === null) {
      featuredScrollSnapInlineRef.current = viewport.style.scrollSnapType;
    }

    viewport.style.scrollSnapType = 'none';
  };

  const restoreFeaturedScrollSnap = (): void => {
    const viewport = featuredCarouselRef.current;

    if (!viewport || featuredScrollSnapInlineRef.current === null) {
      return;
    }

    viewport.style.scrollSnapType = featuredScrollSnapInlineRef.current;
    featuredScrollSnapInlineRef.current = null;
  };

  const pauseFeaturedCarousel = (): void => {
    const viewport = featuredCarouselRef.current;

    clearFeaturedResumeTimer();
    clearFeaturedStepTimer();
    clearFeaturedInteractionSettleTimer();
    featuredAutoScrollPausedRef.current = true;

    if (viewport) {
      disableFeaturedScrollSnap(viewport);
      scrollViewportTo(viewport, viewport.scrollLeft, 'auto');
    }

    if (isTouchFeaturedCarousel) {
      setIsTouchFeaturedCarouselControlsVisible(true);
    }
  };

  const resumeFeaturedCarousel = (): void => {
    clearFeaturedResumeTimer();
    if (featuredCardInteractionHeldRef.current) {
      featuredAutoScrollPausedRef.current = true;
      return;
    }

    featuredAutoScrollPausedRef.current = false;
    restoreFeaturedScrollSnap();

    if (isTouchFeaturedCarousel) {
      setIsTouchFeaturedCarouselControlsVisible(false);
    }
  };

  const scheduleFeaturedCarouselResume = (delay = 2200): void => {
    clearFeaturedResumeTimer();
    featuredResumeTimerRef.current = window.setTimeout(() => {
      if (featuredCardInteractionHeldRef.current) {
        featuredAutoScrollPausedRef.current = true;
        featuredResumeTimerRef.current = null;
        return;
      }

      featuredAutoScrollPausedRef.current = false;
      restoreFeaturedScrollSnap();
      setIsTouchFeaturedCarouselControlsVisible(false);
      featuredResumeTimerRef.current = null;
    }, delay);
  };

  const normalizeFeaturedCarouselScroll = (viewport: HTMLDivElement): void => {
    const loopWidth = featuredLoopWidthRef.current;
    if (loopWidth <= 0) {
      return;
    }

    if (viewport.scrollLeft < loopWidth * 0.5) {
      viewport.scrollLeft += loopWidth;
      return;
    }

    if (viewport.scrollLeft >= loopWidth * 1.5) {
      viewport.scrollLeft -= loopWidth;
    }
  };

  const snapFeaturedCarouselToNearest = (viewport: HTMLDivElement, behavior: ScrollBehavior = 'auto'): void => {
    normalizeFeaturedCarouselScroll(viewport);
    const loopWidth = featuredLoopWidthRef.current;
    if (loopWidth <= 0) {
      return;
    }

    const step = getHorizontalScrollAmount(viewport);
    const relativeOffset = viewport.scrollLeft - loopWidth;
    const snappedOffset = Math.round(relativeOffset / step) * step;
    scrollViewportTo(viewport, loopWidth + snappedOffset, behavior);

    if (behavior === 'auto') {
      normalizeFeaturedCarouselScroll(viewport);
    }
  };

  const stepFeaturedCarousel = (direction: 'left' | 'right'): void => {
    const viewport = featuredCarouselRef.current;
    if (!viewport) {
      return;
    }

    clearFeaturedStepTimer();
    normalizeFeaturedCarouselScroll(viewport);
    const scrollAmount = getHorizontalScrollAmount(viewport);
    const loopWidth = featuredLoopWidthRef.current;
    const relativeOffset = viewport.scrollLeft - loopWidth;
    const currentStep = Math.round(relativeOffset / scrollAmount);
    const nextStep = currentStep + (direction === 'left' ? -1 : 1);
    const targetLeft = loopWidth + nextStep * scrollAmount;

    scrollViewportTo(viewport, targetLeft, 'smooth');
    featuredStepTimerRef.current = window.setTimeout(() => {
      snapFeaturedCarouselToNearest(viewport);
      featuredStepTimerRef.current = null;
    }, FEATURED_STEP_TRANSITION_MS);
  };

  const moveFeaturedCarousel = (direction: 'left' | 'right'): void => {
    pauseFeaturedCarousel();
    stepFeaturedCarousel(direction);
    scheduleFeaturedCarouselResume();
  };

  const settleFeaturedCarouselInteraction = (): void => {
    const viewport = featuredCarouselRef.current;
    if (!viewport) {
      return;
    }

    pauseFeaturedCarousel();
    clearFeaturedStepTimer();
    snapFeaturedCarouselToNearest(viewport, 'smooth');
    featuredStepTimerRef.current = window.setTimeout(() => {
      snapFeaturedCarouselToNearest(viewport);
      featuredStepTimerRef.current = null;
    }, FEATURED_STEP_TRANSITION_MS);
    scheduleFeaturedCarouselResume();
  };

  const scheduleFeaturedCarouselSettle = (delay = FEATURED_INTERACTION_SETTLE_MS): void => {
    clearFeaturedInteractionSettleTimer();
    featuredInteractionSettleTimerRef.current = window.setTimeout(() => {
      featuredInteractionSettleTimerRef.current = null;
      if (featuredPointerActiveRef.current) {
        return;
      }

      settleFeaturedCarouselInteraction();
    }, delay);
  };

  const beginFeaturedCarouselInteraction = (): void => {
    featuredPointerActiveRef.current = true;
    clearFeaturedInteractionSettleTimer();
    pauseFeaturedCarousel();
  };

  const finalizeFeaturedCarouselInteraction = (): void => {
    featuredPointerActiveRef.current = false;
    scheduleFeaturedCarouselSettle();
  };

  const beginFeaturedCardInteraction = (): void => {
    featuredCardInteractionHeldRef.current = true;
    pauseFeaturedCarousel();
  };

  const endFeaturedCardInteraction = (): void => {
    featuredCardInteractionHeldRef.current = false;
    resumeFeaturedCarousel();
  };

  const handleFeaturedCarouselScroll = (): void => {
    if (
      !featuredAutoScrollPausedRef.current ||
      featuredStepTimerRef.current !== null ||
      featuredPointerActiveRef.current
    ) {
      return;
    }

    scheduleFeaturedCarouselSettle();
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueries = [
      window.matchMedia('(hover: none)'),
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(max-width: 767px)')
    ];

    const syncTouchFeaturedCarousel = (): void => {
      const nextIsTouchFeaturedCarousel = mediaQueries.some((query) => query.matches);
      setIsTouchFeaturedCarousel(nextIsTouchFeaturedCarousel);

      if (!nextIsTouchFeaturedCarousel) {
        setIsTouchFeaturedCarouselControlsVisible(false);
      }
    };

    syncTouchFeaturedCarousel();
    const unsubscribeQueries = mediaQueries.map((query) => subscribeToMediaQueryChange(query, syncTouchFeaturedCarousel));

    return () => {
      unsubscribeQueries.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    const viewport = featuredCarouselRef.current;
    if (!viewport || itemCount <= 1) {
      featuredLoopWidthRef.current = 0;
      setIsTouchFeaturedCarouselControlsVisible(false);
      return;
    }

    let resizeFrameId: number | null = null;

    const syncFeaturedPosition = (): void => {
      const loopWidth = getHorizontalScrollAmount(viewport) * itemCount;
      if (loopWidth <= 0) {
        return;
      }

      featuredLoopWidthRef.current = loopWidth;

      if (viewport.scrollLeft < loopWidth * 0.5 || viewport.scrollLeft >= loopWidth * 1.5) {
        viewport.scrollLeft = loopWidth;
      }

      snapFeaturedCarouselToNearest(viewport);
    };

    const scheduleSyncFeaturedPosition = (): void => {
      if (resizeFrameId !== null) {
        return;
      }

      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        syncFeaturedPosition();
      });
    };

    syncFeaturedPosition();

    window.addEventListener('resize', scheduleSyncFeaturedPosition);

    return () => {
      window.removeEventListener('resize', scheduleSyncFeaturedPosition);
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
      clearFeaturedStepTimer();
      clearFeaturedInteractionSettleTimer();
    };
  }, [isTouchFeaturedCarousel, itemCount]);

  useCarouselTimer({
    delay: FEATURED_AUTOSCROLL_MS,
    enabled: itemCount > 1 && !isTouchFeaturedCarousel,
    activeElementRef: featuredCarouselRef,
    onTick: () => {
      if (featuredAutoScrollPausedRef.current || featuredStepTimerRef.current !== null) {
        return;
      }

      stepFeaturedCarousel('right');
    }
  });

  useEffect(
    () => () => {
      if (featuredResumeTimerRef.current !== null) {
        window.clearTimeout(featuredResumeTimerRef.current);
      }
      clearFeaturedStepTimer();
      clearFeaturedInteractionSettleTimer();
      restoreFeaturedScrollSnap();
      featuredPointerActiveRef.current = false;
      featuredCardInteractionHeldRef.current = false;
    },
    []
  );

  return {
    featuredCarouselRef,
    isTouchFeaturedCarousel,
    isTouchFeaturedCarouselControlsVisible,
    beginFeaturedCarouselInteraction,
    beginFeaturedCardInteraction,
    endFeaturedCardInteraction,
    pauseFeaturedCarousel,
    resumeFeaturedCarousel,
    moveFeaturedCarousel,
    finalizeFeaturedCarouselInteraction,
    handleFeaturedCarouselScroll
  };
};
