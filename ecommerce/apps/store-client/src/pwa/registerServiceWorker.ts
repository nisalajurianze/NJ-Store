const isLocalPreviewHost = (hostname: string): boolean =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]' ||
  hostname.endsWith('.local') ||
  hostname.startsWith('192.168.') ||
  hostname.startsWith('10.') ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

const getAllowedServiceWorkerHosts = (): Set<string> => {
  const hosts = new Set(['njstore.lk', 'www.njstore.lk', 'njstore-project.vercel.app', 'njstore-project-njp-roject.vercel.app']);
  const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim();

  if (!configuredSiteUrl) {
    return hosts;
  }

  try {
    hosts.add(new URL(configuredSiteUrl).hostname.toLowerCase());
  } catch {
    return hosts;
  }

  return hosts;
};

const scheduleAfterStartup = (callback: () => void): void => {
  const runWhenIdle = (): void => {
    const requestIdleCallback = (globalThis as typeof globalThis & {
      requestIdleCallback?: (handler: () => void, options?: { timeout?: number }) => number;
    }).requestIdleCallback;

    if (requestIdleCallback) {
      requestIdleCallback(callback, { timeout: 3000 });
      return;
    }

    globalThis.setTimeout(callback, 1500);
  };

  if (document.readyState === 'complete') {
    runWhenIdle();
    return;
  }

  window.addEventListener('load', runWhenIdle, { once: true });
};

const isMobileRuntime = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  (window.matchMedia('(max-width: 767px)').matches ||
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches);

const scheduleServiceWorkerRegistration = (callback: () => void): void => {
  const scheduleIdle = (): void => {
    const requestIdleCallback = (globalThis as typeof globalThis & {
      requestIdleCallback?: (handler: () => void, options?: { timeout?: number }) => number;
    }).requestIdleCallback;

    const timeout = isMobileRuntime() ? 8_000 : 3_000;
    const fallbackDelay = isMobileRuntime() ? 5_000 : 0;

    if (requestIdleCallback) {
      requestIdleCallback(callback, { timeout });
      return;
    }

    globalThis.setTimeout(callback, fallbackDelay);
  };

  if (document.readyState === 'complete') {
    scheduleIdle();
    return;
  }

  window.addEventListener('load', scheduleIdle, { once: true });
};

const clearLocalPwaState = (): void => {
  void navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => undefined);

  if ('caches' in window) {
    void caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.filter((cacheName) => cacheName.startsWith('njstore-')).map((cacheName) => caches.delete(cacheName))))
      .catch(() => undefined);
  }
};

export const registerStoreServiceWorker = (): void => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const currentHostname = window.location.hostname.toLowerCase();
  const allowedHosts = getAllowedServiceWorkerHosts();

  if (isLocalPreviewHost(currentHostname) || !allowedHosts.has(currentHostname)) {
    scheduleAfterStartup(clearLocalPwaState);
    return;
  }

  if (!import.meta.env.PROD) {
    return;
  }

  scheduleServiceWorkerRegistration(() => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update())
      .catch(() => undefined);
  });

  window.addEventListener('appinstalled', () => {
    window.dispatchEvent(new CustomEvent('njstore:pwa-installed'));
  });
};
