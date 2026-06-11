import type { AdminPermission, LoyaltyTransactionDto, NotificationDto, Role, SessionDto, UserSummary } from '@njstore/types';
import { adminPermissions, staffDefaultPermissions } from '@njstore/types';
import { type DateLike, type IdValue, type ImageLike, isDateLike, serializeImage, toId } from './helpers.js';

type ShopFilterParams = Partial<Record<string, string | null | undefined>>;
type ShopFilterParamsDocument = ShopFilterParams & {
  toObject?: () => ShopFilterParams;
};
type ShopFilterPreset = {
  params?: ShopFilterParamsDocument;
  savedAt?: DateLike | string | null;
  toObject?: () => {
    params?: ShopFilterParamsDocument;
    savedAt?: DateLike | string | null;
  };
} | null;

const serializeShopPreferences = (shopPreferences?: { myFilters?: ShopFilterPreset }) => {
  const myFilters =
    shopPreferences?.myFilters && typeof shopPreferences.myFilters.toObject === 'function'
      ? shopPreferences.myFilters.toObject()
      : shopPreferences?.myFilters;

  if (!myFilters) {
    return undefined;
  }

  const rawParams =
    myFilters.params && typeof myFilters.params.toObject === 'function' ? myFilters.params.toObject() : myFilters.params;
  const params = Object.fromEntries(
    Object.entries(rawParams ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
  );

  const savedAt =
    typeof myFilters.savedAt === 'string'
      ? myFilters.savedAt
      : isDateLike(myFilters.savedAt)
        ? myFilters.savedAt.toISOString()
        : undefined;

  if (!savedAt) {
    return undefined;
  }

  return {
    myFilters: {
      params,
      savedAt
    }
  };
};

const normalizePermissions = (role: Role, permissions?: AdminPermission[]): AdminPermission[] | undefined => {
  if (role === 'customer') {
    return undefined;
  }

  const resolvedPermissions = permissions && permissions.length > 0 ? permissions : undefined;

  if (role === 'admin') {
    return [...new Set(resolvedPermissions ?? adminPermissions)];
  }

  return [...new Set(resolvedPermissions ?? staffDefaultPermissions)];
};

export const serializeUser = (user: {
  _id: IdValue;
  name: string;
  email: string;
  role: Role;
  authProvider?: 'local' | 'google';
  avatar?: ImageLike;
  phone?: string | null;
  language: 'en' | 'si';
  isEmailVerified: boolean;
  loyaltyPoints: number;
  isActive?: boolean;
  permissions?: AdminPermission[];
  shopPreferences?: {
    myFilters?: ShopFilterPreset;
  };
}): UserSummary => ({
  id: toId(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  authProvider: user.authProvider,
  avatar: serializeImage(user.avatar),
  phone: user.phone,
  language: user.language,
  isEmailVerified: user.isEmailVerified,
  loyaltyPoints: user.loyaltyPoints,
  isActive: user.isActive,
  permissions: normalizePermissions(user.role, user.permissions),
  shopPreferences: serializeShopPreferences(user.shopPreferences)
});

export const serializeSession = (session: {
  _id?: IdValue;
  sessionId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: DateLike;
  createdAt: DateLike;
}): SessionDto => ({
  id: session.sessionId || (session._id ? toId(session._id) : ''),
  ipAddress: session.ipAddress,
  userAgent: session.userAgent,
  isCurrent: false,
  expiresAt: session.expiresAt.toISOString(),
  createdAt: session.createdAt.toISOString()
});

export const serializeLoyaltyTransaction = (entry: {
  _id: IdValue;
  order?: IdValue;
  type: 'earned' | 'redeemed' | 'adjusted';
  points: number;
  description: string;
  createdAt: DateLike;
}): LoyaltyTransactionDto => ({
  id: toId(entry._id),
  order: entry.order ? toId(entry.order) : undefined,
  type: entry.type,
  points: entry.points,
  description: entry.description,
  createdAt: entry.createdAt.toISOString()
});

export const serializeNotification = (notification: {
  _id: IdValue;
  type: NotificationDto['type'];
  title: string;
  body: string;
  isRead: boolean;
  link?: string | null;
  createdAt: DateLike;
}): NotificationDto => ({
  id: toId(notification._id),
  type: notification.type,
  title: notification.title,
  body: notification.body,
  isRead: notification.isRead,
  link: notification.link ?? undefined,
  createdAt: notification.createdAt.toISOString()
});
