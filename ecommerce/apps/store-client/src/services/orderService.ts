import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import type { OrderDto, PaginatedResult, ReturnRequestDto } from '@njstore/types';
import { downloadBlob } from '@njstore/utils/browserActions';
import api from './api';

const unwrap = <T>(payload: { data: { data: T; pagination?: PaginatedResult<T>['pagination'] } }): { data: T; pagination?: PaginatedResult<T>['pagination'] } => ({
  data: payload.data.data,
  pagination: payload.data.pagination
});

const extractFilename = (
  headers: AxiosResponseHeaders | Partial<RawAxiosResponseHeaders> | undefined,
  fallback: string
): string => {
  const disposition = headers?.['content-disposition'];
  if (typeof disposition !== 'string') {
    return fallback;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallback;
};

const openBlob = (blob: Blob): void => {
  const blobUrl = window.URL.createObjectURL(blob);
  const openedWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

  if (!openedWindow) {
    window.location.assign(blobUrl);
    return;
  }

  window.setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 60_000);
};

const fetchProtectedAsset = async (path: string, fallbackFilename: string): Promise<{ blob: Blob; filename: string }> => {
  const response = await api.get(path, { responseType: 'blob' });
  return {
    blob: response.data as Blob,
    filename: extractFilename(response.headers, fallbackFilename)
  };
};

export const orderService = {
  createQuotation: async (payload: Record<string, unknown>) => unwrap<OrderDto>(await api.post('/orders', payload)),
  getQuotationByToken: async (token: string) => unwrap<OrderDto>(await api.get(`/orders/quotation/${token}`)),
  confirmQuotation: async (token: string, payload?: Record<string, unknown>) =>
    unwrap<OrderDto>(await api.post(`/orders/quotation/${token}/confirm`, payload ?? {})),
  list: async (page = 1, limit = 10, options?: { sortBy?: 'createdAt' | 'activity' }) =>
    unwrap<OrderDto[]>(await api.get('/orders', { params: { page, limit, sortBy: options?.sortBy } })),
  detail: async (id: string) => unwrap<OrderDto>(await api.get(`/orders/${id}`)),
  cancel: async (id: string, reason?: string) => unwrap<OrderDto>(await api.patch(`/orders/${id}/cancel`, { reason })),
  listReturnRequests: async (id: string) => unwrap<ReturnRequestDto[]>(await api.get(`/orders/${id}/returns`)),
  createReturnRequest: async (
    id: string,
    payload: {
      reason: string;
      items?: Array<{ sku: string; variantIndex?: number; quantity: number }>;
      refundAmount?: number;
      refundPercent?: number;
    }
  ) => unwrap<ReturnRequestDto>(await api.post(`/orders/${id}/returns`, payload)),
  uploadReturnEvidence: async (orderId: string, returnId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('evidence', file));
    return unwrap<ReturnRequestDto>(await api.post(`/orders/${orderId}/returns/${returnId}/evidence`, form));
  },
  getReceiptAsset: async (id: string, receiptId?: string) => {
    const path = receiptId ? `/orders/${id}/receipts/${receiptId}` : `/orders/${id}/receipt`;
    return fetchProtectedAsset(path, receiptId ? `receipt-${receiptId}` : `receipt-${id}`);
  },
  openReceipt: async (id: string, receiptId?: string) => {
    const asset = await orderService.getReceiptAsset(id, receiptId);
    openBlob(asset.blob);
  },
  downloadReceipt: async (id: string, receiptId?: string) => {
    const asset = await orderService.getReceiptAsset(id, receiptId);
    downloadBlob(asset.blob, asset.filename);
  },
  downloadQuotation: async (id: string) => {
    const asset = await fetchProtectedAsset(`/orders/${id}/quotation`, `quotation-${id}.pdf`);
    downloadBlob(asset.blob, asset.filename);
  },
  downloadInvoice: async (id: string) => {
    const asset = await fetchProtectedAsset(`/orders/${id}/invoice`, `invoice-${id}.pdf`);
    downloadBlob(asset.blob, asset.filename);
  },
  uploadReceipts: async (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => {
      form.append('receipts', file);
    });
    return unwrap<OrderDto>(await api.post(`/orders/${id}/receipts`, form));
  },
  removeReceipt: async (id: string, receiptId: string) => unwrap<OrderDto>(await api.delete(`/orders/${id}/receipts/${receiptId}`))
};
