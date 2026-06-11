import { auditLogService } from '../services/auditLogService.js';
import { brandService } from '../services/brandService.js';
import { catchAsync } from '../utils/catchAsync.js';
import { sendResponse } from '../utils/api.js';
import { setPublicApiCache } from '../utils/cache.js';
import { AppError } from '../utils/AppError.js';
const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const routeId = (req) => (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
const requestAudit = (req) => ({
    actorUserId: req.user?.id,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? ''
});
export const listBrands = catchAsync(async (req, res) => {
    setPublicApiCache(res, { maxAge: 60, staleWhileRevalidate: 300 });
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 24)));
    const items = await brandService.listBrands({
        activeOnly: true,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        sortBy: req.query.sort === 'name' ? 'name' : 'sortOrder',
        includeProductCounts: true
    });
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);
    sendResponse(res, 200, paginatedItems, undefined, {
        page,
        limit,
        total: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / limit))
    });
});
export const getBrand = catchAsync(async (req, res) => {
    setPublicApiCache(res, { maxAge: 120, staleWhileRevalidate: 600 });
    const data = await brandService.getBrandBySlug(String(req.params.slug));
    sendResponse(res, 200, data);
});
export const listAdminBrands = catchAsync(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const includeInactive = String(req.query.includeInactive ?? 'false') === 'true';
    const items = await brandService.listBrands({
        activeOnly: !includeInactive,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        sortBy: req.query.sort === 'name' ? 'name' : 'sortOrder',
        includeProductCounts: true
    });
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);
    sendResponse(res, 200, paginatedItems, undefined, {
        page,
        limit,
        total: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / limit))
    });
});
export const getAdminBrand = catchAsync(async (req, res) => {
    const data = await brandService.getBrandById(routeId(req));
    sendResponse(res, 200, data);
});
export const createBrand = catchAsync(async (req, res) => {
    const data = await brandService.createBrand(req.body);
    await auditLogService.record({
        action: 'admin.brand.create',
        targetType: 'brand',
        targetId: data.id,
        targetLabel: data.name,
        message: 'Brand created by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 201, data, 'Brand created');
});
export const updateBrand = catchAsync(async (req, res) => {
    const data = await brandService.updateBrand(routeId(req), req.body);
    await auditLogService.record({
        action: 'admin.brand.update',
        targetType: 'brand',
        targetId: data.id,
        targetLabel: data.name,
        message: 'Brand updated by admin',
        metadata: {
            isActive: data.isActive,
            sortOrder: data.sortOrder
        },
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Brand updated');
});
export const deleteBrand = catchAsync(async (req, res) => {
    const brandId = routeId(req);
    await brandService.deleteBrand(brandId);
    await auditLogService.record({
        action: 'admin.brand.delete',
        targetType: 'brand',
        targetId: brandId,
        message: 'Brand deleted by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, undefined, 'Brand deleted');
});
export const uploadBrandLogoAsset = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new AppError('A brand logo image is required', 400);
    }
    const data = await brandService.uploadBrandLogo(req.file, baseUrl(req), typeof req.body.alt === 'string' ? req.body.alt : undefined);
    await auditLogService.record({
        action: 'admin.brand.upload_logo',
        targetType: 'brand',
        targetId: data.publicId,
        targetLabel: data.alt ?? data.publicId,
        message: 'Brand logo uploaded by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 201, data, 'Brand logo uploaded');
});
