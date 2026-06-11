import type { LucideIcon } from 'lucide-react';
import { Gift, Heart, LayoutDashboard, Shield, Truck, User } from 'lucide-react';

export type AccountTabKey =
  | 'overview'
  | 'orders'
  | 'profile'
  | 'wishlist'
  | 'loyalty'
  | 'security';

export interface AccountNavItem {
  key: AccountTabKey;
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export const accountNavItems: AccountNavItem[] = [
  { key: 'overview', label: 'Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
  { key: 'orders', label: 'Orders', to: '/dashboard/orders', icon: Truck },
  { key: 'profile', label: 'Profile', to: '/dashboard/profile', icon: User },
  { key: 'wishlist', label: 'Wishlist', to: '/dashboard/wishlist', icon: Heart },
  { key: 'loyalty', label: 'Loyalty', to: '/dashboard/loyalty', icon: Gift },
  { key: 'security', label: 'Security', to: '/dashboard/security', icon: Shield }
];

export const getAccountTabFromPath = (pathname: string): AccountTabKey => {
  if (pathname.startsWith('/dashboard/orders')) return 'orders';
  if (pathname.startsWith('/dashboard/profile')) return 'profile';
  if (pathname.startsWith('/dashboard/wishlist')) return 'wishlist';
  if (pathname.startsWith('/dashboard/loyalty')) return 'loyalty';
  if (pathname.startsWith('/dashboard/security')) return 'security';
  return 'overview';
};
