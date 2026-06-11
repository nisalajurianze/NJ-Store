import type { AdminPermission } from '@njstore/types';
import { getFirstAccessibleAdminPath, getVisibleAdminNavigationLinks } from '../config/adminNavigation';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getEffectiveAdminPermissions, hasAllAdminPermissions } from '../utils/adminPermissions';

export const useAdminPermissions = () => {
  const { user } = useAdminAuth();
  const permissions = getEffectiveAdminPermissions(user);
  const accessibleLinks = getVisibleAdminNavigationLinks(permissions);
  const fallbackPath = getFirstAccessibleAdminPath(permissions);

  return {
    permissions,
    accessibleLinks,
    fallbackPath,
    hasPermissions: (...requiredPermissions: AdminPermission[]) => hasAllAdminPermissions(permissions, requiredPermissions)
  };
};
