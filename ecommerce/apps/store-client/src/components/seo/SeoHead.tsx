import { Helmet } from 'react-helmet-async';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SITE_NAME,
  DEFAULT_THEME_COLOR,
  buildKeywordList,
  resolveAbsoluteUrl,
  resolveSiteUrl
} from '../../seo/siteMetadata';

interface SeoHeadProps {
  title: string;
  description?: string;
  keywords?: string[] | string;
  canonicalUrl?: string;
  robots?: string;
  siteName?: string;
  openGraphType?: 'website' | 'product' | 'article';
  openGraphImage?: string;
  openGraphTitle?: string;
  openGraphDescription?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  additionalMeta?: Array<{ name?: string; property?: string; content: string }>;
}

const normalizeKeywords = (keywords?: string[] | string): string | undefined => {
  if (Array.isArray(keywords)) {
    return buildKeywordList(DEFAULT_KEYWORDS, keywords).join(', ');
  }

  if (typeof keywords === 'string' && keywords.trim()) {
    return buildKeywordList(DEFAULT_KEYWORDS, keywords.split(',')).join(', ');
  }

  return buildKeywordList(DEFAULT_KEYWORDS).join(', ');
};

export const SeoHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  canonicalUrl,
  robots = 'index,follow,max-image-preview:large',
  siteName = DEFAULT_SITE_NAME,
  openGraphType = 'website',
  openGraphImage,
  openGraphTitle,
  openGraphDescription,
  jsonLd,
  additionalMeta = []
}: SeoHeadProps): JSX.Element => {
  const siteUrl = resolveSiteUrl(import.meta.env.VITE_SITE_URL, typeof window !== 'undefined' ? window.location.href : undefined);
  const resolvedCanonicalUrl = canonicalUrl ? resolveAbsoluteUrl(canonicalUrl, siteUrl) : undefined;
  const resolvedImage = resolveAbsoluteUrl(openGraphImage ?? DEFAULT_OG_IMAGE_PATH, siteUrl);
  const keywordContent = normalizeKeywords(keywords);
  const serializedStructuredData =
    import.meta.env.MODE === 'test' ? null : Array.isArray(jsonLd) ? JSON.stringify(jsonLd) : jsonLd ? JSON.stringify(jsonLd) : null;

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywordContent ? <meta name="keywords" content={keywordContent} /> : null}
      <meta name="robots" content={robots} />
      <meta name="theme-color" content={DEFAULT_THEME_COLOR} />
      <meta name="application-name" content={siteName} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={openGraphType} />
      <meta property="og:title" content={openGraphTitle ?? title} />
      <meta property="og:description" content={openGraphDescription ?? description} />
      <meta property="og:locale" content="en_LK" />
      {resolvedCanonicalUrl ? <meta property="og:url" content={resolvedCanonicalUrl} /> : null}
      {resolvedImage ? <meta property="og:image" content={resolvedImage} /> : null}
      {resolvedImage ? <meta property="og:image:alt" content={openGraphTitle ?? title} /> : null}
      <meta name="twitter:card" content={resolvedImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={openGraphTitle ?? title} />
      <meta name="twitter:description" content={openGraphDescription ?? description} />
      {resolvedImage ? <meta name="twitter:image" content={resolvedImage} /> : null}
      {resolvedCanonicalUrl ? <link rel="canonical" href={resolvedCanonicalUrl} /> : null}
      {additionalMeta.map((meta) =>
        meta.name ? <meta key={`name:${meta.name}`} name={meta.name} content={meta.content} /> : <meta key={`prop:${meta.property}`} property={meta.property} content={meta.content} />
      )}
      {serializedStructuredData ? <script type="application/ld+json">{serializedStructuredData}</script> : null}
    </Helmet>
  );
};
