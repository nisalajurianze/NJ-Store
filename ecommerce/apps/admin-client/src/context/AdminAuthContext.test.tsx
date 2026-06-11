import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthPayloadDto } from '@njstore/types';

const mocks = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  loginMock: vi.fn(),
  logoutMock: vi.fn(),
  registerRefreshHandlerMock: vi.fn(),
  setAccessTokenMock: vi.fn(),
  readStorageItemMock: vi.fn(),
  readStorageJsonMock: vi.fn(),
  writeStorageItemMock: vi.fn(),
  removeStorageItemMock: vi.fn()
}));

vi.mock('../services/authService', () => ({
  authService: {
    refresh: mocks.refreshMock,
    login: mocks.loginMock,
    logout: mocks.logoutMock
  }
}));

vi.mock('../services/api', () => ({
  registerRefreshHandler: mocks.registerRefreshHandlerMock,
  setAccessToken: mocks.setAccessTokenMock
}));

vi.mock('@njstore/utils', async () => {
  const actual = await vi.importActual<typeof import('@njstore/utils')>('@njstore/utils');

  return {
    ...actual,
    readStorageItem: mocks.readStorageItemMock,
    readStorageJson: mocks.readStorageJsonMock,
    writeStorageItem: mocks.writeStorageItemMock,
    removeStorageItem: mocks.removeStorageItemMock
  };
});

import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext';

const adminPayload: AuthPayloadDto = {
  user: {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    isEmailVerified: true,
    loyaltyPoints: 0,
    language: 'en'
  },
  addresses: [],
  sessions: [],
  tokens: {
    accessToken: 'fresh-token',
    expiresIn: 900
  }
};

const renderWithAdminAuth = (): ReturnType<typeof render> => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  const Consumer = (): JSX.Element => {
    const { accessToken, loading, user } = useAdminAuth();

    return <div>{loading ? 'loading' : `${user?.email ?? 'none'}|${accessToken ?? 'none'}`}</div>;
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <Consumer />
      </AdminAuthProvider>
    </QueryClientProvider>
  );
};

describe('AdminAuthProvider', () => {
  beforeEach(() => {
    mocks.refreshMock.mockReset();
    mocks.refreshMock.mockResolvedValue(adminPayload);
    mocks.loginMock.mockReset();
    mocks.logoutMock.mockReset();
    mocks.registerRefreshHandlerMock.mockReset();
    mocks.setAccessTokenMock.mockReset();
    mocks.readStorageItemMock.mockReset();
    mocks.readStorageItemMock.mockReturnValue('1');
    mocks.readStorageJsonMock.mockReset();
    mocks.readStorageJsonMock.mockReturnValue(null);
    mocks.writeStorageItemMock.mockReset();
    mocks.writeStorageItemMock.mockReturnValue(true);
    mocks.removeStorageItemMock.mockReset();
    mocks.removeStorageItemMock.mockReturnValue(true);
  });

  it('skips the guest admin refresh probe when no local session marker exists', async () => {
    mocks.readStorageItemMock.mockReturnValue(null);

    renderWithAdminAuth();

    await waitFor(() => {
      expect(screen.getByText('none|none')).toBeInTheDocument();
    });

    expect(mocks.refreshMock).not.toHaveBeenCalled();
    expect(mocks.setAccessTokenMock).toHaveBeenCalledWith(null);
  });

  it('renders a stored admin auth snapshot while refresh runs in the background', async () => {
    const snapshotPayload = {
      ...adminPayload,
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

    renderWithAdminAuth();

    expect(screen.getByText('admin@example.com|snapshot-token')).toBeInTheDocument();
    expect(mocks.setAccessTokenMock).toHaveBeenCalledWith('snapshot-token');

    await waitFor(() => {
      expect(mocks.refreshMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveRefresh(adminPayload);
    });

    await waitFor(() => {
      expect(screen.getByText('admin@example.com|fresh-token')).toBeInTheDocument();
    });
  });

  it('keeps a valid snapshot when the refresh cookie is unavailable', async () => {
    const snapshotPayload = {
      ...adminPayload,
      tokens: {
        accessToken: 'snapshot-token',
        expiresIn: 600
      }
    };

    mocks.refreshMock.mockRejectedValue(new Error('refresh failed'));
    mocks.readStorageJsonMock.mockReturnValue({
      payload: snapshotPayload,
      expiresAt: Date.now() + 60_000
    });

    renderWithAdminAuth();

    await waitFor(() => {
      expect(screen.getByText('admin@example.com|snapshot-token')).toBeInTheDocument();
    });

    expect(mocks.removeStorageItemMock).not.toHaveBeenCalledWith('njstore:admin-auth-session-snapshot', 'session');
  });

  it('drops expired snapshots before bootstrapping admin auth', async () => {
    mocks.refreshMock.mockRejectedValue(new Error('refresh failed'));
    mocks.readStorageJsonMock.mockReturnValue({
      payload: adminPayload,
      expiresAt: Date.now() - 1_000
    });

    renderWithAdminAuth();

    await waitFor(() => {
      expect(screen.getByText('none|none')).toBeInTheDocument();
    });

    expect(mocks.removeStorageItemMock).toHaveBeenCalledWith('njstore:admin-auth-session-snapshot', 'session');
    expect(mocks.setAccessTokenMock).toHaveBeenCalledWith(null);
  });
});
