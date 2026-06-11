import { useEffect, useState, type PropsWithChildren } from 'react';

interface DeferredRuntimeMountProps extends PropsWithChildren {
  idleTimeoutMs?: number;
  fallbackDelayMs?: number;
  mobileIdleTimeoutMs?: number;
  mobileFallbackDelayMs?: number;
}

export const DeferredRuntimeMount = ({
  children,
  idleTimeoutMs = 2600,
  fallbackDelayMs = 1200,
  mobileIdleTimeoutMs,
  mobileFallbackDelayMs
}: DeferredRuntimeMountProps): JSX.Element | null => {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (shouldMount || typeof window === 'undefined') {
      return undefined;
    }

    let idleCallbackId: number | null = null;
    let timeoutId: number | null = null;
    let isCancelled = false;

    const mount = (): void => {
      if (!isCancelled) {
        setShouldMount(true);
      }
    };

    const isMobileRuntime = (): boolean =>
      typeof window.matchMedia === 'function' &&
      (window.matchMedia('(max-width: 767px)').matches ||
        window.matchMedia('(hover: none)').matches ||
        window.matchMedia('(pointer: coarse)').matches);

    const scheduleMount = (): void => {
      const effectiveIdleTimeoutMs = isMobileRuntime() ? mobileIdleTimeoutMs ?? idleTimeoutMs : idleTimeoutMs;
      const effectiveFallbackDelayMs = isMobileRuntime() ? mobileFallbackDelayMs ?? fallbackDelayMs : fallbackDelayMs;

      if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
        idleCallbackId = window.requestIdleCallback(mount, { timeout: effectiveIdleTimeoutMs });
        return;
      }

      timeoutId = window.setTimeout(mount, effectiveFallbackDelayMs);
    };

    if (document.readyState === 'complete') {
      scheduleMount();
    } else {
      window.addEventListener('load', scheduleMount, { once: true });
    }

    return () => {
      isCancelled = true;
      window.removeEventListener('load', scheduleMount);

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      if (idleCallbackId !== null && 'cancelIdleCallback' in window && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [fallbackDelayMs, idleTimeoutMs, mobileFallbackDelayMs, mobileIdleTimeoutMs, shouldMount]);

  return shouldMount ? <>{children}</> : null;
};
