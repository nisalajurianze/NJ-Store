export type StoreRouteWarmupKey =
  | 'shop'
  | 'cart'
  | 'compare'
  | 'about'
  | 'contact'
  | 'product-detail'
  | 'auth-login'
  | 'auth-register'
  | 'auth-forgot-password'
  | 'dashboard';

const routeWarmups: Record<StoreRouteWarmupKey, () => Promise<unknown>> = {
  shop: () => import('../pages/Shop'),
  cart: () => import('../pages/Cart'),
  compare: () => import('../pages/Compare'),
  about: () => import('../pages/static/About'),
  contact: () => import('../pages/static/Contact'),
  'product-detail': () => import('../pages/ProductDetail'),
  'auth-login': () => import('../pages/auth/Login'),
  'auth-register': () => import('../pages/auth/Register'),
  'auth-forgot-password': () => import('../pages/auth/ForgotPassword'),
  dashboard: () => import('../pages/dashboard/Overview')
};

const warmedRoutes = new Set<StoreRouteWarmupKey>();

export const warmStoreRoute = (route: StoreRouteWarmupKey): void => {
  if (warmedRoutes.has(route)) {
    return;
  }

  warmedRoutes.add(route);
  void routeWarmups[route]().catch(() => {
    warmedRoutes.delete(route);
  });
};
