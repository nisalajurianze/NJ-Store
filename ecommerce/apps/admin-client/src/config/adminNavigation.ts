import type { AdminPermission } from '@njstore/types';
import { BarChart3, Boxes, CreditCard, FolderTree, Home, Image as ImageIcon, LineChart, Megaphone, MessageSquare, PackageSearch, RotateCcw, ScrollText, Settings, ShieldCheck, Tag, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { hasAllAdminPermissions } from '../utils/adminPermissions';

export const adminPagePermissions = {
  overview: ['order:read', 'product:read', 'user:read'] as const,
  salesAnalysis: ['order:read', 'product:read', 'user:read'] as const,
  customerAnalysis: ['order:read', 'product:read', 'user:read'] as const,
  products: ['product:read'] as const,
  inventory: ['product:read'] as const,
  brands: ['brand:read'] as const,
  categories: ['category:read'] as const,
  orders: ['order:read'] as const,
  returns: ['order:read'] as const,
  productQuestions: ['product:read'] as const,
  users: ['user:read'] as const,
  coupons: ['coupon:read'] as const,
  reviews: ['product:read'] as const,
  auditLogs: ['user:read'] as const,
  broadcasts: ['setting:read'] as const,
  homeBanner: ['setting:read'] as const,
  settings: ['setting:read'] as const
};

export const adminNavigationSections = {
  workspace: {
    label: 'Workspace',
    description: 'Track the store at a glance'
  },
  catalog: {
    label: 'Catalog',
    description: 'Manage products, structure, and pricing tools'
  },
  operations: {
    label: 'Operations',
    description: 'Handle fulfilment, customer activity, and review queues'
  },
  administration: {
    label: 'Administration',
    description: 'Audit access, permissions, and system settings'
  }
} as const;

export type AdminNavigationSectionId = keyof typeof adminNavigationSections;

export interface AdminNavigationLink {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  section: AdminNavigationSectionId;
  requiredPermissions: readonly AdminPermission[];
  hidden?: boolean;
}

export const adminNavigationLinks: readonly AdminNavigationLink[] = [
  {
    to: '/dashboard',
    label: 'Overview',
    description: 'See the live performance snapshot, queue mix, and alerts.',
    icon: Home,
    section: 'workspace',
    requiredPermissions: adminPagePermissions.overview
  },
  {
    to: '/dashboard/sales-analysis',
    label: 'Sales Analysis',
    description: 'Deep sales, forecast, and expense analysis.',
    icon: LineChart,
    section: 'workspace',
    requiredPermissions: adminPagePermissions.salesAnalysis,
    hidden: true
  },
  {
    to: '/dashboard/customer-analysis',
    label: 'Customer Analysis',
    description: 'Customer growth, behavior mining, retention, and RFM analysis.',
    icon: Users,
    section: 'workspace',
    requiredPermissions: adminPagePermissions.customerAnalysis,
    hidden: true
  },
  {
    to: '/dashboard/products',
    label: 'Products',
    description: 'Create, edit, and retire catalog products.',
    icon: Boxes,
    section: 'catalog',
    requiredPermissions: adminPagePermissions.products
  },
  {
    to: '/dashboard/inventory',
    label: 'Inventory',
    description: 'Track stock, restock variants, and restore inactive products.',
    icon: PackageSearch,
    section: 'catalog',
    requiredPermissions: adminPagePermissions.inventory
  },
  {
    to: '/dashboard/brands',
    label: 'Brands',
    description: 'Control brand records, logos, visibility, and storefront filter order.',
    icon: Tag,
    section: 'catalog',
    requiredPermissions: adminPagePermissions.brands
  },
  {
    to: '/dashboard/categories',
    label: 'Categories',
    description: 'Keep the catalog taxonomy tidy and easy to browse.',
    icon: FolderTree,
    section: 'catalog',
    requiredPermissions: adminPagePermissions.categories
  },
  {
    to: '/dashboard/coupons',
    label: 'Coupons',
    description: 'Manage promotional discounts and redemption windows.',
    icon: ShieldCheck,
    section: 'catalog',
    requiredPermissions: adminPagePermissions.coupons
  },
  {
    to: '/dashboard/orders',
    label: 'Orders',
    description: 'Review fulfilment, payment proof, and customer order details in one place.',
    icon: CreditCard,
    section: 'operations',
    requiredPermissions: adminPagePermissions.orders
  },
  {
    to: '/dashboard/product-questions',
    label: 'Product Q&A',
    description: 'Review customer questions, answer them quickly, and keep product pages informative.',
    icon: MessageSquare,
    section: 'operations',
    requiredPermissions: adminPagePermissions.productQuestions
  },
  {
    to: '/dashboard/returns',
    label: 'Returns',
    description: 'Approve, reject, and refund customer return requests with item-level evidence.',
    icon: RotateCcw,
    section: 'operations',
    requiredPermissions: adminPagePermissions.returns
  },
  {
    to: '/dashboard/reviews',
    label: 'Reviews',
    description: 'Moderate product feedback and keep public ratings trustworthy.',
    icon: BarChart3,
    section: 'operations',
    requiredPermissions: adminPagePermissions.reviews
  },
  {
    to: '/dashboard/users',
    label: 'Users',
    description: 'Manage staff access levels and customer account status.',
    icon: Users,
    section: 'operations',
    requiredPermissions: adminPagePermissions.users
  },
  {
    to: '/dashboard/audit-logs',
    label: 'Audit Logs',
    description: 'Trace authentication, access changes, and operational events.',
    icon: ScrollText,
    section: 'administration',
    requiredPermissions: adminPagePermissions.auditLogs
  },
  {
    to: '/dashboard/broadcasts',
    label: 'Broadcasts',
    description: 'Send launch emails and promotional announcements to verified audiences.',
    icon: Megaphone,
    section: 'administration',
    requiredPermissions: adminPagePermissions.broadcasts
  },
  {
    to: '/dashboard/home-banner',
    label: 'Home Banner',
    description: 'Manage the storefront hero campaign copy, CTA, and background art.',
    icon: ImageIcon,
    section: 'administration',
    requiredPermissions: adminPagePermissions.homeBanner
  },
  {
    to: '/dashboard/settings',
    label: 'Settings',
    description: 'Adjust shipping, loyalty, and store-wide operational rules.',
    icon: Settings,
    section: 'administration',
    requiredPermissions: adminPagePermissions.settings
  }
];

export const getVisibleAdminNavigationLinks = (permissions: readonly AdminPermission[]): AdminNavigationLink[] =>
  adminNavigationLinks.filter((link) => !link.hidden && hasAllAdminPermissions(permissions, link.requiredPermissions));

export const getFirstAccessibleAdminPath = (permissions: readonly AdminPermission[]): string | null =>
  getVisibleAdminNavigationLinks(permissions)[0]?.to ?? null;

export const getGroupedAdminNavigationLinks = (links: readonly AdminNavigationLink[]) =>
  Object.entries(adminNavigationSections)
    .map(([sectionId, section]) => ({
      id: sectionId as AdminNavigationSectionId,
      ...section,
      links: links.filter((link) => link.section === sectionId)
    }))
    .filter((group) => group.links.length > 0);

export const getAdminNavigationLinkByPath = (pathname: string): AdminNavigationLink | null =>
  [...adminNavigationLinks]
    .sort((left, right) => right.to.length - left.to.length)
    .find((link) => pathname === link.to || pathname.startsWith(`${link.to}/`))
    ?? null;
