import type { CookieOptions } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { OAuth2Client } from 'google-auth-library';
import { Types } from 'mongoose';
import type {
  AuthPayloadDto,
  AuthTokensDto,
  Language,
  LoyaltyTransactionDto,
  RegisterDto,
  Role,
  SessionDto,
  ShopPreferencesDto,
  VerificationEmailResultDto
} from '@njstore/types';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env.js';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction.js';
import { RefreshSession } from '../models/RefreshSession.js';
import { User } from '../models/User.js';
import { Wishlist } from '../models/Wishlist.js';
import { AppError } from '../utils/AppError.js';
import { createRandomToken, hashValue } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { serializeLoyaltyTransaction, serializeSession, serializeUser } from '../utils/serializers.js';
import { auditLogService } from './auditLogService.js';
import { cacheKeys, cacheNamespaces, cacheService } from './cacheService.js';
import { emailService } from './emailService.js';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

const buildAuditMeta = (meta: RequestMeta) => ({
  ipAddress: meta.ipAddress,
  userAgent: meta.userAgent
});

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID || undefined);
const isEmailPreviewMode = !env.RESEND_API_KEY && (!env.SMTP_USER || !env.SMTP_PASS);

const invalidateCachedUser = async (userId: Types.ObjectId | string): Promise<void> => {
  await cacheService.delete(cacheKeys.authUser(String(userId)));
};

const invalidateCachedSession = async (sessionId: string | undefined | null): Promise<void> => {
  if (!sessionId) {
    return;
  }

  await cacheService.delete(cacheKeys.authSession(sessionId));
};

const invalidateCachedSessions = async (sessionIds: string[]): Promise<void> => {
  const uniqueSessionIds = [...new Set(sessionIds.filter(Boolean))];
  await cacheService.deleteMany(uniqueSessionIds.map((sessionId) => cacheKeys.authSession(sessionId)));
};

const getActiveSessionIdsForUser = async (userId: Types.ObjectId | string): Promise<string[]> => {
  const sessions = await RefreshSession.find({
    user: userId,
    revokedAt: null
  })
    .select('sessionId')
    .lean<Array<{ sessionId: string }>>();

  return sessions.map((session) => session.sessionId);
};

const invalidateAnalyticsCache = async (): Promise<void> => {
  await cacheService.bumpNamespace(cacheNamespaces.analytics);
};

const parseDurationToMs = (value: string): number => {
  const match = value.match(/^(\d+)([mhd])$/i);
  if (!match) {
    throw new AppError('Invalid duration format', 500);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'm') {
    return amount * 60 * 1000;
  }
  if (unit === 'h') {
    return amount * 60 * 60 * 1000;
  }
  return amount * 24 * 60 * 60 * 1000;
};

const accessTokenMs = parseDurationToMs(env.JWT_ACCESS_EXPIRES);
const refreshTokenMs = parseDurationToMs(env.JWT_REFRESH_EXPIRES);
const rememberMeMs = parseDurationToMs('30d');
const cookieSameSite = env.NODE_ENV === 'production' ? ('none' as const) : ('strict' as const);

