import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as null | {
      id: string;
      name: string;
      email: string;
      isEmailVerified: boolean;
    }
  },
  navigateMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  storageState: new Map<string, string>(),
  verifyEmailMock: vi.fn()
}));

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => mocks.storageState.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mocks.storageState.set(key, value);
    },
    removeItem: (key: string) => {
      mocks.storageState.delete(key);
    },
    clear: () => {
      mocks.storageState.clear();
    }
  }
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.authState.user,
    refreshSession: mocks.refreshSessionMock
  })
}));

vi.mock('../../services/authService', () => ({
  authService: {
    verifyEmail: mocks.verifyEmailMock
  }
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock
  };
});

import { VerifyEmail } from './VerifyEmail';

const renderVerifyEmail = (entry = '/auth/verify-email?token=verify-token'): void => {
  render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <VerifyEmail />
      <Toaster position="top-right" />
    </MemoryRouter>
  );
};

describe('VerifyEmail page', () => {
  beforeEach(() => {
    mocks.authState.user = null;
    mocks.navigateMock.mockReset();
    mocks.refreshSessionMock.mockReset();
    mocks.storageState.clear();
    mocks.verifyEmailMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the API error state when the verification token is invalid', async () => {
    mocks.verifyEmailMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'This verification link is invalid or has expired'
        }
      }
    });

    renderVerifyEmail();

    expect(await screen.findByRole('heading', { name: 'Verification Unavailable' })).toBeInTheDocument();
    expect(screen.getByText('This verification link is invalid or has expired')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to Verification' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Login' })).toBeInTheDocument();
  });

  it('shows the missing-token state without attempting email verification', async () => {
    renderVerifyEmail('/auth/verify-email');

    expect(await screen.findByRole('heading', { name: 'Verification Unavailable' })).toBeInTheDocument();
    expect(screen.getByText('This verification link is missing its token. Please request a new email verification link.')).toBeInTheDocument();
    expect(mocks.verifyEmailMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Back to Verification' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Login' })).toBeInTheDocument();
  });

  it('keeps the verification shortcut available for signed-in shoppers when verification fails', async () => {
    mocks.authState.user = {
      id: 'user-1',
      name: 'Signed In Shopper',
      email: 'shopper@example.com',
      isEmailVerified: false
    };
    mocks.verifyEmailMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'This verification link is invalid or has expired'
        }
      }
    });

    renderVerifyEmail();

    expect(await screen.findByRole('button', { name: 'Back to Verification' })).toBeInTheDocument();
  });

  it('stores the verification event and redirects signed-out shoppers back to login after success', async () => {
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    mocks.verifyEmailMock.mockResolvedValue(undefined);
    mocks.refreshSessionMock.mockResolvedValue(null);

    renderVerifyEmail();

    expect(await screen.findByRole('heading', { name: 'Email Verified' })).toBeInTheDocument();
    expect(await screen.findByText('Email verified successfully')).toBeInTheDocument();
    expect(window.localStorage.getItem('njstore:email-verified-event')).not.toBeNull();

    await waitFor(() => {
      expect(closeSpy).toHaveBeenCalled();
      expect(mocks.navigateMock).toHaveBeenCalledWith('/auth/login?verified=1', { replace: true });
    }, { timeout: 3_000 });

    closeSpy.mockRestore();
  });

  it('lets active sessions continue to the verification section after a successful email verification', async () => {
    const user = userEvent.setup();

    mocks.verifyEmailMock.mockResolvedValue(undefined);
    mocks.refreshSessionMock.mockResolvedValue('access-token');

    renderVerifyEmail();

    expect(await screen.findByRole('button', { name: 'Continue' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(mocks.verifyEmailMock).toHaveBeenCalledWith('verify-token');
    expect(mocks.navigateMock).toHaveBeenCalledWith('/dashboard/security?section=verification', { replace: true });
  });
});
