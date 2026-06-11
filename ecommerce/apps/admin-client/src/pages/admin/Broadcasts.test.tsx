import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  hasPermissionsMock: vi.fn(),
  refetchMock: vi.fn(),
  sendBroadcastMock: vi.fn(),
  useQueryMock: vi.fn()
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
    broadcastAudience: vi.fn(),
    sendBroadcast: mocks.sendBroadcastMock
  }
}));

import { Broadcasts } from './Broadcasts';

const renderBroadcasts = (): void => {
  render(
    <>
      <Broadcasts />
      <Toaster position="top-right" />
    </>
  );
};

describe('Admin Broadcasts page', () => {
  beforeEach(() => {
    mocks.hasPermissionsMock.mockReset();
    mocks.refetchMock.mockReset();
    mocks.sendBroadcastMock.mockReset();
    mocks.useQueryMock.mockReset();

    mocks.hasPermissionsMock.mockImplementation((permission: string) => permission === 'setting:write');
    mocks.refetchMock.mockResolvedValue(undefined);
    mocks.sendBroadcastMock.mockResolvedValue({
      data: {
        audience: 'customers',
        subject: 'April Launch Week',
        requestedRecipients: 18,
        sent: 18,
        failed: 0
      }
    });
    mocks.useQueryMock.mockReturnValue({
      data: {
        data: {
          customers: 18,
          unverifiedCustomers: 7,
          newsletterSubscribers: 11,
          totalUniqueRecipients: 31
        }
      },
      refetch: mocks.refetchMock
    });
  });

  it('shows read-only messaging when the admin lacks write access', () => {
    mocks.hasPermissionsMock.mockReturnValue(false);

    renderBroadcasts();

    expect(screen.getByText('Read Only')).toBeInTheDocument();
    expect(screen.getByText('This account can review audience counts but cannot send broadcasts.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send Broadcast' })).not.toBeInTheDocument();
  });

  it('submits a broadcast email payload and shows a success toast', async () => {
    const user = userEvent.setup();

    renderBroadcasts();

    const customersButton = screen.getByText('Customers').closest('button');
    if (!customersButton) {
      throw new Error('Customers audience button not found');
    }

    await user.click(customersButton);
    await user.type(screen.getByLabelText('Subject Line'), 'April Launch Week');
    await user.type(screen.getByLabelText('Preview Text'), 'Fresh price drops are now live.');
    await user.type(screen.getByLabelText('Headline'), 'Fresh arrivals are ready to ship');
    await user.type(screen.getByLabelText('Message'), 'See the latest launch-ready products.\n\nGet your quote before the wider release.');
    await user.type(screen.getByLabelText('CTA Label'), 'Browse Launch Picks');
    await user.type(screen.getByLabelText('CTA URL'), '/shop?featured=true');
    await user.click(screen.getByRole('button', { name: 'Send Broadcast' }));

    await waitFor(() => {
      expect(mocks.sendBroadcastMock).toHaveBeenCalledWith({
        audience: 'customers',
        subject: 'April Launch Week',
        previewText: 'Fresh price drops are now live.',
        headline: 'Fresh arrivals are ready to ship',
        body: 'See the latest launch-ready products.\n\nGet your quote before the wider release.',
        ctaLabel: 'Browse Launch Picks',
        ctaUrl: '/shop?featured=true'
      });
    });
    expect(await screen.findByText('Broadcast sent to 18 recipients.')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
    });
  }, 15000);

  it('supports the unverified customers audience option', async () => {
    const user = userEvent.setup();

    mocks.sendBroadcastMock.mockResolvedValueOnce({
      data: {
        audience: 'unverifiedCustomers',
        subject: 'Verify your account',
        requestedRecipients: 7,
        sent: 7,
        failed: 0
      }
    });

    renderBroadcasts();

    const unverifiedButton = screen.getByText('Unverified Customers').closest('button');
    if (!unverifiedButton) {
      throw new Error('Unverified customers audience button not found');
    }

    await user.click(unverifiedButton);
    await user.type(screen.getByLabelText('Subject Line'), 'Verify your account');
    await user.type(screen.getByLabelText('Headline'), 'Complete your email verification');
    await user.type(screen.getByLabelText('Message'), 'Please verify your email to stay in the loop.');
    await user.click(screen.getByRole('button', { name: 'Send Broadcast' }));

    await waitFor(() => {
      expect(mocks.sendBroadcastMock).toHaveBeenCalledWith({
        audience: 'unverifiedCustomers',
        subject: 'Verify your account',
        previewText: undefined,
        headline: 'Complete your email verification',
        body: 'Please verify your email to stay in the loop.',
        ctaLabel: undefined,
        ctaUrl: undefined
      });
    });
    expect(await screen.findByText('Broadcast sent to 7 recipients.')).toBeInTheDocument();
  }, 10000);
});