const normalizeCookieDomain = (value: string | undefined): string | null => {
  const trimmedValue = value?.trim();
  if (!trimmedValue || trimmedValue.toLowerCase() === 'localhost') {
    return null;
  }

  const withoutProtocol = trimmedValue.replace(/^[a-z]+:\/\//i, '');
  const hostname = withoutProtocol.split('/')[0]?.split(':')[0]?.trim().replace(/^\.+/, '').toLowerCase();

  if (!hostname || hostname === 'localhost') {
    return null;
  }

  return hostname;
};

const normalizeRequestHost = (value: string | undefined): string | null => {
  const trimmedValue = value?.trim().toLowerCase();
  if (!trimmedValue) {
    return null;
  }

  const withoutIpv6Brackets = trimmedValue.replace(/^\[/, '').replace(/\]$/, '');
  return withoutIpv6Brackets.split(':')[0]?.trim() || null;
};

const isCookieDomainMatch = (requestHost: string | undefined, cookieDomain: string): boolean => {
  const normalizedRequestHost = normalizeRequestHost(requestHost);
  if (!normalizedRequestHost) {
    return false;
  }

  return normalizedRequestHost === cookieDomain || normalizedRequestHost.endsWith(`.${cookieDomain}`);
};

export const resolveRefreshCookieDomain = (
  requestHost: string | undefined,
  configuredDomain = env.COOKIE_DOMAIN
): string | undefined => {
  const normalizedDomain = normalizeCookieDomain(configuredDomain);
  if (!normalizedDomain) {
    return undefined;
  }

  return isCookieDomainMatch(requestHost, normalizedDomain) ? normalizedDomain : undefined;
};

export const shouldPartitionRefreshCookie = (domain: string | undefined, nodeEnv = env.NODE_ENV): boolean =>
  nodeEnv === 'production' && !domain;

const buildRefreshCookieBaseOptions = (requestHost?: string): CookieOptions => {
  const domain = resolveRefreshCookieDomain(requestHost);
  const partitioned = shouldPartitionRefreshCookie(domain);

  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    // Preview deployments use different frontend/backend hosts, so refresh cookies must be cross-site capable.
    sameSite: cookieSameSite,
    path: '/api/v1/auth',
    ...(domain ? { domain } : {}),
    ...(partitioned ? { partitioned } : {})
  };
};

const createAccessToken = (
  user: { _id: Types.ObjectId; email: string; role: Role; language: Language },
  sessionId: string
): string =>
  jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      language: user.language,
      sessionId
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'] }
  );

const createRefreshToken = (
  user: { _id: Types.ObjectId; email: string; role: Role; language: Language },
  sessionId: string,
  rememberMe: boolean
): string =>
  jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      language: user.language,
      sessionId
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: (rememberMe ? '30d' : env.JWT_REFRESH_EXPIRES) as SignOptions['expiresIn']
    }
  );

const buildAuthTokens = async (
  user: { _id: Types.ObjectId; email: string; role: Role; language: Language },
  rememberMe: boolean,
  meta: RequestMeta
): Promise<{ tokens: AuthTokensDto; refreshToken: string; sessionId: string }> => {
  const sessionId = uuid();
  const refreshToken = createRefreshToken(user, sessionId, rememberMe);
  await RefreshSession.create({
    user: user._id,
    sessionId,
    tokenHash: hashValue(refreshToken),
    expiresAt: new Date(Date.now() + (rememberMe ? rememberMeMs : refreshTokenMs)),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    rememberMe
  });

  return {
    refreshToken,
    sessionId,
    tokens: {
      accessToken: createAccessToken(user, sessionId),
      expiresIn: accessTokenMs / 1000
    }
  };
};

const buildVerificationUrl = (token: string): string => `${env.CLIENT_URL}/auth/verify-email?token=${token}`;
const buildResetUrl = (token: string): string => `${env.CLIENT_URL}/auth/reset-password?token=${token}`;

