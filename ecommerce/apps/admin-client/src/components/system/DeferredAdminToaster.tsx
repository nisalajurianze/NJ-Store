import { lazy, Suspense, useEffect, useState } from 'react';

const ADMIN_TOASTER_IDLE_TIMEOUT_MS = 1800;
const ADMIN_TOASTER_FALLBACK_DELAY_MS = 500;

const AdminToaster = lazy(() => import('react-hot-toast').then((module) => ({ default: module.Toaster })));

export const DeferredAdminToaster = (): JSX.Element | null => {
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

    if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
      idleCallbackId = window.requestIdleCallback(mountToaster, { timeout: ADMIN_TOASTER_IDLE_TIMEOUT_MS });
    } else {
      timeoutId = window.setTimeout(mountToaster, ADMIN_TOASTER_FALLBACK_DELAY_MS);
    }

    return () => {
      isCancelled = true;
      cancelScheduledMount();
    };
  }, [shouldMountToaster]);

  if (!shouldMountToaster) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AdminToaster position="top-right" />
    </Suspense>
  );
};
