import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { PageLoader } from '../components/layout/PageLoader';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { StoreLayout } from '../components/layout/StoreLayout';
import { StoreErrorBoundary } from '../components/system/StoreErrorBoundary';
import { recoverFromChunkLoadError, withChunkRecovery } from '../utils/chunkRecovery';
import { ScrollToTop } from './ScrollToTop';

const loadHomeRoute = () => withChunkRecovery(() => import('../pages/Home'), 'home-route');
const loadShopRoute = () => withChunkRecovery(() => import('../pages/Shop'), 'shop-route');
const loadProductDetailRoute = () => withChunkRecovery(() => import('../pages/ProductDetail'), 'product-detail-route');
const loadCartRoute = () => withChunkRecovery(() => import('../pages/Cart'), 'cart-route');
const loadCheckoutRoute = () => withChunkRecovery(() => import('../pages/Checkout'), 'checkout-route');
const loadCompareRoute = () => withChunkRecovery(() => import('../pages/Compare'), 'compare-route');
const loadQuotationConfirmRoute = () => withChunkRecovery(() => import('../pages/QuotationConfirm'), 'quotation-confirm-route');
const loadLoginRoute = () => withChunkRecovery(() => import('../pages/auth/Login'), 'login-route');
const loadRegisterRoute = () => withChunkRecovery(() => import('../pages/auth/Register'), 'register-route');
const loadForgotPasswordRoute = () => withChunkRecovery(() => import('../pages/auth/ForgotPassword'), 'forgot-password-route');
const loadResetPasswordRoute = () => withChunkRecovery(() => import('../pages/auth/ResetPassword'), 'reset-password-route');

const warmRoute = (loader: () => Promise<unknown>, source: string): void => {
  void loader().catch((error) => {
    recoverFromChunkLoadError(error, source);
  });
};

const preloadInitialRouteChunk = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const { pathname } = window.location;

  if (pathname === '/') {
    warmRoute(loadHomeRoute, 'initial-home-route');
  } else if (pathname.startsWith('/shop')) {
    warmRoute(loadShopRoute, 'initial-shop-route');
  } else if (pathname.startsWith('/product/')) {
    warmRoute(loadProductDetailRoute, 'initial-product-detail-route');
  } else if (pathname.startsWith('/cart')) {
    warmRoute(loadCartRoute, 'initial-cart-route');
  } else if (pathname.startsWith('/checkout')) {
    warmRoute(loadCheckoutRoute, 'initial-checkout-route');
  } else if (pathname.startsWith('/compare')) {
    warmRoute(loadCompareRoute, 'initial-compare-route');
  } else if (pathname.startsWith('/quotation/confirm')) {
    warmRoute(loadQuotationConfirmRoute, 'initial-quotation-confirm-route');
  } else if (pathname.startsWith('/auth/login')) {
    warmRoute(loadLoginRoute, 'initial-login-route');
  } else if (pathname.startsWith('/auth/register')) {
    warmRoute(loadRegisterRoute, 'initial-register-route');
  } else if (pathname.startsWith('/auth/forgot-password')) {
    warmRoute(loadForgotPasswordRoute, 'initial-forgot-password-route');
  } else if (pathname.startsWith('/auth/reset-password')) {
    warmRoute(loadResetPasswordRoute, 'initial-reset-password-route');
  }
};

preloadInitialRouteChunk();

