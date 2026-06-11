import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  hasPermissionsMock: vi.fn(),
  updateHomeHeroBannerMock: vi.fn(),
  uploadHomeBannerImageMock: vi.fn(),
  setQueryDataMock: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock,
  useQueryClient: mocks.useQueryClientMock
}));

vi.mock('../../hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    hasPermissions: mocks.hasPermissionsMock
  })
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    homeHeroBanner: vi.fn(),
    updateHomeHeroBanner: mocks.updateHomeHeroBannerMock,
    uploadHomeBannerImage: mocks.uploadHomeBannerImageMock,
    productSuggestions: vi.fn()
  }
}));

import { HomeBanner } from './HomeBanner';

const storedHeroSpotlightProduct = {
  id: 'hero-1',
  name: 'Galaxy S24 Ultra',
  slug: 'galaxy-s24-ultra',
  price: 449000,
  thumbnail: {
    url: 'https://cdn.example.com/galaxy-s24-ultra.jpg',
    publicId: 'products/galaxy-s24-ultra'
  }
};

const storedShowcaseProduct = {
  id: 'showcase-1',
  name: 'Xiaomi 14',
  slug: 'xiaomi-14',
  price: 249000,
  thumbnail: {
    url: 'https://cdn.example.com/xiaomi-14.jpg',
    publicId: 'products/xiaomi-14'
  }
};

const replacementHeroSpotlightProduct = {
  id: 'hero-2',
  name: 'JBL Charge 5',
  slug: 'jbl-charge-5',
  price: 57900,
  thumbnail: {
    url: 'https://cdn.example.com/jbl-charge-5.jpg',
    publicId: 'products/jbl-charge-5'
  }
};

const bannerQueryResponse = {
  data: {
    data: {
      id: 'home-hero',
      key: 'home-hero',
      campaignLabel: 'NJ Store',
      title: 'Electronics curated for premium everyday performance.',
      subtitle:
        'Flagship phones, productivity laptops, dependable printers, and refined accessories with quotation-first checkout.',
      ctaText: 'Shop Collection',
      ctaUrl: '/shop',
      adSlots: [],
      heroSpotlightProduct: storedHeroSpotlightProduct,
      showcaseProducts: [storedShowcaseProduct],
      showcaseFeatureGroups: [],
      isActive: true
    }
  },
  isPending: false
};

