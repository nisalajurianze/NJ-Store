import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  refreshSessionMock: vi.fn(),
  resendVerificationMock: vi.fn(),
  updatePasswordMock: vi.fn(),
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'shopper@example.com',
    phone: '0771234567',
    authProvider: 'local',
    isEmailVerified: true
  }
}));

const verificationStorageKey = 'njstore:verification-requested:shopper@example.com';
const scrollIntoViewMock = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.user,
    refreshSession: mocks.refreshSessionMock,
    updatePassword: mocks.updatePasswordMock
  })
}));

vi.mock('../../services/authService', () => ({
  authService: {
    resendVerification: mocks.resendVerificationMock
  }
}));

import { DashboardSecurity } from './Security';

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: scrollIntoViewMock
});

const renderDashboardSecurity = (entry = '/dashboard/security'): void => {
  render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <DashboardSecurity />
      <Toaster position="top-right" />
    </MemoryRouter>
  );
};

describe('DashboardSecurity', () => {
  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    mocks.user = {
      id: 'user-1',
      name: 'Test User',
      email: 'shopper@example.com',
      phone: '0771234567',
      authProvider: 'local',
      isEmailVerified: true
    };
    mocks.refreshSessionMock.mockReset();
    mocks.resendVerificationMock.mockReset();
    mocks.updatePasswordMock.mockReset();
    window.sessionStorage.clear();
  });

  it('shows an API error toast when password update fails', async () => {
    const user = userEvent.setup();

    mocks.updatePasswordMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Current password is incorrect'
        }
      }
    });

    renderDashboardSecurity();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.type(screen.getByLabelText('Current Password'), 'wrong-password');
    await user.type(screen.getByLabelText('New Password'), 'NewSecret123');
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument();
  });

  it('keeps the password form closed until edit is selected', async () => {
    const user = userEvent.setup();

    renderDashboardSecurity();

    expect(screen.queryByLabelText('Current Password')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
  });

  it('shows the moved verified email card in security', () => {
    renderDashboardSecurity('/dashboard/security?section=verification');

    expect(screen.getByText('Email Verification')).toBeInTheDocument();
    expect(screen.getByText('Email verified')).toBeInTheDocument();
    expect(screen.getByText('shopper@example.com')).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('sends a verification email and persists the resend state for unverified shoppers', async () => {
    const user = userEvent.setup();

    mocks.user = {
      ...mocks.user,
      isEmailVerified: false
    };
    mocks.resendVerificationMock.mockResolvedValue({
      previewMode: false
    });

    renderDashboardSecurity('/dashboard/security?section=verification');

    await user.click(screen.getByRole('button', { name: 'Verify Email' }));

    expect(mocks.resendVerificationMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Verification email sent')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Resend Verification' })).toBeInTheDocument();
    expect(screen.getByText('Verification status updates automatically here after you complete the email link.')).toBeInTheDocument();
    expect(window.sessionStorage.getItem(verificationStorageKey)).toBe('true');
  });

  it('shows preview mode and opens the verification link directly when available', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    mocks.user = {
      ...mocks.user,
      isEmailVerified: false
    };
    mocks.resendVerificationMock.mockResolvedValue({
      previewMode: true,
      verificationUrl: 'http://localhost:5000/preview/verify-email'
    });

    renderDashboardSecurity('/dashboard/security?section=verification');

    await user.click(screen.getByRole('button', { name: 'Verify Email' }));

    expect(await screen.findByText('Verification preview is ready')).toBeInTheDocument();
    expect(screen.getByText('Local preview mode is active on this machine, so the verification link opens directly here instead of waiting for a mailbox delivery.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open Verification Link' }));

    expect(openSpy).toHaveBeenCalledWith('http://localhost:5000/preview/verify-email', '_blank', 'noopener,noreferrer');

    openSpy.mockRestore();
  });

  it('shows the send fallback message when the first verification request fails', async () => {
    const user = userEvent.setup();

    mocks.user = {
      ...mocks.user,
      isEmailVerified: false
    };
    mocks.resendVerificationMock.mockRejectedValue({});

    renderDashboardSecurity('/dashboard/security?section=verification');

    await user.click(screen.getByRole('button', { name: 'Verify Email' }));

    expect(await screen.findByText('Unable to send verification email right now.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify Email' })).toBeInTheDocument();
  });

  it('restores resend state from session storage and shows the resend fallback message on failure', async () => {
    const user = userEvent.setup();

    mocks.user = {
      ...mocks.user,
      isEmailVerified: false
    };
    window.sessionStorage.setItem(verificationStorageKey, 'true');
    mocks.resendVerificationMock.mockRejectedValue({});

    renderDashboardSecurity('/dashboard/security?section=verification');

    expect(await screen.findByRole('button', { name: 'Resend Verification' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resend Verification' }));

    expect(await screen.findByText('Unable to resend verification email right now.')).toBeInTheDocument();
    expect(window.sessionStorage.getItem(verificationStorageKey)).toBe('true');
  });
});
