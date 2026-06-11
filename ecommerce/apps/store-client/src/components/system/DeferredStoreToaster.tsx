import { lazy, Suspense, useEffect, useState } from 'react';
import {
  hasPendingLazyToastRequest,
  LAZY_TOAST_REQUESTED_EVENT
} from '../../utils/lazyToast';

const TOASTER_IDLE_TIMEOUT_MS = 3000;
const TOASTER_FALLBACK_DELAY_MS = 1200;

const StoreToaster = lazy(() => import('react-hot-toast').then((module) => ({ default: module.Toaster })));

export const DeferredStoreToaster = (): JSX.Element | null => {
  const [shouldMountToaster, setShouldMountToaster] = useState(false);

  useEffect(() => {
    if (shouldMountToaster || typeof window === 'undefined') {
      return undefined;
    }

    let idleCallbackId: number | null = null;
    let timeoutId: number | null = null;
    let isCancelled = false;

    const cancelScheduledMount = (): void => {
      if (idleCallbackId !== null && 'cancelIdleCallback' in window && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId);
        idleCallbackId = null;
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const mountToaster = (): void => {
      if (!isCancelled) {
        cancelScheduledMount();
        setShouldMountToaster(true);
      }
    };

    const scheduleIdleMount = (): void => {
      if (hasPendingLazyToastRequest()) {
        mountToaster();
        return;
      }

      if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
        idleCallbackId = window.requestIdleCallback(mountToaster, { timeout: TOASTER_IDLE_TIMEOUT_MS });
        return;
      }

      timeoutId = window.setTimeout(mountToaster, TOASTER_FALLBACK_DELAY_MS);
    };

    const handleToastRequested = (): void => {
      mountToaster();
    };

    window.addEventListener(LAZY_TOAST_REQUESTED_EVENT, handleToastRequested);

    if (document.readyState === 'complete') {
      scheduleIdleMount();
    } else {
      window.addEventListener('load', scheduleIdleMount, { once: true });
    }

    return () => {
      isCancelled = true;
      cancelScheduledMount();
      window.removeEventListener('load', scheduleIdleMount);
      window.removeEventListener(LAZY_TOAST_REQUESTED_EVENT, handleToastRequested);
    };
  }, [shouldMountToaster]);

  if (!shouldMountToaster) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <StoreToaster position="top-right" />
    </Suspense>
  );
};