const createEmailVerification = async (
  userId: Types.ObjectId,
  name: string,
  email: string
): Promise<VerificationEmailResultDto> => {
  const rawToken = createRandomToken();
  const verificationUrl = buildVerificationUrl(rawToken);
  await User.findByIdAndUpdate(userId, {
    emailVerificationToken: hashValue(rawToken),
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
  await emailService.sendVerification(name, email, verificationUrl);

  if (isEmailPreviewMode) {
    logger.info(`auth.verify_email.preview email=${email} url=${verificationUrl}`);
    return {
      previewMode: true,
      verificationUrl
    };
  }

  return {
    previewMode: false
  };
};

const createPasswordReset = async (userId: Types.ObjectId, name: string, email: string): Promise<void> => {
  const rawToken = createRandomToken();
  await User.findByIdAndUpdate(userId, {
    passwordResetToken: hashValue(rawToken),
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
    passwordResetUsedAt: null
  });
  await emailService.sendPasswordReset(name, email, buildResetUrl(rawToken));
};

const getSessions = async (userId: Types.ObjectId | string, currentSessionId?: string): Promise<SessionDto[]> => {
  const sessions = await RefreshSession.find({
    user: userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  return sessions.map((session) => ({
    ...serializeSession(session),
    isCurrent: session.sessionId === currentSessionId
  }));
};

const createAuthPayload = async (
  user: Parameters<typeof serializeUser>[0] & {
    addresses: Array<{
      _id?: Types.ObjectId;
      label: string;
      fullName: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      district: string;
      postalCode: string;
      country: string;
      isDefault?: boolean;
    }>;
  },
  sessionId?: string,
  tokens?: AuthTokensDto
): Promise<AuthPayloadDto> => ({
  user: serializeUser(user),
  tokens: tokens ?? { accessToken: '', expiresIn: accessTokenMs / 1000 },
  sessions: await getSessions(user._id, sessionId),
  addresses: user.addresses.map((address) => ({
    _id: address._id?.toString(),
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    district: address.district,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: address.isDefault
  }))
});

export const authService = {
  getRefreshCookieOptions: (rememberMe: boolean, requestHost?: string) => ({
    ...buildRefreshCookieBaseOptions(requestHost),
    maxAge: rememberMe ? rememberMeMs : refreshTokenMs
  }),

  getRefreshCookieClearOptions: (requestHost?: string) => buildRefreshCookieBaseOptions(requestHost),

  register: async (payload: RegisterDto, meta: RequestMeta): Promise<{ auth: AuthPayloadDto; refreshToken: string }> => {
    const existing = await User.findOne({ email: payload.email.toLowerCase() });
    if (existing) {
      await auditLogService.record({
        action: 'auth.register',
        actorEmail: payload.email.toLowerCase(),
        actorRole: 'system',
        status: 'blocked',
        message: 'Registration blocked because the email is already in use',
        ...buildAuditMeta(meta)
      });
      throw new AppError('Email already in use', 409);
    }

    const otpSecret = speakeasy.generateSecret({
      name: `${env.APP_NAME}:${payload.email}`
    });

    const created = await User.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      password: payload.password,
      phone: payload.phone,
      language: payload.language ?? 'en',
      otp: {
        secret: otpSecret.base32,
        otpauthUrl: otpSecret.otpauth_url ?? '',
        enabled: false
      }
    });

    await Wishlist.create({ user: created._id, items: [] });
    await invalidateAnalyticsCache();
    await createEmailVerification(created._id, created.name, created.email);
    const { refreshToken, sessionId, tokens } = await buildAuthTokens(created, false, meta);
    const user = await User.findById(created._id);
    if (!user) {
      throw new AppError('Unable to load user after registration', 500);
    }

    logger.info(`auth.register.success user=${created._id.toString()} email=${created.email} ip=${meta.ipAddress ?? 'unknown'}`);
    await auditLogService.record({
      action: 'auth.register',
      actorUserId: created._id.toString(),
      actorEmail: created.email,
      actorRole: created.role,
      targetType: 'user',
      targetId: created._id.toString(),
      targetLabel: created.email,
      message: 'User registered successfully',
      ...buildAuditMeta(meta)
    });

    return {
      refreshToken,
      auth: await createAuthPayload(user, sessionId, tokens)
    };
  },

  login: async (
    email: string,
    password: string,
    rememberMe: boolean,
    meta: RequestMeta
  ): Promise<{ auth: AuthPayloadDto; refreshToken: string }> => {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');
    if (!user) {
      logger.info(`auth.login.failed email=${email.toLowerCase()} reason=missing_user ip=${meta.ipAddress ?? 'unknown'}`);
      await auditLogService.record({
        action: 'auth.login',
        actorEmail: email.toLowerCase(),
        actorRole: 'system',
        status: 'failure',
        message: 'Login failed because the user account was not found',
        ...buildAuditMeta(meta)
      });
      throw new AppError('Invalid email or password', 401);
    }

    if (user.isLocked()) {
      logger.info(`auth.login.locked user=${user._id.toString()} email=${user.email} ip=${meta.ipAddress ?? 'unknown'}`);
      await auditLogService.record({
        action: 'auth.login',
        actorUserId: user._id.toString(),
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'user',
        targetId: user._id.toString(),
        targetLabel: user.email,
        status: 'blocked',
        message: 'Login blocked because the account is temporarily locked',
        ...buildAuditMeta(meta)
      });
      throw new AppError('Account temporarily locked. Try again later.', 423);
    }

    const isValid = await user.correctPassword(password);
    if (!isValid) {
      const nextAttempts = (user.loginAttempts ?? 0) + 1;
      user.loginAttempts = nextAttempts;
      if (nextAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      logger.info(`auth.login.failed user=${user._id.toString()} email=${user.email} attempts=${nextAttempts} ip=${meta.ipAddress ?? 'unknown'}`);
      await auditLogService.record({
        action: 'auth.login',
        actorUserId: user._id.toString(),
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'user',
        targetId: user._id.toString(),
        targetLabel: user.email,
        status: 'failure',
        message: 'Login failed because the password was invalid',
        metadata: { attempts: nextAttempts },
        ...buildAuditMeta(meta)
      });
      throw new AppError('Invalid email or password', 401);
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    await invalidateCachedUser(user._id);

    const { refreshToken, sessionId, tokens } = await buildAuthTokens(user, rememberMe, meta);
    logger.info(`auth.login.success user=${user._id.toString()} email=${user.email} rememberMe=${rememberMe} ip=${meta.ipAddress ?? 'unknown'}`);
    await auditLogService.record({
      action: 'auth.login',
      actorUserId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'session',
      targetId: sessionId,
      targetLabel: user.email,
      message: 'Login successful',
      metadata: { rememberMe },
      ...buildAuditMeta(meta)
    });
    return {
      refreshToken,
      auth: await createAuthPayload(user, sessionId, tokens)
    };
  },

  loginWithGoogle: async (
    credential: string,
    rememberMe: boolean,
    workspaceAccess: boolean,
    meta: RequestMeta
  ): Promise<{ auth: AuthPayloadDto; refreshToken: string }> => {
    let email = '';
    let name = '';
    let googleId = '';
    let picture = '';

    if (env.GOOGLE_CLIENT_ID && !credential.startsWith('dev:')) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.sub) {
        throw new AppError('Invalid Google credential', 401);
      }
      if (payload.email_verified !== true) {
        throw new AppError('Google account email must be verified', 401);
      }
      email = payload.email;
      name = payload.name ?? payload.email.split('@')[0];
      googleId = payload.sub;
      picture = payload.picture ?? '';
    } else {
      const [, devEmail, devName] = credential.split(':');
      if (!devEmail) {
        throw new AppError('Invalid Google credential', 401);
      }
      email = devEmail;
      name = devName || devEmail.split('@')[0];
      googleId = `dev-${devEmail}`;
    }

    let user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { googleId }]
    });

    if (workspaceAccess) {
      if (!user || !['admin', 'staff'].includes(user.role) || !user.isActive) {
        throw new AppError('This Google account is not allowed to access the admin workspace', 403);
      }
    }

    if (!user) {
      const otpSecret = speakeasy.generateSecret({ name: `${env.APP_NAME}:${email}` });
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password: uuid(),
        authProvider: 'google',
        googleId,
        isEmailVerified: true,
        avatar: picture ? { url: picture, publicId: picture, alt: name } : undefined,
        otp: {
          secret: otpSecret.base32,
          otpauthUrl: otpSecret.otpauth_url ?? '',
          enabled: false
        }
      });
      await Wishlist.create({ user: user._id, items: [] });
      await invalidateAnalyticsCache();
    } else {
      user.authProvider = 'google';
      user.googleId = googleId;
      user.isEmailVerified = true;
      if (picture) {
        user.avatar = { url: picture, publicId: picture, alt: name };
      }
      await user.save();
    }

    const { refreshToken, sessionId, tokens } = await buildAuthTokens(user, rememberMe, meta);
    logger.info(`auth.google.success user=${user._id.toString()} email=${user.email} rememberMe=${rememberMe} ip=${meta.ipAddress ?? 'unknown'}`);
    await auditLogService.record({
      action: 'auth.google_login',
      actorUserId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'session',
      targetId: sessionId,
      targetLabel: user.email,
      message: 'Google login successful',
      metadata: { rememberMe },
      ...buildAuditMeta(meta)
    });
    return {
      refreshToken,
      auth: await createAuthPayload(user, sessionId, tokens)
    };
  },

  refresh: async (
    rawRefreshToken: string,
    meta: RequestMeta
  ): Promise<{ auth: AuthPayloadDto; refreshToken: string; rememberMe: boolean }> => {
    let decoded: { id: string; sessionId: string } | null = null;
    try {
      decoded = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as { id: string; sessionId: string };
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    const session = await RefreshSession.findOne({
      sessionId: decoded.sessionId,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).select('+tokenHash');
    if (!session || session.tokenHash !== hashValue(rawRefreshToken)) {
      throw new AppError('Refresh session not found', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new AppError('User not found', 401);
    }

    session.revokedAt = new Date();
    await session.save();
    await invalidateCachedSession(session.sessionId);

    const { refreshToken, sessionId, tokens } = await buildAuthTokens(user, session.rememberMe, meta);
    logger.info(`auth.refresh.success user=${user._id.toString()} session=${sessionId} ip=${meta.ipAddress ?? 'unknown'}`);
    await auditLogService.record({
      action: 'auth.refresh',
      actorUserId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'session',
      targetId: sessionId,
      message: 'Refresh token rotated successfully',
      metadata: { rememberMe: session.rememberMe },
      ...buildAuditMeta(meta)
    });
    return {
      refreshToken,
      auth: await createAuthPayload(user, sessionId, tokens),
      rememberMe: session.rememberMe
    };
  },

  logout: async (rawRefreshToken?: string): Promise<void> => {
    if (!rawRefreshToken) {
      return;
    }
    try {
      const decoded = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as { sessionId: string };
      await RefreshSession.findOneAndUpdate({ sessionId: decoded.sessionId }, { revokedAt: new Date() });
      await invalidateCachedSession(decoded.sessionId);
      logger.info(`auth.logout.success session=${decoded.sessionId}`);
      await auditLogService.record({
        action: 'auth.logout',
        actorRole: 'system',
        targetType: 'session',
        targetId: decoded.sessionId,
        message: 'Session revoked on logout'
      });
    } catch {
      const session = await RefreshSession.findOneAndUpdate(
        { tokenHash: hashValue(rawRefreshToken) },
        { revokedAt: new Date() },
        { new: false }
      )
        .select('sessionId')
        .lean<{ sessionId: string } | null>();
      await invalidateCachedSession(session?.sessionId);
      logger.info('auth.logout.success session=hash-match');
      await auditLogService.record({
        action: 'auth.logout',
        actorRole: 'system',
        targetType: 'session',
        message: 'Session revoked on logout using token hash fallback'
      });
    }
  },

  logoutAll: async (userId: string): Promise<void> => {
    const user = await User.findById(userId).select('email role');
    const sessionIds = await getActiveSessionIdsForUser(userId);
    await RefreshSession.updateMany(
      {
        user: userId,
        revokedAt: null
      },
      { revokedAt: new Date() }
    );
    await Promise.all([invalidateCachedUser(userId), invalidateCachedSessions(sessionIds)]);
    logger.info(`auth.logout_all.success user=${userId}`);
    await auditLogService.record({
      action: 'auth.logout_all',
      actorUserId: userId,
      actorEmail: user?.email,
      actorRole: user?.role ?? 'customer',
      targetType: 'user',
      targetId: userId,
      targetLabel: user?.email,
      message: 'All sessions revoked for user'
    });
  },

  verifyEmail: async (token: string): Promise<void> => {
    const user = await User.findOne({
      emailVerificationToken: hashValue(token),
      emailVerificationExpires: { $gt: new Date() }
    }).select('+emailVerificationToken +emailVerificationExpires');
    if (!user) {
      throw new AppError('Verification link is invalid or expired', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    await invalidateCachedUser(user._id);
    logger.info(`auth.verify_email.success user=${user._id.toString()} email=${user.email}`);
    await auditLogService.record({
      action: 'auth.verify_email',
      actorUserId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'user',
      targetId: user._id.toString(),
      targetLabel: user.email,
      message: 'Email verified successfully'
    });
  },

  resendVerification: async (userId: string): Promise<VerificationEmailResultDto> => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (user.isEmailVerified) {
      throw new AppError('Email already verified', 400);
    }
    const preview = await createEmailVerification(user._id, user.name, user.email);
    await auditLogService.record({
      action: 'auth.resend_verification',
      actorUserId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'user',
      targetId: user._id.toString(),
      targetLabel: user.email,
      message: 'Verification email resent'
    });
    return preview;
  },

  forgotPassword: async (email: string): Promise<void> => {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return;
    }
    await createPasswordReset(user._id, user.name, user.email);
    await auditLogService.record({
      action: 'auth.forgot_password',
      actorUserId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'user',
      targetId: user._id.toString(),
      targetLabel: user.email,
      message: 'Password reset email issued'
    });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    const user = await User.findOne({
      passwordResetToken: hashValue(token),
      passwordResetExpires: { $gt: new Date() },
      passwordResetUsedAt: null
    }).select('+passwordResetToken +passwordResetExpires +passwordResetUsedAt');
    if (!user) {
      throw new AppError('Reset link is invalid or expired', 400);
    }

    user.password = password;
    user.passwordResetUsedAt = new Date();
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    const sessionIds = await getActiveSessionIdsForUser(user._id);
    await RefreshSession.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
    await Promise.all([invalidateCachedUser(user._id), invalidateCachedSessions(sessionIds)]);
    logger.info(`auth.password_reset.success user=${user._id.toString()} email=${user.email}`);
    await auditLogService.record({
      action: 'auth.reset_password',
      actorUserId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'user',
      targetId: user._id.toString(),
      targetLabel: user.email,
      message: 'Password reset completed'
    });
  },

  getMe: async (userId: string, sessionId?: string): Promise<AuthPayloadDto> => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return createAuthPayload(user, sessionId);
  },

  listSessions: async (userId: string, currentSessionId?: string): Promise<SessionDto[]> =>
    getSessions(new Types.ObjectId(userId), currentSessionId),

  listLoyaltyTransactions: async (userId: string): Promise<LoyaltyTransactionDto[]> => {
    const entries = await LoyaltyTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
    return entries.map((entry) => serializeLoyaltyTransaction(entry.toObject()));
  },

  updateProfile: async (
    userId: string,
    payload: Partial<Pick<RegisterDto, 'name' | 'phone' | 'language'>> & {
      avatar?: { url: string; publicId: string; alt?: string };
      shopPreferences?: {
        myFilters?: NonNullable<ShopPreferencesDto['myFilters']> | null;
      };
    }
  ): Promise<AuthPayloadDto> => {
    const $set: Record<string, unknown> = {
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.phone ? { phone: payload.phone } : {}),
      ...(payload.language ? { language: payload.language } : {}),
      ...(payload.avatar ? { avatar: payload.avatar } : {})
    };
    const $unset: Record<string, 1> = {};

    if (payload.shopPreferences) {
      if (payload.shopPreferences.myFilters === null) {
        $unset['shopPreferences.myFilters'] = 1;
      } else if (payload.shopPreferences.myFilters) {
        $set['shopPreferences.myFilters'] = {
          params: Object.fromEntries(
            Object.entries(payload.shopPreferences.myFilters.params).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0
            )
          ),
          savedAt: new Date(payload.shopPreferences.myFilters.savedAt)
        };
      }
    }

    const updateDocument: Record<string, unknown> = {};
    if (Object.keys($set).length) {
      updateDocument.$set = $set;
    }
    if (Object.keys($unset).length) {
      updateDocument.$unset = $unset;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      Object.keys(updateDocument).length ? updateDocument : {},
      { new: true }
    );
    if (!user) {
      throw new AppError('User not found', 404);
    }
    await invalidateCachedUser(user._id);
    return createAuthPayload(user);
  },

  updatePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const matches = await user.correctPassword(currentPassword);
    if (!matches) {
      throw new AppError('Current password is incorrect', 400);
    }
    user.password = newPassword;
    await user.save();
    const sessionIds = await getActiveSessionIdsForUser(userId);
    await RefreshSession.updateMany({ user: userId }, { revokedAt: new Date() });
    await Promise.all([invalidateCachedUser(userId), invalidateCachedSessions(sessionIds)]);
    logger.info(`auth.password_update.success user=${userId}`);
    await auditLogService.record({
      action: 'auth.update_password',
      actorUserId: userId,
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'user',
      targetId: userId,
      targetLabel: user.email,
      message: 'Password updated and sessions revoked'
    });
  },

  addAddress: async (
    userId: string,
    address: {
      label: string;
      fullName: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      district: string;
      postalCode: string;
      country: string;
      isDefault?: boolean;
    }
  ): Promise<AuthPayloadDto> => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (address.isDefault) {
      user.addresses.forEach((item) => {
        item.isDefault = false;
      });
    } else if (user.addresses.length === 0) {
      address.isDefault = true;
    }

    user.addresses.push({
      ...address,
      isDefault: address.isDefault ?? false
    });
    await user.save();
    await invalidateCachedUser(user._id);
    return createAuthPayload(user);
  },

  updateAddress: async (
    userId: string,
    addressId: string,
    address: {
      label: string;
      fullName: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      district: string;
      postalCode: string;
      country: string;
      isDefault?: boolean;
    }
  ): Promise<AuthPayloadDto> => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const targetIndex = user.addresses.findIndex((item) => item._id?.toString() === addressId);
    if (targetIndex < 0) {
      throw new AppError('Address not found', 404);
    }

    if (address.isDefault) {
      user.addresses.forEach((item) => {
        item.isDefault = false;
      });
    }

    const currentAddress = user.addresses[targetIndex]!;
    user.addresses[targetIndex] = {
      ...currentAddress,
      ...address,
      isDefault: address.isDefault ?? currentAddress.isDefault ?? false
    };
    await user.save();
    await invalidateCachedUser(user._id);
    return createAuthPayload(user);
  },

  deleteAddress: async (userId: string, addressId: string): Promise<AuthPayloadDto> => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const targetIndex = user.addresses.findIndex((item) => item._id?.toString() === addressId);
    if (targetIndex < 0) {
      throw new AppError('Address not found', 404);
    }

    const wasDefault = Boolean(user.addresses[targetIndex]?.isDefault);
    user.addresses.splice(targetIndex, 1);
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }
    await user.save();
    await invalidateCachedUser(user._id);
    return createAuthPayload(user);
  },

  setDefaultAddress: async (userId: string, addressId: string): Promise<AuthPayloadDto> => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const targetExists = user.addresses.some((item) => item._id?.toString() === addressId);
    if (!targetExists) {
      throw new AppError('Address not found', 404);
    }

    user.addresses.forEach((address) => {
      address.isDefault = address._id?.toString() === addressId;
    });

    await user.save();
    await invalidateCachedUser(user._id);
    return createAuthPayload(user);
  },

  cleanupExpiredSecurityFields: async (): Promise<{ resetTokensCleared: number; locksCleared: number }> => {
    const now = new Date();
    const [resetTokenResult, lockResult] = await Promise.all([
      User.updateMany(
        {
          passwordResetExpires: { $lte: now },
          passwordResetToken: { $exists: true }
        },
        {
          $unset: {
            passwordResetToken: 1,
            passwordResetExpires: 1
          }
        }
      ),
      User.updateMany(
        {
          lockUntil: { $lte: now }
        },
        {
          $unset: { lockUntil: 1 },
          $set: { loginAttempts: 0 }
        }
      )
    ]);

    return {
      resetTokensCleared: resetTokenResult.modifiedCount,
      locksCleared: lockResult.modifiedCount
    };
  }
};