describe('Admin Home Banner page', () => {
  beforeEach(() => {
    mocks.useQueryMock.mockReset();
    mocks.useQueryClientMock.mockReset();
    mocks.hasPermissionsMock.mockReset();
    mocks.updateHomeHeroBannerMock.mockReset();
    mocks.uploadHomeBannerImageMock.mockReset();
    mocks.setQueryDataMock.mockReset();

    mocks.hasPermissionsMock.mockReturnValue(true);
    mocks.useQueryClientMock.mockReturnValue({
      setQueryData: mocks.setQueryDataMock
    });
    mocks.useQueryMock.mockImplementation((options: { queryKey?: unknown[] }) => {
      if (options.queryKey?.[1] === 'home-hero-banner') {
        return bannerQueryResponse;
      }

      if (options.queryKey?.[1] === 'banner-hero-spotlight-suggestions') {
        return {
          data: {
            data: options.queryKey?.[2] === 'JBL' ? [replacementHeroSpotlightProduct] : []
          },
          isPending: false
        };
      }

      return {
        data: { data: [] },
        isPending: false
      };
    });
    mocks.updateHomeHeroBannerMock.mockResolvedValue({
      data: {
        ...bannerQueryResponse.data.data,
        adSlots: [],
        updatedAt: '2026-04-05T09:00:00.000Z'
      }
    });
    mocks.uploadHomeBannerImageMock.mockResolvedValue({
      data: {
        url: 'https://cdn.example.com/uploaded-hero-background.png',
        publicId: 'banners/uploaded-hero-background',
        alt: 'Uploaded hero background'
      }
    });
  });

  it('saves the hero without activating untouched empty advertisement slots', async () => {
    const user = userEvent.setup();

    render(
      <>
        <HomeBanner />
        <Toaster position="top-right" />
      </>
    );

    await screen.findByDisplayValue('NJ Store');
    await user.click(screen.getByRole('button', { name: 'Save Hero' }));

    expect(mocks.updateHomeHeroBannerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        heroSpotlightProductId: 'hero-1',
        showcaseProductIds: ['showcase-1'],
        adSlots: [
          expect.objectContaining({ slotKey: 'slot-1', isActive: false, title: undefined }),
          expect.objectContaining({ slotKey: 'slot-2', isActive: false, title: undefined }),
          expect.objectContaining({ slotKey: 'slot-3', isActive: false, title: undefined })
        ]
      })
    );
    expect(await screen.findByText('Hero updated')).toBeInTheDocument();
  });

  it('saves multiple advertisement media items for a single slot', async () => {
    const user = userEvent.setup();

    render(
      <>
        <HomeBanner />
        <Toaster position="top-right" />
      </>
    );

    await screen.findByDisplayValue('NJ Store');
    await user.click(screen.getByRole('button', { name: /Place 1/i }));
    await user.type(screen.getByLabelText('Title'), 'Rotating ad slot');
    await user.type(screen.getByLabelText('Ad Click Path'), '/shop?featured=true');
    await user.click(screen.getByRole('button', { name: 'Add Image' }));
    await user.type(screen.getByLabelText('Media URL'), 'https://cdn.example.com/ad-1.jpg');
    await user.type(screen.getByLabelText('Media Public ID'), 'ads/ad-1');
    await user.click(screen.getByRole('button', { name: 'Add Video' }));
    await user.selectOptions(screen.getAllByLabelText('Media Type')[1], 'video');
    await user.type(screen.getAllByLabelText('Media URL')[1], 'https://cdn.example.com/ad-2.mp4');
    await user.type(screen.getAllByLabelText('Media Public ID')[1], 'ads/ad-2');
    await user.click(screen.getByRole('button', { name: 'Save Place 1' }));

    await waitFor(() => {
      expect(mocks.updateHomeHeroBannerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          adSlots: expect.arrayContaining([
            expect.objectContaining({
              slotKey: 'slot-1',
              title: 'Rotating ad slot',
              ctaUrl: '/shop?featured=true',
              mediaItems: [
                expect.objectContaining({ kind: 'image', url: 'https://cdn.example.com/ad-1.jpg', publicId: 'ads/ad-1' }),
                expect.objectContaining({ kind: 'video', url: 'https://cdn.example.com/ad-2.mp4', publicId: 'ads/ad-2' })
              ]
            })
          ])
        })
      );
    });
    expect(await screen.findByText('Advertisement place 1 updated')).toBeInTheDocument();
  }, 15000);

  it('previews and reorders advertisement media items before saving', async () => {
    const user = userEvent.setup();

    render(
      <>
        <HomeBanner />
        <Toaster position="top-right" />
      </>
    );

    await screen.findByDisplayValue('NJ Store');
    await user.click(screen.getByRole('button', { name: /Place 1/i }));
    await user.type(screen.getByLabelText('Title'), 'Reorderable ad slot');
    await user.click(screen.getByRole('button', { name: 'Add Image' }));
    await user.type(screen.getByLabelText('Media URL'), 'https://cdn.example.com/ad-1.jpg');
    await user.type(screen.getByLabelText('Media Public ID'), 'ads/ad-1');
    expect(screen.getByText('ads/ad-1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Image' }));
    await user.type(screen.getAllByLabelText('Media URL')[1], 'https://cdn.example.com/ad-2.jpg');
    await user.type(screen.getAllByLabelText('Media Public ID')[1], 'ads/ad-2');
    await user.click(screen.getByRole('button', { name: 'Move media 2 up' }));
    await user.click(screen.getByRole('button', { name: 'Save Place 1' }));

    await waitFor(() => {
      expect(mocks.updateHomeHeroBannerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          adSlots: expect.arrayContaining([
            expect.objectContaining({
              slotKey: 'slot-1',
              mediaItems: [
                expect.objectContaining({ url: 'https://cdn.example.com/ad-2.jpg', publicId: 'ads/ad-2' }),
                expect.objectContaining({ url: 'https://cdn.example.com/ad-1.jpg', publicId: 'ads/ad-1' })
              ]
            })
          ])
        })
      );
    });
  }, 15000);

  it('uploads a hero background image directly into the hero form', async () => {
    const user = userEvent.setup();

    render(
      <>
        <HomeBanner />
        <Toaster position="top-right" />
      </>
    );

    await screen.findByDisplayValue('NJ Store');
    const file = new File(['hero'], 'hero-background.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Upload Background'), file);
    await screen.findByText('Hero background uploaded');
    await user.click(screen.getByRole('button', { name: 'Save Hero' }));

    expect(mocks.uploadHomeBannerImageMock).toHaveBeenCalledWith(file, undefined);
    expect(mocks.updateHomeHeroBannerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundImage: {
          url: 'https://cdn.example.com/uploaded-hero-background.png',
          publicId: 'banners/uploaded-hero-background',
          alt: 'Uploaded hero background'
        }
      })
    );
  });

  it('saves the mid-page promo section with image/video media and CTA links', async () => {
    const user = userEvent.setup();

    render(
      <>
        <HomeBanner />
        <Toaster position="top-right" />
      </>
    );

    await screen.findByDisplayValue('NJ Store');
    await user.click(screen.getByRole('button', { name: /Mid Promo/i }));
    await user.type(screen.getByLabelText('Eyebrow'), '2025 AI TVs');
    await user.type(screen.getByLabelText('Title'), 'Explore new AI TVs');
    await user.type(screen.getByLabelText('Description'), 'Run a wide promo block between New Arrivals and Brands.');
    await user.type(screen.getByLabelText('Primary CTA Text'), 'Learn more');
    await user.type(screen.getByLabelText('Primary CTA Path'), '/shop?category=tvs');
    await user.type(screen.getByLabelText('Secondary CTA Text'), 'View all');
    await user.type(screen.getByLabelText('Secondary CTA Path'), '/shop?brand=samsung');
    await user.click(screen.getByRole('button', { name: 'Add Image' }));
    await user.type(screen.getByLabelText('Media URL'), 'https://cdn.example.com/ai-tv-promo.png');
    await user.type(screen.getByLabelText('Media Public ID'), 'promo/ai-tvs');
    await user.click(screen.getByRole('button', { name: 'Save Mid Promo' }));

    expect(mocks.updateHomeHeroBannerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        featurePromo: {
          eyebrow: '2025 AI TVs',
          title: 'Explore new AI TVs',
          description: 'Run a wide promo block between New Arrivals and Brands.',
          ctaText: 'Learn more',
          ctaUrl: '/shop?category=tvs',
          secondaryCtaText: 'View all',
          secondaryCtaUrl: '/shop?brand=samsung',
          mediaItems: [
            expect.objectContaining({
              kind: 'image',
              url: 'https://cdn.example.com/ai-tv-promo.png',
              publicId: 'promo/ai-tvs'
            })
          ],
          isActive: false
        }
      })
    );
    expect(await screen.findByText('Mid-page promo updated')).toBeInTheDocument();
  }, 15000);

  it('saves a hero spotlight product separately from the curated showcase', async () => {
    const user = userEvent.setup();

    render(
      <>
        <HomeBanner />
        <Toaster position="top-right" />
      </>
    );

    await screen.findByDisplayValue('NJ Store');
    await user.click(screen.getByRole('button', { name: /Hero Spotlight/i }));
    await user.type(screen.getByLabelText('Find Product'), 'JBL');
    await screen.findByText('JBL Charge 5');
    await user.click(screen.getByRole('button', { name: 'Replace Spotlight' }));
    await user.click(screen.getByRole('button', { name: 'Save Hero Spotlight' }));

    expect(mocks.updateHomeHeroBannerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        heroSpotlightProductId: 'hero-2',
        showcaseProductIds: ['showcase-1']
      })
    );
    expect(await screen.findAllByText('Hero spotlight updated')).not.toHaveLength(0);
  });

  it('saves hero spotlight corner images from the hero spotlight editor', async () => {
    const user = userEvent.setup();

    render(
      <>
        <HomeBanner />
        <Toaster position="top-right" />
      </>
    );

    await screen.findByDisplayValue('NJ Store');
    await user.click(screen.getByRole('button', { name: /Hero Spotlight/i }));
    await user.type(screen.getByLabelText('Top Right Image URL'), 'https://cdn.example.com/warranty-badge.png');
    await user.type(screen.getByLabelText('Top Right Image Public ID'), 'banners/warranty-badge');
    await user.type(screen.getByLabelText('Top Right Image Alt Text'), 'Official warranty badge');
    await user.clear(screen.getByLabelText('Top Right Image Size (px)'));
    await user.type(screen.getByLabelText('Top Right Image Size (px)'), '132');
    await user.type(screen.getByLabelText('Bottom Left Image URL'), 'https://cdn.example.com/delivery-badge.png');
    await user.type(screen.getByLabelText('Bottom Left Image Public ID'), 'banners/delivery-badge');
    await user.type(screen.getByLabelText('Bottom Left Image Alt Text'), 'Fast delivery badge');
    await user.clear(screen.getByLabelText('Bottom Left Image Size (px)'));
    await user.type(screen.getByLabelText('Bottom Left Image Size (px)'), '92');
    await user.click(screen.getByLabelText('Bottom Left Image visibility'));
    await user.type(screen.getByLabelText('Bottom Right Image URL'), 'https://cdn.example.com/trade-in-badge.png');
    await user.type(screen.getByLabelText('Bottom Right Image Public ID'), 'banners/trade-in-badge');
    await user.type(screen.getByLabelText('Bottom Right Image Alt Text'), 'Trade-in bonus badge');
    await user.clear(screen.getByLabelText('Bottom Right Image Size (px)'));
    await user.type(screen.getByLabelText('Bottom Right Image Size (px)'), '118');
    await user.click(screen.getByRole('button', { name: 'Save Hero Spotlight' }));

    expect(mocks.updateHomeHeroBannerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        heroSpotlightProductId: 'hero-1',
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
        heroBottomRightImageSize: 118
      })
    );
    expect(await screen.findAllByText('Hero spotlight updated')).not.toHaveLength(0);
  }, 15_000);

  it('saves curated showcase feature rows for the selected product', async () => {
    const user = userEvent.setup();

    render(
      <>
        <HomeBanner />
        <Toaster position="top-right" />
      </>
    );

    await screen.findByDisplayValue('NJ Store');
    await user.click(screen.getByRole('button', { name: /Showcase/i }));
    await user.click(screen.getByRole('button', { name: 'Add Feature' }));
    await user.type(screen.getByLabelText('Feature Label'), 'Camera');
    await user.type(screen.getByLabelText('Feature Value'), '50MP main');
    await user.click(screen.getByRole('button', { name: 'Save Showcase' }));

    expect(mocks.updateHomeHeroBannerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showcaseProductIds: ['showcase-1'],
        showcaseFeatureGroups: [
          {
            productId: 'showcase-1',
            items: [{ icon: 'camera', label: 'Camera', value: '50MP main' }]
          }
        ]
      })
    );
    expect(await screen.findByText('Curated showcase updated')).toBeInTheDocument();
  });
});
