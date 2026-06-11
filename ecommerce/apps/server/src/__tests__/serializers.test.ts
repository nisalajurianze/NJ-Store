import { describe, expect, it } from 'vitest';
import { serializeBanner, serializeBrand, serializeProductCard, serializeProductDetail, serializeSiteConfig, serializeSuggestion, serializeUser } from '../utils/serializers.js';
import { adminPermissions, staffDefaultPermissions } from '@njstore/types';

describe('serializeBrand', () => {
  it('normalizes Cloudinary logo URLs for brand rail display', () => {
    const serialized = serializeBrand({
      _id: 'brand-1',
      name: 'Samsung',
      slug: 'samsung',
      logo: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/brands/samsung.png',
        publicId: 'njstore/brands/samsung',
        alt: 'Samsung logo'
      },
      isActive: true,
      sortOrder: 2,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z')
    });

    expect(serialized?.logoUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,e_trim,c_limit,w_480,h_192/v1710000000/njstore/brands/samsung.png'
    );
  });

  it('replaces the generic Cloudinary image transform with the brand logo transform', () => {
    const serialized = serializeBrand({
      _id: 'brand-2',
      name: 'Anker',
      slug: 'anker',
      logo: {
        url: 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800/v1710000000/njstore/brands/anker.png',
        publicId: 'njstore/brands/anker',
        alt: 'Anker logo'
      },
      isActive: true,
      sortOrder: 3,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z')
    });

    expect(serialized?.logoUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,e_trim,c_limit,w_480,h_192/v1710000000/njstore/brands/anker.png'
    );
  });

  it('leaves non-Cloudinary logo URLs untouched', () => {
    const serialized = serializeBrand({
      _id: 'brand-3',
      name: 'Local Brand',
      slug: 'local-brand',
      logo: {
        url: 'http://localhost:5000/uploads/brands/local-brand.png',
        publicId: 'local:brands/local-brand.png',
        alt: 'Local Brand logo'
      },
      isActive: true,
      sortOrder: 4,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z')
    });

    expect(serialized?.logoUrl).toBe('http://localhost:5000/uploads/brands/local-brand.png');
  });

  it('returns undefined instead of crashing when a brand reference is not populated', () => {
    const serialized = serializeBrand({ _id: 'brand-object-id-only' } as any);

    expect(serialized).toBeUndefined();
  });
});

