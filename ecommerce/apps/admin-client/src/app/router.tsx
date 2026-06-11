import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { adminPagePermissions } from '../config/adminNavigation';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminLoader } from '../components/layout/AdminLoader';
import { AdminPermissionRoute } from '../components/layout/AdminPermissionRoute';
import { AdminProtectedRoute } from '../components/layout/AdminProtectedRoute';
import { AdminErrorBoundary } from '../components/system/AdminErrorBoundary';
import { ScrollToTop } from './ScrollToTop';

const Login = lazy(() => import('../pages/Login').then((module) => ({ default: module.Login })));
const Dashboard = lazy(() => import('../pages/admin/Dashboard').then((module) => ({ default: module.Dashboard })));
const SalesAnalysis = lazy(() => import('../pages/admin/SalesAnalysis').then((module) => ({ default: module.SalesAnalysis })));
const CustomerAnalysis = lazy(() => import('../pages/admin/CustomerAnalysis').then((module) => ({ default: module.CustomerAnalysis })));
const Products = lazy(() => import('../pages/admin/Products').then((module) => ({ default: module.Products })));
const Inventory = lazy(() => import('../pages/admin/Inventory').then((module) => ({ default: module.Inventory })));
const Brands = lazy(() => import('../pages/admin/Brands').then((module) => ({ default: module.Brands })));
const Categories = lazy(() => import('../pages/admin/Categories').then((module) => ({ default: module.Categories })));
const Orders = lazy(() => import('../pages/admin/Orders').then((module) => ({ default: module.Orders })));
const ProductQuestions = lazy(() => import('../pages/admin/ProductQuestions').then((module) => ({ default: module.ProductQuestions })));
const Users = lazy(() => import('../pages/admin/Users').then((module) => ({ default: module.Users })));
const Coupons = lazy(() => import('../pages/admin/Coupons').then((module) => ({ default: module.Coupons })));
const Reviews = lazy(() => import('../pages/admin/Reviews').then((module) => ({ default: module.Reviews })));
const AuditLogs = lazy(() => import('../pages/admin/AuditLogs').then((module) => ({ default: module.AuditLogs })));
const Broadcasts = lazy(() => import('../pages/admin/Broadcasts').then((module) => ({ default: module.Broadcasts })));
const HomeBanner = lazy(() => import('../pages/admin/HomeBanner').then((module) => ({ default: module.HomeBanner })));
const Settings = lazy(() => import('../pages/admin/Settings').then((module) => ({ default: module.Settings })));
const Returns = lazy(() => import('../pages/admin/Returns').then((module) => ({ default: module.Returns })));

const withAdminLoader = (element: ReactElement): JSX.Element => (
  <AdminErrorBoundary level="page">
    <Suspense fallback={<AdminLoader />}>{element}</Suspense>
  </AdminErrorBoundary>
);

export const AppRouter = (): JSX.Element => (
  <>
    <ScrollToTop />
    <Routes>
      <Route path="/login" element={withAdminLoader(<Login />)} />
      <Route
        path="/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route
          index
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.overview}>
              <Dashboard />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="sales-analysis"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.salesAnalysis}>
              <SalesAnalysis />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="customer-analysis"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.customerAnalysis}>
              <CustomerAnalysis />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="products"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.products}>
              <Products />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="inventory"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.inventory}>
              <Inventory />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="brands"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.brands}>
              <Brands />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="categories"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.categories}>
              <Categories />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="orders"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.orders}>
              <Orders />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="product-questions"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.productQuestions}>
              <ProductQuestions />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="returns"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.returns}>
              <Returns />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="users"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.users}>
              <Users />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="coupons"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.coupons}>
              <Coupons />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="reviews"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.reviews}>
              <Reviews />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="audit-logs"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.auditLogs}>
              <AuditLogs />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="broadcasts"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.broadcasts}>
              <Broadcasts />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="home-banner"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.homeBanner}>
              <HomeBanner />
            </AdminPermissionRoute>
          )}
        />
        <Route
          path="settings"
          element={withAdminLoader(
            <AdminPermissionRoute requiredPermissions={adminPagePermissions.settings}>
              <Settings />
            </AdminPermissionRoute>
          )}
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </>
);
