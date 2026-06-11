export const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;
export const routeId = (req) => (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
export const requestAudit = (req) => ({
    actorUserId: req.user?.id,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? ''
});
export const auditLogFiltersFromRequest = (req) => ({
    page: Number(req.query.page ?? 1),
    limit: Number(req.query.limit ?? 25),
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    action: typeof req.query.action === 'string' ? req.query.action : undefined,
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    actorRole: typeof req.query.actorRole === 'string' ? req.query.actorRole : undefined
});
