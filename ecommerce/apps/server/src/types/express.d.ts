import type { AdminPermission, Language, Role } from '@njstore/types';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      email: string;
      role: Role;
      language: Language;
      isEmailVerified: boolean;
      sessionId?: string;
      permissions: AdminPermission[];
    }

    interface Request {
      user?: AuthUser;
      requestId?: string;
      apiVersion?: number;
    }
  }
}

export {};
