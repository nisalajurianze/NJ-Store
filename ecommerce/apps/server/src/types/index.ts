import type { JwtPayload } from 'jsonwebtoken';
import type { Request } from 'express';
import type { Language, Role } from '@njstore/types';

export interface JwtAuthPayload extends JwtPayload {
  id: string;
  email: string;
  role: Role;
  language: Language;
  sessionId: string;
}

export interface AuthRequest extends Request {
  user: NonNullable<Request['user']>;
}

export interface PaginationQuery {
  page: number;
  limit: number;
}
