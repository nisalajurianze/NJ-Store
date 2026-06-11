import { adminPermissions, staffDefaultPermissions } from '@njstore/types';
import { isDateLike, serializeImage, toId } from './helpers.js';
const serializeShopPreferences = (shopPreferences) => {
    const myFilters = shopPreferences?.myFilters && typeof shopPreferences.myFilters.toObject === 'function'
        ? shopPreferences.myFilters.toObject()
        : shopPreferences?.myFilters;
    if (!myFilters) {
        return undefined;
    }
    const rawParams = myFilters.params && typeof myFilters.params.toObject === 'function' ? myFilters.params.toObject() : myFilters.params;
    const params = Object.fromEntries(Object.entries(rawParams ?? {}).filter((entry) => typeof entry[1] === 'string' && entry[1].length > 0));
    const savedAt = typeof myFilters.savedAt === 'string'
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
const normalizePermissions = (role, permissions) => {
    if (role === 'customer') {
        return undefined;
    }
    const resolvedPermissions = permissions && permissions.length > 0 ? permissions : undefined;
    if (role === 'admin') {
        return [...new Set(resolvedPermissions ?? adminPermissions)];
    }
    return [...new Set(resolvedPermissions ?? staffDefaultPermissions)];
};
export const serializeUser = (user) => ({
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
export const serializeSession = (session) => ({
    id: session.sessionId || (session._id ? toId(session._id) : ''),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    isCurrent: false,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString()
});
export const serializeLoyaltyTransaction = (entry) => ({
    id: toId(entry._id),
    order: entry.order ? toId(entry.order) : undefined,
    type: entry.type,
    points: entry.points,
    description: entry.description,
    createdAt: entry.createdAt.toISOString()
});
export const serializeNotification = (notification) => ({
    id: toId(notification._id),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    isRead: notification.isRead,
    link: notification.link ?? undefined,
    createdAt: notification.createdAt.toISOString()
});
