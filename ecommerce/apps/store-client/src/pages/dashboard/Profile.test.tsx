import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addAddressMock: vi.fn(),
  updateAddressMock: vi.fn(),
  deleteAddressMock: vi.fn(),
  setDefaultAddressMock: vi.fn(),
  setThemeMock: vi.fn(),
  setCurrencyMock: vi.fn(),
  updateProfileMock: vi.fn(),
  addresses: [
    {
      _id: 'address-1',
      label: 'Home',
      fullName: 'Test User',
      phone: '0771234567',
      line1: '123 Main Street',
      line2: '',
      city: 'Colombo',
      district: 'Colombo',
      postalCode: '00100',
      country: 'Sri Lanka',
      isDefault: true
    }
  ],
  currencyState: {
    activeCurrency: { code: 'LKR', symbol: 'LKR', rate: 1, isDefault: true },
    supportedCurrencies: [
      { code: 'LKR', symbol: 'LKR', rate: 1, isDefault: true },
      { code: 'USD', symbol: '$', rate: 3.2, isDefault: false }
    ]
  },
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'shopper@example.com',
    phone: '0771234567',
    isEmailVerified: true
  }
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    addAddress: mocks.addAddressMock,
    addresses: mocks.addresses,
    updateAddress: mocks.updateAddressMock,
    deleteAddress: mocks.deleteAddressMock,
    setDefaultAddress: mocks.setDefaultAddressMock,
    user: mocks.user,
    updateProfile: mocks.updateProfileMock
  })
}));

vi.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({
    activeCurrency: mocks.currencyState.activeCurrency,
    supportedCurrencies: mocks.currencyState.supportedCurrencies,
    setCurrency: mocks.setCurrencyMock
  })
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: true,
    themePreference: 'dark',
    setTheme: mocks.setThemeMock
  })
}));

import { DashboardProfile } from './Profile';

const scrollIntoViewMock = vi.fn();

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: scrollIntoViewMock
});

const renderDashboardProfile = (entry = '/dashboard/profile'): void => {
  render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <DashboardProfile />
      <Toaster position="top-right" />
    </MemoryRouter>
  );
};

describe('DashboardProfile', () => {
  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    mocks.addAddressMock.mockReset();
    mocks.updateAddressMock.mockReset();
    mocks.deleteAddressMock.mockReset();
    mocks.setDefaultAddressMock.mockReset();
    mocks.addresses = [
      {
        _id: 'address-1',
        label: 'Home',
        fullName: 'Test User',
        phone: '0771234567',
        line1: '123 Main Street',
        line2: '',
        city: 'Colombo',
        district: 'Colombo',
        postalCode: '00100',
        country: 'Sri Lanka',
        isDefault: true
      }
    ];
    mocks.user = {
      id: 'user-1',
      name: 'Test User',
      email: 'shopper@example.com',
      phone: '0771234567',
      isEmailVerified: true
    };
    mocks.setThemeMock.mockReset();
    mocks.setCurrencyMock.mockReset();
    mocks.updateProfileMock.mockReset();
    mocks.currencyState = {
      activeCurrency: { code: 'LKR', symbol: 'LKR', rate: 1, isDefault: true },
      supportedCurrencies: [
        { code: 'LKR', symbol: 'LKR', rate: 1, isDefault: true },
        { code: 'USD', symbol: '$', rate: 3.2, isDefault: false }
      ]
    };
  });

  it('shows an API error toast when profile update fails', async () => {
    const user = userEvent.setup();

    mocks.updateProfileMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Profile update failed'
        }
      }
    });

    renderDashboardProfile();

    await user.click(screen.getByRole('button', { name: 'Edit Profile' }));

    const fullName = screen.getByLabelText('Full Name');
    await user.clear(fullName);
    await user.type(fullName, 'Updated User');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Profile update failed')).toBeInTheDocument();
  });

  it('edits the preferred currency only after the shopper saves the preference', async () => {
    const user = userEvent.setup();

    renderDashboardProfile();

    expect(screen.getByText('LKR')).toBeInTheDocument();
    expect(screen.queryByLabelText('Preferred Currency')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit Currency' }));
    await user.selectOptions(screen.getByLabelText('Preferred Currency'), 'USD');

    expect(mocks.setCurrencyMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save Preference' }));

    expect(mocks.setCurrencyMock).toHaveBeenCalledWith('USD');
    expect(screen.getByText('Manage how prices are shown while you browse on this device.')).toBeInTheDocument();
  });

  it('shows the address manager inside profile and scrolls to it from the addresses section link', () => {
    renderDashboardProfile('/dashboard/profile?section=addresses');

    expect(screen.getByText('Addresses')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText(/123 Main Street/)).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('lets shoppers switch directly to a specific storefront theme from the profile appearance card', async () => {
    const user = userEvent.setup();

    renderDashboardProfile();

    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Dark mode is active for this browser.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use Light theme' }));

    expect(mocks.setThemeMock).toHaveBeenCalledWith('light');
  });
});
