import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adminPermissions } from '@njstore/types';
import { Toaster } from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteUserMock: vi.fn(),
  hasPermissionsMock: vi.fn(),
  permanentlyDeleteUserMock: vi.fn(),
  refetchMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  updateUserMock: vi.fn(),
  useAdminAuthMock: vi.fn(),
  useQueryMock: vi.fn(),
  userLoginHistoryMock: vi.fn(),
  usersMock: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock
}));

vi.mock('../../hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    hasPermissions: mocks.hasPermissionsMock
  })
}));

vi.mock('../../context/AdminAuthContext', () => ({
  useAdminAuth: mocks.useAdminAuthMock
}));

vi.mock('../../services/adminService', () => ({
  adminService: {
    users: mocks.usersMock,
    userLoginHistory: mocks.userLoginHistoryMock,
    updateUser: mocks.updateUserMock,
    deleteUser: mocks.deleteUserMock,
    permanentlyDeleteUser: mocks.permanentlyDeleteUserMock
  }
}));

import { Users } from './Users';

const createUserRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'customer',
  isActive: true,
  isEmailVerified: true,
  loyaltyPoints: 120,
  authProvider: 'local',
  permissions: [],
  orderStats: {
    totalOrders: 0,
    totalSpend: 0
  },
  ...overrides
});

const createLoginEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'login-1',
  method: 'password',
  ipAddress: '198.51.100.24',
  userAgent: 'Codex Browser on Windows',
  rememberMe: true,
  createdAt: '2026-04-08T08:30:00.000Z',
  ...overrides
});

