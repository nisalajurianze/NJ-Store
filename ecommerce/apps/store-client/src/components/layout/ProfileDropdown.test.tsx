import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProfileDropdown } from './ProfileDropdown';

const LocationProbe = (): JSX.Element => {
  const location = useLocation();
  return <output data-testid="location-display">{location.pathname}</output>;
};

const renderProfileDropdown = (initialEntry = '/shop'): void => {
  render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route
          path="*"
          element={
            <>
              <ProfileDropdown
                user={{
                  name: 'Salani Perera',
                  email: 'salani@example.com'
                }}
              />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

describe('ProfileDropdown', () => {
  it('routes directly to the profile page when the profile chip is clicked', async () => {
    const user = userEvent.setup();

    renderProfileDropdown('/shop');

    await user.click(screen.getByRole('link', { name: 'Salani' }));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/dashboard/profile');
    expect(screen.queryByRole('menu', { name: 'Profile menu' })).not.toBeInTheDocument();
  });

  it('shows the active state on the profile route', () => {
    renderProfileDropdown('/dashboard/profile');

    expect(screen.getByRole('link', { name: 'Salani' }).className).toContain('bg-white/[0.08]');
  });

  it('does not highlight the profile chip on section routes like wishlist', () => {
    renderProfileDropdown('/dashboard/wishlist');

    expect(screen.getByRole('link', { name: 'Salani' }).className).not.toContain('bg-white/[0.08]');
  });
});
