import type hotToast from 'react-hot-toast';

type ToastApi = typeof hotToast;

export const LAZY_TOAST_REQUESTED_EVENT = 'njstore:lazy-toast-requested';

let toastApiPromise: Promise<ToastApi> | null = null;
let hasRequestedToastHost = false;

export const hasPendingLazyToastRequest = (): boolean => hasRequestedToastHost;

const requestToastHost = (): void => {
  hasRequestedToastHost = true;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LAZY_TOAST_REQUESTED_EVENT));
  }
};

const loadToastApi = (): Promise<ToastApi> => {
  requestToastHost();
  toastApiPromise ??= import('react-hot-toast').then((module) => module.default);
  return toastApiPromise;
};

export const toast = {
  success: (...args: Parameters<ToastApi['success']>): void => {
    void loadToastApi().then((toastApi) => {
      toastApi.success(...args);
    });
  },
  error: (...args: Parameters<ToastApi['error']>): void => {
    void loadToastApi().then((toastApi) => {
      toastApi.error(...args);
    });
  }
};
