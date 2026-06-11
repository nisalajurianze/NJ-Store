import type { AdminPermission } from '@njstore/types';
import { adminPermissionGroups, adminPermissions } from '@njstore/types';
import { Button, Modal } from '@njstore/ui';
import { getAdminPermissionLabel, readOnlyAdminPermissions } from '../../utils/adminPermissions';
import type { UserRecord } from './types';

interface AdminAccessModalProps {
  managingUser: UserRecord | null;
  isManagingSelf: boolean;
  selectedPermissions: AdminPermission[];
  requiredSelfPermissions: AdminPermission[];
  onSelectedPermissionsChange: (permissions: AdminPermission[]) => void;
  onClose: () => void;
  onSave: () => void;
}

export const AdminAccessModal = ({
  managingUser,
  isManagingSelf,
  selectedPermissions,
  requiredSelfPermissions,
  onSelectedPermissionsChange,
  onClose,
  onSave
}: AdminAccessModalProps): JSX.Element => (
  <Modal isOpen={Boolean(managingUser)} title={managingUser ? `Admin Access: ${managingUser.name}` : 'Admin Access'} onClose={onClose} size="lg">
    {managingUser ? (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white">{managingUser.email}</p>
            <p className="mt-1.5 text-sm leading-6 text-gray-400">
              Choose which areas this admin can access. Staff accounts always use the fixed orders-only preset and cannot be customized here.
            </p>
            {isManagingSelf ? (
              <p className="mt-1.5 text-sm leading-6 text-gold">
                Your own admin account must keep View users and Edit users so you can always reopen this access screen.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                onSelectedPermissionsChange([
                  ...new Set(isManagingSelf ? [...readOnlyAdminPermissions, ...requiredSelfPermissions] : [...readOnlyAdminPermissions])
                ])
              }
            >
              Read Only
            </Button>
            <Button type="button" size="sm" onClick={() => onSelectedPermissionsChange([...adminPermissions])}>
              Full Access
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {adminPermissionGroups.map((group) => (
            <section key={group.key} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3">
                <h3 className="font-medium text-white">{group.label}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">{group.permissions.length} permission slots</p>
              </div>
              <div className="space-y-3">
                {group.permissions.map((permission) => {
                  const isRequiredSelfPermission = isManagingSelf && requiredSelfPermissions.includes(permission);

                  return (
                    <label
                      key={permission}
                      className={`flex items-start gap-3 rounded-2xl border px-3.5 py-2.5 text-sm transition-colors ${
                        selectedPermissions.includes(permission) ? 'border-gold/30 bg-gold/10 text-white' : 'border-white/10 bg-white/[0.02] text-gray-300'
                      } ${isRequiredSelfPermission ? 'ring-1 ring-gold/20' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-white/15 bg-dark-light accent-[#d4af37]"
                        checked={selectedPermissions.includes(permission)}
                        disabled={isRequiredSelfPermission}
                        onChange={() =>
                          onSelectedPermissionsChange(
                            selectedPermissions.includes(permission)
                              ? selectedPermissions.filter((entry) => entry !== permission)
                              : [...selectedPermissions, permission]
                          )
                        }
                      />
                      <div>
                        <p className="font-medium text-white">{getAdminPermissionLabel(permission)}</p>
                        <p className="mt-1 text-xs text-gray-500">{permission}</p>
                        {isRequiredSelfPermission ? <p className="mt-1 text-xs text-gold">Required on your own admin account</p> : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-400">
            {selectedPermissions.length} of {adminPermissions.length} permissions selected
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave}>
              Save Access
            </Button>
          </div>
        </div>
      </div>
    ) : null}
  </Modal>
);
