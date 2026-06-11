import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestImage = {
  url: string;
  publicId: string;
  alt?: string;
};

type TestMediaItem = TestImage & {
  kind: 'image' | 'video';
};

type TestProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  price: number;
  brand: string;
  ratings: {
    average: number;
    count: number;
  };
  isBestSeller: boolean;
  isFeatured: boolean;
  isFlashDeal: boolean;
  isActive: boolean;
  stock: number;
  discountPercentage: number;
  comparePrice?: number;
  flashDealEndsAt?: string;
  thumbnail?: TestImage;
  previewImages?: TestImage[];
};

type TestRecentProduct = TestProduct & {
  description: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  images: TestImage[];
  specifications: Array<{ label: string; value: string }>;
  variants: unknown[];
};

type TestBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type TestShowcaseFeature = {
  icon: string;
  label: string;
  value: string;
};

type TestAdSlot = {
  slotKey: string;
  eyebrow?: string;
  title: string;
  description?: string;
  ctaUrl?: string;
  mediaItems?: TestMediaItem[];
  isActive: boolean;
};

type TestFeaturePromo = {
  eyebrow?: string;
  title: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  mediaItems?: TestMediaItem[];
  isActive: boolean;
};

type TestBanner = {
  id: string;
  key: string;
  campaignLabel: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  isActive: boolean;
  updatedAt: string;
  accentText?: string;
  backgroundImage?: TestImage;
  heroSpotlightProduct?: TestProduct;
  showcaseProducts?: TestProduct[];
  showcaseFeatureGroups?: Array<{
    productId: string;
    items: TestShowcaseFeature[];
  }>;
  adSlots?: TestAdSlot[];
  featurePromo?: TestFeaturePromo;
  heroCornerImage?: TestImage;
  heroCornerImageEnabled?: boolean;
  heroCornerImageSize?: number;
  heroBottomLeftImage?: TestImage;
  heroBottomLeftImageEnabled?: boolean;
  heroBottomLeftImageSize?: number;
  heroBottomRightImage?: TestImage;
  heroBottomRightImageEnabled?: boolean;
  heroBottomRightImageSize?: number;
};

type TestHomeFeed = {
  featured: TestProduct[];
  banner: TestBanner;
  latest: TestProduct[];
  flashDeals: TestProduct[];
  wantedProducts: TestProduct[];
  brands: TestBrand[];
  recentlyViewed: TestRecentProduct[];
};

const mocks = vi.hoisted(() => ({
  homeFeedMock: vi.fn(),
  readCachedHomeFeedMock: vi.fn(),
  writeCachedHomeFeedMock: vi.fn(),
  getLocalRecentlyViewedMock: vi.fn(),
  subscribeMock: vi.fn(),
  navigateMock: vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mocks.navigateMock
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null
  })
}));

vi.mock('../hooks/useWishlist', () => ({
  useWishlist: () => ({
    items: [],
    isLoading: false,
    isError: false,
    pendingProductId: null,
    isWishlisted: () => false,
    toggleWishlist: vi.fn(),
    refetch: vi.fn()
  })
}));

vi.mock('../components/product/ProductCard', () => ({
  ProductCard: ({ product }: { product: { name: string } }) => <div>{product.name}</div>
}));

vi.mock('../services/homeService', () => ({
  homeService: {
    readCachedFeed: mocks.readCachedHomeFeedMock,
    writeCachedFeed: mocks.writeCachedHomeFeedMock,
    feed: mocks.homeFeedMock,
    banner: async () => ({ data: (await mocks.homeFeedMock()).data.banner }),
    featured: async () => ({ data: (await mocks.homeFeedMock()).data.featured }),
    latest: async () => ({ data: (await mocks.homeFeedMock()).data.latest }),
    flashDeals: async () => ({ data: (await mocks.homeFeedMock()).data.flashDeals }),
    wantedProducts: async () => ({ data: (await mocks.homeFeedMock()).data.wantedProducts }),
    brands: async () => ({ data: (await mocks.homeFeedMock()).data.brands }),
    recentlyViewed: async () => ({ data: (await mocks.homeFeedMock()).data.recentlyViewed })
  }
}));

vi.mock('../services/productService', () => ({
  productService: {
    getLocalRecentlyViewed: mocks.getLocalRecentlyViewedMock
  }
}));

