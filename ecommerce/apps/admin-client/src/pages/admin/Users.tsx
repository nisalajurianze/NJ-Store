import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdminPermission } from '@njstore/types';
import { adminPermissions, staffDefaultPermissions } from '@njstore/types';
import { Button } from '@njstore/ui';
import { formatCurrency } from '@njstore/utils';
import toast from 'react-hot-toast';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminService } from '../../services/adminService';
import { AdminAccessModal } from '../../components/users/AdminAccessModal';
import { AdminSearchBar } from '../../components/ui/AdminSearchBar';
import { UserDetailModal } from '../../components/users/UserDetailModal';
import { UserListTable } from '../../components/users/UserListTable';
import {
  AdminControlPanel,
  AdminInlineNotice,
  AdminPageHeader,
  AdminStatGrid,
  adminFormFieldClassName
} from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';
import { getEffectiveAdminPermissions } from '../../utils/adminPermissions';
import type { LoginHistoryRecord, RoleOption, UserOrderStats, UserRecord } from '../../components/users/types';

type VerificationFilter = 'all' | 'verified' | 'unverified';
type BulkUserAction = 'activate' | 'deactivate' | 'make_customer' | 'make_staff' | 'make_admin';

interface ListQueryResult<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type UserListRecord = UserRecord & { orderStats?: UserOrderStats };

const selfManagedAdminPermissions: AdminPermission[] = ['user:read', 'user:write'];
const emptyUserOrderStats: UserOrderStats = {
  totalOrders: 0,
  totalSpend: 0,
  lastOrderAt: undefined as string | undefined
};
const roleOptions: RoleOption[] = [
  {
    value: 'customer',
    label: 'Customer',
    description: 'Storefront-only account',
    support: 'No admin workspace access.'
  },
  {
    value: 'staff',
    label: 'Staff',
    description: 'Orders workspace access',
    support: 'Limited to the default order-management preset.'
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full workspace account',
    support: 'Can be narrowed with granular permissions.'
  }
];

const getEffectivePermissions = (user: UserRecord): AdminPermission[] => getEffectiveAdminPermissions(user);

const getRoleBadgeVariant = (role: UserRecord['role']): 'info' | 'warning' | 'default' => {
  if (role === 'admin') {
    return 'info';
  }

  if (role === 'staff') {
    return 'warning';
  }

  return 'default';
};

const getAccessSummary = (user: UserRecord): string => {
  if (user.role === 'customer') {
    return 'Customer account';
  }

  const permissions = getEffectivePermissions(user);
  if (permissions.length === 0) {
    return user.role === 'staff' ? 'No staff page access' : 'No admin page access';
  }

  if (
    user.role === 'staff' &&
    permissions.length === staffDefaultPermissions.length &&
    staffDefaultPermissions.every((permission) => permissions.includes(permission))
  ) {
    return 'Staff access (orders only)';
  }

  if (permissions.length === adminPermissions.length) {
    return 'Full admin access';
  }

  const isReadOnly = permissions.every((permission) => permission.endsWith(':read'));
  if (user.role === 'staff') {
    return isReadOnly ? `Read-only staff (${permissions.length} permissions)` : `Staff access (${permissions.length} permissions)`;
  }

  return isReadOnly ? `Read-only admin (${permissions.length} permissions)` : `${permissions.length} permissions`;
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return 'Not available';
  }

  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return value;
  }

  return parsedValue.toLocaleString();
};

const formatAuthProvider = (value: UserRecord['authProvider']): string => {
  if (value === 'google') {
    return 'Google';
  }

  return 'Email and password';
};

const getRoleMutationCopy = (nextRole: UserRecord['role']): string => {
  if (nextRole === 'admin') {
    return 'User promoted to admin';
  }

  if (nextRole === 'staff') {
    return 'User changed to staff';
  }

  return 'User changed to customer';
};

const getVerificationBadgeLabel = (user: UserRecord): string => (user.isEmailVerified ? 'Verified' : 'Unverified');

const getBulkActionLabel = (value: BulkUserAction): string => {
  switch (value) {
    case 'activate':
      return 'Activate accounts';
    case 'deactivate':
      return 'Deactivate accounts';
    case 'make_customer':
      return 'Move to customer';
    case 'make_staff':
      return 'Move to staff';
    case 'make_admin':
      return 'Move to admin';
    default:
      return 'Apply action';
  }
};

