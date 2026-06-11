export const defaultMapEmbedUrl = 'https://www.google.com/maps?q=Colombo%2003%20Sri%20Lanka&output=embed';
export const defaultPhysicalAddress = '120 Galle Road, Colombo 03, Sri Lanka';
const googleMapsHosts = new Set(['www.google.com', 'maps.google.com']);
const buildGoogleMapEmbedUrl = (query, zoom) => {
    const url = new URL('https://www.google.com/maps');
    url.searchParams.set('q', query);
    if (zoom) {
        url.searchParams.set('z', String(zoom));
    }
    url.searchParams.set('output', 'embed');
    return url.toString();
};
export const defaultFooterSocialLinks = () => ({
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    x: ''
});
export const defaultFooterSectionTitles = () => ({
    about: 'About',
    quickLinks: 'Quick Links',
    contact: 'Contact Info',
    social: 'Social & Updates'
});
export const defaultFooterQuickLinks = () => [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms & Conditions', href: '/terms' },
    { label: 'Return Policy', href: '/returns' },
    { label: 'FAQ', href: '/faq' }
];
export const buildDefaultFooterSettings = () => ({
    companyName: 'NJ Store',
    description: 'Premium electronics, responsive service, and transparent custom quotations.',
    email: 'support@njstore.com',
    phone: '+94 11 245 8899',
    whatsappNumber: '94112458899',
    physicalAddress: defaultPhysicalAddress,
    mapEmbedUrl: defaultMapEmbedUrl,
    openingHours: 'Mon-Sat, 9:00 AM to 6:00 PM',
    copyrightText: '© NJ Store. All rights reserved.',
    socialLinks: defaultFooterSocialLinks(),
    sectionTitles: defaultFooterSectionTitles(),
    quickLinks: defaultFooterQuickLinks()
});
export const isAllowedMapEmbedUrl = (value) => {
    try {
        const url = new URL(value.trim());
        const isGoogleMapsUrl = url.protocol === 'https:' && googleMapsHosts.has(url.hostname) && url.pathname.startsWith('/maps');
        const isEmbedMode = url.pathname.startsWith('/maps/embed') || url.searchParams.get('output') === 'embed';
        return isGoogleMapsUrl && isEmbedMode;
    }
    catch {
        return false;
    }
};
export const sanitizeMapEmbedUrl = (value) => {
    const explicitUrl = value?.trim();
    if (!explicitUrl) {
        return defaultMapEmbedUrl;
    }
    return isAllowedMapEmbedUrl(explicitUrl) ? new URL(explicitUrl).toString() : defaultMapEmbedUrl;
};
export const buildFooterMapEmbedUrl = (input) => {
    const explicitUrl = input.mapEmbedUrl?.trim();
    if (explicitUrl && isAllowedMapEmbedUrl(explicitUrl)) {
        return new URL(explicitUrl).toString();
    }
    if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
        return buildGoogleMapEmbedUrl(`${input.latitude},${input.longitude}`, 15);
    }
    const query = input.physicalAddress?.trim() || defaultPhysicalAddress;
    return buildGoogleMapEmbedUrl(query);
};
