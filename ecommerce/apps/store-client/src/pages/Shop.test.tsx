import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  localStorageState: {} as Record<string, string>,
  resetLocalStorage: () => undefined as void,
  localStorageMock: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  listMock: vi.fn(),
  priceRangeMock: vi.fn(),
  listBrandsMock: vi.fn(),
  categoriesMock: vi.fn(),
  suggestionsMock: vi.fn(),
  navigateMock: vi.fn(),
  updateProfileMock: vi.fn(),
  authState: {
    user: null as
      | null
      | {
          id: string;
          name: string;
          email: string;
          role: 'customer';
          language: 'en';
          isEmailVerified: boolean;
          loyaltyPoints: number;
          shopPreferences?: {
            myFilters?: {
              params: Record<string, string>;
              savedAt: string;
            };
          };
        },
    loading: false,
    updateProfile: vi.fn()
  }
}));

{
  const state = mocks.localStorageState;
  mocks.resetLocalStorage = () => {
    Object.keys(state).forEach((key) => {
      delete state[key];
    });
  };
  mocks.localStorageMock.getItem.mockImplementation((key: string) => (key in state ? state[key] : null));
  mocks.localStorageMock.setItem.mockImplementation((key: string, value: string) => {
    state[key] = String(value);
  });
  mocks.localStorageMock.removeItem.mockImplementation((key: string) => {
    delete state[key];
  });
  mocks.localStorageMock.clear.mockImplementation(() => {
    mocks.resetLocalStorage();
  });
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock
  };
});

vi.mock('../hooks/useWishlist', () => ({
  useWishlist: () => ({
    isWishlisted: () => false,
    pendingProductId: null,
    toggleWishlist: vi.fn()
  })
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mocks.authState
}));

vi.mock('../hooks/useDebounce', () => ({
  useDebounce: <T,>(value: T) => value
}));

vi.mock('../components/product/ProductCard', () => ({
  ProductCard: ({ product, size = 'default' }: { product: { id: string; name: string }; size?: 'default' | 'compact' }) => (
    <div data-testid={`product-card-${product.id}`} data-size={size}>
      {product.name}
    </div>
  )
}));

vi.mock('../services/productService', () => ({
  productService: {
    list: mocks.listMock,
    priceRange: mocks.priceRangeMock,
    categories: mocks.categoriesMock,
    suggestions: mocks.suggestionsMock
  }
}));

vi.mock('../services/brandService', () => ({
  brandService: {
    list: mocks.listBrandsMock
  }
}));

import { Shop } from './Shop';

const sampleProducts = [
  {
    id: 'product-1',
    name: 'Laptop Pro 14',
    slug: 'laptop-pro-14',
    shortDescription: 'Performance laptop',
    price: 125000,
    brand: 'Acer',
    ratings: { average: 4.8, count: 20 },
    isBestSeller: true,
    isFeatured: true,
    isActive: true,
    stock: 8,
    discountPercentage: 10
  },
  {
    id: 'product-2',
    name: 'Office Printer Max',
    slug: 'office-printer-max',
    shortDescription: 'Fast office printer',
    price: 45000,
    brand: 'Canon',
    ratings: { average: 4.2, count: 9 },
    isBestSeller: false,
    isFeatured: false,
    isActive: true,
    stock: 4,
    discountPercentage: 0
  }
];

const buildProduct = (index: number) => ({
  ...sampleProducts[index % sampleProducts.length],
  id: `product-${index + 1}`,
  name: `Catalog Product ${index + 1}`,
  slug: `catalog-product-${index + 1}`
});

const renderShop = (initialEntry = '/shop') => {
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
        initialEntries={[initialEntry]}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Shop />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const openFiltersPanel = async (): Promise<void> => {
  if (!screen.queryByRole('dialog', { name: 'Filters' })) {
    fireEvent.click(screen.getByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i }));
  }

  await screen.findByRole('dialog', { name: 'Filters' });
};

const getFilterToggle = (label: string): HTMLButtonElement => {
  const toggle = screen.getByText(label).closest('button');
  if (!(toggle instanceof HTMLButtonElement)) {
    throw new Error(`Unable to find filter toggle for "${label}".`);
  }

  return toggle;
};

const scrollWindowTo = (nextScrollY: number): void => {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value: nextScrollY
  });
  fireEvent.scroll(window);
};

const appendStoreHeader = (height = 168): HTMLElement => {
  const storeHeader = document.createElement('header');
  storeHeader.setAttribute('data-testid', 'store-header');
  Object.defineProperty(storeHeader, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        x: 0,
        y: 0,
        width: 1280,
        height,
        top: 0,
        right: 1280,
        bottom: height,
        left: 0,
        toJSON: () => ({})
      }) as DOMRect
  });
  document.body.prepend(storeHeader);

  return storeHeader;
};

