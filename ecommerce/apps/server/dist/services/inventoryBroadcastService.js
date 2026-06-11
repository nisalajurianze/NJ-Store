import { Types } from 'mongoose';
import { Product } from '../models/Product.js';
import { socketService } from './socketService.js';
const normalizeProductId = (value) => {
    if (!value) {
        return null;
    }
    const normalized = value.toString().trim();
    return normalized && Types.ObjectId.isValid(normalized) ? normalized : null;
};
export const inventoryBroadcastService = {
    broadcastProductStockUpdates: async (productIds) => {
        const uniqueIds = [...new Set(productIds.map(normalizeProductId).filter((productId) => Boolean(productId)))];
        if (!uniqueIds.length) {
            return;
        }
        const products = await Product.find({ _id: { $in: uniqueIds } })
            .select('name slug productType bundleStock variants')
            .lean();
        products.forEach((product) => {
            const stock = product.productType === 'bundle'
                ? Math.max(0, product.bundleStock ?? 0)
                : product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0);
            socketService.emitToStorefront('product_stock_updated', {
                id: product._id.toString(),
                name: product.name,
                slug: product.slug,
                stock,
                inStock: stock > 0,
                productType: product.productType ?? 'standard',
                variants: product.variants.map((variant) => ({
                    sku: variant.sku,
                    color: variant.color ?? undefined,
                    storage: variant.storage ?? undefined,
                    model: variant.model ?? undefined,
                    stock: Math.max(0, variant.stock)
                }))
            });
        });
    }
};