vi.mock('../services/newsletterService', () => ({
  newsletterService: {
    subscribe: mocks.subscribeMock
  }
}));

import { Home } from './Home';

const LocationProbe = (): JSX.Element => {
  const location = useLocation();

  return <span data-testid="location-display">{`${location.pathname}${location.search}`}</span>;
};

const renderHome = (initialEntries: string[] = ['/']) => {
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
        initialEntries={initialEntries}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Home />
        <LocationProbe />
        <Toaster position="top-right" />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

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

const createProduct = (overrides: Partial<TestProduct> = {}): TestProduct => ({
  id: 'product-1',
  name: 'Galaxy S24 Ultra',
  slug: 'galaxy-s24-ultra',
  shortDescription: 'Premium smartphone',
  price: 449000,
  comparePrice: 479000,
  brand: 'Samsung',
  ratings: { average: 4.9, count: 100 },
  isBestSeller: true,
  isFeatured: true,
  isFlashDeal: false,
  isActive: true,
  stock: 10,
  discountPercentage: 6,
  thumbnail: undefined,
  previewImages: [],
  ...overrides
});

const createRecentProduct = (overrides: Partial<TestRecentProduct> = {}): TestRecentProduct => ({
  ...createProduct({
    id: 'recent-1',
    name: 'iPhone 17 Pro',
    slug: 'iphone-17-pro',
    shortDescription: 'Apple product',
    price: 560000,
    brand: 'Apple',
    ratings: { average: 0, count: 0 },
    isBestSeller: false,
    isFeatured: false,
    isFlashDeal: false,
    stock: 3,
    discountPercentage: 0
  }),
  description: 'Apple product',
  category: { id: 'cat-1', name: 'Smartphones', slug: 'smartphones' },
  images: [],
  specifications: [],
  variants: [],
  ...overrides
});

const createBrand = (overrides: Partial<TestBrand> = {}): TestBrand => ({
  id: 'brand-apple',
  name: 'Apple',
  slug: 'apple',
  logoUrl: 'https://example.com/apple-logo.svg',
  isActive: true,
  sortOrder: 1,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  ...overrides
});

const createBanner = (overrides: Partial<TestBanner> = {}): TestBanner => ({
  id: 'home-hero',
  key: 'home-hero',
  campaignLabel: 'NJ Store',
  title: 'Fallback',
  subtitle: 'Fallback subtitle for tests',
  ctaText: 'Shop Collection',
  ctaUrl: '/shop',
  showcaseProducts: [],
  showcaseFeatureGroups: [],
  adSlots: [],
  isActive: false,
  updatedAt: '2026-04-01T00:00:00.000Z',
  ...overrides
});

const createHomeFeed = (
  overrides: Omit<Partial<TestHomeFeed>, 'banner'> & {
    banner?: Partial<TestBanner>;
  } = {}
): TestHomeFeed => {
  const { banner, ...rest } = overrides;

  return {
    featured: [],
    banner: createBanner(banner ?? {}),
    latest: [],
    flashDeals: [],
    wantedProducts: [],
    brands: [],
    recentlyViewed: [],
    ...rest
  };
};

describe('Home page newsletter form', () => {
  beforeEach(() => {
    mockMatchMedia();
    mocks.homeFeedMock.mockReset();
    mocks.readCachedHomeFeedMock.mockReset();
    mocks.writeCachedHomeFeedMock.mockReset();
    mocks.getLocalRecentlyViewedMock.mockReset();
    mocks.subscribeMock.mockReset();
    mocks.navigateMock.mockReset();
    mocks.readCachedHomeFeedMock.mockReturnValue(undefined);

    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        brands: [
          createBrand(),
          createBrand({
            id: 'brand-samsung',
            name: 'Samsung',
            slug: 'samsung',
            logoUrl: 'https://example.com/samsung-logo.svg',
            sortOrder: 2
          })
        ]
      })
    });
    mocks.getLocalRecentlyViewedMock.mockReturnValue([]);
  });

  it('shows an API error toast when the newsletter request fails', async () => {
    const user = userEvent.setup();

    mocks.subscribeMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Subscription service is unavailable'
        }
      }
    });

    renderHome();

    await user.type(screen.getByLabelText(/email address/i), 'subscriber@example.com');
    await user.click(screen.getByRole('button', { name: 'Join Newsletter' }));

    expect(await screen.findByText('Subscription service is unavailable')).toBeInTheDocument();
  });

  it('clears the newsletter email after a successful subscription request', async () => {
    const user = userEvent.setup();

    mocks.subscribeMock.mockResolvedValue({
      data: {
        id: 'newsletter-1',
        email: 'subscriber@example.com',
        isConfirmed: true
      }
    });

    renderHome();

    await user.type(screen.getByLabelText(/email address/i), 'subscriber@example.com');
    await user.click(screen.getByRole('button', { name: 'Join Newsletter' }));

    expect(mocks.subscribeMock).toHaveBeenCalledWith({
      email: 'subscriber@example.com',
      source: 'home-page'
    });
    expect(await screen.findByText('You are now on the insider list.')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveValue('');
  });

  it('links the flash deals action to the filtered shop view', async () => {
    renderHome();

    expect(await screen.findByRole('link', { name: /view all offers/i })).toHaveAttribute('href', '/shop?flashDeal=true');
  });

  it('links the hero used-items action to the used-items filtered shop view', async () => {
    renderHome();

    expect(await screen.findByRole('link', { name: /shop used items/i })).toHaveAttribute('href', '/shop?condition=used');
  });

  it('renders an active hero banner from the home feed when one is available', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-1',
          campaignLabel: 'Weekend Promo',
          title: 'Launch-ready hero content',
          subtitle: 'Fresh banner copy should replace the translation fallback when active.',
          ctaText: 'Explore Promo',
          ctaUrl: '/shop?featured=true',
          accentText: 'Official warranty included',
          backgroundImage: {
            url: 'https://cdn.example.com/banner.jpg',
            publicId: 'banners/home-hero'
          },
          isActive: true,
          updatedAt: '2026-04-04T06:50:00.000Z'
        }
      })
    });

    renderHome();

    expect(await screen.findByText('Launch-ready hero content')).toBeInTheDocument();
    expect(screen.getByText('Fresh banner copy should replace the translation fallback when active.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore Promo' })).toHaveAttribute('href', '/shop?featured=true');
    expect(screen.getByText('Official warranty included')).toBeInTheDocument();
    expect(document.querySelector('.theme-hero-surface')).toHaveStyle({
      '--hero-surface-image':
        'linear-gradient(140deg, rgba(7, 14, 27, 0.88), rgba(7, 14, 27, 0.68)), url(https://cdn.example.com/banner.jpg?bannerVersion=2026-04-04T06%3A50%3A00.000Z)'
    });
  });

  it('does not request known unavailable Cloudinary demo hero backgrounds', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-demo-placeholder',
          campaignLabel: 'Seeded Campaign',
          title: 'Hero still renders',
          subtitle: 'Placeholder media should not trigger a network request.',
          ctaText: 'Explore',
          ctaUrl: '/shop',
          backgroundImage: {
            url: 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800/v1710000000/njstore/banners/home-hero-april.jpg',
            publicId: 'njstore/banners/home-hero-april'
          },
          isActive: true,
          updatedAt: '2026-05-11T06:45:09.764Z'
        }
      })
    });

    renderHome();

    expect(await screen.findByText('Hero still renders')).toBeInTheDocument();
    expect(document.querySelector('.theme-hero-surface')).toHaveStyle({
      '--hero-surface-image':
        'linear-gradient(145deg, rgba(5, 12, 28, 1), rgba(8, 18, 38, 1) 58%, rgba(7, 12, 22, 1))'
    });
  });

  it('keeps rendering when fallback showcase products have incomplete storefront fields', async () => {
    const malformedFeaturedProduct = {
      ...createProduct({
        id: 'legacy-featured-1',
        name: 'Legacy Featured Device',
        slug: 'legacy-featured-device'
      }),
      brand: undefined,
      brandSlug: undefined,
      ratings: undefined
    } as unknown as TestProduct;

    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-partial-fallback',
          title: 'Legacy-safe hero',
          subtitle: 'Incomplete product records should not crash the homepage.',
          isActive: true,
          showcaseProducts: []
        },
        featured: [malformedFeaturedProduct]
      })
    });

    renderHome();

    expect(await screen.findByText('Legacy-safe hero')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Unbranded products' })).toBeInTheDocument();
  });

  it('renders admin-configured showcase features beside the preview image', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-showcase-features',
          campaignLabel: 'Feature-driven showcase',
          title: 'Curated product showcase',
          subtitle: 'Show custom highlight rows beside the product image.',
          showcaseProducts: [
            createProduct({
              id: 'showcase-1',
              name: 'I Phone 17 pro',
              slug: 'iphone-17-pro',
              shortDescription: 'Flagship Apple smartphone.',
              price: 356000,
              comparePrice: 356800,
              brand: 'Apple',
              stock: 9,
              discountPercentage: 0,
              thumbnail: {
                url: 'https://cdn.example.com/iphone-17-pro.png',
                publicId: 'products/iphone-17-pro',
                alt: 'I Phone 17 pro'
              },
              previewImages: [
                {
                  url: 'https://cdn.example.com/iphone-17-pro.png',
                  publicId: 'products/iphone-17-pro',
                  alt: 'I Phone 17 pro'
                }
              ]
            })
          ],
          showcaseFeatureGroups: [
            {
              productId: 'showcase-1',
              items: [
                { icon: 'camera', label: 'Camera', value: '48MP main' },
                { icon: 'memory', label: 'RAM', value: '12GB' },
                { icon: 'storage', label: 'Storage', value: '256GB' }
              ]
            }
          ],
          isActive: true,
          updatedAt: '2026-04-07T05:10:00.000Z'
        }
      })
    });

    renderHome();

    expect((await screen.findAllByText('Camera')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('48MP main').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RAM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12GB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Storage').length).toBeGreaterThan(0);
    expect(screen.getAllByText('256GB').length).toBeGreaterThan(0);
  });

  it('keeps the hero spotlight product separate from the curated showcase rotation', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-separated-products',
          campaignLabel: 'Separated products',
          title: 'Distinct hero and showcase products',
          subtitle: 'The hero visual and the showcase carousel should be managed independently.',
          heroSpotlightProduct: createProduct({
            id: 'hero-product-1',
            name: 'JBL Charge 5',
            slug: 'jbl-charge-5',
            shortDescription: 'Portable speaker with premium sound.',
            price: 57900,
            brand: 'JBL',
            ratings: { average: 4.8, count: 13 },
            isBestSeller: false,
            stock: 6,
            discountPercentage: 0,
            thumbnail: {
              url: 'https://cdn.example.com/jbl-charge-5.png',
              publicId: 'products/jbl-charge-5',
              alt: 'Hero spotlight speaker'
            },
            previewImages: [
              {
                url: 'https://cdn.example.com/jbl-charge-5.png',
                publicId: 'products/jbl-charge-5',
                alt: 'Hero spotlight speaker'
              }
            ]
          }),
          showcaseProducts: [
            createProduct({
              id: 'showcase-product-1',
              name: 'Xiaomi 14',
              slug: 'xiaomi-14',
              shortDescription: 'Compact flagship phone.',
              price: 249000,
              comparePrice: 269000,
              brand: 'Xiaomi',
              ratings: { average: 4.9, count: 24 },
              isFlashDeal: true,
              flashDealEndsAt: '2026-04-10T12:43:00.000Z',
              stock: 20,
              discountPercentage: 7
            })
          ],
          isActive: true,
          updatedAt: '2026-04-05T10:00:00.000Z'
        }
      })
    });

    renderHome();

    expect(await screen.findByAltText('Hero spotlight speaker')).toBeInTheDocument();
    expect((await screen.findAllByRole('heading', { name: 'Xiaomi 14' })).length).toBeGreaterThan(0);
    expect(screen.getAllByText('JBL Charge 5').length).toBeGreaterThan(0);
  });

  it('renders admin-managed hero corner images around the hero spotlight', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-corner-image',
          campaignLabel: 'Warranty focus',
          title: 'Hero with warranty badge',
          subtitle: 'The hero spotlight should show the uploaded corner image instead of the text pill.',
          heroCornerImage: {
            url: 'https://cdn.example.com/warranty-badge.png',
            publicId: 'banners/warranty-badge',
            alt: 'Official warranty badge'
          },
          heroCornerImageEnabled: true,
          heroCornerImageSize: 132,
          heroBottomLeftImage: {
            url: 'https://cdn.example.com/delivery-badge.png',
            publicId: 'banners/delivery-badge',
            alt: 'Fast delivery badge'
          },
          heroBottomLeftImageEnabled: false,
          heroBottomLeftImageSize: 92,
          heroBottomRightImage: {
            url: 'https://cdn.example.com/trade-in-badge.png',
            publicId: 'banners/trade-in-badge',
            alt: 'Trade-in bonus badge'
          },
          heroBottomRightImageEnabled: true,
          heroBottomRightImageSize: 118,
          heroSpotlightProduct: createProduct({
            id: 'hero-product-2',
            name: 'I Phone 17 pro',
            slug: 'iphone-17-pro',
            shortDescription: 'Flagship phone with bright display.',
            price: 356000,
            brand: 'Apple',
            ratings: { average: 4.9, count: 18 },
            thumbnail: {
              url: 'https://cdn.example.com/iphone-17-pro.png',
              publicId: 'products/iphone-17-pro',
              alt: 'I Phone 17 pro'
            },
            previewImages: [
              {
                url: 'https://cdn.example.com/iphone-17-pro.png',
                publicId: 'products/iphone-17-pro',
                alt: 'I Phone 17 pro'
              }
            ]
          }),
          isActive: true,
          updatedAt: '2026-04-06T08:30:00.000Z'
        }
      })
    });

    renderHome();

    const topRightImage = await screen.findByAltText('Official warranty badge');
    const bottomRightImage = screen.getByAltText('Trade-in bonus badge');
    const spotlightLink = screen.getByRole('link', { name: 'Open hero spotlight I Phone 17 pro' });
    const heroBadgeImages = Array.from(document.querySelectorAll('img')).filter((image) =>
      image.getAttribute('src')?.includes('warranty-badge.png')
    );
    const bottomRightBadgeImages = Array.from(document.querySelectorAll('img')).filter((image) =>
      image.getAttribute('src')?.includes('trade-in-badge.png')
    );

    expect(topRightImage).toHaveStyle({ width: '132px', maxWidth: '132px', maxHeight: '132px' });
    expect(bottomRightImage).toHaveStyle({ width: '118px', maxWidth: '118px', maxHeight: '118px' });
    expect(screen.queryByAltText('Fast delivery badge')).not.toBeInTheDocument();
    expect(spotlightLink).toHaveAttribute('href', '/product/iphone-17-pro');
    expect(topRightImage.className).toContain('group-hover:scale-110');
    expect(topRightImage.className).toContain('group-hover:-translate-y-1');
    expect(heroBadgeImages.length).toBeGreaterThan(1);
    expect(bottomRightBadgeImages.length).toBeGreaterThan(1);
  });

  it('renders admin-managed ad slots and steps through curated showcase products', async () => {
    const user = userEvent.setup();

    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-2',
          campaignLabel: 'Campaign Edit',
          title: 'Curated hero',
          subtitle: 'The admin editor should drive the full hero row.',
          accentText: 'Updated from admin',
          adSlots: [
            {
              slotKey: 'slot-1',
              eyebrow: 'Launch',
              title: 'Advertisement place 1',
              description: 'New arrivals and launch offers.',
              ctaUrl: '/shop?featured=true',
              isActive: true
            },
            {
              slotKey: 'slot-2',
              eyebrow: 'Video',
              title: 'Advertisement place 2',
              description: 'Media-driven story block.',
              mediaItems: [
                {
                  kind: 'video',
                  url: 'https://cdn.example.com/promo.mp4',
                  publicId: 'promo/video'
                }
              ],
              isActive: true
            },
            {
              slotKey: 'slot-3',
              eyebrow: 'Text',
              title: 'Advertisement place 3',
              description: 'Text-only campaign card.',
              isActive: true
            }
          ],
          showcaseProducts: [
            createProduct({
              id: 'showcase-1',
              name: 'iPad Air M2',
              slug: 'ipad-air-m2',
              shortDescription: 'Powerful tablet for work and play.',
              price: 279000,
              comparePrice: 299000,
              brand: 'Apple',
              ratings: { average: 4.9, count: 24 },
              isFlashDeal: true,
              flashDealEndsAt: '2026-04-05T08:00:00.000Z',
              stock: 8,
              discountPercentage: 7
            }),
            createProduct({
              id: 'showcase-2',
              name: 'JBL Charge 5',
              slug: 'jbl-charge-5',
              shortDescription: 'Portable speaker with bigger sound.',
              price: 68900,
              brand: 'JBL',
              ratings: { average: 4.8, count: 13 },
              isBestSeller: false,
              isFlashDeal: false,
              stock: 6,
              discountPercentage: 0
            })
          ],
          isActive: true,
          updatedAt: '2026-04-04T06:50:00.000Z'
        }
      })
    });

    renderHome();

    expect(await screen.findByText('Advertisement place 1')).toBeInTheDocument();
    expect(screen.getByText('Advertisement place 2')).toBeInTheDocument();
    expect(screen.getByText('Advertisement place 3')).toBeInTheDocument();
    expect(screen.queryByText('Shop by department')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Advertisement place 1' })).toHaveAttribute('href', '/shop?featured=true');
    expect(screen.queryByText('See Promo')).not.toBeInTheDocument();
    expect((await screen.findAllByRole('heading', { name: 'iPad Air M2' })).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: 'Next showcase product' })[0]);

    expect((await screen.findAllByRole('heading', { name: 'JBL Charge 5' })).length).toBeGreaterThan(0);
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it('renders the admin-managed mid-page promo between new arrivals and brands', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-mid-promo',
          campaignLabel: 'Campaign Edit',
          title: 'Curated hero',
          subtitle: 'The admin editor should drive the full hero row.',
          featurePromo: {
            eyebrow: '2025 AI TVs',
            title: 'Explore new AI TVs',
            description: 'Run a wide promo block between the newest arrivals and the live brand rail.',
            ctaText: 'Learn more',
            ctaUrl: '/shop?category=tvs',
            secondaryCtaText: 'View all',
            secondaryCtaUrl: '/shop?brand=samsung',
            mediaItems: [
              {
                kind: 'image',
                url: 'https://cdn.example.com/ai-tv-promo.png',
                publicId: 'promo/ai-tvs',
                alt: 'AI TV campaign'
              }
            ],
            isActive: true
          },
          isActive: true,
          updatedAt: '2026-04-08T08:10:00.000Z'
        }
      })
    });

    renderHome();

    const promoHeading = await screen.findByRole('heading', { name: 'Explore new AI TVs' });
    const newArrivalsHeading = screen.getByRole('heading', { name: 'Fresh additions to the catalog' });
    const brandsHeading = screen.getByRole('heading', { name: 'Trusted electronics brands' });

    expect(screen.getByText('2025 AI TVs')).toBeInTheDocument();
    expect(screen.getByText('Run a wide promo block between the newest arrivals and the live brand rail.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', '/shop?category=tvs');
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/shop?brand=samsung');
    expect(screen.getByRole('link', { name: 'Open Explore new AI TVs' })).toHaveAttribute('href', '/shop?category=tvs');
    expect(screen.getByAltText('AI TV campaign')).toBeInTheDocument();
    expect(newArrivalsHeading.compareDocumentPosition(promoHeading) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(promoHeading.compareDocumentPosition(brandsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('opens the showcase product when the curated showcase card is clicked', async () => {
    const user = userEvent.setup();

    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-showcase-click',
          campaignLabel: 'Clickable showcase',
          title: 'Direct access',
          subtitle: 'The whole showcase card should open the product page.',
          showcaseProducts: [
            createProduct({
              id: 'showcase-click-1',
              name: 'Sony WH-1000XM5',
              slug: 'sony-wh-1000xm5',
              shortDescription: 'Premium noise-cancelling headphones.',
              price: 129900,
              brand: 'Sony',
              ratings: { average: 4.9, count: 31 },
              stock: 5,
              discountPercentage: 0
            })
          ],
          isActive: true,
          updatedAt: '2026-04-04T06:50:00.000Z'
        }
      })
    });

    renderHome();

    const showcaseCard = await screen.findByRole('link', { name: 'Open Sony WH-1000XM5' });

    expect(screen.queryByRole('button', { name: /view deal/i })).not.toBeInTheDocument();

    await user.click(showcaseCard);

    expect(mocks.navigateMock).toHaveBeenCalledWith('/product/sony-wh-1000xm5');
  });

  it('moves the showcase product on a mobile swipe without opening the product page', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-showcase-swipe',
          campaignLabel: 'Swipe showcase',
          title: 'Swipe access',
          subtitle: 'The full showcase card should respond to touch swipes.',
          showcaseProducts: [
            createProduct({
              id: 'showcase-swipe-1',
              name: 'Lenovo Legion 5',
              slug: 'lenovo-legion-5',
              shortDescription: 'Gaming laptop with a fast display.',
              price: 629000,
              brand: 'Lenovo',
              ratings: { average: 4.7, count: 18 },
              stock: 4,
              discountPercentage: 9
            }),
            createProduct({
              id: 'showcase-swipe-2',
              name: 'Sony WH-1000XM5',
              slug: 'sony-wh-1000xm5',
              shortDescription: 'Premium noise-cancelling headphones.',
              price: 129900,
              brand: 'Sony',
              ratings: { average: 4.9, count: 31 },
              stock: 5,
              discountPercentage: 0
            })
          ],
          isActive: true,
          updatedAt: '2026-04-04T06:50:00.000Z'
        }
      })
    });

    renderHome();

    const showcaseCard = await screen.findByRole('link', { name: 'Open Lenovo Legion 5' });

    fireEvent.touchStart(showcaseCard, { touches: [{ identifier: 1, clientX: 310, clientY: 180 }] });
    fireEvent.touchMove(showcaseCard, { touches: [{ identifier: 1, clientX: 190, clientY: 186 }] });
    fireEvent.touchEnd(showcaseCard, { changedTouches: [{ identifier: 1, clientX: 170, clientY: 188 }] });
    expect(await screen.findByRole('link', { name: 'Open Sony WH-1000XM5' })).toBeInTheDocument();
    fireEvent.click(showcaseCard);

    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it('does not render placeholder advertisement cards when no ad slots are configured', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-empty-slots',
          campaignLabel: 'Hero Only',
          title: 'Hero without ad slots',
          subtitle: 'The storefront should collapse empty advertisement places instead of showing placeholder copy.',
          isActive: true,
          updatedAt: '2026-04-05T08:30:00.000Z'
        }
      })
    });

    renderHome();

    expect(await screen.findByText('Hero without ad slots')).toBeInTheDocument();
    expect(screen.queryByText('Advertisement place 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Advertisement place 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Advertisement place 3')).not.toBeInTheDocument();
  });

  it('rotates through multiple media items inside an advertisement card', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      mocks.homeFeedMock.mockResolvedValue({
        data: createHomeFeed({
          banner: {
            id: 'banner-rotating-media',
            campaignLabel: 'Media Rotation',
            title: 'Hero with rotating ads',
            subtitle: 'Advertisement cards should rotate through multiple images and videos.',
            adSlots: [
              {
                slotKey: 'slot-1',
                eyebrow: 'Rotation',
                title: 'Advertisement place 1',
                description: 'Rotating ad card',
                mediaItems: [
                  {
                    kind: 'image',
                    url: 'https://cdn.example.com/rotation-1.jpg',
                    publicId: 'rotation-1',
                    alt: 'Rotation slide one'
                  },
                  {
                    kind: 'image',
                    url: 'https://cdn.example.com/rotation-2.jpg',
                    publicId: 'rotation-2',
                    alt: 'Rotation slide two'
                  }
                ],
                isActive: true
              }
            ],
            isActive: true,
            updatedAt: '2026-04-05T08:45:00.000Z'
          }
        })
      });

      renderHome();
      expect(await screen.findByAltText('Rotation slide one')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4500);
      });

      expect(screen.getByAltText('Rotation slide two')).toBeInTheDocument();
      expect(screen.getByAltText('Rotation slide two').closest('.promo-media-enter')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets mobile shoppers swipe advertisement media while keeping tap navigation intact', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        banner: {
          id: 'banner-swipe-media',
          campaignLabel: 'Media Swipe',
          title: 'Hero with swipeable ads',
          subtitle: 'Advertisement cards should support a horizontal media swipe on touch devices.',
          adSlots: [
            {
              slotKey: 'slot-swipe',
              eyebrow: 'Swipe',
              title: 'Swipe ad',
              description: 'Swipeable ad card',
              ctaUrl: '/shop?brand=sony',
              mediaItems: [
                {
                  kind: 'image',
                  url: 'https://cdn.example.com/swipe-1.jpg',
                  publicId: 'swipe-1',
                  alt: 'Swipe slide one'
                },
                {
                  kind: 'image',
                  url: 'https://cdn.example.com/swipe-2.jpg',
                  publicId: 'swipe-2',
                  alt: 'Swipe slide two'
                }
              ],
              isActive: true
            }
          ],
          isActive: true,
          updatedAt: '2026-04-05T08:50:00.000Z'
        }
      })
    });

    renderHome();

    expect(await screen.findByAltText('Swipe slide one')).toBeInTheDocument();
    const adLink = screen.getByText('Swipe ad').closest('a');
    expect(adLink).not.toBeNull();

    fireEvent.touchStart(adLink!, { touches: [{ identifier: 1, clientX: 300, clientY: 200 }] });
    fireEvent.touchMove(adLink!, { touches: [{ identifier: 1, clientX: 210, clientY: 204 }] });
    fireEvent.touchEnd(adLink!, { changedTouches: [{ identifier: 1, clientX: 188, clientY: 205 }] });

    expect(screen.getByAltText('Swipe slide two')).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(() => resolve(undefined), 340);
      });
    });

    fireEvent.click(adLink!);
    expect(screen.getByTestId('location-display')).toHaveTextContent('/shop?brand=sony');
  });

  it('loads home sections through the combined feed request', async () => {
    renderHome();

    await waitFor(() => {
      expect(mocks.homeFeedMock).toHaveBeenCalledTimes(1);
    });
  });

  it('renders horizontal brand carousel controls for live catalog brands', async () => {
    renderHome();

    expect(await screen.findByRole('button', { name: 'Scroll brands left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scroll brands right' })).toBeInTheDocument();
    expect((await screen.findAllByAltText('Apple logo')).length).toBeGreaterThan(0);
    expect(screen.getAllByAltText('Samsung logo').length).toBeGreaterThan(0);
  });

  it('renders left and right controls for the featured product carousel', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        featured: [
          createProduct({
            id: 'featured-1',
            name: 'Galaxy S24 Ultra',
            slug: 'galaxy-s24-ultra'
          }),
          createProduct({
            id: 'featured-2',
            name: 'iPad Air M2',
            slug: 'ipad-air-m2',
            shortDescription: 'Powerful tablet',
            price: 279000,
            comparePrice: 299000,
            brand: 'Apple',
            ratings: { average: 4.8, count: 64 },
            isBestSeller: false,
            isFlashDeal: false,
            stock: 6,
            discountPercentage: 7
          })
        ]
      })
    });

    renderHome();

    expect(await screen.findByRole('button', { name: 'Scroll featured products left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scroll featured products right' })).toBeInTheDocument();
  });

  it('reveals featured carousel controls on touch devices after carousel interaction', async () => {
    mockMatchMedia((query) => ['(hover: none)', '(pointer: coarse)', '(max-width: 767px)'].includes(query));

    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed({
        featured: [
          createProduct({
            id: 'featured-1',
            name: 'Galaxy S24 Ultra',
            slug: 'galaxy-s24-ultra'
          }),
          createProduct({
            id: 'featured-2',
            name: 'iPhone 15 Pro Max',
            slug: 'iphone-15-pro-max',
            shortDescription: 'Flagship iPhone',
            price: 529000,
            comparePrice: undefined,
            brand: 'Apple',
            ratings: { average: 4.8, count: 80 },
            isBestSeller: false,
            isFlashDeal: false,
            stock: 5,
            discountPercentage: 0
          })
        ]
      })
    });

    const { container } = renderHome();

    await screen.findAllByText('Galaxy S24 Ultra');

    expect(screen.queryByRole('button', { name: 'Scroll featured products left' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scroll featured products right' })).not.toBeInTheDocument();

    const featuredViewport = container.querySelector('.featured-carousel-viewport');
    expect(featuredViewport).not.toBeNull();

    fireEvent.pointerDown(featuredViewport as Element, {
      pointerType: 'touch',
      clientX: 180
    });

    expect(await screen.findByRole('button', { name: 'Scroll featured products left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scroll featured products right' })).toBeInTheDocument();
  });

  it('deduplicates recently viewed products before rendering the rail', async () => {
    mocks.homeFeedMock.mockResolvedValue({
      data: createHomeFeed()
    });
    mocks.getLocalRecentlyViewedMock.mockReturnValue([
      createRecentProduct(),
      createRecentProduct()
    ]);

    renderHome();

    expect(await screen.findByText('Pick up where you left off')).toBeInTheDocument();
    expect(screen.getAllByText('iPhone 17 Pro')).toHaveLength(1);
  });
});
