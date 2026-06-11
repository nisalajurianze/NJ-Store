import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import type {
  AdminOrderListDto,
  AdminNotificationCenterDto,
  AdminBrandListDto,
  AdminUserListDto,
  AdminProductQuestionDto,
  AdminUserLoginEntryDto,
  AdminUserMergeResultDto,
  AnalyticsQueryDto,
  AnalyticsSummaryDto,
  AdminReturnRequestDto,
  AuditLogDto,
  BannerDto,
  BannerMutationDto,
  BroadcastAudienceSummaryDto,
  BroadcastCampaignInputDto,
  BroadcastDispatchDto,
  BrandDto,
  ExternalExpenseDto,
  ImageAsset,
  ProductSpecificationDto,
  ProductVariantDto,
  ProductSuggestionDto,
  ReviewDto,
  SalesAnalysisDto,
  SiteConfigDto,
  UserSummary
} from '@njstore/types';
import { downloadBlob } from '@njstore/utils';
import api from './api';

const MAX_LIST_PAGE_SIZE = 50;

const unwrap = <T>(payload: { data: { data: T; pagination?: { page: number; limit: number; total: number; totalPages: number } } }) => ({
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

type AdminOrderListParams = {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
};

const normalizeOrderListParams = (pageOrParams: number | AdminOrderListParams = 1, limit = 20): AdminOrderListParams => {
  if (typeof pageOrParams === 'number') {
    return {
      page: pageOrParams,
      limit
    };
  }

  return pageOrParams;
};

const fetchAdminOrdersPage = async (pageOrParams: number | AdminOrderListParams = 1, limit = 20) => {
  const params = normalizeOrderListParams(pageOrParams, limit);

  return unwrap<AdminOrderListDto['items']>(
    await api.get('/admin/orders', {
      params: {
        ...params,
        limit: Math.min(params.limit ?? 20, MAX_LIST_PAGE_SIZE)
      }
    })
  );
};

type AdminProductListParams = {
  page?: number;
  limit?: number;
  search?: string;
  includeInactive?: boolean;
  inventory?: 'all' | 'low_stock';
  ids?: string[];
};

const normalizeProductListParams = (pageOrParams: number | AdminProductListParams = 1, limit = 20): AdminProductListParams => {
  if (typeof pageOrParams === 'number') {
    return {
      page: pageOrParams,
      limit
    };
  }

  return pageOrParams;
};

const fetchAdminProductsPage = async <T = Record<string, unknown>>(pageOrParams: number | AdminProductListParams = 1, limit = 20) => {
  const params = normalizeProductListParams(pageOrParams, limit);

  return unwrap<T[]>(
    await api.get('/admin/products', {
      params: {
        ...params,
        ids: params.ids?.join(','),
        limit: Math.min(params.limit ?? 20, MAX_LIST_PAGE_SIZE)
      }
    })
  );
};

type AdminUserListParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserSummary['role'] | 'workspace';
  verification?: 'verified' | 'unverified';
  includeInactive?: boolean;
};

const normalizeUserListParams = (pageOrParams: number | AdminUserListParams = 1, limit = 20): AdminUserListParams => {
  if (typeof pageOrParams === 'number') {
    return {
      page: pageOrParams,
      limit
    };
  }

  return pageOrParams;
};

const fetchAdminUsersPage = async <T = AdminUserListDto['items'][number]>(
  pageOrParams: number | AdminUserListParams = 1,
  limit = 20
) => {
  const params = normalizeUserListParams(pageOrParams, limit);

  return unwrap<T[]>(
    await api.get('/admin/users', {
      params: {
        ...params,
        limit: Math.min(params.limit ?? 20, MAX_LIST_PAGE_SIZE)
      }
    })
  );
};

type ProductImageInput = Pick<ImageAsset, 'url' | 'publicId'> & { alt?: string };
type ProductBundleItemInput = {
  product: string;
  quantity: number;
  variantIndex?: number;
};

export type AdminProductMutationPayload = {
  name: string;
  productType: 'standard' | 'bundle';
  brand?: string | null;
  condition: 'new' | 'used';
  category: string;
  price: number;
  comparePrice?: number | null;
  shortDescription: string;
  description: string;
  sku: string;
  weight?: number | null;
  loyaltyPoints: number;
  tags?: string[];
  images: ProductImageInput[];
  variants: Array<Omit<ProductVariantDto, 'images'> & { images?: ProductImageInput[] }>;
  bundleItems: ProductBundleItemInput[];
  specifications: ProductSpecificationDto[];
  isBestSeller: boolean;
  isFeatured: boolean;
  isFlashDeal: boolean;
  flashDealEndsAt?: string | null;
  isActive: boolean;
  publishAt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  warranty?: string | null;
  videoUrl?: string | null;
};

export const adminService = {
  notifications: async () => unwrap<AdminNotificationCenterDto>(await api.get('/admin/notifications')),
  markNotificationViewed: async (id: string) =>
    unwrap<AdminNotificationCenterDto>(await api.post(`/admin/notifications/${encodeURIComponent(id)}/viewed`)),
  analytics: async (params?: AnalyticsQueryDto) => unwrap<AnalyticsSummaryDto>(await api.get('/admin/analytics', { params })),
  exportAnalyticsPdf: async (params?: AnalyticsQueryDto): Promise<void> => {
    const response = await api.get('/admin/analytics/export/pdf', {
      params,
      responseType: 'blob'
    });
    downloadBlob(response.data as Blob, extractFilename(response.headers, 'dashboard-report.pdf'));
  },
  exportSalesAnalysisPdf: async (): Promise<void> => {
    const response = await api.get('/admin/sales-analysis/export/pdf', {
      responseType: 'blob'
    });
    downloadBlob(response.data as Blob, extractFilename(response.headers, 'sales-analysis-report.pdf'));
  },
  auditLogs: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    status?: 'success' | 'failure' | 'blocked';
    actorRole?: 'customer' | 'staff' | 'admin' | 'system';
  }) => unwrap<AuditLogDto[]>(await api.get('/admin/audit-logs', { params })),
  exportAuditLogsCsv: async (params?: {
    search?: string;
    action?: string;
    status?: 'success' | 'failure' | 'blocked';
    actorRole?: 'customer' | 'staff' | 'admin' | 'system';
  }): Promise<void> => {
    const response = await api.get('/admin/audit-logs/export', {
      params,
      responseType: 'blob'
    });
    downloadBlob(response.data as Blob, extractFilename(response.headers, 'audit-logs.csv'));
  },
  broadcastAudience: async () => unwrap<BroadcastAudienceSummaryDto>(await api.get('/admin/broadcasts/audience')),
  sendBroadcast: async (payload: BroadcastCampaignInputDto) => unwrap<BroadcastDispatchDto>(await api.post('/admin/broadcasts/email', payload)),
  products: fetchAdminProductsPage,
  updateProduct: async (id: string, payload: Partial<AdminProductMutationPayload>) => unwrap(await api.patch(`/admin/products/${id}`, payload)),
  createProduct: async (payload: AdminProductMutationPayload) => unwrap(await api.post('/admin/products', payload)),
  bulkAdjustProductPrices: async (payload: {
    productIds: string[];
    adjustmentType: 'percentage' | 'fixed';
    amount: number;
    target: 'price' | 'comparePrice' | 'both';
    applyToVariantOverrides?: boolean;
  }) => unwrap(await api.post('/admin/products/bulk-price-adjust', payload)),
  productVersions: async (id: string, limit = 5) => unwrap(await api.get(`/admin/products/${id}/versions`, { params: { limit } })),
  restoreProductVersion: async (id: string, versionId: string) => unwrap(await api.post(`/admin/products/${id}/versions/${versionId}/restore`)),
  importProductsCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return (await api.post('/admin/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })).data;
  },
  deleteProduct: async (id: string) => unwrap(await api.delete(`/admin/products/${id}`)),
  permanentlyDeleteProduct: async (id: string) => unwrap(await api.delete(`/admin/products/${id}/permanent`)),
  orders: fetchAdminOrdersPage,
  createOrder: async (payload: Record<string, unknown>) => unwrap(await api.post('/admin/orders', payload)),
  updateOrder: async (id: string, payload: Record<string, unknown>) => unwrap(await api.patch(`/admin/orders/${id}`, payload)),
  mergeOrders: async (payload: { keepOrderId: string; mergeOrderId: string; reason?: string }) =>
    unwrap(await api.post('/admin/orders/merge', payload)),
  sendOrderShippingNotification: async (id: string) => unwrap(await api.post(`/admin/orders/${id}/notifications/shipping`)),
  deleteOrder: async (id: string) => unwrap(await api.delete(`/admin/orders/${id}`)),
  returnRequests: async (params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'approved' | 'rejected' | 'refunded';
    search?: string;
  }) => unwrap<AdminReturnRequestDto[]>(await api.get('/admin/returns', { params })),
  updateReturnRequest: async (
    id: string,
    payload: {
      status: 'approved' | 'rejected' | 'refunded';
      adminNote?: string;
      items?: Array<{ sku: string; variantIndex?: number; quantity: number }>;
      refundAmount?: number;
      refundPercent?: number;
    }
  ) => unwrap<AdminReturnRequestDto>(await api.patch(`/admin/returns/${id}`, payload)),
  uploadReturnEvidence: async (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('evidence', file));
    return unwrap<AdminReturnRequestDto>(await api.post(`/admin/returns/${id}/evidence`, form));
  },
  getOrderReceiptAsset: async (id: string, receiptId?: string) => {
    const path = receiptId ? `/admin/orders/${id}/receipts/${receiptId}` : `/admin/orders/${id}/receipt`;
    return fetchProtectedAsset(path, receiptId ? `receipt-${receiptId}` : `receipt-${id}`);
  },
  openOrderReceipt: async (id: string, receiptId?: string) => {
    const asset = await adminService.getOrderReceiptAsset(id, receiptId);
    openBlob(asset.blob);
  },
  downloadOrderReceipt: async (id: string, receiptId?: string) => {
    const asset = await adminService.getOrderReceiptAsset(id, receiptId);
    downloadBlob(asset.blob, asset.filename);
  },
  exportOrders: async (): Promise<Blob> => {
    const response = await api.get('/admin/orders/export', { responseType: 'blob' });
    return response.data as Blob;
  },
  users: fetchAdminUsersPage,
  mergeUsers: async (payload: { keepUserId: string; mergeUserId: string }) =>
    unwrap<AdminUserMergeResultDto>(await api.post('/admin/users/merge', payload)),
  userLoginHistory: async (id: string) => unwrap<AdminUserLoginEntryDto[]>(await api.get(`/admin/users/${id}/login-history`)),
  updateUser: async (id: string, payload: Record<string, unknown>) => unwrap(await api.patch(`/admin/users/${id}`, payload)),
  deleteUser: async (id: string) => unwrap(await api.delete(`/admin/users/${id}`)),
  permanentlyDeleteUser: async (id: string) => unwrap(await api.delete(`/admin/users/${id}/permanent`)),
  coupons: async () => unwrap(await api.get('/admin/coupons')),
  createCoupon: async (payload: Record<string, unknown>) => unwrap(await api.post('/admin/coupons', payload)),
  updateCoupon: async (id: string, payload: Record<string, unknown>) => unwrap(await api.patch(`/admin/coupons/${id}`, payload)),
  deleteCoupon: async (id: string) => unwrap(await api.delete(`/admin/coupons/${id}`)),
  productQuestions: async (params?: {
    status?: 'pending' | 'answered';
    search?: string;
  }) => unwrap<AdminProductQuestionDto[]>(await api.get('/admin/product-questions', { params })),
  uploadProductImages: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    return unwrap<ImageAsset[]>(
      await api.post('/admin/products/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
  },
  answerProductQuestion: async (id: string, payload: { answer: string }) =>
    unwrap<AdminProductQuestionDto>(await api.patch(`/admin/product-questions/${id}/answer`, payload)),
  reviews: async () => unwrap<ReviewDto[]>(await api.get('/admin/reviews')),
  moderateReview: async (id: string, isApproved: boolean) => unwrap<ReviewDto>(await api.patch(`/admin/reviews/${id}`, { isApproved })),
  replyToReview: async (id: string, adminReply: string) => unwrap<ReviewDto>(await api.patch(`/admin/reviews/${id}/reply`, { adminReply })),
  productSuggestions: async (q: string) => unwrap<ProductSuggestionDto[]>(await api.get('/products/suggestions', { params: { q } })),
  settings: async () => unwrap<SiteConfigDto>(await api.get('/admin/settings')),
  updateSettings: async (payload: Partial<SiteConfigDto>) => unwrap<SiteConfigDto>(await api.patch('/admin/settings', payload)),
  uploadStoreLogo: async (file: File, alt?: string) => {
    const formData = new FormData();
    formData.append('logo', file);
    if (alt?.trim()) {
      formData.append('alt', alt.trim());
    }
    return unwrap<ImageAsset>(
      await api.post('/admin/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
  },
  homeHeroBanner: async () => unwrap<BannerDto>(await api.get('/admin/banners/home-hero')),
  uploadHomeBannerImage: async (file: File, alt?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (alt?.trim()) {
      formData.append('alt', alt.trim());
    }
    return unwrap<ImageAsset>(
      await api.post('/admin/banners/home-hero/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
  },
  updateHomeHeroBanner: async (payload: BannerMutationDto) => unwrap<BannerDto>(await api.put('/admin/banners/home-hero', payload)),
  categories: async () => unwrap(await api.get('/admin/categories')),
  createCategory: async (payload: Record<string, unknown>) => unwrap(await api.post('/admin/categories', payload)),
  updateCategory: async (id: string, payload: Record<string, unknown>) => unwrap(await api.patch(`/admin/categories/${id}`, payload)),
  deleteCategory: async (id: string) => unwrap(await api.delete(`/admin/categories/${id}`)),
  permanentlyDeleteCategory: async (id: string) => unwrap(await api.delete(`/admin/categories/${id}/permanent`)),
  uploadCategoryImage: async (file: File, alt?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (alt?.trim()) {
      formData.append('alt', alt.trim());
    }
    return unwrap<ImageAsset>(
      await api.post('/admin/categories/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
  },
  brands: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: 'name' | 'sortOrder';
    includeInactive?: boolean;
  }) => unwrap<AdminBrandListDto['items']>(await api.get('/admin/brands', { params })),
  brand: async (id: string) => unwrap<BrandDto>(await api.get(`/admin/brands/${id}`)),
  createBrand: async (payload: {
    name: string;
    logo?: ImageAsset;
    description?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) => unwrap<BrandDto>(await api.post('/admin/brands', payload)),
  updateBrand: async (
    id: string,
    payload: Partial<{
      name: string;
      logo?: ImageAsset;
      description?: string;
      isActive?: boolean;
      sortOrder?: number;
    }>
  ) => unwrap<BrandDto>(await api.patch(`/admin/brands/${id}`, payload)),
  deleteBrand: async (id: string) => unwrap(await api.delete(`/admin/brands/${id}`)),
  uploadBrandLogo: async (file: File, alt?: string) => {
    const formData = new FormData();
    formData.append('logo', file);
    if (alt?.trim()) {
      formData.append('alt', alt.trim());
    }
    return unwrap<ImageAsset>(
      await api.post('/admin/brands/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
  },
  salesAnalysis: async () => unwrap<SalesAnalysisDto>(await api.get('/admin/sales-analysis')),
  createExternalExpense: async (payload: {
    label: string;
    amount: number;
    incurredOn: string;
    category?: string;
    notes?: string;
  }) => unwrap<ExternalExpenseDto>(await api.post('/admin/sales-analysis/expenses', payload)),
  updateExternalExpense: async (
    id: string,
    payload: Partial<{
      label: string;
      amount: number;
      incurredOn: string;
      category?: string;
      notes?: string;
    }>
  ) => unwrap<ExternalExpenseDto>(await api.patch(`/admin/sales-analysis/expenses/${id}`, payload)),
  deleteExternalExpense: async (id: string) => unwrap(await api.delete(`/admin/sales-analysis/expenses/${id}`))
};
