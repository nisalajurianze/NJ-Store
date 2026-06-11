import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logout: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    logout: mocks.logout
  })
}));

import { DashboardLayout } from './DashboardLayout';

const renderDashboardLayout = (initialEntry = '/dashboard/profile'): void => {
  render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<div>Overview content</div>} />
          <Route path="profile" element={<div>Profile content</div>} />
          <Route path="orders" element={<div>Orders content</div>} />
          <Route path="security" element={<div>Security content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('DashboardLayout', () => {
  it('keeps the account menu bar sticky below the store header', async () => {
    const storeHeader = document.createElement('header');
    storeHeader.setAttribute('data-testid', 'store-header');
    storeHeader.getBoundingClientRect = vi.fn(
      () =>
        ({
          height: 88
        }) as DOMRect
    );
    document.body.appendChild(storeHeader);

    try {
      renderDashboardLayout('/dashboard/orders');

      const accountMenuBar = screen.getByTestId('account-menu-bar');
      expect(accountMenuBar).toHaveClass('sticky');
      await waitFor(() => {
        expect(accountMenuBar).toHaveStyle({ top: '88px' });
      });
    } finally {
      storeHeader.remove();
    }
  });

  it('opens account navigation as a desktop drawer and switches routed content inside the panel', async () => {
    const user = userEvent.setup();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280
    });

    renderDashboardLayout();

    expect(screen.getByText('Profile content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sections' }));

    const accountDialog = await screen.findByRole('dialog', { name: 'Account navigation' });
    expect(within(accountDialog).getByRole('link', { name: 'Profile' }).className).toContain('bg-gold/15');
    expect(within(accountDialog).getByRole('button', { name: 'Logout' })).toBeInTheDocument();

    await user.click(within(accountDialog).getByRole('link', { name: 'Orders' }));

    expect(await screen.findByText('Orders content')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Account navigation' })).not.toBeInTheDocument();
    });
  });

  it('switches routed content from the mobile account drawer', async () => {
    const user = userEvent.setup();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390
    });

    renderDashboardLayout();

    expect(screen.getByText('Profile content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sections' }));

    const drawerTitle = await screen.findByText('Account navigation');
    const drawer = drawerTitle.closest('.fixed');
    expect(drawer).not.toBeNull();

    await user.click(screen.getByRole('link', { name: 'Security' }));

    expect(await screen.findByText('Security content')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Account navigation')).not.toBeInTheDocument();
    });
  });
});
