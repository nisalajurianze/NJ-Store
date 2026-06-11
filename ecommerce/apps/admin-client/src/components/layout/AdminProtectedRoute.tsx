import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminLoader } from './AdminLoader';

interface AdminProtectedRouteProps {
  children: JSX.Element;
}

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps): JSX.Element => {
  const { loading, user } = useAdminAuth();

  if (loading) {
    return <AdminLoader />;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
