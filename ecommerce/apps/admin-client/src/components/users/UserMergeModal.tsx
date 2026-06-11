import { Badge, Button, Modal } from '@njstore/ui';
import { adminFormFieldClassName } from '../ui/AdminSurface';
import type { UserOrderStats, UserRecord } from './types';

interface UserMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerUsers: UserRecord[];
  keepUserId: string;
  mergeUserId: string;
  onKeepUserIdChange: (value: string) => void;
  onMergeUserIdChange: (value: string) => void;
  keepUser: UserRecord | null;
  mergeUser: UserRecord | null;
  keepUserOrderStats: UserOrderStats;
  mergeUserOrderStats: UserOrderStats;
  canReadOrders: boolean;
  formatCurrency: (value: number) => string;
  formatDateTime: (value?: string) => string;
  isMergingUsers: boolean;
  onSubmit: () => void;
}

export const UserMergeModal = ({
  isOpen,
  onClose,
  customerUsers,
  keepUserId,
  mergeUserId,
  onKeepUserIdChange,
  onMergeUserIdChange,
  keepUser,
  mergeUser,
  keepUserOrderStats,
  mergeUserOrderStats,
  canReadOrders,
  formatCurrency,
  formatDateTime,
  isMergingUsers,
  onSubmit
}: UserMergeModalProps): JSX.Element => {
  const previewCards: Array<{
    key: 'keep' | 'merge';
    title: string;
    user: UserRecord | null;
    stats: UserOrderStats;
  }> = [
    { key: 'keep', title: 'Primary account', user: keepUser, stats: keepUserOrderStats },
    { key: 'merge', title: 'Duplicate account', user: mergeUser, stats: mergeUserOrderStats }
  ];

  return (
    <Modal isOpen={isOpen} title="Merge Customer Accounts" onClose={onClose} size="lg">
      <div className="space-y-5">
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Duplicate signup recovery</p>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Keep one customer record as the primary account and fold the duplicate into it. Orders, loyalty activity, wishlist items, compare
            items, cart contents, and coupon usage move across automatically.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2.5 text-sm text-gray-300">
            <span className="font-medium text-gray-200">Keep account</span>
            <select aria-label="Keep account" value={keepUserId} onChange={(event) => onKeepUserIdChange(event.target.value)} className={adminFormFieldClassName}>
              <option value="">Choose primary customer</option>
              {customerUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2.5 text-sm text-gray-300">
            <span className="font-medium text-gray-200">Merge duplicate into keep account</span>
            <select aria-label="Merge account" value={mergeUserId} onChange={(event) => onMergeUserIdChange(event.target.value)} className={adminFormFieldClassName}>
              <option value="">Choose duplicate customer</option>
              {customerUsers
                .filter((user) => user.id !== keepUserId)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.email}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {previewCards.map(({ key, title, user, stats }) => (
            <section key={key} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{title}</p>
              {user ? (
                <>
                  <p className="mt-2 font-medium text-white">{user.name}</p>
                  <p className="mt-1 text-sm text-gray-400">{user.email}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant={user.isActive === false ? 'danger' : 'success'}>{user.isActive === false ? 'Inactive' : 'Active'}</Badge>
                    <Badge variant={user.isEmailVerified ? 'success' : 'warning'}>{user.isEmailVerified ? 'Verified' : 'Unverified'}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Orders</p>
                      <p className="mt-2 text-sm font-medium text-white">{stats.totalOrders.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Lifetime spend</p>
                      <p className="mt-2 text-sm font-medium text-white">{canReadOrders ? formatCurrency(stats.totalSpend) : 'Restricted'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Loyalty points</p>
                      <p className="mt-2 text-sm font-medium text-white">{user.loyaltyPoints.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Last order</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {canReadOrders ? (stats.lastOrderAt ? formatDateTime(stats.lastOrderAt) : 'No orders yet') : 'Restricted'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm leading-6 text-gray-400">Choose a customer above to preview what will happen during the merge.</p>
              )}
            </section>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} isLoading={isMergingUsers} loadingLabel="Merging">
            Complete Merge
          </Button>
        </div>
      </div>
    </Modal>
  );
};
