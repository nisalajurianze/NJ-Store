import { cn } from '@njstore/utils/cn';
import { motion, useReducedMotion } from 'framer-motion';
import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

interface AccountContentProps {
  className?: string;
}

const resetAccountScroll = (): void => {
  const scrollRoot = document.scrollingElement as HTMLElement | null;

  window.scrollTo(0, 0);

  if (scrollRoot) {
    scrollRoot.scrollTop = 0;
    scrollRoot.scrollLeft = 0;
  }

  document.documentElement.scrollTop = 0;
  document.documentElement.scrollLeft = 0;
  document.body.scrollTop = 0;
  document.body.scrollLeft = 0;
};

export const AccountContent = ({ className }: AccountContentProps): JSX.Element => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const previousScrollRestoration =
      'scrollRestoration' in window.history ? window.history.scrollRestoration : undefined;

    if (previousScrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }

    return () => {
      if (previousScrollRestoration) {
        window.history.scrollRestoration = previousScrollRestoration;
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let secondFrameId: number | null = null;

    resetAccountScroll();
    const firstFrameId = window.requestAnimationFrame(() => {
      resetAccountScroll();
      secondFrameId = window.requestAnimationFrame(resetAccountScroll);
    });
    const timeoutId = window.setTimeout(resetAccountScroll, 0);

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId);
      }
      window.clearTimeout(timeoutId);
    };
  }, [location.pathname, location.search]);

  return (
    <section className={cn('min-w-0 overflow-x-clip [overflow-anchor:none] lg:pr-1', className)}>
      <motion.div
        className="pb-1 lg:pb-6"
        key={`${location.pathname}${location.search}`}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={reduceMotion ? undefined : { duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.div>
    </section>
  );
};
