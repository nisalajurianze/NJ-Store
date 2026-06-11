import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AdminThemeProvider } from '../context/AdminThemeContext';

interface RenderAdminRouteOptions {
  initialEntries?: string[];
}

const LocationProbe = (): JSX.Element => {
  const location = useLocation();

  return <div data-testid="router-pathname">{location.pathname}</div>;
};

export const renderAdminRoute = (
  ui: ReactElement,
  { initialEntries = ['/dashboard'] }: RenderAdminRouteOptions = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      },
      mutations: {
        retry: false
      }
    }
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="never">
          <AdminThemeProvider>
            <MemoryRouter
              initialEntries={initialEntries}
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <LocationProbe />
              {ui}
            </MemoryRouter>
          </AdminThemeProvider>
        </MotionConfig>
      </QueryClientProvider>
    )
  };
};