describe('serializeProductCard', () => {
  it('falls back to brandName when the brand reference is not populated', () => {
    const serialized = serializeProductCard({
      _id: 'product-1',
      name: 'HP LaserJet Pro M15a',
      slug: 'hp-laserjet-pro-m15a',
      shortDescription: 'Compact mono laser printer.',
      price: 67000,
      brand: { _id: 'brand-object-id-only' } as any,
      brandName: 'HP',
      ratings: { average: 4.6, count: 12 },
      isBestSeller: false,
      isFeatured: true,
      isActive: true,
      variants: [{ stock: 7 }]
    } as any);

    expect(serialized.brand).toBe('HP');
    expect(serialized.brandId).toBeNull();
    expect(serialized.brandSlug).toBeNull();
  });

  it('includes a compact transformed brand logo when the brand reference is populated', () => {
    const serialized = serializeProductCard({
      _id: 'product-brand-logo-1',
      name: 'AirPods Pro 2',
      slug: 'airpods-pro-2',
      shortDescription: 'Wireless earbuds.',
      price: 108900,
      brand: {
        _id: 'brand-apple',
        name: 'Apple',
        slug: 'apple',
        logo: {
          url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/brands/apple.png',
          publicId: 'njstore/brands/apple',
          alt: 'Apple logo'
        },
        isActive: true,
        sortOrder: 1,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z')
      },
      ratings: { average: 4.6, count: 12 },
      isBestSeller: false,
      isFeatured: true,
      isActive: true,
      variants: [{ stock: 7 }]
    } as any);

    expect(serialized.brand).toBe('Apple');
    expect(serialized.brandId).toBe('brand-apple');
    expect(serialized.brandSlug).toBe('apple');
    expect(serialized.brandLogoUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,e_trim,c_limit,w_192,h_96/v1710000000/njstore/brands/apple.png'
    );
  });

  it('normalizes Cloudinary product images for trimmed contain-fit display', () => {
    const serialized = serializeProductCard({
      _id: 'product-2',
      name: 'iPhone 17 Pro',
      slug: 'iphone-17-pro',
      shortDescription: 'Flagship smartphone.',
      price: 356000,
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/products/iphone-17-pro.png',
          publicId: 'njstore/products/iphone-17-pro',
          alt: 'iPhone 17 Pro'
        }
      ],
      brandName: 'Apple',
      ratings: { average: 0, count: 0 },
      isBestSeller: false,
      isFeatured: true,
      isActive: true,
      variants: [{ stock: 10 }]
    } as any);

    expect(serialized.thumbnail?.url).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,e_trim,c_fit,w_320,h_320/v1710000000/njstore/products/iphone-17-pro.png'
    );
    expect(serialized.previewImages?.[0]?.url).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,e_trim,c_fit,w_720,h_720/v1710000000/njstore/products/iphone-17-pro.png'
    );
  });

  it('replaces generic product image transforms with the trimmed product transform', () => {
    const serialized = serializeProductCard({
      _id: 'product-3',
      name: 'iPhone 17 Pro',
      slug: 'iphone-17-pro',
      shortDescription: 'Flagship smartphone.',
      price: 356000,
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800/v1710000000/njstore/products/iphone-17-pro.png',
          publicId: 'njstore/products/iphone-17-pro',
          alt: 'iPhone 17 Pro'
        }
      ],
      brandName: 'Apple',
      ratings: { average: 0, count: 0 },
      isBestSeller: false,
      isFeatured: true,
      isActive: true,
      variants: [{ stock: 10 }]
    } as any);

    expect(serialized.thumbnail?.url).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,e_trim,c_fit,w_320,h_320/v1710000000/njstore/products/iphone-17-pro.png'
    );
  });

  it('uses variant media as the search suggestion thumbnail when product media is missing', () => {
    const serialized = serializeSuggestion({
      _id: 'product-suggestion-1',
      name: 'iPhone 17 Pro',
      slug: 'iphone-17-pro',
      price: 351600,
      images: [],
      variants: [
        {
          color: 'Orange',
          colorCode: '#f97316',
          stock: 6,
          images: [
            {
              url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/products/iphone-17-pro-orange.png',
              publicId: 'njstore/products/iphone-17-pro-orange',
              alt: 'iPhone 17 Pro orange'
            }
          ]
        }
      ]
    });

    expect(serialized.thumbnail?.url).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,e_trim,c_fit,w_320,h_320/v1710000000/njstore/products/iphone-17-pro-orange.png'
    );
    expect(serialized.colorVariants).toEqual([{ name: 'Orange', colorCode: '#f97316' }]);
  });

  it('includes deduped color variants for card swatches', () => {
    const serialized = serializeProductCard({
      _id: 'product-4',
      name: 'iPhone 17 Pro',
      slug: 'iphone-17-pro',
      shortDescription: 'Flagship smartphone.',
      price: 356000,
      brandName: 'Apple',
      ratings: { average: 0, count: 0 },
      isBestSeller: false,
      isFeatured: true,
      isActive: true,
      variants: [
        { color: 'Orange', colorCode: '#f97316', stock: 5 },
        { color: 'Orange', colorCode: '#f97316', stock: 3 },
        { color: 'Black', colorCode: '#000000', stock: 4 }
      ]
    } as any);

    expect(serialized.colorVariants).toEqual([
      { name: 'Orange', colorCode: '#f97316' },
      { name: 'Black', colorCode: '#000000' }
    ]);
  });
});

describe('serializeProductDetail', () => {
  it('preserves premium variant media fields while transforming Cloudinary images', () => {
    const serialized = serializeProductDetail({
      _id: 'product-detail-1',
      name: 'iPhone 17 Pro',
      slug: 'iphone-17-pro',
      shortDescription: 'Flagship smartphone.',
      description: 'Flagship smartphone.',
      price: 356000,
      images: [],
      brandName: 'Apple',
      ratings: { average: 0, count: 0 },
      isBestSeller: false,
      isFeatured: true,
      isActive: true,
      variants: [
        {
          color: 'Blue',
          colorCode: '#2563eb',
          storage: '256GB',
          glowColor: '#2563eb',
          images: [
            {
              url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/products/iphone-17-pro-blue.png',
              publicId: 'njstore/products/iphone-17-pro-blue',
              alt: 'iPhone 17 Pro in blue'
            }
          ],
          stock: 6,
          sku: 'IPH17P-BLU-256'
        }
      ],
      specifications: [],
      tags: [],
      loyaltyPoints: 0,
      sku: 'IPH17P'
    } as any);

    expect(serialized.variants[0]?.glowColor).toBe('#2563eb');
    expect(serialized.variants[0]?.images?.[0]?.url).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,e_trim,c_fit,w_1400,h_1400/v1710000000/njstore/products/iphone-17-pro-blue.png'
    );
  });
});

