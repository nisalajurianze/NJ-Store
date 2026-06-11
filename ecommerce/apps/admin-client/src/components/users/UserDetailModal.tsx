import { Badge, Button, Modal } from '@njstore/ui';
import type { LoginHistoryRecord, RoleOption, UserOrderStats, UserRecord } from './types';

interface UserDetailModalProps {
  detailUser: UserRecord | null;
  currentAdminId?: string;
  canReadOrders: boolean;
  canWriteUsers: boolean;
  detailUserOrderStats: UserOrderStats;
  loginEntries: LoginHistoryRecord[];
  isLoginHistoryLoading: boolean;
  loginHistoryErrorMessage?: string;
  roleOptions: RoleOption[];
  getRoleBadgeVariant: (role: UserRecord['role']) => 'info' | 'warning' | 'default';
  getAccessSummary: (user: UserRecord) => string;
  formatAuthProvider: (value: UserRecord['authProvider']) => string;
  formatCurrency: (value: number) => string;
  formatDateTime: (value?: string) => string;
  onClose: () => void;
  onOpenPermissionModal: (user: UserRecord) => void;
  onRoleChange: (user: UserRecord, nextRole: UserRecord['role']) => void;
}

export const UserDetailModal = ({
  detailUser,
  currentAdminId,
  canReadOrders,
  canWriteUsers,
  detailUserOrderStats,
  loginEntries,
  isLoginHistoryLoading,
  loginHistoryErrorMessage,
  roleOptions,
  getRoleBadgeVariant,
  getAccessSummary,
  formatAuthProvider,
  formatCurrency,
  formatDateTime,
  onClose,
  onOpenPermissionModal,
  onRoleChange
}: UserDetailModalProps): JSX.Element => (
  <Modal isOpen={Boolean(detailUser)} title={detailUser ? `User Details: ${detailUser.name}` : 'User Details'} onClose={onClose} size="xl">
    {detailUser ? (
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <section className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getRoleBadgeVariant(detailUser.role)} className="capitalize">
                    {detailUser.role}
                  </Badge>
                  <Badge variant={detailUser.isActive === false ? 'danger' : 'success'}>
                    {detailUser.isActive === false ? 'Inactive' : 'Active'}
                  </Badge>
                  <Badge variant={detailUser.isEmailVerified ? 'success' : 'warning'}>
                    {detailUser.isEmailVerified ? 'Email verified' : 'Email unverified'}
                  </Badge>
                </div>
                <p className="mt-3 text-lg font-medium text-white">{detailUser.name}</p>
                <p className="mt-1 text-sm text-gray-400">{detailUser.email}</p>
                {detailUser.phone ? <p className="mt-1 text-sm text-gray-500">{detailUser.phone}</p> : null}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-sm sm:max-w-[18rem]">
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Access profile</p>
                <p className="mt-2 font-medium text-white">{getAccessSummary(detailUser)}</p>
                <p className="mt-2 text-xs leading-5 text-gray-400">Auth provider: {formatAuthProvider(detailUser.authProvider)}</p>
                {detailUser.role === 'admin' && (canWriteUsers || currentAdminId === detailUser.id) ? (
                  <Button type="button" size="sm" variant="secondary" className="mt-3 justify-center" onClick={() => onOpenPermissionModal(detailUser)}>
                    Manage Admin Permissions
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Total spend',
                  value: canReadOrders ? formatCurrency(detailUserOrderStats.totalSpend) : 'Restricted',
                  support: canReadOrders ? 'Confirmed order revenue linked to this account.' : 'Needs order read access.'
                },
                {
                  label: 'Total orders',
                  value: canReadOrders ? detailUserOrderStats.totalOrders.toLocaleString() : 'Restricted',
                  support: canReadOrders ? 'Every admin-visible order tied to this customer.' : 'Needs order read access.'
                },
                {
                  label: 'Last order',
                  value: canReadOrders ? (detailUserOrderStats.lastOrderAt ? formatDateTime(detailUserOrderStats.lastOrderAt) : 'No orders yet') : 'Restricted',
                  support: canReadOrders ? 'Most recent order timestamp.' : 'Needs order read access.'
                },
                {
                  label: 'Loyalty points',
                  value: detailUser.loyaltyPoints.toLocaleString(),
                  support: 'Current balance on the user record.'
                }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{item.label}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-white">{item.value}</p>
                  <p className="mt-2 text-xs leading-5 text-gray-400">{item.support}</p>
                </div>
              ))}
            </div>

            {!canReadOrders ? (
              <p className="mt-4 text-sm leading-6 text-gray-400">
                Order totals stay hidden in this session because the current workspace account does not have order read access.
              </p>
            ) : null}
          </section>

          <section className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-white">Recent Sign-ins</h3>
                <p className="mt-1 text-sm leading-6 text-gray-400">Last 10 recorded login events with IP and device details.</p>
              </div>
              <Badge variant="default" className="bg-white/[0.06] text-gray-300">
                {loginEntries.length}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {isLoginHistoryLoading ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-sm text-gray-400">Loading recent sign-ins...</p>
              ) : loginHistoryErrorMessage ? (
                <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-3.5 py-3 text-sm text-red-100">{loginHistoryErrorMessage}</p>
              ) : loginEntries.length > 0 ? (
                loginEntries.map((entry) => (
                  <article key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={entry.method === 'google' ? 'info' : 'default'}>
                        {entry.method === 'google' ? 'Google sign-in' : entry.method === 'session' ? 'Session recorded' : 'Password sign-in'}
                      </Badge>
                      {entry.rememberMe ? (
                        <Badge variant="default" className="bg-white/[0.06] text-gray-300">
                          Remembered
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-medium text-white">{formatDateTime(entry.createdAt)}</p>
                    <p className="mt-1 text-xs text-gray-500">{entry.ipAddress ?? 'IP address not captured'}</p>
                    <p className="mt-2 break-words text-sm leading-6 text-gray-300">{entry.userAgent?.trim() || 'Device information not available'}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-sm text-gray-400">
                  No recorded sign-ins are available for this account yet.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-medium text-white">Role Management</h3>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                Choose whether this account stays customer-only, uses the limited staff preset, or becomes a configurable admin account.
              </p>
            </div>
            <Badge variant="default" className="bg-white/[0.06] text-gray-300">
              {detailUser.role === 'staff' ? 'Orders only preset' : 'Workspace role'}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {roleOptions.map((option) => {
              const isCurrentRole = detailUser.role === option.value;
              const isSelfAccount = currentAdminId === detailUser.id;

              return (
                <div
                  key={option.value}
                  className={`rounded-[20px] border p-4 ${isCurrentRole ? 'border-gold/30 bg-gold/[0.12]' : 'border-white/10 bg-white/[0.02]'}`}
                >
                  <p className={`text-[11px] uppercase tracking-[0.22em] ${isCurrentRole ? 'text-gold' : 'text-gray-500'}`}>{option.label}</p>
                  <p className="mt-2 font-medium text-white">{option.description}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{option.support}</p>
                  <div className="mt-4">
                    <Button
                      type="button"
                      size="sm"
                      variant={isCurrentRole ? 'secondary' : 'primary'}
                      className="justify-center"
                      disabled={isCurrentRole || !canWriteUsers || isSelfAccount}
                      onClick={() => onRoleChange(detailUser, option.value)}
                    >
                      {isCurrentRole ? 'Current Role' : `Make ${option.label}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {currentAdminId === detailUser.id ? (
            <p className="mt-4 text-sm leading-6 text-gold">
              Your own workspace role cannot be changed from this screen. Use the access modal to recover required admin permissions when needed.
            </p>
          ) : null}
        </section>
      </div>
    ) : null}
  </Modal>
);
