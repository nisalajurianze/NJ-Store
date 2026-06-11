import type { AdminPermission, UserSummary } from '@njstore/types';
import { adminPermissions, staffDefaultPermissions } from '@njstore/types';

const adminPermissionLabels: Record<AdminPermission, string> = {
  'product:read': 'View products',
  'product:write': 'Edit products',
  'product:delete': 'Delete products',
  'brand:read': 'View brands',
  'brand:write': 'Edit brands',
  'brand:delete': 'Delete brands',
  'order:read': 'View orders',
  'order:write': 'Update orders',
  'order:delete': 'Delete orders',
  'user:read': 'View users',
  'user:write': 'Edit users',
  'user:delete': 'Deactivate or delete users',
  'category:read': 'View categories',
  'category:write': 'Edit categories',
  'category:delete': 'Delete categories',
  'setting:read': 'View settings',
  'setting:write': 'Update settings',
  'coupon:read': 'View coupons',
  'coupon:write': 'Edit coupons',
  'coupon:delete': 'Delete coupons'
};

type AdminUserLike = Pick<UserSummary, 'role' | 'permissions'> | null | undefined;

export const getEffectiveAdminPermissions = (user: AdminUserLike): AdminPermission[] => {
  if (!user || user.role === 'customer') {
    return [];
  }

  if (!user.permissions || user.permissions.length === 0) {
    if (user.role === 'staff') {
      return [...staffDefaultPermissions];
    }

    return [...adminPermissions];
  }

  return [...new Set(user.permissions)];
};

export const hasAllAdminPermissions = (
  grantedPermissions: readonly AdminPermission[] | undefined,
  requiredPermissions: readonly AdminPermission[] = []
): boolean => requiredPermissions.every((permission) => grantedPermissions?.includes(permission));

export const getAdminPermissionLabel = (permission: AdminPermission): string => adminPermissionLabels[permission];

export const readOnlyAdminPermissions = adminPermissions.filter((permission) => permission.endsWith(':read'));