const buildQueryState = <T,>(data: T[] | undefined, options?: { error?: unknown; enabled?: boolean }) => {
  if (options?.enabled === false) {
    return {
      data: undefined,
      error: null,
      isError: false,
      isLoading: false,
      refetch: mocks.refetchMock
    };
  }

  if (options?.error) {
    return {
      data: undefined,
      error: options.error,
      isError: true,
      isLoading: false,
      refetch: mocks.refetchMock
    };
  }

  return {
    data: data ? { data } : { data: [] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: mocks.refetchMock
  };
};

const mockQueries = ({
  users = [],
  loginHistory = [],
  loginHistoryError
}: {
  users?: Array<Record<string, unknown>>;
  loginHistory?: Array<Record<string, unknown>>;
  loginHistoryError?: unknown;
} = {}): void => {
  mocks.useQueryMock.mockImplementation((options: { queryKey: unknown[]; enabled?: boolean }) => {
    const key = Array.isArray(options.queryKey) ? options.queryKey.join(':') : String(options.queryKey);

    if (key.startsWith('admin:users:all')) {
      const search = typeof options.queryKey[3] === 'string' ? options.queryKey[3].trim().toLowerCase() : '';
      const includeInactive = options.queryKey[4] === true;
      const role = typeof options.queryKey[5] === 'string' ? options.queryKey[5] : 'all';
      const verification = typeof options.queryKey[6] === 'string' ? options.queryKey[6] : 'all';
      const filteredUsers = users.filter((entry) => {
        if (!includeInactive && entry.isActive === false) {
          return false;
        }

        if (role !== 'all' && entry.role !== role) {
          return false;
        }

        if (verification === 'verified' && entry.isEmailVerified !== true) {
          return false;
        }

        if (verification === 'unverified' && entry.isEmailVerified === true) {
          return false;
        }

        if (!search) {
          return true;
        }

        return [entry.name, entry.email, entry.role]
          .join(' ')
          .toLowerCase()
          .includes(search);
      });

      return buildQueryState(filteredUsers, { enabled: options.enabled });
    }

    if (key.includes('login-history')) {
      return buildQueryState(loginHistory, { error: loginHistoryError, enabled: options.enabled });
    }

    return buildQueryState([], { enabled: options.enabled });
  });
};

const renderUsers = (): void => {
  render(
    <>
      <Users />
      <Toaster position="top-right" />
    </>
  );
};

describe('Admin Users page', () => {
  beforeEach(() => {
    mocks.deleteUserMock.mockReset();
    mocks.hasPermissionsMock.mockReset();
    mocks.permanentlyDeleteUserMock.mockReset();
    mocks.refetchMock.mockReset();
    mocks.refreshSessionMock.mockReset();
    mocks.updateUserMock.mockReset();
    mocks.useQueryMock.mockReset();
    mocks.userLoginHistoryMock.mockReset();
    mocks.usersMock.mockReset();
    mocks.deleteUserMock.mockResolvedValue(undefined);
    mocks.hasPermissionsMock.mockImplementation(() => true);
    mocks.permanentlyDeleteUserMock.mockResolvedValue(undefined);
    mocks.refetchMock.mockResolvedValue(undefined);
    mocks.refreshSessionMock.mockResolvedValue('token');
    mocks.updateUserMock.mockResolvedValue(undefined);
    mocks.userLoginHistoryMock.mockResolvedValue({ data: [] });
    mocks.usersMock.mockResolvedValue({ data: [] });
    mocks.useAdminAuthMock.mockReturnValue({
      user: {
        id: 'current-admin',
        name: 'Current Admin',
        email: 'current-admin@example.com',
        role: 'admin',
        permissions: adminPermissions
      },
      accessToken: 'token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: mocks.refreshSessionMock
    });
    mockQueries();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows read-only access when the admin lacks user permissions', () => {
    mocks.hasPermissionsMock.mockReturnValue(false);
    mockQueries({
      users: [
        createUserRecord({
          id: 'other-admin',
          role: 'admin',
          permissions: ['user:read']
        })
      ]
    });

    renderUsers();

    expect(screen.queryByRole('button', { name: 'Access' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make Customer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(screen.getByText('Read-only access')).toBeInTheDocument();
  });

  it('keeps self-access available so an admin can restore their own user permissions', async () => {
    const user = userEvent.setup();

    mocks.hasPermissionsMock.mockImplementation((permission: string) => permission === 'user:read');
    mocks.useAdminAuthMock.mockReturnValue({
      user: {
        id: 'self-admin',
        name: 'Admin User',
        email: 'admin@njstore.com',
        role: 'admin',
        permissions: ['user:read']
      },
      accessToken: 'token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: mocks.refreshSessionMock
    });
    mockQueries({
      users: [
        createUserRecord({
          id: 'self-admin',
          name: 'Admin User',
          email: 'admin@njstore.com',
          role: 'admin',
          permissions: ['user:read']
        })
      ]
    });

    renderUsers();

    await user.click(screen.getByRole('button', { name: 'Access' }));

    const viewUsersInput = screen.getByText('View users').closest('label')?.querySelector('input');
    const editUsersInput = screen.getByText('Edit users').closest('label')?.querySelector('input');

    expect(viewUsersInput).toBeDisabled();
    expect(editUsersInput).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Save Access' }));

    expect(mocks.updateUserMock).toHaveBeenCalledWith('self-admin', {
      role: 'admin',
      permissions: ['user:read', 'user:write']
    });
    expect(mocks.refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Admin permissions updated')).toBeInTheDocument();
  });

  it('shows customer spend, order totals, and login history in the detail modal', async () => {
    const user = userEvent.setup();

    mockQueries({
      users: [
        createUserRecord({
          orderStats: {
            totalOrders: 2,
            totalSpend: 35000,
            lastOrderAt: '2026-04-05T14:15:00.000Z'
          }
        })
      ],
      loginHistory: [createLoginEntry()]
    });

    renderUsers();

    await user.click(screen.getByRole('button', { name: 'Details' }));

    expect(screen.getByText('Total spend')).toBeInTheDocument();
    expect(screen.getByText('LKR 35,000')).toBeInTheDocument();
    expect(screen.getByText('Total orders')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Recent Sign-ins')).toBeInTheDocument();
    expect(screen.getByText('198.51.100.24')).toBeInTheDocument();
    expect(screen.getByText('Codex Browser on Windows')).toBeInTheDocument();
    expect(screen.getByText('Remembered')).toBeInTheDocument();
  });

  it('keeps broadcast and merge actions out of the users workspace', () => {
    mockQueries({
      users: [
        createUserRecord({
          id: 'keep-user',
          name: 'Primary Customer',
          email: 'primary@example.com'
        }),
        createUserRecord({
          id: 'merge-user',
          name: 'Duplicate Customer',
          email: 'duplicate@example.com',
          loyaltyPoints: 35
        })
      ]
    });

    renderUsers();

    expect(screen.queryByRole('button', { name: 'Email Segment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Merge Accounts' })).not.toBeInTheDocument();
  });

  it('changes a customer to staff with the order-only permission preset', async () => {
    const user = userEvent.setup();

    mockQueries({
      users: [createUserRecord()]
    });

    renderUsers();

    await user.click(screen.getByRole('button', { name: 'Make Staff' }));

    expect(mocks.updateUserMock).toHaveBeenCalledWith('user-1', {
      role: 'staff'
    });
    expect(await screen.findByText('User changed to staff')).toBeInTheDocument();
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('changes an admin to customer and clears admin permissions', async () => {
    const user = userEvent.setup();

    mockQueries({
      users: [
        createUserRecord({
          id: 'admin-2',
          role: 'admin',
          permissions: ['user:read', 'user:write']
        })
      ]
    });

    renderUsers();

    await user.click(screen.getByRole('button', { name: 'Make Customer' }));

    expect(mocks.updateUserMock).toHaveBeenCalledWith('admin-2', {
      role: 'customer',
      permissions: []
    });
    expect(await screen.findByText('User changed to customer')).toBeInTheDocument();
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows a success toast after deactivating an active user', async () => {
    const user = userEvent.setup();

    mockQueries({ users: [createUserRecord()] });

    renderUsers();

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Deactivate "Jane Doe"? They will disappear from the active list but can still be restored.'
    );
    expect(mocks.deleteUserMock).toHaveBeenCalledWith('user-1');
    expect(await screen.findByText('User deactivated. Inactive items are now visible.')).toBeInTheDocument();
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows a success toast after permanently deleting an inactive user', async () => {
    const user = userEvent.setup();

    mockQueries({
      users: [
        createUserRecord({
          id: 'user-inactive',
          isActive: false
        })
      ]
    });

    renderUsers();

    await user.click(screen.getByRole('button', { name: 'Show Inactive' }));
    await user.click(screen.getByRole('button', { name: 'Delete Permanently' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Permanently delete "Jane Doe"? This cannot be undone. Users with orders or reviews must be deactivated instead.'
    );
    expect(mocks.permanentlyDeleteUserMock).toHaveBeenCalledWith('user-inactive');
    expect(await screen.findByText('User deleted permanently')).toBeInTheDocument();
    expect(mocks.refetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows the API error toast when saving admin access fails', async () => {
    const user = userEvent.setup();

    mocks.updateUserMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Permission update failed'
        }
      }
    });
    mockQueries({
      users: [
        createUserRecord({
          id: 'admin-1',
          role: 'admin',
          permissions: ['user:read', 'user:write']
        })
      ]
    });

    renderUsers();

    await user.click(screen.getByRole('button', { name: 'Access' }));
    await user.click(screen.getByRole('button', { name: 'Save Access' }));

    expect(mocks.updateUserMock).toHaveBeenCalledWith('admin-1', {
      role: 'admin',
      permissions: ['user:read', 'user:write']
    });
    expect(await screen.findByText('Permission update failed')).toBeInTheDocument();
    expect(mocks.refetchMock).not.toHaveBeenCalled();
  });
});
