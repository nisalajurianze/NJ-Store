import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState, type PropsWithChildren } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { CompareProvider } from './context/CompareContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppRouter } from './app/router';
import { DeferredStoreToaster } from './components/system/DeferredStoreToaster';
import { DeferredRuntimeMount } from './components/system/DeferredRuntimeMount';
import { StoreErrorBoundary } from './components/system/StoreErrorBoundary';
import { CurrencyProvider } from './context/CurrencyContext';

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then((module) => ({ default: module.ReactQueryDevtools })))
  : null;
const AnalyticsRuntime = lazy(() => import('./analytics/AnalyticsRuntime').then((module) => ({ default: module.AnalyticsRuntime })));
const CartAddDrawer = lazy(() => import('./components/cart/CartAddDrawer').then((module) => ({ default: module.CartAddDrawer })));

const DeferredCartAddDrawer = (): JSX.Element | null => {
  const { recentlyAddedItem } = useCart();

  if (!recentlyAddedItem) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CartAddDrawer />
    </Suspense>
  );
};

export const createStoreQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: 0
      }
    }
  });

const AppSettingsProvider = ({ children }: PropsWithChildren): JSX.Element => (
  <ThemeProvider>
    <CurrencyProvider>{children}</CurrencyProvider>
  </ThemeProvider>
);

export const App = (): JSX.Element => {
  const [queryClient] = useState(createStoreQueryClient);

  return (
    <StoreErrorBoundary level="app">
      <QueryClientProvider client={queryClient}>
        <AppSettingsProvider>
          <AuthProvider>
            <CartProvider>
              <CompareProvider>
                <BrowserRouter
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true
                  }}
                >
                  <DeferredRuntimeMount mobileIdleTimeoutMs={6400} mobileFallbackDelayMs={4200}>
                    <Suspense fallback={null}>
                      <AnalyticsRuntime />
                    </Suspense>
                  </DeferredRuntimeMount>
                  <AppRouter />
                  <DeferredCartAddDrawer />
                </BrowserRouter>
                <DeferredStoreToaster />
              </CompareProvider>
            </CartProvider>
          </AuthProvider>
        </AppSettingsProvider>
        {ReactQueryDevtools ? (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        ) : null}
      </QueryClientProvider>
    </StoreErrorBoundary>
  );
};