export const Users = (): JSX.Element => {
  const { hasPermissions } = useAdminPermissions();
  const { user: currentAdmin, refreshSession } = useAdminAuth();
  const canReadOrders = hasPermissions('order:read');
  const canWriteUsers = hasPermissions('user:write');
  const canDeleteUsers = hasPermissions('user:delete');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRecord['role']>('all');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');
  const [managingUser, setManagingUser] = useState<UserRecord | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermission[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkUserAction, setBulkUserAction] = useState<BulkUserAction>('activate');
  const [isApplyingBulkUserAction, setIsApplyingBulkUserAction] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const users = useQuery<ListQueryResult<UserListRecord>>({
    queryKey: ['admin', 'users', 'all', deferredSearchTerm, showInactive, roleFilter, verificationFilter],
    queryFn: async () =>
      (await adminService.users<UserListRecord>({
        search: deferredSearchTerm.trim() || undefined,
        includeInactive: showInactive,
        role: roleFilter === 'all' ? undefined : roleFilter,
        verification: verificationFilter === 'all' ? undefined : verificationFilter,
        limit: 50
      })) as ListQueryResult<UserListRecord>
  });
  const [detailUser, setDetailUser] = useState<UserRecord | null>(null);
  const loginHistory = useQuery<ListQueryResult<LoginHistoryRecord>>({
    queryKey: ['admin', 'users', detailUser?.id, 'login-history'],
    queryFn: async () => {
      if (!detailUser) {
        return { data: [] };
      }

      return (await adminService.userLoginHistory(detailUser.id)) as ListQueryResult<LoginHistoryRecord>;
    },
    enabled: Boolean(detailUser)
  });
  const userItems = users.data?.data ?? [];
  const filteredUsers = userItems;
  const totalUserCount = users.data?.pagination?.total ?? userItems.length;
  const isUserResultTruncated = totalUserCount > userItems.length;
  const loginEntries = loginHistory.data?.data ?? [];
  const adminCount = userItems.filter((user) => user.role === 'admin').length;
  const staffCount = userItems.filter((user) => user.role === 'staff').length;
  const customerCount = userItems.filter((user) => user.role === 'customer').length;
  const workspaceCount = adminCount + staffCount;
  const activeCount = userItems.filter((user) => user.isActive !== false).length;
  const inactiveCount = userItems.filter((user) => user.isActive === false).length;
  const unverifiedCount = userItems.filter((user) => !user.isEmailVerified).length;
  const selectableFilteredUsers = useMemo(() => filteredUsers.filter((user) => user.id !== currentAdmin?.id), [currentAdmin?.id, filteredUsers]);
  const selectedUsers = useMemo(() => userItems.filter((user) => selectedUserIds.has(user.id)), [selectedUserIds, userItems]);
  const selectedVisibleCount = selectableFilteredUsers.filter((user) => selectedUserIds.has(user.id)).length;
  const allVisibleSelected = selectableFilteredUsers.length > 0 && selectedVisibleCount === selectableFilteredUsers.length;

  const getUserOrderStats = (user: UserRecord): UserOrderStats =>
    userItems.find((candidate) => candidate.id === user.id)?.orderStats ?? emptyUserOrderStats;

  const detailUserOrderStats = detailUser ? getUserOrderStats(detailUser) : emptyUserOrderStats;
  const isManagingSelf = Boolean(managingUser && currentAdmin?.id === managingUser.id);
  const activeFiltersLabel = [roleFilter === 'all' ? 'All roles' : `${roleFilter} only`, verificationFilter === 'all' ? 'All verification states' : verificationFilter]
    .join(' • ');
  const loginHistoryErrorMessage = loginHistory.isError
    ? getApiErrorMessage(loginHistory.error, 'Unable to load sign-in history right now.')
    : undefined;

  useEffect(() => {
    setSelectedUserIds((current) => {
      const next = new Set<string>();
      current.forEach((userId) => {
        if (userItems.some((user) => user.id === userId) && userId !== currentAdmin?.id) {
          next.add(userId);
        }
      });

      if (next.size === current.size && [...next].every((userId) => current.has(userId))) {
        return current;
      }

      return next;
    });
  }, [currentAdmin?.id, userItems]);

  const closePermissionModal = (): void => {
    setManagingUser(null);
    setSelectedPermissions([]);
  };

  const closeDetailModal = (): void => {
    setDetailUser(null);
  };

  const openPermissionModal = (user: UserRecord): void => {
    if (user.role !== 'admin') {
      return;
    }

    setManagingUser(user);
    setSelectedPermissions(getEffectivePermissions(user));
  };

  const handleRoleChange = async (user: UserRecord, nextRole: UserRecord['role']): Promise<void> => {
    if (user.role === nextRole) {
      return;
    }

    try {
      const result = await adminService.updateUser(
        user.id,
        nextRole === 'customer'
          ? {
              role: nextRole,
              permissions: []
            }
          : { role: nextRole }
      );
      const updatedUser = (result?.data ??
        ({
          ...user,
          role: nextRole,
          permissions: nextRole === 'customer' ? [] : getEffectiveAdminPermissions({ role: nextRole })
        } satisfies UserRecord)) as UserRecord;
      toast.success(getRoleMutationCopy(nextRole));

      if (detailUser?.id === user.id) {
        setDetailUser(updatedUser);
      }

      if (managingUser?.id === user.id) {
        if (updatedUser.role !== 'admin') {
          closePermissionModal();
        } else {
          setManagingUser(updatedUser);
          setSelectedPermissions(getEffectivePermissions(updatedUser));
        }
      }

      await users.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update this user right now.'));
    }
  };

  const handleDeactivateUser = async (user: UserRecord): Promise<void> => {
    if (!window.confirm(`Deactivate "${user.name}"? They will disappear from the active list but can still be restored.`)) {
      return;
    }

    try {
      await adminService.deleteUser(user.id);
      setShowInactive(true);
      toast.success('User deactivated. Inactive items are now visible.');
      await users.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to deactivate this user right now.'));
    }
  };

  const handleRestoreUser = async (user: UserRecord): Promise<void> => {
    try {
      await adminService.updateUser(user.id, { isActive: true });
      toast.success('User restored');
      await users.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to restore this user right now.'));
    }
  };

  const handleDeleteUser = async (user: UserRecord): Promise<void> => {
    if (
      !window.confirm(
        `Permanently delete "${user.name}"? This cannot be undone. Users with orders or reviews must be deactivated instead.`
      )
    ) {
      return;
    }

    try {
      await adminService.permanentlyDeleteUser(user.id);
      toast.success('User deleted permanently');
      await users.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to permanently delete this user.'));
    }
  };

  const handleSaveAdminPermissions = async (): Promise<void> => {
    if (!managingUser || managingUser.role !== 'admin') {
      return;
    }

    try {
      const permissions = [...new Set(isManagingSelf ? [...selectedPermissions, ...selfManagedAdminPermissions] : selectedPermissions)];

      await adminService.updateUser(managingUser.id, {
        role: 'admin',
        permissions
      });
      if (isManagingSelf) {
        await refreshSession();
      }
      toast.success('Admin permissions updated');
      closePermissionModal();
      await users.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update permissions right now.'));
    }
  };

  const toggleSelectedUser = (userId: string): void => {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSelectVisibleUsers = (): void => {
    setSelectedUserIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        selectableFilteredUsers.forEach((user) => {
          next.delete(user.id);
        });
        return next;
      }

      selectableFilteredUsers.forEach((user) => {
        next.add(user.id);
      });
      return next;
    });
  };

  const handleApplyBulkUserAction = async (): Promise<void> => {
    if (!selectedUsers.length) {
      toast.error('Select at least one user first.');
      return;
    }

    const actionableUsers = selectedUsers.filter((user) => user.id !== currentAdmin?.id);
    if (!actionableUsers.length) {
      toast.error('The current admin account cannot be changed in bulk.');
      return;
    }

    setIsApplyingBulkUserAction(true);

    try {
      const results = await Promise.allSettled(
        actionableUsers.map((user) => {
          switch (bulkUserAction) {
            case 'activate':
              return user.isActive === false ? adminService.updateUser(user.id, { isActive: true }) : Promise.resolve(null);
            case 'deactivate':
              return user.isActive === false ? Promise.resolve(null) : adminService.deleteUser(user.id);
            case 'make_customer':
              return user.role === 'customer'
                ? Promise.resolve(null)
                : adminService.updateUser(user.id, { role: 'customer', permissions: [] });
            case 'make_staff':
              return user.role === 'staff'
                ? Promise.resolve(null)
                : adminService.updateUser(user.id, { role: 'staff' });
            case 'make_admin':
              return user.role === 'admin'
                ? Promise.resolve(null)
                : adminService.updateUser(user.id, { role: 'admin' });
            default:
              return Promise.resolve(null);
          }
        })
      );

      const failedUserIds = actionableUsers
        .filter((_, index) => results[index]?.status === 'rejected')
        .map((user) => user.id);
      const successfulCount = results.length - failedUserIds.length;

      if (successfulCount > 0) {
        toast.success(
          `${getBulkActionLabel(bulkUserAction)} finished for ${successfulCount} user${successfulCount === 1 ? '' : 's'}${failedUserIds.length ? ` (${failedUserIds.length} failed)` : ''}.`
        );
      }

      if (failedUserIds.length > 0) {
        if (successfulCount === 0) {
          const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
          toast.error(getApiErrorMessage(firstFailure?.reason, 'Unable to apply the selected bulk action right now.'));
        }
        setSelectedUserIds(new Set(failedUserIds));
      } else {
        setSelectedUserIds(new Set());
      }

      if (successfulCount > 0) {
        await users.refetch();
      }
    } finally {
      setIsApplyingBulkUserAction(false);
    }
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Operations"
        title="Users"
        description="Customer accounts, staff seats, admin access control, role updates, and account status management from one workspace."
        meta={[
          {
            label: 'People loaded',
            value: userItems.length.toLocaleString(),
            support: isUserResultTruncated
              ? `Showing the first ${userItems.length.toLocaleString()} of ${totalUserCount.toLocaleString()} matching accounts.`
              : 'The full account list currently returned by the admin feed.',
            tone: 'blue'
          },
          {
            label: 'Workspace seats',
            value: workspaceCount.toLocaleString(),
            support: `${adminCount.toLocaleString()} admins and ${staffCount.toLocaleString()} staff accounts currently have workspace access.`,
            tone: 'gold'
          }
        ]}
      />
      <AdminStatGrid
        items={[
          {
            label: 'Customers',
            value: customerCount.toLocaleString(),
            support: 'Storefront-only accounts in the current result.',
            tone: 'slate'
          },
          {
            label: 'Staff',
            value: staffCount.toLocaleString(),
            support: 'Order-management accounts using the limited staff preset.',
            tone: 'blue'
          },
          {
            label: 'Admins',
            value: adminCount.toLocaleString(),
            support: 'Full workspace accounts with configurable access.',
            tone: 'gold'
          },
          {
            label: 'Active',
            value: activeCount.toLocaleString(),
            support: 'Accounts still active in the current list.',
            tone: 'emerald'
          },
          {
            label: 'Inactive',
            value: inactiveCount.toLocaleString(),
            support: 'Hidden by default until you expose them.',
            tone: inactiveCount > 0 ? 'rose' : 'slate'
          },
          {
            label: 'Unverified',
            value: unverifiedCount.toLocaleString(),
            support: 'Accounts that can be isolated for follow-up email.',
            tone: unverifiedCount > 0 ? 'rose' : 'slate'
          }
        ]}
      />
      <AdminControlPanel>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(180px,0.22fr)_minmax(220px,0.26fr)_minmax(180px,0.2fr)]">
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search users by name, email, or phone"
            label="Search users"
            resultCount={filteredUsers.length}
            totalCount={totalUserCount}
          />
          <label className="flex flex-col gap-2.5 text-sm text-gray-300">
            <span className="font-medium text-gray-200">Role</span>
            <select
              aria-label="Role filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
              className={adminFormFieldClassName}
            >
              <option value="all">All roles</option>
              <option value="customer">Customers</option>
              <option value="staff">Staff</option>
              <option value="admin">Admins</option>
            </select>
          </label>
          <label className="flex flex-col gap-2.5 text-sm text-gray-300">
            <span className="font-medium text-gray-200">Verification</span>
            <select
              aria-label="Verification filter"
              value={verificationFilter}
              onChange={(event) => setVerificationFilter(event.target.value as VerificationFilter)}
              className={adminFormFieldClassName}
            >
              <option value="all">All states</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button type="button" variant="secondary" className="w-full justify-center" onClick={() => setShowInactive((value) => !value)}>
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </Button>
          </div>
        </div>
        <AdminInlineNotice>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            {showInactive ? 'All accounts' : 'Active only'}
          </span>
          <p>
            {filteredUsers.length} loaded user{filteredUsers.length === 1 ? '' : 's'} match the current filters.
          </p>
          <p>{activeFiltersLabel}</p>
          {isUserResultTruncated ? (
            <p>
              {totalUserCount.toLocaleString()} accounts match this query, but only the first {userItems.length.toLocaleString()} are loaded. Narrow the
              search to focus this workspace view.
            </p>
          ) : null}
        </AdminInlineNotice>
        {canWriteUsers ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={toggleSelectVisibleUsers} disabled={!selectableFilteredUsers.length}>
              {allVisibleSelected ? 'Unselect Visible' : `Select Visible (${selectableFilteredUsers.length})`}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setSelectedUserIds(new Set())} disabled={!selectedUserIds.size}>
              Clear Selection
            </Button>
            <p className="text-sm text-gray-400">
              {selectedUserIds.size} selected across the current filtered view. Bulk actions skip your current admin account automatically.
            </p>
          </div>
        ) : null}
      </AdminControlPanel>

      {selectedUserIds.size > 0 && canWriteUsers ? (
        <div className="space-y-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">{selectedUserIds.size} selected</p>
              <p className="text-xs text-gray-500">Apply account status or role changes in one pass across the current selection.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={toggleSelectVisibleUsers}>
                {allVisibleSelected ? 'Clear visible' : `Select visible (${selectableFilteredUsers.length})`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds(new Set())}>
                Clear selection
              </Button>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(240px,0.7fr)_auto]">
            <label className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.24em] text-gold">Bulk action</span>
              <select
                aria-label="Bulk user action"
                value={bulkUserAction}
                onChange={(event) => setBulkUserAction(event.target.value as BulkUserAction)}
                className={adminFormFieldClassName}
              >
                <option value="activate">Activate accounts</option>
                <option value="deactivate">Deactivate accounts</option>
                <option value="make_customer">Move to customer</option>
                <option value="make_staff">Move to staff</option>
                <option value="make_admin">Move to admin</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button type="button" isLoading={isApplyingBulkUserAction} loadingLabel="Applying" onClick={() => void handleApplyBulkUserAction()}>
                {getBulkActionLabel(bulkUserAction)}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <UserListTable
        users={filteredUsers}
        currentAdminId={currentAdmin?.id}
        canReadOrders={canReadOrders}
        canWriteUsers={canWriteUsers}
        canDeleteUsers={canDeleteUsers}
        selectedUserIds={selectedUserIds}
        roleOptions={roleOptions}
        formatCurrency={formatCurrency}
        getAccessSummary={getAccessSummary}
        getRoleBadgeVariant={getRoleBadgeVariant}
        getUserOrderStats={getUserOrderStats}
        getVerificationBadgeLabel={getVerificationBadgeLabel}
        getEffectivePermissions={getEffectivePermissions}
        onToggleSelectedUser={toggleSelectedUser}
        onOpenDetails={setDetailUser}
        onOpenPermissionModal={openPermissionModal}
        onRoleChange={(user, nextRole) => void handleRoleChange(user, nextRole)}
        onRestoreUser={(user) => void handleRestoreUser(user)}
        onDeleteUser={(user) => void handleDeleteUser(user)}
        onDeactivateUser={(user) => void handleDeactivateUser(user)}
      />
      <UserDetailModal
        detailUser={detailUser}
        currentAdminId={currentAdmin?.id}
        canReadOrders={canReadOrders}
        canWriteUsers={canWriteUsers}
        detailUserOrderStats={detailUserOrderStats}
        loginEntries={loginEntries}
        isLoginHistoryLoading={loginHistory.isLoading}
        loginHistoryErrorMessage={loginHistoryErrorMessage}
        roleOptions={roleOptions}
        getRoleBadgeVariant={getRoleBadgeVariant}
        getAccessSummary={getAccessSummary}
        formatAuthProvider={formatAuthProvider}
        formatCurrency={formatCurrency}
        formatDateTime={formatDateTime}
        onClose={closeDetailModal}
        onOpenPermissionModal={openPermissionModal}
        onRoleChange={(user, nextRole) => void handleRoleChange(user, nextRole)}
      />
      <AdminAccessModal
        managingUser={managingUser}
        isManagingSelf={isManagingSelf}
        selectedPermissions={selectedPermissions}
        requiredSelfPermissions={selfManagedAdminPermissions}
        onSelectedPermissionsChange={setSelectedPermissions}
        onClose={closePermissionModal}
        onSave={() => void handleSaveAdminPermissions()}
      />
    </div>
  );
};
