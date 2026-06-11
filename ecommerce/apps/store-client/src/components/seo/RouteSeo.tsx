import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { buildCanonicalUrl, getRouteSeoMetadata, resolveSiteUrl } from '../../seo/siteMetadata';
import { SeoHead } from './SeoHead';

export const RouteSeo = ({ storeName }: { storeName?: string }): JSX.Element | null => {
  const location = useLocation();

  const metadata = useMemo(() => {
    if (location.pathname === '/shop' || location.pathname.startsWith('/product/')) {
      return null;
    }

    return getRouteSeoMetadata(location.pathname, storeName);
  }, [location.pathname, storeName]);

  if (!metadata) {
    return null;
  }

  const siteUrl = resolveSiteUrl(import.meta.env.VITE_SITE_URL, typeof window !== 'undefined' ? window.location.href : undefined);

  return (
    <SeoHead
      title={metadata.title}
      description={metadata.description}
      keywords={metadata.keywords}
      robots={metadata.robots}
      canonicalUrl={buildCanonicalUrl(metadata.canonicalPath ?? location.pathname, siteUrl)}
    />
  );
};
