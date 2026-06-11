import { Types } from 'mongoose';
import { Product } from '../models/Product.js';
import { socketService } from './socketService.js';

type BroadcastableProductId = string | Types.ObjectId;

const normalizeProductId = (value: BroadcastableProductId | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.toString().trim();
  return normalized && Types.ObjectId.isValid(normalized) ? normalized : null;
};

export const inventoryBroadcastService = {
  broadcastProductStockUpdates: async (productIds: Array<BroadcastableProductId | null | undefined>): Promise<void> => {
    const uniqueIds = [...new Set(productIds.map(normalizeProductId).filter((productId): productId is string => Boolean(productId)))];
    if (!uniqueIds.length) {
      return;
    }

    const products = await Product.find({ _id: { $in: uniqueIds } })
      .select('name slug productType bundleStock variants')
      .lean<Array<{
        _id: Types.ObjectId;
        name: string;
        slug: string;
        productType?: 'standard' | 'bundle';
        bundleStock?: number | null;
        variants: Array<{
          color?: string | null;
          storage?: string | null;
          model?: string | null;
          stock: number;
          sku: string;
        }>;
      }>>();

    products.forEach((product) => {
      const stock =
        product.productType === 'bundle'
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
