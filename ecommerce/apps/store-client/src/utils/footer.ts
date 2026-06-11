import type { FooterSettingsDto, SiteConfigDto } from '@njstore/types';

const defaultFooterQuickLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Return Policy', href: '/returns' },
  { label: 'FAQ', href: '/faq' }
];

const defaultFooterSectionTitles = {
  about: 'About',
  quickLinks: 'Quick Links',
  contact: 'Contact Info',
  social: 'Social & Updates'
};

export const defaultMapEmbedUrl = 'https://www.google.com/maps?q=Colombo%2003%20Sri%20Lanka&output=embed';

const trimText = (value?: string | null): string => value?.trim() ?? '';
const googleMapsHosts = new Set(['www.google.com', 'maps.google.com']);

const buildGoogleMapEmbedUrl = (query: string, zoom?: number): string => {
  const url = new URL('https://www.google.com/maps');
  url.searchParams.set('q', query);
  if (zoom) {
    url.searchParams.set('z', String(zoom));
  }
  url.searchParams.set('output', 'embed');
  return url.toString();
};

export const isAllowedMapEmbedUrl = (value: string): boolean => {
  try {
    const url = new URL(value.trim());
    const isGoogleMapsUrl = url.protocol === 'https:' && googleMapsHosts.has(url.hostname) && url.pathname.startsWith('/maps');
    const isEmbedMode = url.pathname.startsWith('/maps/embed') || url.searchParams.get('output') === 'embed';

    return isGoogleMapsUrl && isEmbedMode;
  } catch {
    return false;
  }
};

const sanitizeExplicitMapEmbedUrl = (value?: string | null): string | undefined => {
  const trimmedValue = trimText(value);
  if (!trimmedValue || !isAllowedMapEmbedUrl(trimmedValue)) {
    return undefined;
  }

  return new URL(trimmedValue).toString();
};

export const sanitizeMapEmbedUrl = (value?: string | null): string => {
  return sanitizeExplicitMapEmbedUrl(value) ?? defaultMapEmbedUrl;
};

const buildMapEmbedUrl = (
  footer: Partial<Pick<FooterSettingsDto, 'mapEmbedUrl' | 'physicalAddress' | 'latitude' | 'longitude'>>
): string => {
  const explicitUrl = sanitizeExplicitMapEmbedUrl(footer.mapEmbedUrl);
  if (explicitUrl) {
    return explicitUrl;
  }

  if (typeof footer.latitude === 'number' && typeof footer.longitude === 'number') {
    return buildGoogleMapEmbedUrl(`${footer.latitude},${footer.longitude}`, 15);
  }

  const query = trimText(footer.physicalAddress) || 'Colombo 03 Sri Lanka';
  return buildGoogleMapEmbedUrl(query);
};

export const resolveFooterSettings = (
  siteConfig?: Partial<Pick<SiteConfigDto, 'footer' | 'socialLinks' | 'storeName' | 'supportPhoneNumber' | 'whatsappNumber'>>
): FooterSettingsDto => {
  const footer = siteConfig?.footer;
  const quickLinks = (footer?.quickLinks ?? [])
    .map((link) => ({
      label: trimText(link.label),
      href: trimText(link.href)
    }))
    .filter((link) => link.label && link.href);

  const physicalAddress = trimText(footer?.physicalAddress) || '120 Galle Road, Colombo 03, Sri Lanka';
  const latitude = footer?.latitude;
  const longitude = footer?.longitude;

  return {
    companyName: trimText(footer?.companyName) || trimText(siteConfig?.storeName) || 'NJ Store',
    logo: footer?.logo,
    description: trimText(footer?.description) || 'Premium electronics, responsive service, and transparent custom quotations.',
    email: trimText(footer?.email) || 'support@njstore.com',
    phone: trimText(footer?.phone) || trimText(siteConfig?.supportPhoneNumber) || '+94 11 245 8899',
    whatsappNumber: trimText(footer?.whatsappNumber) || trimText(siteConfig?.whatsappNumber) || '94112458899',
    physicalAddress,
    mapEmbedUrl: buildMapEmbedUrl({
      mapEmbedUrl: footer?.mapEmbedUrl,
      physicalAddress,
      latitude,
      longitude
    }),
    latitude,
    longitude,
    openingHours: trimText(footer?.openingHours) || 'Mon-Sat, 9:00 AM to 6:00 PM',
    copyrightText: trimText(footer?.copyrightText) || '© NJ Store. All rights reserved.',
    socialLinks: {
      facebook: trimText(footer?.socialLinks?.facebook) || trimText(siteConfig?.socialLinks?.facebook),
      instagram: trimText(footer?.socialLinks?.instagram) || trimText(siteConfig?.socialLinks?.instagram),
      tiktok: trimText(footer?.socialLinks?.tiktok) || trimText(siteConfig?.socialLinks?.tiktok),
      youtube: trimText(footer?.socialLinks?.youtube) || trimText(siteConfig?.socialLinks?.youtube),
      x: trimText(footer?.socialLinks?.x) || trimText(siteConfig?.socialLinks?.x)
    },
    sectionTitles: {
      about: trimText(footer?.sectionTitles?.about) || defaultFooterSectionTitles.about,
      quickLinks: trimText(footer?.sectionTitles?.quickLinks) || defaultFooterSectionTitles.quickLinks,
      contact: trimText(footer?.sectionTitles?.contact) || defaultFooterSectionTitles.contact,
      social: trimText(footer?.sectionTitles?.social) || defaultFooterSectionTitles.social
    },
    quickLinks: quickLinks.length > 0 ? quickLinks : defaultFooterQuickLinks
  };
};

export const buildMapSearchUrl = (footer: Pick<FooterSettingsDto, 'physicalAddress' | 'latitude' | 'longitude'>): string => {
  if (typeof footer.latitude === 'number' && typeof footer.longitude === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${footer.latitude},${footer.longitude}`)}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(footer.physicalAddress)}`;
};
