import type { NextFunction, Request, Response } from 'express';
import type { AdminPermission, Language, Role } from '@njstore/types';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RefreshSession } from '../models/RefreshSession.js';
import { AdminPermissionProfile } from '../models/AdminPermissionProfile.js';
import { ALL_PERMISSIONS, STAFF_DEFAULT_PERMISSIONS, User } from '../models/User.js';
import { cacheKeys, cacheService } from '../services/cacheService.js';
import { AppError } from '../utils/AppError.js';
import type { JwtAuthPayload } from '../types/index.js';

interface AuthUserSnapshot {
  _id: string;
  email: string;
  role: Role;
  language: Language;
  isEmailVerified: boolean;
  isActive: boolean;
  permissions: AdminPermission[];
  passwordChangedAt?: string;
}

const AUTH_CACHE_TTL_SECONDS = 60;
const AUTH_SESSION_CACHE_TTL_SECONDS = 60;
const AUTH_MISSING_SESSION_CACHE_TTL_SECONDS = 15;

export const invalidateUserCache = async (userId: string): Promise<void> => {
  await cacheService.delete(cacheKeys.authUser(userId));
};

const extractAccessToken = (req: Request): string | null => {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7);
  }
  return null;
};

const decodeAccessToken = (token: string): JwtAuthPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAuthPayload;
  } catch {
    throw new AppError('Authentication required', 401);
  }
};

const resolveAdminPermissions = async (role: Role, userPermissions: AdminPermission[] | undefined): Promise<AdminPermission[]> => {
  if (role === 'customer') {
    return [];
  }

  if (userPermissions?.length) {
    return userPermissions;
  }

  const profile = await AdminPermissionProfile.findOne({ role, isActive: true })
    .select('permissions')
    .lean<{ permissions?: AdminPermission[] } | null>();
  if (profile?.permissions?.length) {
    return profile.permissions;
  }

  return role === 'admin' ? [...ALL_PERMISSIONS] : [...STAFF_DEFAULT_PERMISSIONS];
};

const loadUserSnapshot = async (userId: string): Promise<AuthUserSnapshot | null> => {
  const cacheKey = cacheKeys.authUser(userId);
  const cached = await cacheService.get<AuthUserSnapshot>(cacheKey);
  if (cached) {
    return cached;
  }

  const dbUser = await User.findById(userId)
    .select('_id email role language isEmailVerified isActive permissions passwordChangedAt')
    .lean<{
      _id: { toString: () => string } | string;
      email: string;
      role: Role;
      language: Language;
      isEmailVerified: boolean;
      isActive: boolean;
      permissions?: AdminPermission[];
      passwordChangedAt?: Date | null;
    } | null>();

  if (!dbUser) {
    return null;
  }

  const snapshot: AuthUserSnapshot = {
    _id: typeof dbUser._id === 'string' ? dbUser._id : dbUser._id.toString(),
    email: dbUser.email,
    role: dbUser.role,
    language: dbUser.language,
    isEmailVerified: dbUser.isEmailVerified,
    isActive: dbUser.isActive,
    permissions: await resolveAdminPermissions(dbUser.role, dbUser.permissions),
    passwordChangedAt: dbUser.passwordChangedAt?.toISOString()
  };

  await cacheService.set(cacheKey, snapshot, AUTH_CACHE_TTL_SECONDS);
  return snapshot;
};

const ensureSessionIsActive = async (sessionId: string): Promise<void> => {
  const cacheKey = cacheKeys.authSession(sessionId);
  const cached = await cacheService.get<boolean>(cacheKey);
  if (cached === true) {
    return;
  }
  if (cached === false) {
    throw new AppError('Authentication required', 401);
  }

  const session = await RefreshSession.exists({
    sessionId,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (!session) {
    await cacheService.set(cacheKey, false, AUTH_MISSING_SESSION_CACHE_TTL_SECONDS);
    throw new AppError('Authentication required', 401);
  }

  await cacheService.set(cacheKey, true, AUTH_SESSION_CACHE_TTL_SECONDS);
};

const attachUser = async (req: Request, token: string): Promise<void> => {
  const decoded = decodeAccessToken(token);
  await ensureSessionIsActive(decoded.sessionId);
  const user = await loadUserSnapshot(decoded.id);

  if (!user || !user.isActive) {
    throw new AppError('User no longer exists', 401);
  }

  if (decoded.iat && user.passwordChangedAt) {
    const passwordChangedAtSeconds = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
    if (passwordChangedAtSeconds > decoded.iat) {
      throw new AppError('Authentication required', 401);
    }
  }

  req.user = {
    id: user._id,
    email: user.email,
    role: user.role,
    language: user.language,
    isEmailVerified: user.isEmailVerified,
    sessionId: decoded.sessionId,
    permissions: user.permissions
  };
};

/**
 * Requires a valid access token and an active user.
 */
export const protect = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const token = extractAccessToken(req);
  if (!token) {
    next(new AppError('Authentication required', 401));
    return;
  }

  try {
    await attachUser(req, token);
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const token = extractAccessToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    await attachUser(req, token);
  } catch {
    req.user = undefined;
  }
  next();
};

export const restrictTo =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError('Forbidden', 403));
      return;
    }
    next();
  };

export const requireVerifiedEmail = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(new AppError('Authentication required', 401));
    return;
  }

  if (!req.user.isEmailVerified) {
    next(new AppError('Verify your email before continuing', 403));
    return;
  }

  next();
};
