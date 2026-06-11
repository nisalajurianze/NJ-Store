import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  enabled?: boolean;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  deferWhileScrolling?: boolean;
}

const SCROLL_IDLE_DELAY_MS = 260;
const scrollIdleSubscribers = new Set<() => void>();
let isViewportScrolling = false;
let scrollIdleTimeoutId: number | null = null;
let scrollListenerCount = 0;

const flushScrollIdleSubscribers = (): void => {
  isViewportScrolling = false;
  scrollIdleTimeoutId = null;
  scrollIdleSubscribers.forEach((listener) => listener());
};

const handleViewportScroll = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  isViewportScrolling = true;

  if (scrollIdleTimeoutId !== null) {
    window.clearTimeout(scrollIdleTimeoutId);
  }

  scrollIdleTimeoutId = window.setTimeout(flushScrollIdleSubscribers, SCROLL_IDLE_DELAY_MS);
};

const subscribeToScrollIdle = (listener: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  scrollIdleSubscribers.add(listener);

  if (scrollListenerCount === 0) {
    window.addEventListener('scroll', handleViewportScroll, { passive: true });
  }
  scrollListenerCount += 1;

  return () => {
    scrollIdleSubscribers.delete(listener);
    scrollListenerCount = Math.max(0, scrollListenerCount - 1);

    if (scrollListenerCount > 0) {
      return;
    }

    window.removeEventListener('scroll', handleViewportScroll);
    if (scrollIdleTimeoutId !== null) {
      window.clearTimeout(scrollIdleTimeoutId);
      scrollIdleTimeoutId = null;
    }
    isViewportScrolling = false;
  };
};

export const useInView = ({
  enabled = true,
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
  deferWhileScrolling = false
}: UseInViewOptions = {}) => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const pendingInViewRef = useRef<boolean | null>(null);

  const commitInView = useCallback(
    (nextInView: boolean): void => {
      if (deferWhileScrolling && isViewportScrolling) {
        pendingInViewRef.current = nextInView;
        return;
      }

      pendingInViewRef.current = null;
      setInView((current) => (current === nextInView ? current : nextInView));
    },
    [deferWhileScrolling]
  );

  useEffect(() => {
    if (!deferWhileScrolling) {
      pendingInViewRef.current = null;
      return undefined;
    }

    return subscribeToScrollIdle(() => {
      const pendingInView = pendingInViewRef.current;
      if (pendingInView === null) {
        return;
      }

      pendingInViewRef.current = null;
      setInView((current) => (current === pendingInView ? current : pendingInView));
    });
  }, [deferWhileScrolling]);

  useEffect(() => {
    if (!enabled) {
      commitInView(false);
      return;
    }

    const defaultRef = ref.current;
    if (!defaultRef) return;

    const isCurrentlyVisible = (): boolean => {
      const rect = defaultRef.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

      return rect.bottom >= 0 && rect.right >= 0 && rect.top <= viewportHeight && rect.left <= viewportWidth;
    };

    if (typeof IntersectionObserver === 'undefined') {
      commitInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          commitInView(true);
          if (triggerOnce) observer.unobserve(defaultRef);
        } else if (!triggerOnce) {
          commitInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(defaultRef);
    const frameId =
      triggerOnce
        ? window.requestAnimationFrame(() => {
            if (isCurrentlyVisible()) {
              commitInView(true);
              observer.unobserve(defaultRef);
            }
          })
        : null;

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      observer.disconnect();
    };
  }, [commitInView, enabled, threshold, rootMargin, triggerOnce]);

  return { ref, inView };
};
