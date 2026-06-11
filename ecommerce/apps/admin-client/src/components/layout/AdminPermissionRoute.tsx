import type { AdminPermission } from '@njstore/types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { AdminAccessLimitedState } from './AdminAccessLimitedState';

interface AdminPermissionRouteProps {
  children: JSX.Element;
  requiredPermissions: readonly AdminPermission[];
}

export const AdminPermissionRoute = ({
  children,
  requiredPermissions
}: AdminPermissionRouteProps): JSX.Element => {
  const location = useLocation();
  const { fallbackPath, hasPermissions } = useAdminPermissions();

  if (hasPermissions(...requiredPermissions)) {
    return children;
  }

  if (fallbackPath && fallbackPath !== location.pathname) {
    return <Navigate to={fallbackPath} replace />;
  }

  return (
    <div className="pt-4 sm:pt-5">
      <AdminAccessLimitedState />
    </div>
  );
};
