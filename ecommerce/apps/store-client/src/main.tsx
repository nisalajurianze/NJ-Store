import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './styles/fonts.css';
import './index.css';
import './styles/theme-utilities.css';
import './styles/catalog.css';
import './styles/media-showcase.css';
import './styles/motion-layout.css';
import './i18n';
import { App } from './App';
import { DeferredRuntimeMount } from './components/system/DeferredRuntimeMount';
import { registerStoreServiceWorker } from './pwa/registerServiceWorker';
import { resolveApiBaseUrl } from './utils/apiConfig';

registerStoreServiceWorker();
const SpeedInsights = lazy(() => import('@vercel/speed-insights/react').then((module) => ({ default: module.SpeedInsights })));
const isLocalPreviewHost =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
const shouldMountSpeedInsights = import.meta.env.PROD && !isLocalPreviewHost;

const warmApiConnection = (): void => {
  const baseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_URL);

  if (!/^https?:\/\//i.test(baseUrl)) {
    return;
  }

  const origin = new URL(baseUrl).origin;
  const head = document.head;
  const appendHint = (rel: 'dns-prefetch' | 'preconnect'): void => {
    if (head.querySelector(`link[rel="${rel}"][href="${origin}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = rel;
    link.href = origin;
    if (rel === 'preconnect') {
      link.crossOrigin = '';
    }
    head.appendChild(link);
  };

  appendHint('dns-prefetch');
  appendHint('preconnect');
};

warmApiConnection();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
      {shouldMountSpeedInsights ? (
        <DeferredRuntimeMount idleTimeoutMs={3200} fallbackDelayMs={1800} mobileIdleTimeoutMs={7200} mobileFallbackDelayMs={5200}>
          <Suspense fallback={null}>
            <SpeedInsights />
          </Suspense>
        </DeferredRuntimeMount>
      ) : null}
    </HelmetProvider>
  </React.StrictMode>
);
