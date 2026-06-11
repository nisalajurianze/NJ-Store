import { broadcastAdminService as adminService } from '../../services/admin/index.js';
import { auditLogService } from '../../services/auditLogService.js';
import { sendResponse } from '../../utils/api.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { baseUrl, requestAudit } from './helpers.js';
export const getBroadcastAudienceSummary = catchAsync(async (_req, res) => {
    const data = await adminService.getBroadcastAudienceSummary();
    sendResponse(res, 200, data);
});
export const sendBroadcastEmail = catchAsync(async (req, res) => {
    const data = await adminService.sendBroadcastEmail(req.body, baseUrl(req));
    await auditLogService.record({
        action: 'admin.broadcast.send',
        targetType: 'broadcast',
        targetId: data.audience,
        targetLabel: data.subject,
        message: 'Admin broadcast email dispatched',
        metadata: {
            audience: data.audience,
            requestedRecipients: data.requestedRecipients,
            sent: data.sent,
            failed: data.failed
        },
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, `Broadcast sent to ${data.sent} recipients${data.failed > 0 ? ` (${data.failed} failed)` : ''}`);
});
