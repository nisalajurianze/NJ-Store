import type { ProductDetailDto } from '@njstore/types';

export const DEFAULT_SITE_NAME = 'NJ Store';
export const DEFAULT_SITE_URL = 'https://njstore.lk';
export const DEFAULT_THEME_COLOR = '#0A1F44';
export const DEFAULT_DESCRIPTION =
  'NJ Store offers premium electronics shopping, quotation review, and secure order tracking across Sri Lanka.';
export const DEFAULT_OG_IMAGE_PATH = '/og-default.png';
export const DEFAULT_KEYWORDS = [
  'NJ Store',
  'electronics store Sri Lanka',
  'online electronics shopping',
  'premium electronics',
  'quotation checkout',
  'secure order tracking'
];

export interface ResolvedRouteSeoMetadata {
  title: string;
  description: string;
  keywords: string[];
  robots?: string;
  canonicalPath?: string;
}

const normalizeAbsoluteUrl = (value: string): string => value.replace(/\/+$/, '');

export const resolveSiteUrl = (value?: string, currentLocationHref?: string): string => {
  if (value?.trim()) {
    try {
      return normalizeAbsoluteUrl(new URL(value).toString());
    } catch {
      // Fall back to the runtime origin or the production default below.
    }
  }

  const runtimeHref = currentLocationHref ?? (typeof window !== 'undefined' ? window.location.href : undefined);
  if (runtimeHref) {
    try {
      return normalizeAbsoluteUrl(new URL(runtimeHref).origin);
    } catch {
      // Fall back to the production default below.
    }
  }

  return DEFAULT_SITE_URL;
};

export const resolveAbsoluteUrl = (value: string | undefined, siteUrl: string): string | undefined => {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    return new URL(value, `${siteUrl}/`).toString();
  } catch {
    return undefined;
  }
};

export const buildCanonicalUrl = (pathOrUrl: string | undefined, siteUrl: string): string | undefined => {
  if (!pathOrUrl?.trim()) {
    return undefined;
  }

  return resolveAbsoluteUrl(pathOrUrl, siteUrl);
};

export const buildKeywordList = (...groups: Array<Array<string | undefined> | string | undefined>): string[] => {
  const seen = new Set<string>();
  const keywords: string[] = [];

  groups
    .flatMap((group) => (Array.isArray(group) ? group : [group]))
    .map((keyword) => keyword?.trim())
    .filter((keyword): keyword is string => Boolean(keyword))
    .forEach((keyword) => {
      const normalized = keyword.toLowerCase();
      if (seen.has(normalized)) {
        return;
      }

      seen.add(normalized);
      keywords.push(keyword);
    });

  return keywords;
};

const buildTitle = (sectionTitle: string, storeName: string): string => `${sectionTitle} | ${storeName}`;

const ROUTE_METADATA_RULES: Array<{
  matches: (pathname: string) => boolean;
  meta: (storeName: string, pathname: string) => ResolvedRouteSeoMetadata;
}> = [
  {
    matches: (pathname) => pathname === '/',
    meta: (storeName) => ({
      title: buildTitle('Premium Electronics in Sri Lanka', storeName),
      description:
        'Shop premium phones, laptops, accessories, and business-ready electronics with quotation-first checkout and secure order tracking.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['Sri Lanka electronics', 'phones', 'laptops', 'quotations', 'official warranty']),
      canonicalPath: '/'
    })
  },
  {
    matches: (pathname) => pathname === '/about',
    meta: (storeName) => ({
      title: buildTitle('About', storeName),
      description: 'Learn how NJ Store combines premium electronics curation, quotation-first checkout, and responsive customer support.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['about NJ Store', 'Sri Lanka electronics retailer']),
      canonicalPath: '/about'
    })
  },
  {
    matches: (pathname) => pathname === '/contact',
    meta: (storeName) => ({
      title: buildTitle('Contact', storeName),
      description: 'Contact NJ Store for product guidance, quotation support, delivery clarifications, and post-purchase help.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['contact NJ Store', 'quotation support', 'customer support']),
      canonicalPath: '/contact'
    })
  },
  {
    matches: (pathname) => pathname === '/faq',
    meta: (storeName) => ({
      title: buildTitle('Frequently Asked Questions', storeName),
      description: 'Find answers about quotations, payments, delivery, returns, and account management on NJ Store.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['NJ Store FAQ', 'delivery questions', 'quotation help']),
      canonicalPath: '/faq'
    })
  },
  {
    matches: (pathname) => pathname === '/privacy',
    meta: (storeName) => ({
      title: buildTitle('Privacy Policy', storeName),
      description: 'Review how NJ Store collects, stores, and uses customer information for orders, support, and analytics.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['privacy policy', 'customer data', 'store privacy']),
      canonicalPath: '/privacy'
    })
  },
  {
    matches: (pathname) => pathname === '/terms',
    meta: (storeName) => ({
      title: buildTitle('Terms and Conditions', storeName),
      description: 'Read the shopping, quotation, delivery, and account terms that apply when using NJ Store.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['terms and conditions', 'shopping terms', 'quotation terms']),
      canonicalPath: '/terms'
    })
  },
  {
    matches: (pathname) => pathname === '/returns',
    meta: (storeName) => ({
      title: buildTitle('Returns and Refunds', storeName),
      description: 'Understand NJ Store return eligibility, damaged-item handling, and refund expectations before you order.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['returns policy', 'refund policy', 'warranty support']),
      canonicalPath: '/returns'
    })
  },
  {
    matches: (pathname) => pathname === '/compare',
    meta: (storeName) => ({
      title: buildTitle('Compare Products', storeName),
      description: 'Compare product specifications and shortlist the right NJ Store electronics before creating a quotation.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['product comparison', 'spec comparison']),
      robots: 'noindex,nofollow',
      canonicalPath: '/compare'
    })
  },
  {
    matches: (pathname) => pathname === '/cart',
    meta: (storeName) => ({
      title: buildTitle('Cart', storeName),
      description: 'Review cart totals, save products for later, and prepare your quotation before checkout.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['shopping cart', 'quotation prep']),
      robots: 'noindex,nofollow',
      canonicalPath: '/cart'
    })
  },
  {
    matches: (pathname) => pathname === '/checkout',
    meta: (storeName) => ({
      title: buildTitle('Checkout', storeName),
      description: 'Finalize fulfilment preferences and create your NJ Store quotation securely.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['checkout', 'quotation checkout']),
      robots: 'noindex,nofollow',
      canonicalPath: '/checkout'
    })
  },
  {
    matches: (pathname) => pathname === '/quotation/confirm',
    meta: (storeName) => ({
      title: buildTitle('Quotation Confirmation', storeName),
      description: 'Confirm your NJ Store quotation details and review the next steps for order processing.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['quotation confirmation']),
      robots: 'noindex,nofollow',
      canonicalPath: '/quotation/confirm'
    })
  },
  {
    matches: (pathname) => pathname.startsWith('/auth/'),
    meta: (storeName, pathname) => ({
      title: buildTitle(pathnameToAuthTitle(pathname), storeName),
      description: 'Access your NJ Store account, verify your email, or recover your password securely.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['account access', 'sign in', 'register']),
      robots: 'noindex,nofollow',
      canonicalPath: pathname
    })
  },
  {
    matches: (pathname) => pathname.startsWith('/dashboard'),
    meta: (storeName, pathname) => ({
      title: buildTitle('Customer Dashboard', storeName),
      description: 'Manage orders, addresses, profile details, loyalty activity, and saved products from your NJ Store dashboard.',
      keywords: buildKeywordList(DEFAULT_KEYWORDS, ['customer dashboard', 'order management']),
      robots: 'noindex,nofollow',
      canonicalPath: pathname
    })
  }
];

