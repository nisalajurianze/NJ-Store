import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductCardDto, ProductDetailDto } from '@njstore/types';

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  addItemMock: vi.fn(),
  toggleCompareMock: vi.fn(),
  detailMock: vi.fn(),
  useInViewMock: vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: null
  })
}));

vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    addItem: mocks.addItemMock,
    cart: null,
    loading: false,
    loadCart: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn()
  })
}));

vi.mock('../../context/CompareContext', () => ({
  useCompare: () => ({
    items: [],
    toggleCompare: mocks.toggleCompareMock,
    clearCompare: vi.fn()
  })
}));

vi.mock('../../services/productService', () => ({
  productService: {
    detail: mocks.detailMock
  }
}));

vi.mock('../../hooks/useInView', () => ({
  useInView: mocks.useInViewMock
}));

import { ProductCard } from './ProductCard';

const renderWithRouter = (ui: JSX.Element) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return (
  render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    )
  );
};

const mockTouchDevice = (): (() => void) => {
  const previousMatchMedia = window.matchMedia;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(hover: none)' || query === '(pointer: coarse)' || query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  return () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: previousMatchMedia
    });
  };
};

const product: ProductCardDto = {
  id: 'product-1',
  name: 'Travel Charger',
  slug: 'travel-charger',
  shortDescription: 'Compact fast charger for phones and tablets.',
  price: 8900,
  brand: 'Anker',
  ratings: {
    average: 4.8,
    count: 24
  },
  isBestSeller: true,
  isFeatured: true,
  isActive: true,
  stock: 9,
  discountPercentage: 10,
  productType: 'standard'
};

const productDetail: ProductDetailDto = {
  ...product,
  description: 'Compact fast charger for phones and tablets.',
  images: [
    {
      url: 'https://example.com/products/travel-charger.jpg',
      publicId: 'travel-charger',
      alt: 'Travel Charger'
    }
  ],
  variants: [],
  specifications: [],
  tags: ['charger'],
  loyaltyPoints: 25,
  sku: 'CHR-001',
  bundleItems: []
};

const configurableProductDetail: ProductDetailDto = {
  ...productDetail,
  variants: [
    {
      color: 'Black',
      colorCode: '#111827',
      storage: '128 GB',
      price: 8900,
      stock: 6,
      sku: 'CHR-001-BLK-128'
    },
    {
      color: 'Black',
      colorCode: '#111827',
      storage: '256 GB',
      price: 9900,
      stock: 4,
      sku: 'CHR-001-BLK-256'
    },
    {
      color: 'Silver',
      colorCode: '#cbd5e1',
      storage: '128 GB',
      price: 9200,
      stock: 0,
      sku: 'CHR-001-SLV-128'
    }
  ]
};

const buildPreviewProduct = (index: number): ProductCardDto => ({
  ...product,
  id: `preview-product-${index}`,
  name: `Preview Product ${index}`,
  slug: `preview-product-${index}`,
  previewImages: [
    {
      url: `https://example.com/products/preview-${index}-1.jpg`,
      publicId: `preview-${index}-1`,
      alt: `Preview Product ${index} image 1`
    },
    {
      url: `https://example.com/products/preview-${index}-2.jpg`,
      publicId: `preview-${index}-2`,
      alt: `Preview Product ${index} image 2`
    },
    {
      url: `https://example.com/products/preview-${index}-3.jpg`,
      publicId: `preview-${index}-3`,
      alt: `Preview Product ${index} image 3`
    }
  ]
});

