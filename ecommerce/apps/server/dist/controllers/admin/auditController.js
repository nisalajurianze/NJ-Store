import { auditLogService } from '../../services/auditLogService.js';
import { sendResponse } from '../../utils/api.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { auditLogFiltersFromRequest, requestAudit } from './helpers.js';
export const listAuditLogs = catchAsync(async (req, res) => {
    const data = await auditLogService.list(auditLogFiltersFromRequest(req));
    sendResponse(res, 200, data.items, undefined, {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: Math.max(1, Math.ceil(data.total / data.limit))
    });
});
export const exportAuditLogs = catchAsync(async (req, res) => {
    const { search, action, status, actorRole } = auditLogFiltersFromRequest(req);
    const { csv, count, filename } = await auditLogService.exportCsv({ search, action, status, actorRole });
    const metadata = { exportedCount: count };
    if (search) {
        metadata.search = search;
    }
    if (action) {
        metadata.action = action;
    }
    if (status) {
        metadata.status = status;
    }
    if (actorRole) {
        metadata.actorRole = actorRole;
    }
    await auditLogService.record({
        action: 'admin.audit.export',
        targetType: 'audit_log',
        targetId: 'csv',
        targetLabel: filename,
        status: 'success',
        message: 'Audit logs exported as CSV by admin',
        metadata,
        ...requestAudit(req)
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.status(200).send(csv);
});
