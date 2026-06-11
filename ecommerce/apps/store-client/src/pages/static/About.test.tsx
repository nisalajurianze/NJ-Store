import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { About } from './About';

describe('About page', () => {
  it('keeps the hero background transparent in light mode', () => {
    document.documentElement.dataset.theme = 'light';

    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Premium electronics, presented with more clarity and care.' }).closest('section')).toHaveClass(
      'static-page-hero'
    );
    expect(screen.getByRole('heading', { name: 'Premium electronics, presented with more clarity and care.' }).closest('section')).not.toHaveClass(
      'theme-hero-surface'
    );
    expect(screen.getByRole('heading', { name: 'Explore the catalog or talk to the team about what you need next.' }).closest('section')).toHaveClass(
      'theme-promo-surface'
    );
    expect(screen.getByText('Guidance that makes premium products easier to compare.').closest('div')).toHaveClass('theme-dark-surface');
  });

  it('shows bank transfer details from the site settings', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            element={
              <Outlet
                context={{
                  siteConfig: {
                    storeName: 'NJ Store',
                    bankTransferDetails: {
                      accountName: 'NJ Store (Pvt) Ltd',
                      bankName: 'Commercial Bank',
                      branch: 'Colombo Fort',
                      accountNumber: '1234567890'
                    }
                  }
                }}
              />
            }
          >
            <Route path="/" element={<About />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Bank details for confirmed orders' })).toBeInTheDocument();
    expect(screen.getByText('NJ Store (Pvt) Ltd')).toBeInTheDocument();
    expect(screen.getByText('Commercial Bank')).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
  });
});