describe('serializeUser', () => {
  it('treats empty admin permissions as inherited full admin access', () => {
    const serialized = serializeUser({
      _id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      language: 'en',
      isEmailVerified: true,
      loyaltyPoints: 0,
      permissions: []
    });

    expect(serialized.permissions).toEqual([...adminPermissions]);
  });

  it('treats empty staff permissions as inherited staff access', () => {
    const serialized = serializeUser({
      _id: 'staff-1',
      name: 'Staff User',
      email: 'staff@example.com',
      role: 'staff',
      language: 'en',
      isEmailVerified: true,
      loyaltyPoints: 0,
      permissions: []
    });

    expect(serialized.permissions).toEqual([...staffDefaultPermissions]);
  });
});

describe('serializeBanner', () => {
  it('serializes the mid-page promo media while preserving video URLs and transforming images', () => {
    const serialized = serializeBanner({
      key: 'home-hero',
      campaignLabel: 'NJ Store',
      title: 'Home hero',
      subtitle: 'Banner subtitle',
      ctaText: 'Shop',
      ctaUrl: '/shop',
      adSlots: [],
      featurePromo: {
        eyebrow: '2025 AI TVs',
        title: 'Explore new AI TVs',
        description: 'Feature promo block',
        mediaItems: [
          {
            kind: 'image',
            url: 'https://res.cloudinary.com/njstore/image/upload/v1710000000/njstore/banners/ai-tv-promo.png',
            publicId: 'njstore/banners/ai-tv-promo',
            alt: 'AI TV campaign'
          },
          {
            kind: 'video',
            url: 'https://cdn.example.com/promo/ai-tv-video.mp4',
            publicId: 'promo/ai-tv-video'
          }
        ],
        isActive: true
      },
      showcaseProducts: [],
      isActive: true
    } as any);

    expect(serialized.featurePromo?.mediaItems?.[0]?.url).toBe(
      'https://res.cloudinary.com/njstore/image/upload/f_auto,q_auto,w_800/v1710000000/njstore/banners/ai-tv-promo.png'
    );
    expect(serialized.featurePromo?.mediaItems?.[1]?.url).toBe('https://cdn.example.com/promo/ai-tv-video.mp4');
    expect(serialized.featurePromo?.title).toBe('Explore new AI TVs');
  });

  it('omits seeded Cloudinary demo banner assets that are unavailable in production', () => {
    const serialized = serializeBanner({
      key: 'home-hero',
      campaignLabel: 'NJ Store',
      title: 'Home hero',
      subtitle: 'Banner subtitle',
      ctaText: 'Shop',
      ctaUrl: '/shop',
      backgroundImage: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/banners/home-hero-april.jpg',
        publicId: 'njstore/banners/home-hero-april'
      },
      featurePromo: {
        title: 'Seeded promo',
        mediaItems: [
          {
            kind: 'image',
            url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/banners/seeded-promo.jpg',
            publicId: 'njstore/banners/seeded-promo'
          }
        ],
        isActive: true
      },
      showcaseProducts: [],
      isActive: true
    } as any);

    expect(serialized.backgroundImage).toBeUndefined();
    expect(serialized.featurePromo?.mediaItems).toEqual([]);
  });
});

describe('serializeSiteConfig', () => {
  it('normalizes storefront logo URLs for crisp header rendering', () => {
    const serialized = serializeSiteConfig({
      _id: 'site-config-1',
      storeName: 'NJ Store',
      storeLogo: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/site-config/store-logo.png',
        publicId: 'njstore/site-config/store-logo',
        alt: 'NJ Store logo'
      },
      storeLogoDark: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/site-config/store-logo-dark.png',
        publicId: 'njstore/site-config/store-logo-dark',
        alt: 'NJ Store dark logo'
      },
      storeLogoLight: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/site-config/store-logo-light.png',
        publicId: 'njstore/site-config/store-logo-light',
        alt: 'NJ Store light logo'
      },
      freeShippingThreshold: 15000,
      lowStockThreshold: 5,
      shippingRates: [],
      loyaltyPointsRate: 100,
      cancellationWindowHours: 2,
      quotationExpiryDays: 7
    } as any);

    expect(serialized.storeLogo?.url).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,e_trim,c_limit,w_560,h_180/v1710000000/njstore/site-config/store-logo.png'
    );
    expect(serialized.storeLogo?.srcSet).toContain('w_220,h_180');
    expect(serialized.storeLogo?.sizes).toBe('(min-width: 1024px) 11.5rem, (min-width: 640px) 10.5rem, 9rem');
    expect(serialized.storeLogoDark?.url).toContain('store-logo-dark.png');
    expect(serialized.storeLogoLight?.url).toContain('store-logo-light.png');
    expect(serialized.footer?.companyName).toBe('NJ Store');
    expect(serialized.footer?.quickLinks).toHaveLength(4);
  });
});