function pathnameToAuthTitle(pathname: string): string {
  if (pathname === '/auth/login') {
    return 'Sign In';
  }

  if (pathname === '/auth/register') {
    return 'Create Account';
  }

  if (pathname === '/auth/forgot-password') {
    return 'Forgot Password';
  }

  if (pathname === '/auth/reset-password') {
    return 'Reset Password';
  }

  if (pathname === '/auth/verify-email') {
    return 'Verify Email';
  }

  return 'Account Access';
}

export const getRouteSeoMetadata = (pathname: string, storeName = DEFAULT_SITE_NAME): ResolvedRouteSeoMetadata | null => {
  const rule = ROUTE_METADATA_RULES.find((candidate) => candidate.matches(pathname));
  return rule ? rule.meta(storeName, pathname) : null;
};

export const buildProductSeoKeywords = (product: ProductDetailDto): string[] =>
  buildKeywordList(
    DEFAULT_KEYWORDS,
    [
      product.name,
      product.brand,
      product.category?.name,
      product.sku,
      product.brand && product.category?.name ? `${product.brand} ${product.category.name}` : undefined
    ],
    product.tags
  );

export const buildProductStructuredData = ({
  product,
  siteUrl,
  canonicalUrl,
  storeName = DEFAULT_SITE_NAME,
  price,
  stock,
  sku
}: {
  product: ProductDetailDto;
  siteUrl: string;
  canonicalUrl: string;
  storeName?: string;
  price?: number;
  stock?: number;
  sku?: string;
}): Array<Record<string, unknown>> => {
  const resolvedPrice = typeof price === 'number' && Number.isFinite(price) ? price : product.price;
  const resolvedStock = typeof stock === 'number' && Number.isFinite(stock) ? stock : product.stock;
  const resolvedSku = sku?.trim() || product.sku;
  const imageUrls = Array.from(
    new Set(
      [product.thumbnail?.url, ...(product.previewImages?.map((image) => image.url) ?? []), ...product.images.map((image) => image.url)]
        .map((url) => resolveAbsoluteUrl(url, siteUrl))
        .filter((url): url is string => Boolean(url))
    )
  );

  const productEntity: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.metaDescription?.trim() || product.shortDescription.trim() || product.description.trim(),
    sku: resolvedSku,
    mpn: resolvedSku,
    image: imageUrls,
    category: product.category?.name,
    brand: {
      '@type': 'Brand',
      name: product.brand
    },
    url: canonicalUrl,
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'LKR',
      price: Number(resolvedPrice.toFixed(2)),
      availability: resolvedStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: storeName
      }
    }
  };

  if (product.ratings.count > 0 && product.ratings.average > 0) {
    productEntity.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.ratings.average.toFixed(1)),
      reviewCount: product.ratings.count
    };
  }

  if (product.specifications.length) {
    productEntity.additionalProperty = product.specifications.slice(0, 8).map((specification) => ({
      '@type': 'PropertyValue',
      name: specification.key,
      value: specification.value
    }));
  }

  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: buildCanonicalUrl('/', siteUrl)
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Shop',
      item: buildCanonicalUrl('/shop', siteUrl)
    },
    product.category
      ? {
          '@type': 'ListItem',
          position: 3,
          name: product.category.name,
          item: buildCanonicalUrl(`/shop?category=${encodeURIComponent(product.category.id)}`, siteUrl)
        }
      : null,
    {
      '@type': 'ListItem',
      position: product.category ? 4 : 3,
      name: product.name,
      item: canonicalUrl
    }
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return [
    productEntity,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems
    }
  ];
};
