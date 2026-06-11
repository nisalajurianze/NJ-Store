import { Product } from '../../models/Product.js';
import { collectUploadedFiles } from '../../middleware/upload.js';
import { catalogAdminService } from '../../services/admin/index.js';
import { auditLogService } from '../../services/auditLogService.js';
import { productService } from '../../services/productService.js';
import { AppError } from '../../utils/AppError.js';
import { sendResponse } from '../../utils/api.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { buildSafeRegex } from '../../utils/regex.js';
import { baseUrl, requestAudit, routeId } from './helpers.js';
export const listAdminProducts = catchAsync(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    // Hard cap at 50 to prevent admin list queries from scanning the full collection.
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const includeInactive = String(req.query.includeInactive) === 'true';
    const inventoryFilter = typeof req.query.inventory === 'string' ? req.query.inventory : 'all';
    const ids = Array.isArray(req.query.ids) ? req.query.ids : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const andFilters = [];
    const filter = {};
    if (!includeInactive) {
        filter.isActive = true;
    }
    if (ids?.length) {
        filter._id = { $in: ids };
    }
    if (search) {
        const pattern = buildSafeRegex(search);
        andFilters.push({
            $or: [
                { name: pattern },
                { brandName: pattern },
                { sku: pattern },
                { shortDescription: pattern },
                { tags: { $in: [pattern] } },
                { 'variants.sku': pattern }
            ]
        });
    }
    if (inventoryFilter === 'low_stock') {
        andFilters.push({
            $or: [
                { productType: 'bundle', bundleStock: { $lt: 5 } },
                { productType: { $ne: 'bundle' }, 'variants.stock': { $lt: 5 } }
            ]
        });
    }
    if (andFilters.length > 0) {
        filter.$and = andFilters;
    }
    const [items, total] = await Promise.all([
        Product.find(filter).populate('category').populate('brand').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Product.countDocuments(filter)
    ]);
    sendResponse(res, 200, items.map((item) => {
        const serialized = item;
        return {
            ...serialized,
            brand: (typeof serialized.brand === 'string' ? serialized.brand : serialized.brand?.name)
                ?? serialized.brandName
                ?? 'Unbranded',
            brandId: serialized.brand?._id?.toString?.() ?? serialized.brand?._id ?? null,
            brandSlug: serialized.brand?.slug ?? null,
            brandLogoUrl: serialized.brand?.logo?.url ?? undefined
        };
    }), undefined, { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
});
export const createProduct = catchAsync(async (req, res) => {
    const data = await productService.createProduct(req.body, {
        actorUserId: req.user?.id,
        commitMessage: 'Created product'
    });
    await auditLogService.record({
        action: 'admin.product.create',
        targetType: 'product',
        targetId: data.id,
        targetLabel: data.name,
        message: 'Product created by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 201, data, 'Product created');
});
export const updateProduct = catchAsync(async (req, res) => {
    const data = await productService.updateProduct(routeId(req), req.body, {
        actorUserId: req.user?.id,
        commitMessage: 'Updated product details'
    });
    await auditLogService.record({
        action: 'admin.product.update',
        targetType: 'product',
        targetId: data.id,
        targetLabel: data.name,
        message: 'Product updated by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Product updated');
});
export const deleteProduct = catchAsync(async (req, res) => {
    const productId = routeId(req);
    await productService.softDeleteProduct(productId, {
        actorUserId: req.user?.id,
        commitMessage: 'Deactivated product'
    });
    await auditLogService.record({
        action: 'admin.product.deactivate',
        targetType: 'product',
        targetId: productId,
        message: 'Product deactivated by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, undefined, 'Product deactivated');
});
export const importProductsCsv = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new AppError('A CSV file is required', 400);
    }
    const result = await catalogAdminService.importProductsCsv(req.file.buffer, req.user?.id);
    await auditLogService.record({
        action: 'admin.product.import',
        targetType: 'product',
        message: `Imported products from CSV (${result.success} succeeded, ${result.failed} failed)`,
        ...requestAudit(req)
    });
    sendResponse(res, 200, result, `Imported ${result.success} products. ${result.failed > 0 ? `${result.failed} failed.` : ''}`);
});
export const bulkAdjustProductPrices = catchAsync(async (req, res) => {
    const data = await productService.bulkAdjustProductPrices(req.body, {
        actorUserId: req.user?.id
    });
    await auditLogService.record({
        action: 'admin.product.bulk_price_adjust',
        targetType: 'product',
        message: `Bulk-adjusted prices on ${data.updatedCount} products`,
        metadata: {
            updatedCount: data.updatedCount,
            flashDealsDisabledCount: data.flashDealsDisabledCount,
            updatedProductIds: data.updatedProductIds
        },
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, `Adjusted ${data.updatedCount} products${data.flashDealsDisabledCount > 0 ? ` and disabled ${data.flashDealsDisabledCount} flash deals` : ''}.`);
});
export const listProductVersions = catchAsync(async (req, res) => {
    const data = await productService.listProductVersions(routeId(req), Number(req.query.limit ?? 5));
    sendResponse(res, 200, data);
});
export const restoreProductVersion = catchAsync(async (req, res) => {
    const productId = routeId(req);
    const versionId = Array.isArray(req.params.versionId) ? req.params.versionId[0] : req.params.versionId;
    const data = await productService.restoreProductVersion(productId, versionId, {
        actorUserId: req.user?.id
    });
    await auditLogService.record({
        action: 'admin.product.restore_version',
        targetType: 'product',
        targetId: data.id,
        targetLabel: data.name,
        message: 'Product restored from version history',
        metadata: {
            versionId
        },
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Product restored from version history');
});
export const permanentlyDeleteProduct = catchAsync(async (req, res) => {
    const productId = routeId(req);
    await productService.hardDeleteProduct(productId);
    await auditLogService.record({
        action: 'admin.product.delete_permanent',
        targetType: 'product',
        targetId: productId,
        message: 'Product deleted permanently by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, undefined, 'Product deleted permanently');
});
export const listCategories = catchAsync(async (_req, res) => {
    const data = await catalogAdminService.listCategories();
    sendResponse(res, 200, data);
});
export const createCategory = catchAsync(async (req, res) => {
    const data = await catalogAdminService.createCategory(req.body);
    await auditLogService.record({
        action: 'admin.category.create',
        targetType: 'category',
        targetId: data.id,
        targetLabel: data.name,
        message: 'Category created by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 201, data, 'Category created');
});
export const updateCategory = catchAsync(async (req, res) => {
    const data = await catalogAdminService.updateCategory(routeId(req), req.body);
    await auditLogService.record({
        action: 'admin.category.update',
        targetType: 'category',
        targetId: data.id,
        targetLabel: data.name,
        message: 'Category updated by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, data, 'Category updated');
});
export const deleteCategory = catchAsync(async (req, res) => {
    const categoryId = routeId(req);
    await catalogAdminService.removeCategory(categoryId);
    await auditLogService.record({
        action: 'admin.category.deactivate',
        targetType: 'category',
        targetId: categoryId,
        message: 'Category deactivated by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, undefined, 'Category deactivated');
});
export const permanentlyDeleteCategory = catchAsync(async (req, res) => {
    const categoryId = routeId(req);
    await catalogAdminService.permanentlyDeleteCategory(categoryId);
    await auditLogService.record({
        action: 'admin.category.delete_permanent',
        targetType: 'category',
        targetId: categoryId,
        message: 'Category deleted permanently by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 200, undefined, 'Category deleted permanently');
});
export const uploadCategoryImageAsset = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new AppError('A category image is required', 400);
    }
    const data = await catalogAdminService.uploadCategoryImage(req.file, baseUrl(req), typeof req.body.alt === 'string' ? req.body.alt : undefined);
    await auditLogService.record({
        action: 'admin.category.upload_image',
        targetType: 'category',
        targetId: data.publicId,
        targetLabel: data.alt ?? data.publicId,
        message: 'Category image uploaded by admin',
        ...requestAudit(req)
    });
    sendResponse(res, 201, data, 'Category image uploaded');
});
export const uploadProductImageAssets = catchAsync(async (req, res) => {
    const files = collectUploadedFiles(req);
    if (!files.length) {
        throw new AppError('At least one product image is required', 400);
    }
    const data = await catalogAdminService.uploadProductImages(files, baseUrl(req));
    await auditLogService.record({
        action: 'admin.product.upload_images',
        targetType: 'product',
        targetId: data.map((asset) => asset.publicId).join(','),
        targetLabel: `${data.length} product image${data.length === 1 ? '' : 's'}`,
        message: 'Product images uploaded by admin',
        metadata: {
            count: data.length
        },
        ...requestAudit(req)
    });
    sendResponse(res, 201, data, `Uploaded ${data.length} product image${data.length === 1 ? '' : 's'}`);
});
