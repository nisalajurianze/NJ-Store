import { auditLogService } from '../../services/auditLogService.js';
import { returnService } from '../../services/returnService.js';
import { sendResponse } from '../../utils/api.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { collectUploadedFiles } from '../../middleware/upload.js';
import { requestAudit, routeId } from './helpers.js';

const baseUrl = (req: import('express').Request): string => `${req.protocol}://${req.get('host')}`;

export const listReturnRequests = catchAsync(async (req, res) => {
  const data = await returnService.listAll({
    page: Number(req.query.page),
    limit: Number(req.query.limit),
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined
  });
  sendResponse(res, 200, data.items, undefined, data.pagination);
});

export const updateReturnRequestStatus = catchAsync(async (req, res) => {
  const data = await returnService.updateStatus(routeId(req), req.body, {
    id: req.user!.id,
    name: req.user!.email
  });
  await auditLogService.record({
    action: `admin.return.${req.body.status}`,
    targetType: 'return_request',
    targetId: data.id,
    targetLabel: data.orderNumber,
    message: `Return request ${req.body.status} by admin`,
    metadata: {
      status: data.status,
      refundAmount: data.refundAmount
    },
    ...requestAudit(req)
  });
  sendResponse(res, 200, data, 'Return request updated');
});

export const uploadReturnEvidence = catchAsync(async (req, res) => {
  const files = collectUploadedFiles(req);
  if (files.length === 0) {
    sendResponse(res, 400, undefined, 'Evidence is required');
    return;
  }

  const data = await returnService.uploadEvidence(routeId(req), req.user!.id, files, baseUrl(req), 'admin');
  await auditLogService.record({
    action: 'admin.return.upload_evidence',
    targetType: 'return_request',
    targetId: data.id,
    targetLabel: data.orderNumber,
    message: 'Return evidence uploaded by admin',
    ...requestAudit(req)
  });
  sendResponse(res, 200, data, 'Return evidence uploaded');
});
