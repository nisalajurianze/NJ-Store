import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  categoriesMock: vi.fn(),
  brandsMock: vi.fn(),
  suggestionsMock: vi.fn(),
  notificationsMock: vi.fn(),
  logoutMock: vi.fn(),
  cycleThemeMock: vi.fn(),
  isDarkTheme: true,
  compareItems: [] as string[],
  wishlistItems: [] as Array<{ id: string }>,
  user: null as { name: string } | null
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        brand: 'NJ Store',
        'nav.categories': 'Categories',
        'nav.search.placeholder': 'Search products, brands, categories...',
        'nav.search.submit': 'Search',
        'nav.search.clear': 'Clear search',
        'nav.search.open': 'Open search',
        'nav.search.close': 'Close search',
        'nav.home': 'Home',
        'nav.shop': 'Shop',
        'nav.wishlist': 'Wishlist',
        'nav.compare': 'Compare',
        'nav.login': 'Login'
      })[key] ?? key
  })
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.user,
    logout: mocks.logoutMock
  })
}));

vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    cart: { itemCount: 2 }
  })
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: mocks.isDarkTheme,
    themePreference: 'dark',
    cycleTheme: mocks.cycleThemeMock
  })
}));

vi.mock('../../context/CompareContext', () => ({
  useCompare: () => ({
    items: mocks.compareItems,
    toggleCompare: vi.fn(),
    clearCompare: vi.fn()
  })
}));

vi.mock('../../hooks/useWishlist', () => ({
  useWishlist: () => ({
    items: mocks.wishlistItems,
    isLoading: false,
    isError: false,
    pendingProductId: null,
    isWishlisted: vi.fn(),
    toggleWishlist: vi.fn(),
    refetch: vi.fn()
  })
}));

vi.mock('../../services/productService', () => ({
  productService: {
    categories: mocks.categoriesMock,
    suggestions: mocks.suggestionsMock
  }
}));

vi.mock('../../services/brandService', () => ({
  brandService: {
    list: mocks.brandsMock
  }
}));

vi.mock('../../services/notificationService', () => ({
  notificationService: {
    list: mocks.notificationsMock,
    markAsRead: vi.fn()
  }
}));

import { Navbar } from './Navbar';
import { getCategoryFallbackImage } from './navbarConstants';

const DESKTOP_CATEGORIES_HOVER_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 768px)';
const DESKTOP_VIEWPORT_QUERY = '(min-width: 768px)';
const STORE_LOGO_DATA_URL =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 120 40%22%3E%3Crect width=%22120%22 height=%2240%22 fill=%22white%22/%3E%3C/svg%3E';

const mockMatchMedia = (matcher: (query: string) => boolean = () => false): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matcher(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
};

const LocationProbe = (): JSX.Element => {
  const location = useLocation();
  return <output data-testid="location-display">{`${location.pathname}${location.search}`}</output>;
};

