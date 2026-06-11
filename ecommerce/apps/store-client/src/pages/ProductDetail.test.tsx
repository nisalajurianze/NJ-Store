import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductDetailDto, ReviewDto } from '@njstore/types';

const mocks = vi.hoisted(() => ({
  addItemMock: vi.fn(),
  askQuestionMock: vi.fn(),
  createReviewMock: vi.fn(),
  detailMock: vi.fn(),
  listByProductMock: vi.fn(),
  listMock: vi.fn(),
  questionsMock: vi.fn(),
  subscribeToBackInStockMock: vi.fn(),
  toggleCompareMock: vi.fn(),
  toggleHelpfulMock: vi.fn(),
  toggleWishlistMock: vi.fn(),
  trackRecentlyViewedMock: vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ slug: 'travel-charger' })
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'shopper@example.com',
      isEmailVerified: true
    }
  })
}));

vi.mock('../context/CartContext', () => ({
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

vi.mock('../context/CompareContext', () => ({
  useCompare: () => ({
    items: [],
    toggleCompare: mocks.toggleCompareMock,
    clearCompare: vi.fn()
  })
}));

vi.mock('../hooks/useWishlist', () => ({
  useWishlist: () => ({
    items: [],
    isLoading: false,
    isError: false,
    pendingProductId: null,
    isWishlisted: () => false,
    toggleWishlist: mocks.toggleWishlistMock,
    refetch: vi.fn()
  })
}));

vi.mock('../services/productService', () => ({
  productService: {
    detail: mocks.detailMock,
    list: mocks.listMock,
    questions: mocks.questionsMock,
    askQuestion: mocks.askQuestionMock,
    subscribeToBackInStock: mocks.subscribeToBackInStockMock,
    trackRecentlyViewed: mocks.trackRecentlyViewedMock
  }
}));

vi.mock('../services/reviewService', () => ({
  reviewService: {
    listByProduct: mocks.listByProductMock,
    create: mocks.createReviewMock,
    toggleHelpful: mocks.toggleHelpfulMock
  }
}));

import { ProductDetail } from './ProductDetail';

const productDetail: ProductDetailDto = {
  id: 'product-1',
  name: 'Travel Charger',
  slug: 'travel-charger',
  shortDescription: 'Compact fast charger for phones and tablets.',
  description: 'Compact fast charger for phones and tablets.',
  price: 8900,
  brand: 'Anker',
  brandLogoUrl: 'https://example.com/brands/anker.svg',
  ratings: {
    average: 4.8,
    count: 24
  },
  isBestSeller: true,
  isFeatured: true,
  isActive: true,
  stock: 9,
  discountPercentage: 10,
  images: [
    {
      url: 'https://example.com/products/travel-charger.jpg',
      publicId: 'travel-charger',
      alt: 'Travel Charger'
    }
  ],
  variants: [],
  specifications: [
    {
      key: 'Power',
      value: '65W'
    }
  ],
  tags: ['charger'],
  loyaltyPoints: 25,
  sku: 'CHR-001',
  productType: 'standard',
  bundleItems: []
};

const productDetailWithVariants: ProductDetailDto = {
  ...productDetail,
  images: [
    {
      url: 'https://example.com/products/travel-charger-default-1.jpg',
      publicId: 'travel-charger-default-1',
      alt: 'Travel Charger default front'
    },
    {
      url: 'https://example.com/products/travel-charger-default-2.jpg',
      publicId: 'travel-charger-default-2',
      alt: 'Travel Charger default side'
    }
  ],
  variants: [
    {
      color: 'Black',
      colorCode: '#111827',
      storage: '128GB',
      glowColor: '#111827',
      images: [
        {
          url: 'https://example.com/products/travel-charger-black-128.jpg',
          publicId: 'travel-charger-black-128',
          alt: 'Travel Charger black 128GB'
        }
      ],
      price: 8900,
      stock: 8,
      sku: 'CHR-001-BLK-128'
    },
    {
      color: 'Black',
      colorCode: '#111827',
      storage: '256GB',
      price: 9400,
      stock: 4,
      sku: 'CHR-001-BLK-256'
    },
    {
      color: 'Blue',
      colorCode: '#2563eb',
      storage: '256GB',
      glowColor: '#2563eb',
      images: [
        {
          url: 'https://example.com/products/travel-charger-blue-256.jpg',
          publicId: 'travel-charger-blue-256',
          alt: 'Travel Charger blue 256GB'
        }
      ],
      price: 9600,
      stock: 3,
      sku: 'CHR-001-BLU-256'
    }
  ]
};

const productDetailWithPlainVariants: ProductDetailDto = {
  ...productDetail,
  images: [
    {
      url: 'https://example.com/products/travel-charger-default-plain-1.jpg',
      publicId: 'travel-charger-default-plain-1',
      alt: 'Travel Charger default plain front'
    }
  ],
  variants: [
    {
      glowColor: '#f97316',
      images: [
        {
          url: 'https://example.com/products/travel-charger-matte.jpg',
          publicId: 'travel-charger-matte',
          alt: 'Travel Charger matte edition'
        }
      ],
      price: 8900,
      stock: 5,
      sku: 'CHR-001-MATTE'
    },
    {
      glowColor: '#22c55e',
      images: [
        {
          url: 'https://example.com/products/travel-charger-limited.jpg',
          publicId: 'travel-charger-limited',
          alt: 'Travel Charger limited edition'
        }
      ],
      price: 9400,
      stock: 2,
      sku: 'CHR-001-LIMITED'
    }
  ]
};

const helpfulReview: ReviewDto = {
  id: 'review-1',
  product: 'product-1',
  user: {
    id: 'reviewer-1',
    name: 'Jamie Perera'
  },
  order: 'order-1',
  rating: 5,
  title: 'Helpful winner',
  comment: 'Fast charging and compact design.',
  isVerified: true,
  isVerifiedBuyer: true,
  isApproved: true,
  helpfulVotes: 2,
  createdAt: new Date('2026-03-25T10:00:00.000Z').toISOString()
};

const newerReview: ReviewDto = {
  ...helpfulReview,
  id: 'review-2',
  title: 'Newest arrival',
  helpfulVotes: 1,
  createdAt: new Date('2026-03-27T10:00:00.000Z').toISOString()
};

const renderProductDetail = () => {
  window.history.pushState({}, '', '/product/travel-charger');

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

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={['/shop/travel-charger']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ProductDetail />
        <Toaster position="top-right" />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ProductDetail', () => {
  beforeEach(() => {
    mocks.addItemMock.mockReset();
    mocks.askQuestionMock.mockReset();
    mocks.createReviewMock.mockReset();
    mocks.detailMock.mockReset();
    mocks.listByProductMock.mockReset();
    mocks.listMock.mockReset();
    mocks.questionsMock.mockReset();
    mocks.subscribeToBackInStockMock.mockReset();
    mocks.toggleCompareMock.mockReset();
    mocks.toggleHelpfulMock.mockReset();
    mocks.toggleWishlistMock.mockReset();
    mocks.trackRecentlyViewedMock.mockReset();

    mocks.detailMock.mockResolvedValue({ data: productDetail });
    mocks.listMock.mockResolvedValue({ data: [] });
    mocks.listByProductMock.mockResolvedValue([helpfulReview]);
    mocks.questionsMock.mockResolvedValue({ data: [] });
    mocks.askQuestionMock.mockResolvedValue({ data: { id: 'question-1', status: 'pending' } });
    mocks.subscribeToBackInStockMock.mockResolvedValue(undefined);
    mocks.trackRecentlyViewedMock.mockResolvedValue(undefined);

    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it('shows an API error toast when adding the product to cart fails', async () => {
    const user = userEvent.setup();

    mocks.addItemMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Only 1 unit is available right now'
        }
      }
    });

    renderProductDetail();

    const primaryAddToCartButton = await screen.findByRole('button', { name: 'Add to Cart' });
    await user.click(primaryAddToCartButton);

    expect(await screen.findByText('Only 1 unit is available right now')).toBeInTheDocument();
  });

  it('renders modular variant selectors, falls back to product media, and updates glow on valid selections', async () => {
    const user = userEvent.setup();

    mocks.detailMock.mockResolvedValue({
      data: productDetailWithVariants
    });

    renderProductDetail();

    await screen.findByRole('heading', { name: 'Travel Charger' });
    await waitFor(() => {
      expect(screen.getByTestId('product-gallery-active-image')).toHaveAttribute(
        'src',
        'https://example.com/products/travel-charger-black-128.jpg'
      );
    });

    expect(screen.getByRole('button', { name: 'Select Color Black' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Color Blue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Storage 128GB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Storage 256GB' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select Storage 256GB' }));

    await waitFor(() => {
      expect(screen.getByTestId('product-gallery-active-image')).toHaveAttribute(
        'src',
        'https://example.com/products/travel-charger-default-1.jpg'
      );
    });

    await user.click(screen.getByRole('button', { name: 'Select Color Blue' }));

    await waitFor(() => {
      expect(screen.getByTestId('product-gallery-active-image')).toHaveAttribute(
        'src',
        'https://example.com/products/travel-charger-blue-256.jpg'
      );
    });

    expect(screen.getByRole('button', { name: 'Select Storage 128GB' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Select Storage 128GB' }));

    await waitFor(() => {
      expect(screen.getByTestId('product-gallery-active-image')).toHaveAttribute(
        'src',
        'https://example.com/products/travel-charger-black-128.jpg'
      );
    });

    await waitFor(() => {
      expect(
        screen
          .getAllByTestId('product-backlight-glow')
          .some((node) => node.getAttribute('style')?.includes('#111827'))
      ).toBe(true);
    });
  });

  it('shows a fallback variant picker for plain variants and swaps media without attribute groups', async () => {
    const user = userEvent.setup();

    mocks.detailMock.mockResolvedValue({
      data: productDetailWithPlainVariants
    });

    renderProductDetail();

    await screen.findByRole('heading', { name: 'Travel Charger' });
    await waitFor(() => {
      expect(screen.getByTestId('product-gallery-active-image')).toHaveAttribute(
        'src',
        'https://example.com/products/travel-charger-matte.jpg'
      );
    });

    expect(screen.getByRole('button', { name: 'Select variant CHR-001-MATTE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select variant CHR-001-LIMITED' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select variant CHR-001-LIMITED' }));

    await waitFor(() => {
      expect(screen.getByTestId('product-gallery-active-image')).toHaveAttribute(
        'src',
        'https://example.com/products/travel-charger-limited.jpg'
      );
    });

    await waitFor(() => {
      expect(
        screen
          .getAllByTestId('product-backlight-glow')
          .some((node) => node.getAttribute('style')?.includes('#22c55e'))
      ).toBe(true);
    });
  });

  it('renders the brand logo next to the product name when a logo is available', async () => {
    const { container } = renderProductDetail();

    await screen.findByRole('heading', { name: 'Travel Charger' });

    expect(container.querySelector('img[src="https://example.com/brands/anker.svg"]')).toBeInTheDocument();
  });

  it('falls back to the brand text when the title brand logo fails to load', async () => {
    const { container } = renderProductDetail();

    await screen.findByRole('heading', { name: 'Travel Charger' });

    const brandLogo = container.querySelector('img[src="https://example.com/brands/anker.svg"]');

    expect(brandLogo).toBeTruthy();

    fireEvent.error(brandLogo as HTMLImageElement);

    expect(screen.getAllByText('Anker').length).toBeGreaterThan(0);
  });

  it('shows an API error toast when helpful feedback update fails', async () => {
    const user = userEvent.setup();

    mocks.toggleHelpfulMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'You already marked this review as helpful'
        }
      }
    });

    renderProductDetail();

    await screen.findByRole('button', { name: 'Helpful (2)' });
    await user.click(screen.getByRole('button', { name: 'Helpful (2)' }));

    expect(await screen.findByText('You already marked this review as helpful')).toBeInTheDocument();
  });

  it('shows an API error toast when review submission fails', async () => {
    const user = userEvent.setup();

    mocks.createReviewMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Only delivered orders can be reviewed'
        }
      }
    });

    renderProductDetail();

    await screen.findByRole('button', { name: 'Submit Review' });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Great charger' } });
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'This charger performs really well on daily use.' } });
    await user.click(screen.getByRole('button', { name: 'Submit Review' }));

    expect(await screen.findByText('Only delivered orders can be reviewed')).toBeInTheDocument();
  });

  it('resets the review form and refetches reviews after a successful submission', async () => {
    const user = userEvent.setup();

    mocks.createReviewMock.mockResolvedValue({
      ...helpfulReview,
      id: 'review-3',
      title: 'Great charger',
      comment: 'This charger performs really well on daily use.'
    });

    renderProductDetail();

    await screen.findByRole('button', { name: 'Submit Review' });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Great charger' } });
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'This charger performs really well on daily use.' } });
    await user.click(screen.getByRole('button', { name: 'Submit Review' }));

    expect(await screen.findByText('Review submitted for moderation.')).toBeInTheDocument();
    expect(mocks.createReviewMock).toHaveBeenCalledWith({
      product: 'product-1',
      rating: 5,
      title: 'Great charger',
      comment: 'This charger performs really well on daily use.'
    });
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Comment')).toHaveValue('');
    expect(mocks.listByProductMock).toHaveBeenCalledTimes(2);
  });

  it('copies the current product link when share falls back to the clipboard', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    const productUrl = `${window.location.origin}/product/travel-charger`;

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock
      }
    });

    renderProductDetail();

    await user.click(await screen.findByRole('button', { name: 'Share this product' }));

    expect(writeTextMock).toHaveBeenCalledWith(productUrl);
    expect(await screen.findByText('Link copied to clipboard.')).toBeInTheDocument();
  });

  it('sorts reviews by helpful votes by default and by newest when selected', async () => {
    const user = userEvent.setup();

    mocks.listByProductMock.mockResolvedValue([helpfulReview, newerReview]);

    renderProductDetail();

    await screen.findByText('Helpful winner');
    await screen.findByText('Newest arrival');

    const initialText = document.body.textContent ?? '';
    expect(initialText.indexOf('Helpful winner')).toBeLessThan(initialText.indexOf('Newest arrival'));

    await user.click(screen.getByRole('button', { name: 'Newest' }));

    const reorderedText = document.body.textContent ?? '';
    expect(reorderedText.indexOf('Newest arrival')).toBeLessThan(reorderedText.indexOf('Helpful winner'));
  });

  it('shows verified-buyer badges and admin replies inside the review list', async () => {
    mocks.listByProductMock.mockResolvedValue([
      {
        ...helpfulReview,
        adminReply: 'Thanks for the thoughtful review. We are glad the charger is working well for you.',
        adminRepliedAt: new Date('2026-03-28T12:00:00.000Z').toISOString()
      }
    ]);

    renderProductDetail();

    expect(await screen.findByText('Verified Buyer')).toBeInTheDocument();
    expect(screen.getByText('Admin reply')).toBeInTheDocument();
    expect(screen.getByText(/Thanks for the thoughtful review/i)).toBeInTheDocument();
  });

  it('sanitizes rich descriptions before injecting them into the page', async () => {
    mocks.detailMock.mockResolvedValue({
      data: {
        ...productDetail,
        description:
          '<p>Fast <strong>charger</strong></p><script>alert("bad")</script><a href="javascript:alert(1)" onclick="alert(1)">Unsafe link</a>'
      }
    });

    const { container } = renderProductDetail();

    expect(await screen.findByText('Fast')).toBeInTheDocument();

    const description = container.querySelector('.prose');
    const unsafeLink = screen.getByText('Unsafe link');

    expect(description).toHaveTextContent('Fast charger');
    expect(description?.querySelector('script')).toBeNull();
    expect(description?.querySelector('[onclick]')).toBeNull();
    expect(unsafeLink).not.toHaveAttribute('href');
  });

  it('submits product questions through the product question endpoint', async () => {
    const user = userEvent.setup();

    renderProductDetail();

    await user.click(await screen.findByRole('button', { name: 'Ask a Question' }));
    expect(screen.getByRole('dialog', { name: 'Ask a Question' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Test User');
    expect(screen.getByLabelText('Email')).toHaveValue('shopper@example.com');

    fireEvent.change(screen.getByLabelText('Question'), {
      target: { value: 'Is this charger compatible with a MacBook Air?' }
    });
    await user.click(screen.getByRole('button', { name: 'Send Question' }));

    expect(mocks.askQuestionMock).toHaveBeenCalledWith('product-1', {
      customerName: 'Test User',
      customerEmail: 'shopper@example.com',
      question: 'Is this charger compatible with a MacBook Air?'
    });
    expect(await screen.findByText('Question submitted for an answer.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Ask a Question' })).not.toBeInTheDocument();
    });
  });
});
