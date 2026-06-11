const STATIC_CACHE = 'njstore-static-v7';
const DATA_CACHE = 'njstore-data-v7';
const SHELL_ASSETS = ['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/pwa-192.png', '/pwa-512.png', '/apple-touch-icon.png', '/og-default.png'];
const CACHEABLE_API_ORIGINS = new Set([
  self.location.origin,
  'https://njstore-api-production.up.railway.app',
  'https://nj-store-monorepo2-production.up.railway.app'
]);
const FAST_CACHE_API_PREFIXES = ['/api/v1/site-config', '/api/v1/categories', '/api/v1/brands'];
const NETWORK_FIRST_API_PREFIXES = ['/api/v1/home-feed', '/api/v1/products'];

const isRequestCacheableApi = (url, method, prefixes) =>
  method === 'GET' && CACHEABLE_API_ORIGINS.has(url.origin) && prefixes.some((prefix) => url.pathname.startsWith(prefix));

const CACHE_FIRST_STATIC_DESTINATIONS = new Set(['style', 'script', 'worker', 'font']);
const STALE_WHILE_REVALIDATE_STATIC_DESTINATIONS = new Set(['image']);

const shouldCacheFirstStaticRequest = (request) => CACHE_FIRST_STATIC_DESTINATIONS.has(request.destination);

const shouldStaleWhileRevalidateStaticRequest = (request) =>
  STALE_WHILE_REVALIDATE_STATIC_DESTINATIONS.has(request.destination);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.filter((cacheName) => ![STATIC_CACHE, DATA_CACHE].includes(cacheName)).map((cacheName) => caches.delete(cacheName)));
      await self.clients.claim();
    })()
  );
});

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })
    .catch(() => undefined);

  return cachedResponse || networkResponsePromise || Response.error();
};

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone()).catch(() => undefined);
    }

    return response;
  } catch {
    return Response.error();
  }
};

const appShellWhileRevalidate = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = (await cache.match(request)) || (await cache.match('/index.html')) || (await cache.match('/'));
  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })
    .catch(() => undefined);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;
  if (networkResponse) {
    return networkResponse;
  }

  const fallbackResponse = await caches.match('/offline.html');
  return fallbackResponse || Response.error();
};

const networkFirst = async (request, cacheName, fallbackUrl) => {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (fallbackUrl) {
      const fallbackResponse = await caches.match(fallbackUrl);
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    return Response.error();
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(appShellWhileRevalidate(request));
    return;
  }

  if (isRequestCacheableApi(url, request.method, FAST_CACHE_API_PREFIXES)) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  if (isRequestCacheableApi(url, request.method, NETWORK_FIRST_API_PREFIXES)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (shouldCacheFirstStaticRequest(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (shouldStaleWhileRevalidateStaticRequest(request)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});