const renderNavbar = (
  initialEntry = '/',
  siteConfig?: {
    storeName: string;
    storeLogo?: {
      url: string;
      publicId: string;
      alt?: string;
      srcSet?: string;
      sizes?: string;
    } | null;
    storeLogoDark?: {
      url: string;
      publicId: string;
      alt?: string;
      srcSet?: string;
      sizes?: string;
    } | null;
    storeLogoLight?: {
      url: string;
      publicId: string;
      alt?: string;
      srcSet?: string;
      sizes?: string;
    } | null;
  }
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <Navbar siteConfig={siteConfig} />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const expectCategoriesDialogToStopBlocking = async (): Promise<void> => {
  await waitFor(() => {
    const dialog = screen.queryByRole('dialog', { name: 'Categories' });

    if (!dialog) {
      expect(dialog).not.toBeInTheDocument();
      return;
    }

    expect(dialog).toHaveStyle({ pointerEvents: 'none' });
  });
};

describe('Navbar categories modal', () => {
  beforeEach(() => {
    mockMatchMedia();
    mocks.categoriesMock.mockReset();
    mocks.brandsMock.mockReset();
    mocks.suggestionsMock.mockReset();
    mocks.notificationsMock.mockReset();
    mocks.logoutMock.mockReset();
    mocks.cycleThemeMock.mockReset();
    mocks.isDarkTheme = true;
    mocks.compareItems = [];
    mocks.wishlistItems = [];
    mocks.user = null;

    mocks.categoriesMock.mockResolvedValue({
      data: [
        {
          id: 'smartphones',
          name: 'Smartphones',
          slug: 'smartphones',
          description: 'Flagship phones and trusted daily drivers.',
          isActive: true,
          order: 1,
          children: []
        },
        {
          id: 'laptops',
          name: 'Laptops',
          slug: 'laptops',
          description: 'Portable power for work and study.',
          isActive: true,
          order: 2,
          children: []
        }
      ]
    });
    mocks.brandsMock.mockResolvedValue({
      data: [
        {
          id: 'apple',
          name: 'Apple',
          slug: 'apple',
          logoUrl: 'https://example.com/apple.svg',
          isActive: true,
          sortOrder: 1,
          productCount: 4,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
          id: 'samsung',
          name: 'Samsung',
          slug: 'samsung',
          logoUrl: 'https://example.com/samsung.svg',
          isActive: true,
          sortOrder: 2,
          productCount: 6,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ]
    });
    mocks.suggestionsMock.mockResolvedValue({ data: [] });
    mocks.notificationsMock.mockResolvedValue({ data: [] });
  });

  it('prefetches categories from trigger intent and defers brands until needed', async () => {
    const user = userEvent.setup();

    renderNavbar();

    expect(mocks.categoriesMock).not.toHaveBeenCalled();
    expect(mocks.brandsMock).not.toHaveBeenCalled();

    fireEvent.pointerEnter(screen.getAllByRole('button', { name: 'Categories' })[0]);

    await waitFor(() => {
      expect(mocks.categoriesMock).toHaveBeenCalledTimes(1);
    });
    expect(mocks.brandsMock).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole('button', { name: 'Categories' })[0]);

    expect(await screen.findByRole('dialog', { name: 'Categories' })).toBeInTheDocument();
    expect(mocks.categoriesMock).toHaveBeenCalledTimes(1);
    expect(mocks.brandsMock).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('tab', { name: /Brands/i }));

    await waitFor(() => {
      expect(mocks.brandsMock).toHaveBeenCalledTimes(1);
    });
  });

  it('returns stable memoized fallback artwork data URIs', () => {
    const category = {
      id: 'cameras',
      name: 'Cameras',
      slug: 'cameras',
      isActive: true,
      order: 3,
      children: []
    };

    const firstArtwork = getCategoryFallbackImage(category);
    const secondArtwork = getCategoryFallbackImage({ ...category });

    expect(firstArtwork).toBe(secondArtwork);
    expect(firstArtwork).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
  });

  it('opens the categories popup from the navbar trigger', async () => {
    const user = userEvent.setup();

    renderNavbar();

    await user.click(screen.getAllByRole('button', { name: 'Categories' })[0]);

    expect(await screen.findByRole('dialog', { name: 'Categories' })).toBeInTheDocument();
    expect((await screen.findAllByRole('link', { name: 'Shop Smartphones' })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Shop Laptops' }).length).toBeGreaterThan(0);
  });

  it('does not open the desktop categories popup on hover', async () => {
    mockMatchMedia((query) => query === DESKTOP_CATEGORIES_HOVER_QUERY);

    renderNavbar();

    const categoryButtons = screen.getAllByRole('button', { name: 'Categories' });
    const desktopTrigger = categoryButtons[categoryButtons.length - 1];

    fireEvent.mouseEnter(desktopTrigger);

    expect(screen.queryByRole('dialog', { name: 'Categories' })).not.toBeInTheDocument();
  });

  it('switches to brands inside the popup and navigates to the filtered shop view', async () => {
    const user = userEvent.setup();

    renderNavbar();

    await user.click(screen.getAllByRole('button', { name: 'Categories' })[0]);
    await user.click(await screen.findByRole('tab', { name: /Brands/i }));
    await user.click(await screen.findByRole('link', { name: 'Shop Apple brand' }));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/shop?brand=apple');
  });

  it('switches the popup tabs when dragged with touch', async () => {
    const user = userEvent.setup();
    const getBoundingClientRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          x: 0,
          y: 0,
          left: 0,
          top: 0,
          right: 220,
          bottom: 44,
          width: 220,
          height: 44,
          toJSON: () => ({})
        }) as DOMRect
    );

    renderNavbar();

    await user.click(screen.getAllByRole('button', { name: 'Categories' })[0]);

    const switcher = await screen.findByRole('tablist', { name: 'Browse categories or brands' });
    fireEvent.pointerDown(switcher, { pointerId: 1, pointerType: 'touch', clientX: 32, clientY: 22 });
    fireEvent.pointerMove(switcher, { pointerId: 1, pointerType: 'touch', clientX: 180, clientY: 24 });
    fireEvent.pointerUp(switcher, { pointerId: 1, pointerType: 'touch', clientX: 180, clientY: 24 });

    await waitFor(() => {
      expect(mocks.brandsMock).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole('tab', { name: /Brands/i })).toHaveAttribute('aria-selected', 'true');

    getBoundingClientRectSpy.mockRestore();
  });

  it('switches catalog views when the item area is swiped with touch', async () => {
    const user = userEvent.setup();

    renderNavbar();

    await user.click(screen.getAllByRole('button', { name: 'Categories' })[0]);

    const catalogItems = await screen.findByRole('group', { name: 'Catalog items' });
    fireEvent.pointerDown(catalogItems, { pointerId: 2, pointerType: 'touch', clientX: 260, clientY: 220 });
    fireEvent.pointerMove(catalogItems, { pointerId: 2, pointerType: 'touch', clientX: 180, clientY: 224 });
    fireEvent.pointerUp(catalogItems, { pointerId: 2, pointerType: 'touch', clientX: 180, clientY: 224 });

    await waitFor(() => {
      expect(mocks.brandsMock).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole('tab', { name: /Brands/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('closes cleanly after switching to brands', async () => {
    const user = userEvent.setup();

    renderNavbar();

    await user.click(screen.getAllByRole('button', { name: 'Categories' })[0]);
    await user.click(await screen.findByRole('tab', { name: /Brands/i }));
    await user.click(screen.getByRole('button', { name: 'Close modal' }));

    await expectCategoriesDialogToStopBlocking();

    await user.click(screen.getAllByRole('link', { name: 'Compare' })[0]);
    expect(screen.getByTestId('location-display')).toHaveTextContent('/compare');
  });

  it('uses stable desktop categories popup sizing after clicking the desktop trigger', async () => {
    const user = userEvent.setup();
    const getBoundingClientRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          x: 640,
          y: 40,
          left: 640,
          top: 40,
          right: 836,
          bottom: 88,
          width: 196,
          height: 48,
          toJSON: () => ({})
        }) as DOMRect
    );

    try {
      mockMatchMedia((query) => query === DESKTOP_CATEGORIES_HOVER_QUERY || query === DESKTOP_VIEWPORT_QUERY);
      renderNavbar();

      const categoryButtons = screen.getAllByRole('button', { name: 'Categories' });
      const desktopTrigger = categoryButtons[categoryButtons.length - 1];

      fireEvent.click(desktopTrigger);

      const dialog = await screen.findByRole('dialog', { name: 'Categories' });
      const panel = dialog.firstElementChild?.firstElementChild;

      expect(panel).not.toBeNull();
      expect(panel as HTMLElement).toHaveClass('w-[min(820px,calc(100vw-1rem))]');
      expect(panel as HTMLElement).toHaveStyle({ position: 'fixed' });
      expect(document.body.style.overflow).not.toBe('hidden');

      await user.click(await screen.findByRole('tab', { name: /Brands/i }));
      await user.click(screen.getByRole('button', { name: 'Close modal' }));

      await expectCategoriesDialogToStopBlocking();

      await user.click(screen.getAllByRole('link', { name: 'Compare' })[0]);
      expect(screen.getByTestId('location-display')).toHaveTextContent('/compare');
    } finally {
      getBoundingClientRectSpy.mockRestore();
    }
  });

  it('submits navbar search into the shop query flow', async () => {
    const user = userEvent.setup();

    renderNavbar();

    await user.type(screen.getByPlaceholderText('Search products, brands, categories...'), 'printer');
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('location-display')).toHaveTextContent('/shop?q=printer');
  });

  it('opens navbar autosuggest immediately while the query is still debouncing', async () => {
    const user = userEvent.setup();

    renderNavbar();

    const searchInput = screen.getByPlaceholderText('Search products, brands, categories...');

    await user.type(searchInput, 'ai');

    expect(searchInput).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Browse all results for "ai"')).toBeInTheDocument();
  });

  it('condenses the sticky header after scrolling', async () => {
    renderNavbar();

    expect(screen.getByTestId('store-header')).toHaveAttribute('data-condensed', 'false');

    Object.defineProperty(window, 'scrollY', {
      value: 120,
      writable: true,
      configurable: true
    });
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(screen.getByTestId('store-header')).toHaveAttribute('data-condensed', 'true');
    });
  });

  it('shows wishlist and compare shortcuts in the navbar', async () => {
    const user = userEvent.setup();

    renderNavbar();

    expect(screen.getAllByRole('link', { name: 'Wishlist' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Compare' }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('link', { name: 'Compare' })[0]);
    expect(screen.getByTestId('location-display')).toHaveTextContent('/compare');
  });

  it('highlights the cart shortcut while the shopper is on cart pages', () => {
    renderNavbar('/cart');

    expect(screen.getByRole('link', { name: 'Open cart' }).className).toContain('bg-white/[0.08]');
  });

  it('highlights the wishlist shortcut while the shopper is on the wishlist page', () => {
    mocks.user = { name: 'Nisal' };

    renderNavbar('/dashboard/wishlist');

    expect(screen.getAllByRole('link', { name: 'Wishlist' })[0].className).toContain('bg-white/[0.08]');
  });

  it('highlights the categories trigger while the shopper is browsing the shop', () => {
    renderNavbar('/shop');

    const categoryButtons = screen.getAllByRole('button', { name: 'Categories' });
    const desktopTrigger = categoryButtons[categoryButtons.length - 1];

    expect(desktopTrigger.className).toContain('bg-white/[0.08]');
  });

  it('renders the storefront logo when admin branding is configured', () => {
    const { container } = renderNavbar('/', {
      storeName: 'NJ Store',
      storeLogo: {
        url: STORE_LOGO_DATA_URL,
        publicId: 'njstore/site-config/store-logo',
        alt: 'NJ Store logo'
      }
    });

    const storeLogo = container.querySelector('img');

    expect(screen.getByRole('link', { name: 'NJ Store' })).toBeInTheDocument();
    expect(storeLogo).toHaveAttribute('src', STORE_LOGO_DATA_URL);
  });

  it('uses the light logo asset on dark theme headers', () => {
    mocks.isDarkTheme = true;

    const { container } = renderNavbar('/', {
      storeName: 'NJ Store',
      storeLogo: {
        url: STORE_LOGO_DATA_URL,
        publicId: 'njstore/site-config/store-logo',
        alt: 'NJ Store logo'
      },
      storeLogoDark: {
        url: 'data:image/gif;base64,dark',
        publicId: 'njstore/site-config/store-logo-dark',
        alt: 'NJ Store dark logo'
      },
      storeLogoLight: {
        url: 'data:image/gif;base64,light',
        publicId: 'njstore/site-config/store-logo-light',
        alt: 'NJ Store light logo'
      }
    });

    expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/gif;base64,light');
  });

  it('falls back to the store name when the storefront logo fails to load', () => {
    const { container } = renderNavbar('/', {
      storeName: 'NJ Store',
      storeLogo: {
        url: STORE_LOGO_DATA_URL,
        publicId: 'njstore/site-config/store-logo',
        alt: 'NJ Store logo'
      }
    });

    const storeLogo = container.querySelector('img');

    expect(storeLogo).toBeTruthy();
    expect(storeLogo).toHaveAttribute('src', STORE_LOGO_DATA_URL);
    fireEvent.error(storeLogo as HTMLImageElement);

    expect(screen.getByText('NJ Store')).toBeInTheDocument();
  });
});