const Home = lazy(() => loadHomeRoute().then((module) => ({ default: module.Home })));
const Shop = lazy(() => loadShopRoute().then((module) => ({ default: module.Shop })));
const ProductDetail = lazy(() => loadProductDetailRoute().then((module) => ({ default: module.ProductDetail })));
const Cart = lazy(() => loadCartRoute().then((module) => ({ default: module.Cart })));
const Checkout = lazy(() => loadCheckoutRoute().then((module) => ({ default: module.Checkout })));
const Compare = lazy(() => loadCompareRoute().then((module) => ({ default: module.Compare })));
const QuotationConfirm = lazy(() => loadQuotationConfirmRoute().then((module) => ({ default: module.QuotationConfirm })));
const Login = lazy(() => loadLoginRoute().then((module) => ({ default: module.Login })));
const Register = lazy(() => loadRegisterRoute().then((module) => ({ default: module.Register })));
const ForgotPassword = lazy(() => loadForgotPasswordRoute().then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => loadResetPasswordRoute().then((module) => ({ default: module.ResetPassword })));
const VerifyEmail = lazy(() => withChunkRecovery(() => import('../pages/auth/VerifyEmail'), 'verify-email-route').then((module) => ({ default: module.VerifyEmail })));
const DashboardOverview = lazy(() =>
  withChunkRecovery(() => import('../pages/dashboard/Overview'), 'dashboard-overview-route').then((module) => ({ default: module.DashboardOverview }))
);
const DashboardOrders = lazy(() =>
  withChunkRecovery(() => import('../pages/dashboard/Orders'), 'dashboard-orders-route').then((module) => ({ default: module.DashboardOrders }))
);
const DashboardOrderDetail = lazy(() =>
  withChunkRecovery(() => import('../pages/dashboard/OrderDetail'), 'dashboard-order-detail-route').then((module) => ({ default: module.DashboardOrderDetail }))
);
const DashboardProfile = lazy(() =>
  withChunkRecovery(() => import('../pages/dashboard/Profile'), 'dashboard-profile-route').then((module) => ({ default: module.DashboardProfile }))
);
const DashboardWishlist = lazy(() =>
  withChunkRecovery(() => import('../pages/dashboard/Wishlist'), 'dashboard-wishlist-route').then((module) => ({ default: module.DashboardWishlist }))
);
const DashboardLoyalty = lazy(() =>
  withChunkRecovery(() => import('../pages/dashboard/Loyalty'), 'dashboard-loyalty-route').then((module) => ({ default: module.DashboardLoyalty }))
);
const DashboardSecurity = lazy(() =>
  withChunkRecovery(() => import('../pages/dashboard/Security'), 'dashboard-security-route').then((module) => ({ default: module.DashboardSecurity }))
);
const About = lazy(() => withChunkRecovery(() => import('../pages/static/About'), 'about-route').then((module) => ({ default: module.About })));
const Contact = lazy(() => withChunkRecovery(() => import('../pages/static/Contact'), 'contact-route').then((module) => ({ default: module.Contact })));
const FAQ = lazy(() => withChunkRecovery(() => import('../pages/static/FAQ'), 'faq-route').then((module) => ({ default: module.FAQ })));
const Privacy = lazy(() => withChunkRecovery(() => import('../pages/static/Privacy'), 'privacy-route').then((module) => ({ default: module.Privacy })));
const Terms = lazy(() => withChunkRecovery(() => import('../pages/static/Terms'), 'terms-route').then((module) => ({ default: module.Terms })));
const Returns = lazy(() => withChunkRecovery(() => import('../pages/static/Returns'), 'returns-route').then((module) => ({ default: module.Returns })));

const withPageLoader = (element: ReactElement): JSX.Element => (
  <StoreErrorBoundary level="page">
    <Suspense fallback={<PageLoader />}>{element}</Suspense>
  </StoreErrorBoundary>
);

export const AppRouter = (): JSX.Element => (
  <>
    <ScrollToTop />
    <Routes>
      <Route path="/auth/verify-email" element={withPageLoader(<VerifyEmail />)} />

      <Route element={<StoreLayout />}>
        <Route path="/" element={withPageLoader(<Home />)} />
        <Route path="/shop" element={withPageLoader(<Shop />)} />
        <Route path="/product/:slug" element={withPageLoader(<ProductDetail />)} />
        <Route path="/cart" element={withPageLoader(<Cart />)} />
        <Route path="/compare" element={withPageLoader(<Compare />)} />
        <Route path="/quotation/confirm" element={withPageLoader(<QuotationConfirm />)} />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              {withPageLoader(<Checkout />)}
            </ProtectedRoute>
          }
        />
        <Route path="/about" element={withPageLoader(<About />)} />
        <Route path="/contact" element={withPageLoader(<Contact />)} />
        <Route path="/faq" element={withPageLoader(<FAQ />)} />
        <Route path="/privacy" element={withPageLoader(<Privacy />)} />
        <Route path="/terms" element={withPageLoader(<Terms />)} />
        <Route path="/returns" element={withPageLoader(<Returns />)} />
        <Route path="/auth/login" element={withPageLoader(<Login />)} />
        <Route path="/auth/register" element={withPageLoader(<Register />)} />
        <Route path="/auth/forgot-password" element={withPageLoader(<ForgotPassword />)} />
        <Route path="/auth/reset-password" element={withPageLoader(<ResetPassword />)} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={withPageLoader(<DashboardOverview />)} />
          <Route path="orders" element={withPageLoader(<DashboardOrders />)} />
          <Route path="orders/:id" element={withPageLoader(<DashboardOrderDetail />)} />
          <Route path="profile" element={withPageLoader(<DashboardProfile />)} />
          <Route path="addresses" element={<Navigate to="/dashboard/profile?section=addresses" replace />} />
          <Route path="wishlist" element={withPageLoader(<DashboardWishlist />)} />
          <Route path="compare" element={<Navigate to="/compare" replace />} />
          <Route path="loyalty" element={withPageLoader(<DashboardLoyalty />)} />
          <Route path="security" element={withPageLoader(<DashboardSecurity />)} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
);
