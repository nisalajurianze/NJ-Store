import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { lazy, Suspense, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AdminThemeProvider } from './context/AdminThemeContext';
import { AdminErrorBoundary } from './components/system/AdminErrorBoundary';
import { DeferredAdminToaster } from './components/system/DeferredAdminToaster';
import { AppRouter } from './app/router';

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then((module) => ({ default: module.ReactQueryDevtools })))
  : null;

export const createAdminQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        gcTime: 10 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: 0
      }
    }
  });

export const App = (): JSX.Element => {
  const [queryClient] = useState(createAdminQueryClient);

  return (
    <AdminErrorBoundary level="app">
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <AdminThemeProvider>
            <AdminAuthProvider>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}
              >
                <AppRouter />
              </BrowserRouter>
              <DeferredAdminToaster />
            </AdminAuthProvider>
          </AdminThemeProvider>
        </MotionConfig>
        {ReactQueryDevtools ? (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        ) : null}
      </QueryClientProvider>
    </AdminErrorBoundary>
  );
};