describe('ProductCard', () => {
  beforeEach(() => {
    mocks.navigateMock.mockReset();
    mocks.addItemMock.mockReset();
    mocks.toggleCompareMock.mockReset();
    mocks.detailMock.mockReset();
    mocks.useInViewMock.mockReset();
    mocks.addItemMock.mockResolvedValue(undefined);
    mocks.detailMock.mockResolvedValue({ data: productDetail });
    mocks.useInViewMock.mockReturnValue({
      ref: { current: null },
      inView: false
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the desktop select options trigger without exposing actions first', () => {
    renderWithRouter(<ProductCard product={product} onWishlistToggle={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add travel charger to wishlist/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /toggle compare for travel charger/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /quick view/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select options/i })).toBeInTheDocument();
  });

  it('renders safely when a storefront product is missing brand and rating metadata', () => {
    const partialProduct = {
      ...product,
      brand: undefined,
      brandSlug: undefined,
      ratings: undefined
    } as unknown as ProductCardDto;

    renderWithRouter(<ProductCard product={partialProduct} onWishlistToggle={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Browse Unbranded products' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open details for Travel Charger' })).toBeInTheDocument();
  });

  it('opens the inline option drawer only after clicking the desktop select options dock', async () => {
    mocks.detailMock.mockResolvedValue({ data: configurableProductDetail });

    renderWithRouter(<ProductCard product={product} onWishlistToggle={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Open details for Travel Charger' }));

    const selectOptionsButton = await screen.findByRole('button', { name: /select options/i });

    fireEvent.mouseMove(selectOptionsButton);

    expect(screen.queryByRole('button', { name: /select color black/i })).not.toBeInTheDocument();

    fireEvent.click(selectOptionsButton);

    expect(mocks.detailMock).toHaveBeenCalledWith('travel-charger');
    const selectOptionLabel = await screen.findByText(/^select option$/i);
    const selectionStatus = screen.getByText(/0 of 2 options selected/i);

    expect(selectOptionLabel.compareDocumentPosition(selectionStatus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await screen.findByRole('button', { name: /select color black/i })).toBeInTheDocument();
    const optionScene = await screen.findByTestId('product-card-option-scene');

    expect(optionScene.className).toContain('will-change-transform');
    expect(optionScene.className).toContain('#111827');
    expect(optionScene.className).not.toContain('#817973');
    expect(optionScene.className).not.toContain('clip-path');
    expect(optionScene.getAttribute('style') ?? '').not.toMatch(/clip/i);
  });

  it('unlocks the bottom actions after selecting all options and adds the chosen variant to cart', async () => {
    const user = userEvent.setup();
    const onWishlistToggle = vi.fn();

    mocks.detailMock.mockResolvedValue({ data: configurableProductDetail });

    renderWithRouter(
      <>
        <ProductCard product={product} onWishlistToggle={onWishlistToggle} />
        <Toaster position="top-right" />
      </>
    );

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Open details for Travel Charger' }));

    const selectOptionsButton = await screen.findByRole('button', { name: /select options/i });

    fireEvent.click(selectOptionsButton);

    expect(mocks.detailMock).toHaveBeenCalledWith('travel-charger');
    expect(await screen.findByRole('button', { name: /select color black/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /select color black/i }));
    fireEvent.click(screen.getByRole('button', { name: /select storage 256 gb/i }));

    const addToCartButton = await screen.findByRole('button', { name: /add to cart/i }, { timeout: 2500 });

    expect(addToCartButton).toBeInTheDocument();
    expect(screen.getByLabelText(/selected price lkr\s*9,900/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add travel charger to wishlist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle compare for travel charger/i })).toBeInTheDocument();

    await user.click(addToCartButton);

    expect(mocks.addItemMock).toHaveBeenCalledWith({
      productId: 'product-1',
      quantity: 1,
      variantIndex: 1,
      product: configurableProductDetail
    });
    expect(await screen.findByText('Added to cart')).toBeInTheDocument();
    expect(mocks.navigateMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /add travel charger to wishlist/i }));

    expect(onWishlistToggle).toHaveBeenCalledWith(configurableProductDetail);
  });

  it('uses the fresh detail id when adding from a stale recently viewed card', async () => {
    const user = userEvent.setup();
    const currentProductId = '69d41f25b9896e7a86d4ae31';
    const staleRecentlyViewedProduct = {
      ...product,
      id: 'stale-product-id'
    };
    const currentProductDetail = {
      ...configurableProductDetail,
      id: currentProductId
    };

    mocks.detailMock.mockResolvedValue({ data: currentProductDetail });

    renderWithRouter(<ProductCard product={staleRecentlyViewedProduct} onWishlistToggle={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Open details for Travel Charger' }));
    fireEvent.click(await screen.findByRole('button', { name: /select options/i }));

    fireEvent.click(await screen.findByRole('button', { name: /select color black/i }));
    fireEvent.click(screen.getByRole('button', { name: /select storage 256 gb/i }));

    await user.click(await screen.findByRole('button', { name: /add to cart/i }, { timeout: 2500 }));

    expect(mocks.addItemMock).toHaveBeenCalledWith({
      productId: currentProductId,
      quantity: 1,
      variantIndex: 1,
      product: currentProductDetail
    });
  });

  it('allows changing a completed option combination without resetting the drawer', async () => {
    mocks.detailMock.mockResolvedValue({ data: configurableProductDetail });

    renderWithRouter(<ProductCard product={product} onWishlistToggle={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Open details for Travel Charger' }));
    fireEvent.click(await screen.findByRole('button', { name: /select options/i }));

    expect(await screen.findByRole('button', { name: /select color black/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /select color black/i }));
    fireEvent.click(screen.getByRole('button', { name: /select storage 256 gb/i }));

    const silverButton = screen.getByRole('button', { name: /select color silver/i });

    expect(silverButton).not.toBeDisabled();

    fireEvent.click(silverButton);

    expect((await screen.findAllByText(/Silver \/ 128 GB/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /select color black/i }));

    expect((await screen.findAllByText(/Black \/ 128 GB/i)).length).toBeGreaterThan(0);
  });

  it('limits touch autoplay previews to the mobile budget and lets a touched card take priority', async () => {
    vi.useFakeTimers();
    const restoreMatchMedia = mockTouchDevice();
    mocks.useInViewMock.mockReturnValue({
      ref: { current: null },
      inView: true
    });

    try {
      renderWithRouter(
        <>
          <ProductCard product={buildPreviewProduct(1)} />
          <ProductCard product={buildPreviewProduct(2)} />
          <ProductCard product={buildPreviewProduct(3)} />
        </>
      );

      await act(async () => {
        vi.advanceTimersByTime(450);
      });

      expect(screen.getByAltText('Preview Product 1 image 2')).toBeInTheDocument();
      expect(screen.queryByAltText('Preview Product 2 image 2')).not.toBeInTheDocument();
      expect(screen.queryByAltText('Preview Product 3 image 2')).not.toBeInTheDocument();
      expect(screen.getByAltText('Preview Product 2 image 1')).toBeInTheDocument();
      expect(screen.getByAltText('Preview Product 3 image 1')).toBeInTheDocument();

      fireEvent.touchStart(screen.getByRole('link', { name: 'Open details for Preview Product 3' }));

      await act(async () => {
        vi.advanceTimersByTime(450);
      });

      expect(screen.getByAltText('Preview Product 3 image 2')).toBeInTheDocument();
    } finally {
      restoreMatchMedia();
    }
  });

  it('uses the clean mobile summary card on touch devices and opens product detail on tap', async () => {
    const restoreMatchMedia = mockTouchDevice();

    mocks.detailMock.mockResolvedValue({ data: configurableProductDetail });

    try {
      renderWithRouter(<ProductCard product={product} onWishlistToggle={vi.fn()} />);

      expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /preview travel charger/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select options/i })).toBeInTheDocument();
      expect(screen.getByText(/^select option$/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('link', { name: 'Open details for Travel Charger' }));

      expect(mocks.detailMock).not.toHaveBeenCalled();
      expect(mocks.navigateMock).toHaveBeenCalledWith('/product/travel-charger');
    } finally {
      restoreMatchMedia();
    }
  });

  it('shows the product name only once when the image is unavailable', () => {
    renderWithRouter(<ProductCard product={product} />);

    expect(screen.getAllByText('Travel Charger')).toHaveLength(1);
    expect(screen.getByText('Image coming soon')).toBeInTheDocument();
  });

  it('renders the brand logo badge when a brand logo is available', () => {
    const productWithBrandLogo: ProductCardDto = {
      ...product,
      brandLogoUrl: 'https://example.com/brands/anker.svg'
    };

    const { container } = renderWithRouter(<ProductCard product={productWithBrandLogo} />);
    const brandLogo = container.querySelector('img[src="https://example.com/brands/anker.svg"]');

    expect(brandLogo).toBeInTheDocument();
    expect(brandLogo).toHaveClass('product-card-brand-logo');
  });

  it('falls back to the brand text when the brand logo cannot load', () => {
    const productWithBrandLogo: ProductCardDto = {
      ...product,
      brandLogoUrl: 'https://example.com/brands/anker.svg'
    };

    const { container } = renderWithRouter(<ProductCard product={productWithBrandLogo} />);
    const brandLogo = container.querySelector('img[src="https://example.com/brands/anker.svg"]');

    expect(brandLogo).toBeTruthy();

    fireEvent.error(brandLogo as HTMLImageElement);

    expect(screen.getByText('Anker')).toBeInTheDocument();
  });

  it('shows color variant swatches in the product summary row', () => {
    const productWithColors: ProductCardDto = {
      ...product,
      colorVariants: [
        { name: 'Orange', colorCode: '#f97316' },
        { name: 'Black', colorCode: '#000000' }
      ]
    };

    const { container } = renderWithRouter(<ProductCard product={productWithColors} />);

    expect(screen.getByLabelText('Available colors: Orange, Black')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="product-card-color-swatch"]')).toHaveLength(2);
  });

  it('shows color variant swatches in compact product cards', () => {
    const productWithColors: ProductCardDto = {
      ...product,
      colorVariants: [
        { name: 'Orange', colorCode: '#f97316' },
        { name: 'Black', colorCode: '#000000' }
      ]
    };

    const { container } = renderWithRouter(<ProductCard product={productWithColors} size="compact" />);

    expect(screen.getByLabelText('Available colors: Orange, Black')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="product-card-color-swatch"]')).toHaveLength(2);
  });

  it('does not fetch compact product detail just because a touch card preview becomes visible', async () => {
    const restoreMatchMedia = mockTouchDevice();
    const productWithPreviewImages: ProductCardDto = {
      ...product,
      thumbnail: {
        url: 'https://example.com/products/travel-charger-front.jpg',
        publicId: 'travel-charger-front',
        alt: 'Travel Charger front'
      },
      previewImages: [
        {
          url: 'https://example.com/products/travel-charger-front.jpg',
          publicId: 'travel-charger-front',
          alt: 'Travel Charger front'
        },
        {
          url: 'https://example.com/products/travel-charger-side.jpg',
          publicId: 'travel-charger-side',
          alt: 'Travel Charger side'
        }
      ]
    };

    mocks.detailMock.mockResolvedValue({ data: configurableProductDetail });
    mocks.useInViewMock.mockReturnValue({
      ref: { current: null },
      inView: true
    });

    try {
      renderWithRouter(<ProductCard product={productWithPreviewImages} size="compact" onWishlistToggle={vi.fn()} />);

      const selectOptionsButton = await screen.findByRole('button', { name: /select options/i });

      expect(selectOptionsButton).toBeInTheDocument();
      expect(mocks.detailMock).not.toHaveBeenCalled();

      fireEvent.click(selectOptionsButton);

      expect(await screen.findAllByRole('button', { name: /select color black/i })).toHaveLength(2);
      expect(mocks.detailMock).toHaveBeenCalledTimes(1);
    } finally {
      restoreMatchMedia();
    }
  });

  it('defers preview image preloading until preview interaction starts', async () => {
    const OriginalImage = window.Image;
    const imageConstructorSpy = vi.fn();
    const productWithPreviewImages: ProductCardDto = {
      ...product,
      thumbnail: {
        url: 'https://example.com/products/travel-charger-front.jpg',
        publicId: 'travel-charger-front',
        alt: 'Travel Charger front'
      },
      previewImages: [
        {
          url: 'https://example.com/products/travel-charger-front.jpg',
          publicId: 'travel-charger-front',
          alt: 'Travel Charger front'
        },
        {
          url: 'https://example.com/products/travel-charger-side.jpg',
          publicId: 'travel-charger-side',
          alt: 'Travel Charger side'
        },
        {
          url: 'https://example.com/products/travel-charger-angle.jpg',
          publicId: 'travel-charger-angle',
          alt: 'Travel Charger angle'
        }
      ]
    };

    class MockImage extends OriginalImage {
      constructor(width?: number, height?: number) {
        super(width, height);
        imageConstructorSpy();
      }
    }

    Object.defineProperty(window, 'Image', {
      configurable: true,
      writable: true,
      value: MockImage
    });

    try {
      renderWithRouter(<ProductCard product={productWithPreviewImages} />);

      expect(imageConstructorSpy).not.toHaveBeenCalled();

      fireEvent.mouseEnter(screen.getByRole('link', { name: 'Open details for Travel Charger' }));

      await screen.findByRole('button', { name: /select options/i });
      await waitFor(() => {
        expect(imageConstructorSpy).toHaveBeenCalledTimes(1);
      });
    } finally {
      Object.defineProperty(window, 'Image', {
        configurable: true,
        writable: true,
        value: OriginalImage
      });
    }
  });

  it('switches to the next preview image on hover when multiple images are available', async () => {
    vi.useFakeTimers();
    const productWithPreviewImages: ProductCardDto = {
      ...product,
      thumbnail: {
        url: 'https://example.com/products/travel-charger-front.jpg',
        publicId: 'travel-charger-front',
        alt: 'Travel Charger front'
      },
      previewImages: [
        {
          url: 'https://example.com/products/travel-charger-front.jpg',
          publicId: 'travel-charger-front',
          alt: 'Travel Charger front'
        },
        {
          url: 'https://example.com/products/travel-charger-side.jpg',
          publicId: 'travel-charger-side',
          alt: 'Travel Charger side'
        }
      ]
    };

    try {
      renderWithRouter(<ProductCard product={productWithPreviewImages} />);

      const card = screen.getByRole('link', { name: 'Open details for Travel Charger' });

      expect(screen.getByAltText('Travel Charger front')).toHaveAttribute('src', 'https://example.com/products/travel-charger-front.jpg');

      fireEvent.mouseEnter(card);

      expect(card.className).toContain('scale-[1.01]');
      expect(screen.getByAltText('Travel Charger front').className).toContain('scale-[1.055]');
      expect(screen.getByText('Travel Charger').className).toContain('-translate-y-0.5');

      await vi.advanceTimersByTimeAsync(460);

      expect(screen.getByAltText('Travel Charger side')).toHaveAttribute('src', 'https://example.com/products/travel-charger-side.jpg');
      expect(screen.getByAltText('Travel Charger side').className).toContain('scale-[1.055]');
      await vi.advanceTimersByTimeAsync(2100);

      expect(screen.getByAltText('Travel Charger side')).toHaveAttribute('src', 'https://example.com/products/travel-charger-side.jpg');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps auto-rotating preview images on touch devices while the card remains in view', async () => {
    vi.useFakeTimers();
    const restoreMatchMedia = mockTouchDevice();
    const productWithPreviewImages: ProductCardDto = {
      ...product,
      thumbnail: {
        url: 'https://example.com/products/travel-charger-front.jpg',
        publicId: 'travel-charger-front',
        alt: 'Travel Charger front'
      },
      previewImages: [
        {
          url: 'https://example.com/products/travel-charger-front.jpg',
          publicId: 'travel-charger-front',
          alt: 'Travel Charger front'
        },
        {
          url: 'https://example.com/products/travel-charger-side.jpg',
          publicId: 'travel-charger-side',
          alt: 'Travel Charger side'
        }
      ]
    };

    mocks.useInViewMock.mockReturnValue({
      ref: { current: null },
      inView: true
    });

    try {
      renderWithRouter(<ProductCard product={productWithPreviewImages} />);

      expect(screen.getByAltText('Travel Charger front')).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(460);

      expect(screen.getByAltText('Travel Charger side')).toHaveAttribute('src', 'https://example.com/products/travel-charger-side.jpg');
      fireEvent.blur(screen.getByRole('link', { name: 'Open details for Travel Charger' }));
      await vi.advanceTimersByTimeAsync(2900);

      expect(screen.getByAltText('Travel Charger front')).toHaveAttribute('src', 'https://example.com/products/travel-charger-front.jpg');
    } finally {
      restoreMatchMedia();
      vi.useRealTimers();
    }
  });

  it('keeps touch cards stable without applying an active shadow when in view', () => {
    const restoreMatchMedia = mockTouchDevice();

    mocks.useInViewMock.mockReturnValue({
      ref: { current: null },
      inView: true
    });

    try {
      renderWithRouter(<ProductCard product={product} />);

      expect(screen.getByRole('link', { name: 'Open details for Travel Charger' })).toHaveClass(
        'opacity-100',
        'scale-100',
        'translate-y-0',
        'shadow-none',
        'sm:shadow-none'
      );
    } finally {
      restoreMatchMedia();
    }
  });

  it('keeps the product card stationary while hovered and while options are open', async () => {
    mocks.detailMock.mockResolvedValue({ data: configurableProductDetail });

    renderWithRouter(<ProductCard product={product} onWishlistToggle={vi.fn()} />);

    const card = screen.getByRole('link', { name: 'Open details for Travel Charger' });
    const placeholder = screen.getByText('Image coming soon').parentElement;

    expect(card.className).not.toContain('hover:-translate-y');
    expect(placeholder?.className).toContain('translate-y-0');
    expect(placeholder?.className).not.toContain('-translate-y');
    expect(placeholder?.className).not.toContain('scale-[1.04]');

    fireEvent.mouseEnter(card);
    fireEvent.click(await screen.findByRole('button', { name: /select options/i }));

    expect(await screen.findByRole('button', { name: /select color black/i })).toBeInTheDocument();
    expect(card.className).not.toContain('hover:-translate-y');
    expect(placeholder?.className).toContain('translate-y-0');
    expect(placeholder?.className).not.toContain('-translate-y');
    expect(placeholder?.className).not.toContain('scale-[1.04]');
  });

  it('keeps carousel interaction paused when selected options rerender while the pointer remains inside', async () => {
    const onInteractionStart = vi.fn();
    const onInteractionEnd = vi.fn();

    mocks.detailMock.mockResolvedValue({ data: configurableProductDetail });

    renderWithRouter(
      <ProductCard
        product={product}
        onInteractionStart={onInteractionStart}
        onInteractionEnd={onInteractionEnd}
        onWishlistToggle={vi.fn()}
      />
    );

    const card = screen.getByRole('link', { name: 'Open details for Travel Charger' });

    fireEvent.mouseEnter(card);
    fireEvent.focus(card);
    fireEvent.click(await screen.findByRole('button', { name: /select options/i }));

    fireEvent.click(await screen.findByRole('button', { name: /select color black/i }));
    fireEvent.click(screen.getByRole('button', { name: /select storage 256 gb/i }));

    expect(await screen.findByRole('button', { name: /add to cart/i }, { timeout: 2500 })).toBeInTheDocument();

    fireEvent.blur(card, { relatedTarget: null });

    expect(onInteractionStart).toHaveBeenCalled();
    expect(onInteractionEnd).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
  });

  it('keeps carousel interaction paused while a touch option sheet is open', async () => {
    const restoreMatchMedia = mockTouchDevice();
    const onInteractionStart = vi.fn();
    const onInteractionEnd = vi.fn();

    mocks.detailMock.mockResolvedValue({ data: configurableProductDetail });

    try {
      renderWithRouter(
        <ProductCard
          product={product}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          onWishlistToggle={vi.fn()}
        />
      );

      const selectOptionsButton = screen.getByRole('button', { name: /select options/i });

      fireEvent.pointerDown(selectOptionsButton, { pointerType: 'touch' });
      fireEvent.click(selectOptionsButton);

      expect(await screen.findByRole('button', { name: /close product options/i })).toBeInTheDocument();
      expect(onInteractionStart).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /close product options/i }));

      await waitFor(() => {
        expect(onInteractionEnd).toHaveBeenCalled();
      });
    } finally {
      restoreMatchMedia();
    }
  });

  it('uses the standard default sizing for the default card layout', () => {
    renderWithRouter(<ProductCard product={product} />);

	expect(screen.getByRole('link', { name: 'Open details for Travel Charger' })).toHaveClass(
	  'aspect-[9/15.2]',
	  'h-auto',
	  'w-full',
	  'sm:h-[548px]',
	  'sm:min-h-0',
	  'min-[390px]:aspect-[9/16]',
	  'sm:aspect-auto'
	);
  });

  it('renders rating and review details in compact list mode', () => {
    renderWithRouter(<ProductCard product={product} size="compact" />);

    expect(screen.getByText('4.8 / 5 rating')).toBeInTheDocument();
    expect(screen.getByText('24 reviews')).toBeInTheDocument();
    expect(screen.getByText('9 ready to order right now')).toBeInTheDocument();
  });

  it('keeps featured cards in a vertical layout while showing the compact details', () => {
    const { container } = renderWithRouter(<ProductCard product={product} size="featured" />);

    expect(screen.getByText('4.8 / 5 rating')).toBeInTheDocument();
    expect(screen.getByText('24 reviews')).toBeInTheDocument();
    expect(screen.getByText('9 ready to order right now')).toBeInTheDocument();
    expect(container.querySelector('[role="link"] > div')).not.toHaveClass('sm:flex-row');
  });
});
