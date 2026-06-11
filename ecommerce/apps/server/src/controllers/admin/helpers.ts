import type { Request } from 'express';
import type { AuditLogListFilters } from '../../services/auditLogService.js';

export const baseUrl = (req: Request): string => `${req.protocol}://${req.get('host')}`;

export const routeId = (req: Request): string => (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

export const requestAudit = (req: Request) => ({
  actorUserId: req.user?.id,
  actorEmail: req.user?.email,
  actorRole: req.user?.role,
  ipAddress: req.ip,
  userAgent: req.get('user-agent') ?? ''
});

export const auditLogFiltersFromRequest = (req: Request): AuditLogListFilters => ({
  page: Number(req.query.page ?? 1),
  limit: Number(req.query.limit ?? 25),
  search: typeof req.query.search === 'string' ? req.query.search : undefined,
  action: typeof req.query.action === 'string' ? req.query.action : undefined,
  status: typeof req.query.status === 'string' ? (req.query.status as 'success' | 'failure' | 'blocked') : undefined,
  actorRole: typeof req.query.actorRole === 'string' ? (req.query.actorRole as 'customer' | 'staff' | 'admin' | 'system') : undefined
});
