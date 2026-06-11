import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  siteConfigGetMock: vi.fn(),
  navbarMock: vi.fn()
}));

vi.mock('../../services/siteConfigService', () => ({
  siteConfigService: {
    get: mocks.siteConfigGetMock
  }
}));

vi.mock('../../hooks/useSocket', () => ({
  useSocket: () => ({ isConnected: false, socket: null })
}));

vi.mock('./Navbar', () => ({
  Navbar: (props: unknown) => {
    mocks.navbarMock(props);
    return <div>Navbar</div>;
  }
}));

vi.mock('./CompareBar', () => ({
  CompareBar: () => null
}));

vi.mock('./Footer', () => ({
  Footer: () => null
}));

vi.mock('./MobileTabBar', () => ({
  MobileTabBar: () => null
}));

vi.mock('./FloatingContactRail', () => ({
  FloatingContactRail: () => null
}));

const LocationProbe = (): JSX.Element => {
  const location = useLocation();
  return <output data-testid="location-display">{location.pathname}</output>;
};

const renderLayout = async (initialEntries: string[] = ['/shop']) => {
  const { StoreLayout } = await import('./StoreLayout');
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={initialEntries}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          <Route path="/" element={<StoreLayout />}>
            <Route path="shop" element={<div>Shop Content</div>} />
          </Route>
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('StoreLayout', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.siteConfigGetMock.mockReset();
    mocks.navbarMock.mockReset();
    mocks.siteConfigGetMock.mockResolvedValue({
      storeName: 'NJ Store',
      maintenanceMode: {
        enabled: false,
        message: "We're making a few improvements right now. Please check back shortly."
      }
    });
  });

  it('renders the shared store chrome and keeps outlet pages in the normal layout flow', async () => {
    const { container } = await renderLayout();

    expect(await screen.findByText('Shop Content')).toBeInTheDocument();

    expect(screen.getByText('Navbar')).toBeInTheDocument();
    expect(screen.getByText('Shop Content')).toBeInTheDocument();
    expect(screen.getByTestId('location-display')).toHaveTextContent('/shop');
    expect(container.querySelector('main')).not.toHaveClass('min-h-[calc(100vh-5rem)]');
  });

  it('renders outlet pages while the site config request is still pending', async () => {
    mocks.siteConfigGetMock.mockReturnValue(new Promise(() => undefined));

    await renderLayout();

    expect(await screen.findByText('Shop Content')).toBeInTheDocument();
    expect(screen.getByText('Navbar')).toBeInTheDocument();
  });

  it('passes theme-specific storefront logos into the navbar', async () => {
    mocks.siteConfigGetMock.mockResolvedValue({
      storeName: 'NJ Store',
      storeLogo: {
        url: 'https://example.com/fallback.png',
        publicId: 'site-config/fallback'
      },
      storeLogoDark: {
        url: 'https://example.com/dark.png',
        publicId: 'site-config/dark'
      },
      storeLogoLight: {
        url: 'https://example.com/light.png',
        publicId: 'site-config/light'
      },
      maintenanceMode: {
        enabled: false,
        message: "We're making a few improvements right now. Please check back shortly."
      }
    });

    await renderLayout();

    expect(await screen.findByText('Shop Content')).toBeInTheDocument();
    expect(mocks.navbarMock).toHaveBeenLastCalledWith({
      siteConfig: {
        storeName: 'NJ Store',
        storeLogo: {
          url: 'https://example.com/fallback.png',
          publicId: 'site-config/fallback'
        },
        storeLogoDark: {
          url: 'https://example.com/dark.png',
          publicId: 'site-config/dark'
        },
        storeLogoLight: {
          url: 'https://example.com/light.png',
          publicId: 'site-config/light'
        }
      }
    });
  });

  it('replaces the storefront with the maintenance view when the site config enables it', async () => {
    mocks.siteConfigGetMock.mockResolvedValue({
      storeName: 'NJ Store',
      supportPhoneNumber: '+94 11 300 4000',
      whatsappNumber: '94773004000',
      maintenanceMode: {
        enabled: true,
        message: 'Temporarily offline for upgrades.'
      }
    });

    await renderLayout();

    expect(await screen.findByText('NJ Store is temporarily offline')).toBeInTheDocument();
    expect(screen.queryByText('Shop Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Navbar')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call support' })).toHaveAttribute('href', 'tel:+94113004000');
  });
});
