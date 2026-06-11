import { describe, expect, it } from 'vitest';
import { defaultMapEmbedUrl, resolveFooterSettings, sanitizeMapEmbedUrl } from './footer';

describe('footer map embed safety', () => {
  it('allows Google Maps HTTPS embeds and rejects unsafe URLs', () => {
    expect(sanitizeMapEmbedUrl('https://www.google.com/maps?q=Colombo&output=embed')).toBe('https://www.google.com/maps?q=Colombo&output=embed');
    expect(sanitizeMapEmbedUrl('https://www.google.com/maps/place/Pelawatta')).toBe(defaultMapEmbedUrl);
    expect(sanitizeMapEmbedUrl('https://evil.example/maps?q=Colombo&output=embed')).toBe(defaultMapEmbedUrl);
    expect(sanitizeMapEmbedUrl('javascript:alert(1)')).toBe(defaultMapEmbedUrl);
  });

  it('builds a working embed from the address when a saved map URL is a non-embed share link', () => {
    const footer = resolveFooterSettings({
      footer: {
        companyName: 'NJ Store',
        description: 'Premium electronics, responsive service, and transparent custom quotations.',
        email: 'support@njstore.com',
        phone: '+94 11 245 8899',
        whatsappNumber: '94112458899',
        physicalAddress: 'No:10, L.L.D.B, Perera Mw, Thalangama South, Pelawatta',
        mapEmbedUrl: 'https://www.google.com/maps/place/Pelawatta',
        openingHours: 'Mon-Sat, 9:00 AM to 6:00 PM',
        copyrightText: 'Copyright',
        socialLinks: {
          facebook: '',
          instagram: '',
          tiktok: '',
          youtube: '',
          x: ''
        },
        sectionTitles: {
          about: 'About',
          quickLinks: 'Quick Links',
          contact: 'Contact Info',
          social: 'Social & Updates'
        },
        quickLinks: []
      }
    });

    expect(footer.mapEmbedUrl).toBe('https://www.google.com/maps?q=No%3A10%2C+L.L.D.B%2C+Perera+Mw%2C+Thalangama+South%2C+Pelawatta&output=embed');
  });
});
