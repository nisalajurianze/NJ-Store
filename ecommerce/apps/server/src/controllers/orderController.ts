import { catchAsync } from '../utils/catchAsync.js';
import { sendResponse } from '../utils/api.js';
import { auditLogService } from '../services/auditLogService.js';
import { customerOrderService as orderService } from '../services/order/index.js';
import { returnService } from '../services/returnService.js';
import { collectUploadedFiles } from '../middleware/upload.js';
import { isLocalAsset, resolveAssetDeliveryUrl, resolveLocalAssetPath } from '../services/uploadService.js';
import { AppError } from '../utils/AppError.js';

const baseUrl = (req: import('express').Request): string => `${req.protocol}://${req.get('host')}`;
const requestAudit = (req: import('express').Request) => ({
  ipAddress: req.ip,
  userAgent: req.get('user-agent') ?? ''
});
const deliverProtectedAsset = async (
  res: import('express').Response,
  asset: { publicId: string; url: string }
): Promise<void> => {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (isLocalAsset(asset.publicId)) {
    res.sendFile(resolveLocalAssetPath(asset.publicId));
    return;
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(resolveAssetDeliveryUrl(asset));
  } catch {
    throw new AppError('Unable to retrieve the requested file right now', 502);
  }

  if (!upstreamResponse.ok) {
    throw new AppError('Unable to retrieve the requested file right now', 502);
  }

  const contentType = upstreamResponse.headers.get('content-type');
  const contentDisposition = upstreamResponse.headers.get('content-disposition');
  const contentLength = upstreamResponse.headers.get('content-length');

  if (contentType) {
    res.setHeader('Content-Type', contentType);
  }

  if (contentDisposition) {
    res.setHeader('Content-Disposition', contentDisposition);
  }

  if (contentLength) {
    res.setHeader('Content-Length', contentLength);
  }

  res.status(200).send(Buffer.from(await upstreamResponse.arrayBuffer()));
};

export const createQuotation = catchAsync(async (req, res) => {
  const data = await orderService.createQuotation(req.user!.id, req.body, baseUrl(req));
  await auditLogService.record({
    action: 'order.create_quotation',
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    targetType: 'order',
    targetId: data.id,
    targetLabel: data.orderNumber,
    message: 'Quotation created',
    metadata: { total: data.total, type: data.type },
    ...requestAudit(req)
  });
  sendResponse(res, 201, data, 'Quotation created');
});

export const confirmQuotation = catchAsync(async (req, res) => {
  const data = await orderService.confirmQuotation(String(req.params.token), req.user!.id, req.body);
  sendResponse(res, 200, data, 'Quotation confirmed');
});

export const getQuotationByToken = catchAsync(async (req, res) => {
  const data = await orderService.getQuotationByToken(String(req.params.token), req.user!.id);
  sendResponse(res, 200, data);
});

export const listOrders = catchAsync(async (req, res) => {
  const data = await orderService.listOrders(
    req.user!.id,
    Number(req.query.page),
    Number(req.query.limit),
    req.query.sortBy === 'activity' ? 'activity' : 'createdAt'
  );
  sendResponse(res, 200, data.items, undefined, data.pagination);
});

export const getOrder = catchAsync(async (req, res) => {
  const data = await orderService.getOrderById(String(req.params.id), req.user!.id);
  sendResponse(res, 200, data);
});

export const cancelOrder = catchAsync(async (req, res) => {
  const data = await orderService.cancelOrder(String(req.params.id), req.user!.id, req.body.reason);
  await auditLogService.record({
    action: 'order.cancel',
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    targetType: 'order',
    targetId: data.id,
    targetLabel: data.orderNumber,
    message: req.body.reason ?? 'Order cancelled by customer',
    metadata: { status: data.status },
    ...requestAudit(req)
  });
  sendResponse(res, 200, data, 'Order cancelled');
});

export const listReturnRequests = catchAsync(async (req, res) => {
  const data = await returnService.listForOrder(req.user!.id, String(req.params.id));
  sendResponse(res, 200, data);
});

export const createReturnRequest = catchAsync(async (req, res) => {
  const data = await returnService.createRequest(req.user!.id, String(req.params.id), req.body);
  sendResponse(res, 201, data, 'Return request submitted');
});

export const uploadReturnEvidenceFiles = catchAsync(async (req, res) => {
  const files = collectUploadedFiles(req);
  if (files.length === 0) {
    sendResponse(res, 400, undefined, 'Evidence is required');
    return;
  }

  const data = await returnService.uploadEvidence(String(req.params.returnId), req.user!.id, files, baseUrl(req), 'customer');
  sendResponse(res, 200, data, 'Return evidence uploaded');
});

export const uploadReceiptFiles = catchAsync(async (req, res) => {
  const files = collectUploadedFiles(req);
  if (files.length === 0) {
    sendResponse(res, 400, undefined, 'Receipt is required');
    return;
  }

  const data = await orderService.uploadReceipts(String(req.params.id), req.user!.id, files, baseUrl(req));
  await auditLogService.record({
    action: 'order.upload_receipt',
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    targetType: 'order',
    targetId: data.id,
    targetLabel: data.orderNumber,
    message: files.length > 1 ? 'Multiple payment receipts uploaded' : 'Payment receipt uploaded',
    metadata: { paymentStatus: data.paymentStatus, receiptCount: data.receipts.length },
    ...requestAudit(req)
  });
  sendResponse(res, 200, data, 'Receipt uploaded');
});

export const deleteReceiptFile = catchAsync(async (req, res) => {
  const data = await orderService.removeReceipt(String(req.params.id), req.user!.id, String(req.params.receiptId));
  await auditLogService.record({
    action: 'order.remove_receipt',
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    targetType: 'order',
    targetId: data.id,
    targetLabel: data.orderNumber,
    message: 'Payment receipt removed',
    metadata: { paymentStatus: data.paymentStatus, receiptCount: data.receipts.length },
    ...requestAudit(req)
  });
  sendResponse(res, 200, data, 'Receipt removed');
});

export const getReceipt = catchAsync(async (req, res) => {
  const asset = await orderService.getReceiptAsset(String(req.params.id), String(req.params.receiptId), { userId: req.user!.id });
  await deliverProtectedAsset(res, asset);
});

export const getLegacyReceipt = catchAsync(async (req, res) => {
  const asset = await orderService.getReceiptAsset(String(req.params.id), undefined, { userId: req.user!.id });
  await deliverProtectedAsset(res, asset);
});

export const getInvoice = catchAsync(async (req, res) => {
  const data = await orderService.getInvoiceAsset(String(req.params.id), req.user!.id);
  await deliverProtectedAsset(res, {
    publicId: data.publicId,
    url: data.url
  });
});

export const getQuotation = catchAsync(async (req, res) => {
  const data = await orderService.getQuotationAsset(String(req.params.id), req.user!.id);
  await deliverProtectedAsset(res, data);
});
