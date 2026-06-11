import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  hasPermissionsMock: vi.fn(),
  updateSettingsMock: vi.fn(),
  refetchMock: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock
}));

vi.mock('../../hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    hasPermissions: mocks.hasPermissionsMock
  })
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    settings: vi.fn(),
    updateSettings: mocks.updateSettingsMock,
    uploadStoreLogo: vi.fn()
  }
}));

import { Settings } from './Settings';

const STORE_LOGO_DATA_URL =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 120 40%22%3E%3Crect width=%22120%22 height=%2240%22 fill=%22white%22/%3E%3C/svg%3E';

const buildSettingsQuery = () => ({
  data: {
    data: {
      storeName: 'NJ Store',
      revision: 3,
      storeLogo: {
        url: STORE_LOGO_DATA_URL,
        publicId: 'njstore/site-config/store-logo',
        alt: 'NJ Store logo'
      },
      supportPhoneNumber: '+94 11 245 8899',
      whatsappNumber: '94112458899',
      footer: {
        companyName: 'NJ Store',
        description: 'Premium electronics with local support.',
        email: 'support@njstore.com',
        phone: '+94 11 245 8899',
        whatsappNumber: '94112458899',
        physicalAddress: '120 Galle Road, Colombo 03, Sri Lanka',
        mapEmbedUrl: 'https://www.google.com/maps?q=Colombo%2003%20Sri%20Lanka&output=embed',
        openingHours: 'Mon-Sat, 9:00 AM to 6:00 PM',
        copyrightText: '© NJ Store. All rights reserved.',
        socialLinks: {
          facebook: 'https://www.facebook.com/njstore',
          instagram: 'https://www.instagram.com/njstore',
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
        quickLinks: [
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms & Conditions', href: '/terms' },
          { label: 'Return Policy', href: '/returns' },
          { label: 'FAQ', href: '/faq' }
        ]
      },
      freeShippingThreshold: 15000,
      lowStockThreshold: 5,
      loyaltyPointsRate: 125,
      cancellationWindowHours: 6,
      quotationExpiryDays: 9,
      bankTransferDetails: {
        accountName: 'NJ Retail',
        bankName: 'Bank of Ceylon',
        branch: 'Colombo',
        accountNumber: '1234567890'
      },
      supportedCurrencies: [
        {
          code: 'LKR',
          symbol: 'LKR',
          rate: 1,
          isDefault: true
        },
        {
          code: 'USD',
          symbol: '$',
          rate: 0.0033,
          isDefault: false
        }
      ],
      shippingRates: [],
      emailTemplates: [],
      socialLinks: {
        facebook: 'https://www.facebook.com/njstore',
        instagram: 'https://www.instagram.com/njstore',
        tiktok: '',
        youtube: '',
        x: ''
      },
      maintenanceMode: {
        enabled: true,
        message: 'Temporarily offline for upgrades.'
      },
      taxSettings: {
        enabled: true,
        label: 'VAT',
        rate: 18
      },
      notificationSettings: {
        quotationReady: { emailEnabled: true, smsEnabled: false },
        orderConfirmed: { emailEnabled: true, smsEnabled: false },
        orderShipped: { emailEnabled: true, smsEnabled: true },
        receiptRejected: { emailEnabled: true, smsEnabled: false },
        lowStockAlert: { emailEnabled: true, smsEnabled: true }
      }
    }
  },
  refetch: mocks.refetchMock
});

describe('Admin Settings page', () => {
  beforeEach(() => {
    mocks.updateSettingsMock.mockReset();
    mocks.refetchMock.mockReset();
    mocks.updateSettingsMock.mockResolvedValue(undefined);
    mocks.refetchMock.mockResolvedValue(undefined);
    mocks.hasPermissionsMock.mockReturnValue(true);
    mocks.useQueryMock.mockReturnValue(buildSettingsQuery());
  });

  const renderSettings = (): void => {
    render(
      <>
        <Settings />
        <Toaster position="top-right" />
      </>
    );
  };

  it('shows a success toast after saving the active settings panel', async () => {
    const user = userEvent.setup();

    renderSettings();

    await screen.findByLabelText('Store Name');
    await user.click(screen.getByRole('button', { name: 'Save Store Controls' }));

    expect(mocks.updateSettingsMock).toHaveBeenCalledWith({
      revision: 3,
      storeName: 'NJ Store',
      storeLogo: {
        url: STORE_LOGO_DATA_URL,
        publicId: 'njstore/site-config/store-logo',
        alt: 'NJ Store logo'
      },
      storeLogoDark: {
        url: STORE_LOGO_DATA_URL,
        publicId: 'njstore/site-config/store-logo',
        alt: 'NJ Store logo'
      },
      storeLogoLight: null,
      supportedCurrencies: [
        {
          code: 'LKR',
          symbol: 'LKR',
          rate: 1,
          isDefault: true
        },
        {
          code: 'USD',
          symbol: '$',
          rate: 0.0033,
          isDefault: false
        }
      ],
      freeShippingThreshold: 15000,
      lowStockThreshold: 5,
      loyaltyPointsRate: 125,
      cancellationWindowHours: 6,
      quotationExpiryDays: 9,
      taxSettings: {
        enabled: true,
        label: 'VAT',
        rate: 18
      }
    });
    expect(await screen.findByText('Store Controls updated')).toBeInTheDocument();
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('switches panels and saves only the selected settings group', async () => {
    const user = userEvent.setup();

    renderSettings();

    await user.click(await screen.findByRole('button', { name: /Payments/i }));
    await screen.findByLabelText('Account Name');
    await user.click(screen.getByRole('button', { name: 'Save Payments' }));

    expect(mocks.updateSettingsMock).toHaveBeenCalledWith({
      revision: 3,
      bankTransferDetails: {
        accountName: 'NJ Retail',
        bankName: 'Bank of Ceylon',
        branch: 'Colombo',
        accountNumber: '1234567890'
      },
      cashOnDeliveryEnabled: true
    });
    expect(await screen.findByText('Payments updated')).toBeInTheDocument();
  });

  it('shows an API error toast when saving settings fails', async () => {
    const user = userEvent.setup();

    mocks.updateSettingsMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Settings service unavailable'
        }
      }
    });

    renderSettings();

    await screen.findByLabelText('Store Name');
    await user.click(screen.getByRole('button', { name: 'Save Store Controls' }));

    expect(await screen.findByText('Settings service unavailable')).toBeInTheDocument();
    expect(mocks.refetchMock).not.toHaveBeenCalled();
  });
});
