import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const distDirectory = path.join(workspaceRoot, 'dist');
const env = loadEnv(process.env.NODE_ENV || 'production', workspaceRoot, '');

const DEFAULT_SITE_URL = 'https://njstore.lk';
// Keep this aligned with the backend query validator max to avoid sitemap build-time 400s.
const PRODUCT_PAGE_SIZE = 50;

const normalizeAbsoluteUrl = (value) => value.replace(/\/+$/, '');

const resolveSiteUrl = (value) => {
  try {
    return normalizeAbsoluteUrl(new URL(value || DEFAULT_SITE_URL).toString());
  } catch {
    return DEFAULT_SITE_URL;
  }
};

const resolveApiBaseUrl = () => {
  const explicitSitemapUrl = env.SITEMAP_API_URL?.trim();
  if (explicitSitemapUrl) {
    return normalizeAbsoluteUrl(new URL(explicitSitemapUrl, `${siteUrl}/`).toString());
  }

  const viteApiUrl = env.VITE_API_URL?.trim();
  if (viteApiUrl && /^https?:\/\//i.test(viteApiUrl)) {
    return normalizeAbsoluteUrl(viteApiUrl);
  }

  return null;
};

const siteUrl = resolveSiteUrl(env.VITE_SITE_URL);
const apiBaseUrl = resolveApiBaseUrl();
const requireDynamicSitemap = env.SITEMAP_API_URL_REQUIRED === 'true' || process.env.VERCEL_ENV === 'production';

const staticEntries = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/shop', priority: '0.9', changefreq: 'daily' },
  { path: '/about', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/faq', priority: '0.6', changefreq: 'weekly' },
  { path: '/privacy', priority: '0.4', changefreq: 'yearly' },
  { path: '/terms', priority: '0.4', changefreq: 'yearly' },
  { path: '/returns', priority: '0.5', changefreq: 'monthly' }
];

const resolveApiPayloadItems = (payload) => {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  return [];
};

const resolveApiPayloadPagination = (payload) => payload?.pagination ?? payload?.data?.pagination ?? null;

const withTimeout = async (resource, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const fetchJson = async (resource) => {
  const response = await withTimeout(resource, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Unexpected ${response.status} for ${resource}`);
  }

  return response.json();
};

const flattenCategories = (items) =>
  items.flatMap((item) => [
    item,
    ...(Array.isArray(item.children) ? flattenCategories(item.children) : [])
  ]);

const fetchCategoryEntries = async () => {
  if (!apiBaseUrl) {
    return [];
  }

  const payload = await fetchJson(`${apiBaseUrl}/categories`);
  const categories = flattenCategories(resolveApiPayloadItems(payload));

  return categories
    .filter((category) => category?.id)
    .map((category) => ({
      path: `/shop?category=${encodeURIComponent(category.id)}`,
      priority: '0.8',
      changefreq: 'daily'
    }));
};

const fetchProductEntries = async () => {
  if (!apiBaseUrl) {
    return [];
  }

  const products = [];
  let page = 1;
  let totalPages = 1;

  do {
    const pageUrl = new URL(`${apiBaseUrl}/products`);
    pageUrl.searchParams.set('page', String(page));
    pageUrl.searchParams.set('limit', String(PRODUCT_PAGE_SIZE));
    pageUrl.searchParams.set('sort', '-createdAt');

    const payload = await fetchJson(pageUrl.toString());
    const pageItems = resolveApiPayloadItems(payload);
    const pagination = resolveApiPayloadPagination(payload);

    pageItems.forEach((item) => {
      if (item?.slug) {
        products.push({
          path: `/product/${item.slug}`,
          priority: '0.7',
          changefreq: 'weekly',
          lastmod: item.publishAt || undefined
        });
      }
    });

    totalPages = Number(pagination?.totalPages) || (pageItems.length < PRODUCT_PAGE_SIZE ? page : page + 1);
    page += 1;
  } while (page <= totalPages);

  return products;
};

const dedupeEntries = (entries) => {
  const seen = new Set();

  return entries.filter((entry) => {
    const url = new URL(entry.path, `${siteUrl}/`).toString();
    if (seen.has(url)) {
      return false;
    }

    seen.add(url);
    return true;
  });
};

const renderSitemap = (entries) => {
  const urlEntries = entries
    .map((entry) => {
      const absoluteUrl = new URL(entry.path, `${siteUrl}/`).toString();
      const lastmod = entry.lastmod ? `<lastmod>${new Date(entry.lastmod).toISOString()}</lastmod>` : '';
      const changefreq = entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : '';
      const priority = entry.priority ? `<priority>${entry.priority}</priority>` : '';

      return `<url><loc>${absoluteUrl}</loc>${lastmod}${changefreq}${priority}</url>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}</urlset>`;
};

const renderRobots = () => `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;

const buildSitemap = async () => {
  const entries = [...staticEntries];

  if (apiBaseUrl) {
    try {
      const [categoryEntries, productEntries] = await Promise.all([fetchCategoryEntries(), fetchProductEntries()]);
      entries.push(...categoryEntries, ...productEntries);
    } catch (error) {
      if (requireDynamicSitemap) {
        throw new Error(
          `[sitemap] Dynamic catalog fetch failed for production sitemap. ${error instanceof Error ? error.message : String(error)}`
        );
      }
      console.warn(`[sitemap] Dynamic catalog fetch failed, falling back to static routes only. ${error instanceof Error ? error.message : String(error)}`);
    }
  } else if (requireDynamicSitemap) {
    throw new Error('[sitemap] SITEMAP_API_URL or an absolute VITE_API_URL is required for production sitemap generation.');
  } else {
    console.warn('[sitemap] SITEMAP_API_URL or an absolute VITE_API_URL was not provided. Generated a static-route sitemap only.');
  }

  const dedupedEntries = dedupeEntries(entries);

  await fs.mkdir(distDirectory, { recursive: true });
  await fs.writeFile(path.join(distDirectory, 'sitemap.xml'), renderSitemap(dedupedEntries), 'utf8');
  await fs.writeFile(path.join(distDirectory, 'robots.txt'), renderRobots(), 'utf8');

  console.log(`[sitemap] Generated ${dedupedEntries.length} URLs.`);
};

await buildSitemap();
