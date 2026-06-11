import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders dynamic contact actions and configured social links', () => {
    render(
      <MemoryRouter initialEntries={['/shop']}>
        <Footer
          siteConfig={{
            storeName: 'NJ Store',
            footer: {
              companyName: 'NJ Store',
              description: 'Premium electronics with local support.',
              email: 'support@njstore.com',
              phone: '+94 11 300 4000',
              whatsappNumber: '94773004000',
              physicalAddress: '120 Galle Road, Colombo 03',
              mapEmbedUrl: 'https://www.google.com/maps?q=Colombo%2003%20Sri%20Lanka&output=embed',
              openingHours: 'Mon-Sat, 9:00 AM to 6:00 PM',
              copyrightText: '© NJ Store. All rights reserved.',
              socialLinks: {
                facebook: 'https://www.facebook.com/njstore',
                instagram: '',
                tiktok: '',
                youtube: '',
                x: ''
              },
              sectionTitles: {
                about: 'About',
                quickLinks: 'Quick Links',
                contact: 'Contact',
                social: 'Social'
              },
              quickLinks: [
                { label: 'Privacy Policy', href: '/privacy' }
              ]
            }
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '+94 11 300 4000' })).toHaveAttribute('href', 'tel:+94113004000');
    expect(screen.getByRole('link', { name: 'support@njstore.com' })).toHaveAttribute('href', 'mailto:support@njstore.com');
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/njstore');
    expect(
      screen
        .getAllByRole('link', { name: 'WhatsApp' })
        .every(
          (link) =>
            link.getAttribute('href') ===
            'https://wa.me/94773004000?text=Hi%20NJ%20Store%2C%20I%20need%20some%20help%20with%20my%20order.'
        )
    ).toBe(true);
    expect(screen.queryByRole('link', { name: 'Instagram' })).not.toBeInTheDocument();
    expect(screen.getByText('120 Galle Road, Colombo 03')).toBeInTheDocument();
  });

  it('keeps the same top spacing on non-home pages as the home page', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/shop']}>
        <Footer />
      </MemoryRouter>
    );

    expect(container.querySelector('footer')).toHaveClass('mt-4', 'lg:mt-6');
  });

  it('uses the theme footer card surface without forcing the dark text palette', () => {
    document.documentElement.dataset.theme = 'light';

    const { container } = render(
      <MemoryRouter initialEntries={['/shop']}>
        <Footer />
      </MemoryRouter>
    );

    const footerCard = container.querySelector('footer > div > div');

    expect(footerCard).toHaveClass('theme-footer-card', 'rounded-t-[20px]', 'rounded-b-none', 'border-x-0', 'border-b-0');
    expect(footerCard).not.toHaveClass('theme-dark-surface');
  });
});
