import { Badge, Button } from '@njstore/ui';
import { AdminDataGrid } from '../ui/AdminDataGrid';
import type { RoleOption, UserOrderStats, UserRecord } from './types';

const usersTableGridClass =
  'grid min-w-[1020px] grid-cols-[28px_minmax(0,1.3fr)_minmax(0,0.94fr)_minmax(0,0.7fr)_minmax(250px,1.06fr)] items-start gap-4 lg:min-w-0 lg:grid-cols-[28px_minmax(0,1.2fr)_minmax(0,0.88fr)_minmax(0,0.66fr)_minmax(250px,1fr)] lg:gap-3';

interface UserListTableProps {
  users: UserRecord[];
  currentAdminId?: string;
  canReadOrders: boolean;
  canWriteUsers: boolean;
  canDeleteUsers: boolean;
  selectedUserIds: Set<string>;
  roleOptions: RoleOption[];
  formatCurrency: (value: number) => string;
  getAccessSummary: (user: UserRecord) => string;
  getRoleBadgeVariant: (role: UserRecord['role']) => 'info' | 'warning' | 'default';
  getUserOrderStats: (user: UserRecord) => UserOrderStats;
  getVerificationBadgeLabel: (user: UserRecord) => string;
  getEffectivePermissions: (user: UserRecord) => string[];
  onToggleSelectedUser: (userId: string) => void;
  onOpenDetails: (user: UserRecord) => void;
  onOpenPermissionModal: (user: UserRecord) => void;
  onRoleChange: (user: UserRecord, nextRole: UserRecord['role']) => void;
  onRestoreUser: (user: UserRecord) => void;
  onDeleteUser: (user: UserRecord) => void;
  onDeactivateUser: (user: UserRecord) => void;
}

export const UserListTable = ({
  users,
  currentAdminId,
  canReadOrders,
  canWriteUsers,
  canDeleteUsers,
  selectedUserIds,
  roleOptions,
  formatCurrency,
  getAccessSummary,
  getRoleBadgeVariant,
  getUserOrderStats,
  getVerificationBadgeLabel,
  getEffectivePermissions,
  onToggleSelectedUser,
  onOpenDetails,
  onOpenPermissionModal,
  onRoleChange,
  onRestoreUser,
  onDeleteUser,
  onDeactivateUser
}: UserListTableProps): JSX.Element => (
  <AdminDataGrid
    headers={['Select', 'User', 'Role & Access', 'Status', 'Actions']}
    gridClassName={usersTableGridClass}
    hasRows={users.length > 0}
    emptyMessage="No users matched that search."
  >
    {users.map((user) => {
      const isSelfAccount = currentAdminId === user.id;
      const canOpenAccess = user.role === 'admin' && (canWriteUsers || isSelfAccount);
      const canChangeRole = canWriteUsers && !isSelfAccount;
      const userOrderStats = getUserOrderStats(user);
      const permissions = getEffectivePermissions(user);

      return (
        <div key={user.id} className={`${usersTableGridClass} border-b border-white/5 px-5 py-4 text-sm text-gray-300 last:border-b-0 sm:px-6`}>
          <div className="pt-1">
            <input
              type="checkbox"
              aria-label={`Select ${user.name}`}
              className="h-4 w-4 rounded border-white/20 bg-dark-light text-gold accent-gold focus:ring-gold/30"
              checked={selectedUserIds.has(user.id)}
              disabled={!canWriteUsers || isSelfAccount}
              onChange={() => onToggleSelectedUser(user.id)}
            />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
            {canReadOrders && userOrderStats.totalOrders > 0 ? (
              <p className="text-xs text-gold" title="Lifetime order value">
                LTV: {formatCurrency(userOrderStats.totalSpend)}
              </p>
            ) : null}
            {canReadOrders && userOrderStats.totalOrders > 0 ? (
              <p className="text-xs text-gray-500">
                {userOrderStats.totalOrders} order{userOrderStats.totalOrders === 1 ? '' : 's'}
              </p>
            ) : null}
            {isSelfAccount ? <p className="text-xs text-gold">Current admin account</p> : null}
          </div>
          <div className="space-y-2">
            <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
              {user.role}
            </Badge>
            <p className="text-xs leading-5 text-gray-500">{getAccessSummary(user)}</p>
            {user.role !== 'customer' ? (
              <div className="flex flex-wrap gap-1.5">
                {permissions.slice(0, 3).map((permission) => (
                  <Badge key={permission} variant="default" className="bg-white/[0.06] text-[10px] text-gray-300">
                    {permission}
                  </Badge>
                ))}
                {permissions.length > 3 ? (
                  <Badge variant="default" className="bg-white/[0.06] text-[10px] text-gray-300">
                    +{permissions.length - 3}
                  </Badge>
                ) : null}
              </div>
            ) : null}
            {canChangeRole ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {roleOptions
                  .filter((option) => option.value !== user.role)
                  .map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onRoleChange(user, option.value)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-gray-300 transition-colors hover:border-gold/25 hover:text-white"
                    >
                      Make {option.label}
                    </button>
                  ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Badge variant={user.isActive === false ? 'danger' : 'success'}>{user.isActive === false ? 'Inactive' : 'Active'}</Badge>
            <Badge variant={user.isEmailVerified ? 'success' : 'warning'}>{getVerificationBadgeLabel(user)}</Badge>
          </div>
          <div className="grid w-full max-w-[250px] grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" className="justify-center" onClick={() => onOpenDetails(user)}>
              Details
            </Button>
            {canOpenAccess ? (
              <Button size="sm" variant="secondary" className="justify-center" onClick={() => onOpenPermissionModal(user)}>
                Access
              </Button>
            ) : null}
            {user.isActive === false ? (
              <>
                {canWriteUsers && !isSelfAccount ? (
                  <Button size="sm" className="justify-center" onClick={() => onRestoreUser(user)}>
                    Restore
                  </Button>
                ) : null}
                {canDeleteUsers && !isSelfAccount ? (
                  <Button size="sm" variant="danger" className="col-span-2 justify-center" onClick={() => onDeleteUser(user)}>
                    Delete Permanently
                  </Button>
                ) : null}
              </>
            ) : canDeleteUsers && !isSelfAccount ? (
              <Button size="sm" variant="danger" className="justify-center" onClick={() => onDeactivateUser(user)}>
                Deactivate
              </Button>
            ) : null}
            {!canOpenAccess && !canWriteUsers && !canDeleteUsers ? <p className="col-span-2 text-xs text-gray-500">Read-only access</p> : null}
          </div>
        </div>
      );
    })}
  </AdminDataGrid>
);