describe('Shop page', () => {
  beforeEach(() => {
    document.querySelectorAll('[data-testid="store-header"]').forEach((element) => {
      element.remove();
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0
    });
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: mocks.localStorageMock
    });
    mocks.resetLocalStorage();
    mocks.localStorageMock.getItem.mockClear();
    mocks.localStorageMock.setItem.mockClear();
    mocks.localStorageMock.removeItem.mockClear();
    mocks.localStorageMock.clear.mockClear();
    mocks.listMock.mockReset();
    mocks.priceRangeMock.mockReset();
    mocks.listBrandsMock.mockReset();
    mocks.categoriesMock.mockReset();
    mocks.suggestionsMock.mockReset();
    mocks.navigateMock.mockReset();
    mocks.updateProfileMock.mockReset();
    mocks.authState = {
      user: null,
      loading: false,
      updateProfile: mocks.updateProfileMock
    };

    mocks.listMock.mockImplementation(async (params: { limit?: number }) => ({
        data: sampleProducts,
        pagination: {
          page: 1,
          totalPages: 1,
          total: sampleProducts.length,
          limit: params.limit ?? 12
        }
      }));
    mocks.priceRangeMock.mockResolvedValue({
      data: {
        min: 0,
        max: 125000
      }
    });
    mocks.categoriesMock.mockResolvedValue({
      data: [
        {
          id: 'category-laptops',
          name: 'Laptops',
          slug: 'laptops',
          metaTitle: 'Laptops | NJ Store',
          metaDescription: 'Shop laptops with fast delivery from NJ Store.',
          isActive: true,
          order: 1,
          productCount: 12,
          children: []
        },
        {
          id: 'category-accessories',
          name: 'Accessories',
          slug: 'accessories',
          isActive: true,
          order: 2,
          productCount: 5,
          children: []
        },
        {
          id: 'category-printers',
          name: 'Printers',
          slug: 'printers',
          isActive: true,
          order: 3,
          productCount: 0,
          children: []
        }
      ]
    });
    mocks.suggestionsMock.mockResolvedValue({ data: [] });
    mocks.listBrandsMock.mockResolvedValue({
      data: [
        {
          id: 'brand-acer',
          name: 'Acer',
          slug: 'acer',
          productCount: 8,
          isActive: true,
          sortOrder: 1,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z'
        },
        {
          id: 'brand-dell',
          name: 'Dell',
          slug: 'dell',
          productCount: 4,
          isActive: true,
          sortOrder: 2,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z'
        },
        {
          id: 'brand-canon',
          name: 'Canon',
          slug: 'canon',
          productCount: 0,
          isActive: true,
          sortOrder: 3,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z'
        }
      ]
    });
  });

  it('commits the dual price slider to the catalog query filters', async () => {
    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    await openFiltersPanel();

    const minimumPriceSlider = screen.getByLabelText('Minimum price');
    const maximumPriceSlider = screen.getByLabelText('Maximum price');

    fireEvent.change(minimumPriceSlider, { target: { value: '50000' } });
    fireEvent.mouseUp(minimumPriceSlider);

    fireEvent.change(maximumPriceSlider, { target: { value: '100000' } });
    fireEvent.mouseUp(maximumPriceSlider);

    await waitFor(() => {
      expect(
        mocks.listMock.mock.calls.some(([params]) =>
          params.limit === 12 && params.minPrice === 50000 && params.maxPrice === 100000
        )
      ).toBe(true);
    });

    expect(screen.getByText(/Min: LKR 50,000/i)).toBeInTheDocument();
    expect(screen.getByText(/Max: LKR 100,000/i)).toBeInTheDocument();
  });

  it('shows a loading summary instead of 0 results while the first catalog request is pending', async () => {
    mocks.listMock.mockImplementation((params: { limit?: number }) => {
      if (params.limit === 50) {
        return Promise.resolve({ data: sampleProducts });
      }

      return new Promise(() => undefined);
    });

    renderShop('/shop?inStock=true');

    expect(await screen.findByText('Loading products...')).toBeInTheDocument();
    expect(screen.getByText('Checking the latest matching products for your current filters.')).toBeInTheDocument();
    expect(screen.queryByText('0 results found')).not.toBeInTheDocument();
  });

  it('uses the selected category SEO metadata on the shop page', async () => {
    const { container } = renderShop('/shop?category=category-laptops');

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();

    expect(container.querySelector('title')?.textContent).toBe('Laptops | NJ Store');
    expect(container.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Shop laptops with fast delivery from NJ Store.'
    );
    expect(container.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain('/shop?category=category-laptops');
  });

  it('supports keyboard navigation inside search suggestions', async () => {
    mocks.suggestionsMock.mockResolvedValue({
      data: [
        {
          id: 'suggestion-1',
          name: 'Laptop Pro 14',
          slug: 'laptop-pro-14',
          price: 125000
        }
      ]
    });

    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    await openFiltersPanel();

    const searchInput = screen.getByLabelText('Search');
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'lap' } });

    const suggestion = await screen.findByRole('option', { name: /Laptop Pro 14/i });

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(suggestion).toHaveAttribute('aria-selected', 'true');
    });

    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(mocks.navigateMock).toHaveBeenCalledWith('/product/laptop-pro-14');
  });

  it('shows brand and category suggestions beyond product matches', async () => {
    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    await openFiltersPanel();

    const searchInput = screen.getByLabelText('Search');
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'ac' } });

    const brandSuggestion = await screen.findByRole('option', { name: /Acer/i });
    expect(screen.getByRole('option', { name: /Accessories/i })).toBeInTheDocument();

    fireEvent.click(brandSuggestion);

    await waitFor(() => {
      expect(
        mocks.listMock.mock.calls.some(([params]) => params.limit === 12 && Array.isArray(params.brand) && params.brand.includes('acer'))
      ).toBe(true);
    });
  });

  it('keeps product cards in the default grid mode', async () => {
    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    expect(screen.getByTestId('product-card-product-1')).toHaveAttribute('data-size', 'default');
    expect(screen.queryByRole('button', { name: 'Grid view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'List view' })).not.toBeInTheDocument();
  });

  it('uses the custom sort dropdown to update the catalog query', async () => {
    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sort products' }));
    fireEvent.click(screen.getByRole('option', { name: 'Price: High to Low' }));

    await waitFor(() => {
      expect(mocks.listMock.mock.calls.some(([params]) => params.limit === 12 && params.sort === 'price_desc')).toBe(true);
    });
  });

  it('shows facet counts and disables empty category and brand options', async () => {
    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    await openFiltersPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Category' }));

    expect(screen.getByRole('option', { name: 'Laptops (12)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Printers (0)' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Brand' }));

    expect(screen.getByRole('option', { name: 'Acer (8)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Canon (0)' })).toBeDisabled();
  });

  it('applies multi-select category and brand filters, item type, and fresh deal filters through the catalog query', async () => {
    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    await openFiltersPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Laptops (12)' }));
    fireEvent.click(screen.getByRole('option', { name: 'Accessories (5)' }));

    await waitFor(() => {
      expect(
        mocks.listMock.mock.calls.some(
          ([params]) =>
            params.limit === 12 &&
            Array.isArray(params.category) &&
            params.category.includes('category-laptops') &&
            params.category.includes('category-accessories')
        )
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Brand' }));
    fireEvent.click(screen.getByRole('option', { name: 'Acer (8)' }));
    fireEvent.click(screen.getByRole('option', { name: 'Dell (4)' }));

    await waitFor(() => {
      expect(
        mocks.listMock.mock.calls.some(
          ([params]) =>
            params.limit === 12 &&
            Array.isArray(params.brand) &&
            params.brand.includes('acer') &&
            params.brand.includes('dell')
        )
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Item Type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Used items' }));

    await waitFor(() => {
      expect(mocks.listMock.mock.calls.some(([params]) => params.limit === 12 && params.condition === 'used')).toBe(true);
    });

    fireEvent.click(getFilterToggle('Fresh deals'));

    await waitFor(() => {
      expect(mocks.listMock.mock.calls.some(([params]) => params.limit === 12 && params.flashDeal === true)).toBe(true);
    });
  });

  it('saves and reloads My Filters for signed-in shoppers', async () => {
    mocks.authState = {
      user: {
        id: 'user-1',
        name: 'Nisal',
        email: 'nisal@example.com',
        role: 'customer',
        language: 'en',
        isEmailVerified: true,
        loyaltyPoints: 120
      },
      loading: false,
      updateProfile: mocks.updateProfileMock
    };
    mocks.updateProfileMock.mockResolvedValue(undefined);

    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    await openFiltersPanel();

    fireEvent.click(getFilterToggle('In stock only'));

    await waitFor(() => {
      expect(
        mocks.listMock.mock.calls.some(([params]) => params.limit === 12 && params.inStock === true)
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save My Filters' }));

    await waitFor(() => {
      expect(mocks.updateProfileMock).toHaveBeenCalledWith({
        shopPreferences: {
          myFilters: {
            params: { inStock: 'true' },
            savedAt: expect.any(String)
          }
        }
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Filters$/i })).toBeInTheDocument();
    });

    await openFiltersPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Load My Filters' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Filters \(1\)$/i })).toBeInTheDocument();
      expect(mocks.listMock.mock.calls.filter(([params]) => params.limit === 12 && params.inStock === true).length).toBeGreaterThan(1);
    });
  });

  it('offers quick recovery actions when filters produce no results', async () => {
    mocks.listMock.mockImplementation(async (params: { limit?: number; inStock?: boolean }) => {
      if (params.limit === 50) {
        return { data: sampleProducts };
      }

      const filteredProducts = params.inStock ? [] : sampleProducts;
      return {
        data: filteredProducts,
        pagination: {
          page: 1,
          totalPages: 1,
          total: filteredProducts.length,
          limit: params.limit ?? 12
        }
      };
    });

    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    await openFiltersPanel();
    fireEvent.click(getFilterToggle('In stock only'));

    expect((await screen.findAllByText('0 results found')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Include out-of-stock' }));

    await waitFor(() => {
      expect(screen.queryByText('0 results found')).not.toBeInTheDocument();
    });
  });

  it('loads additional pages when infinite mode is selected', async () => {
    mocks.listMock.mockImplementation(async (params: { limit?: number; page?: number }) => {
      if (params.limit === 50) {
        return { data: sampleProducts };
      }

      const page = params.page ?? 1;
      const pageItems = page === 1 ? [sampleProducts[0]] : page === 2 ? [sampleProducts[1]] : [];

      return {
        data: pageItems,
        pagination: {
          page,
          totalPages: 2,
          total: sampleProducts.length,
          limit: params.limit ?? 12
        }
      };
    });

    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Infinite scroll mode' })[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Load more results' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Load more results' }));

    await waitFor(() => {
      expect(screen.getByText('Office Printer Max')).toBeInTheDocument();
    });

    expect(
      mocks.listMock.mock.calls.some(([params]) => params.limit === 12 && params.page === 2)
    ).toBe(true);
  });

  it('keeps the compact results toolbar available for filters and sorting', async () => {
    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort products' })).toBeInTheDocument();
    expect(screen.getByText('2 results found')).toBeInTheDocument();
  });

  it('keeps catalog controls available on mobile layouts', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390
    });

    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Grid view' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Catalog controls' }));

    expect(screen.queryByRole('button', { name: 'Grid view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'List view' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pagination mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Infinite scroll mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort products' })).toBeInTheDocument();

    scrollWindowTo(180);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Show catalog toolbar' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show catalog toolbar' }));

    expect(window.scrollY).toBe(180);
    expect(await screen.findByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Catalog controls' }));
    expect(screen.getByRole('button', { name: 'Pagination mode' })).toBeInTheDocument();
  });

  it('reopens the collapsed toolbar on desktop without changing scroll position', async () => {
    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();

    scrollWindowTo(180);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show catalog toolbar' }));

    expect(window.scrollY).toBe(180);
    expect(await screen.findByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort products' })).toBeInTheDocument();
  });

  it('collapses the desktop toolbar only after meaningful downward scroll', async () => {
    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).toBeInTheDocument();

    scrollWindowTo(170);
    expect(screen.getByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).toBeInTheDocument();

    scrollWindowTo(190);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).not.toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Show catalog toolbar' })).toBeInTheDocument();
  });

  it('positions the sticky catalog toolbar below the measured store header height', async () => {
    const storeHeader = appendStoreHeader(168);

    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('shop-results-toolbar')).toHaveStyle({ top: '168px' });
    });

    storeHeader.remove();
  });

  it('keeps the desktop toolbar visible after reopening until the next real downward scroll', async () => {
    renderShop();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();

    scrollWindowTo(180);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show catalog toolbar' }));

    expect(await screen.findByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).toBeInTheDocument();

    scrollWindowTo(230);
    expect(screen.getByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).toBeInTheDocument();

    scrollWindowTo(270);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Filters(?:\s+\(\d+\))?$/i })).not.toBeInTheDocument();
    });
  });

  it('window-renders long catalog grids instead of mounting every product card at once', async () => {
    const manyProducts = Array.from({ length: 72 }, (_, index) => buildProduct(index));

    mocks.listMock.mockImplementation(async (params: { limit?: number; page?: number }) => {
      return {
        data: manyProducts,
        pagination: {
          page: params.page ?? 1,
          totalPages: 1,
          total: manyProducts.length,
          limit: params.limit ?? 12
        }
      };
    });

    renderShop();

    expect(await screen.findByText('Catalog Product 1')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('shop-product-list')).toHaveAttribute('data-virtualized', 'true');
    });

    expect(screen.getByTestId('product-card-product-1')).toBeInTheDocument();
    expect(screen.queryByTestId('product-card-product-72')).not.toBeInTheDocument();
  });
});
