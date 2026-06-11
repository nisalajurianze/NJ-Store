import { StrictMode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthPayloadDto } from '@njstore/types';

const mocks = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  registerRefreshHandlerMock: vi.fn(),
  setAccessTokenMock: vi.fn(),
  changeLanguageMock: vi.fn().mockResolvedValue(undefined),
  readStorageItemMock: vi.fn(),
  readStorageJsonMock: vi.fn(),
  writeStorageItemMock: vi.fn(),
  removeStorageItemMock: vi.fn()
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en',
      changeLanguage: mocks.changeLanguageMock
    }
  })
}));

vi.mock('../services/authService', () => ({
  authService: {
    refresh: mocks.refreshMock,
    login: vi.fn(),
    googleLogin: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    updateProfile: vi.fn(),
    updatePassword: vi.fn(),
    addAddress: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
    setDefaultAddress: vi.fn()
  }
}));

vi.mock('../services/api', () => ({
  registerRefreshHandler: mocks.registerRefreshHandlerMock,
  setAccessToken: mocks.setAccessTokenMock
}));

vi.mock('../utils/browserStorage', () => ({
  readStorageItem: mocks.readStorageItemMock,
  readStorageJson: mocks.readStorageJsonMock,
  writeStorageItem: mocks.writeStorageItemMock,
  removeStorageItem: mocks.removeStorageItemMock
}));

import { AuthProvider, useAuth } from './AuthContext';

const payload: AuthPayloadDto = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'customer',
    isEmailVerified: true,
    loyaltyPoints: 0,
    language: 'en'
  },
  addresses: [],
  sessions: [],
  tokens: {
    accessToken: 'access-token',
    expiresIn: 900
  }
};

const Consumer = (): JSX.Element => {
  const { user, accessToken, loading } = useAuth();

  return <div>{loading ? 'loading' : `${user?.email ?? 'none'}|${accessToken ?? 'none'}`}</div>;
};

describe('AuthProvider', () => {
  beforeEach(() => {
    mocks.refreshMock.mockReset();
    mocks.refreshMock.mockResolvedValue(payload);
    mocks.registerRefreshHandlerMock.mockReset();
    mocks.setAccessTokenMock.mockReset();
    mocks.changeLanguageMock.mockClear();
    mocks.readStorageItemMock.mockReset();
    mocks.readStorageItemMock.mockReturnValue('1');
    mocks.readStorageJsonMock.mockReset();
    mocks.readStorageJsonMock.mockReturnValue(null);
    mocks.writeStorageItemMock.mockReset();
    mocks.writeStorageItemMock.mockReturnValue(true);
    mocks.removeStorageItemMock.mockReset();
    mocks.removeStorageItemMock.mockReturnValue(true);
  });

  it('bootstraps the session only once under StrictMode', async () => {
    render(
      <StrictMode>
        <AuthProvider bootstrapScope="strict-mode-test">
          <Consumer />
        </AuthProvider>
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByText('test@example.com|access-token')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mocks.refreshMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.setAccessTokenMock).toHaveBeenCalledWith('access-token');
  });

  it('skips the guest refresh probe when no local session marker exists', async () => {
    mocks.readStorageItemMock.mockReturnValue(null);

    render(
      <AuthProvider bootstrapScope="no-session-test">
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('none|none')).toBeInTheDocument();
    });

    expect(mocks.refreshMock).not.toHaveBeenCalled();
    expect(mocks.setAccessTokenMock).toHaveBeenCalledWith(null);
  });

  it('restores from the same-tab auth snapshot when the refresh cookie is unavailable', async () => {
    const snapshotPayload = {
      ...payload,
      tokens: {
        accessToken: 'snapshot-token',
        expiresIn: 600
      }
    };
    mocks.refreshMock.mockRejectedValue(new Error('refresh cookie unavailable'));
    mocks.readStorageJsonMock.mockReturnValue({
      payload: snapshotPayload,
      expiresAt: Date.now() + 60_000
    });

    render(
      <AuthProvider bootstrapScope="snapshot-fallback-test">
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('test@example.com|snapshot-token')).toBeInTheDocument();
    });

    expect(mocks.refreshMock).toHaveBeenCalledTimes(1);
    expect(mocks.setAccessTokenMock).toHaveBeenCalledWith('snapshot-token');
    expect(mocks.removeStorageItemMock).not.toHaveBeenCalledWith('njstore:auth-session', 'session');
  });

  it('renders a stored auth snapshot before the background refresh settles', async () => {
    const snapshotPayload = {
      ...payload,
      tokens: {
        accessToken: 'snapshot-token',
        expiresIn: 600
      }
    };
    let resolveRefresh: (payload: AuthPayloadDto) => void = () => undefined;

    mocks.refreshMock.mockReturnValue(
      new Promise<AuthPayloadDto>((resolve) => {
        resolveRefresh = resolve;
      })
    );
    mocks.readStorageJsonMock.mockReturnValue({
      payload: snapshotPayload,
      expiresAt: Date.now() + 60_000
    });

    render(
      <AuthProvider bootstrapScope="optimistic-snapshot-test">
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('test@example.com|snapshot-token')).toBeInTheDocument();
    });

    expect(mocks.refreshMock).toHaveBeenCalledTimes(1);
    expect(mocks.writeStorageItemMock).not.toHaveBeenCalledWith(
      'njstore:auth-session-snapshot',
      expect.any(String),
      'session'
    );

    await act(async () => {
      resolveRefresh(payload);
    });

    await waitFor(() => {
      expect(screen.getByText('test@example.com|access-token')).toBeInTheDocument();
    });
  });

  it('keeps bootstrap refreshes isolated across provider scopes', async () => {
    render(
      <>
        <AuthProvider bootstrapScope="scope-a">
          <Consumer />
        </AuthProvider>
        <AuthProvider bootstrapScope="scope-b">
          <Consumer />
        </AuthProvider>
      </>
    );

    await waitFor(() => {
      expect(mocks.refreshMock).toHaveBeenCalledTimes(2);
    });
  });

  it('does not share bootstrap refresh state across provider instances by default', async () => {
    render(
      <>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </>
    );

    await waitFor(() => {
      expect(mocks.refreshMock).toHaveBeenCalledTimes(2);
    });
  });
});
