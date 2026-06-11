import mongoose, { Types } from 'mongoose';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';

type ProductVariantLike = {
  color?: string | null;
  storage?: string | null;
  model?: string | null;
  attributes?: Array<{ name: string; value: string }>;
  stock: number;
  sku: string;
};

type BundleComponentLike = {
  product: {
    _id: Types.ObjectId | string;
    name: string;
    slug: string;
    sku: string;
    isActive?: boolean;
    productType?: 'standard' | 'bundle';
    images?: Array<{ url: string; publicId: string; alt?: string | null }>;
    bundleStock?: number | null;
    variants: ProductVariantLike[];
  };
  quantity: number;
  variantIndex?: number;
};

export type BundleMutationItem = {
  product: string;
  quantity: number;
  variantIndex?: number;
};

export type BundleOrderItemSnapshot = {
  product: Types.ObjectId;
  name: string;
  slug: string;
  image?: { url: string; publicId: string; alt?: string };
  sku: string;
  quantity: number;
  variantIndex?: number;
  variantLabel?: string;
};

const buildVariantLabel = (variant?: Pick<ProductVariantLike, 'color' | 'storage' | 'model' | 'attributes'>): string | undefined => {
  const customParts = (variant?.attributes ?? []).map((attribute) => `${attribute.name}: ${attribute.value}`);
  const parts = [variant?.color, variant?.storage, variant?.model, ...customParts].filter(Boolean);
  return parts.length ? parts.join(' / ') : undefined;
};

const getAvailableStock = (
  product: {
    isActive?: boolean;
    productType?: 'standard' | 'bundle';
    bundleStock?: number | null;
    variants: ProductVariantLike[];
  },
  variantIndex?: number
): number => {
  if (product.isActive === false) {
    return 0;
  }

  if (product.productType === 'bundle') {
    return product.bundleStock ?? 0;
  }

  if (variantIndex !== undefined) {
    return product.variants[variantIndex]?.stock ?? 0;
  }

  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
};

const calculateBundleStock = (bundle: { bundleItems: BundleComponentLike[] }): number => {
  if (!bundle.bundleItems.length) {
    return 0;
  }

  return bundle.bundleItems.reduce((minimumStock, item) => {
    const componentStock = getAvailableStock(item.product, item.variantIndex);
    const bundleUnits = Math.floor(componentStock / item.quantity);
    return Math.min(minimumStock, bundleUnits);
  }, Number.POSITIVE_INFINITY);
};

export const bundleService = {
  normalizeBundleItems: async (
    bundleItems: BundleMutationItem[] | undefined,
    currentProductId?: string
  ): Promise<Array<{ product: Types.ObjectId; quantity: number; variantIndex?: number }>> => {
    if (!bundleItems?.length) {
      return [];
    }

    const normalizedItems = bundleItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      variantIndex: item.variantIndex
    }));
    const uniqueProductIds = [...new Set(normalizedItems.map((item) => item.product))];
    const products = await Product.find({ _id: { $in: uniqueProductIds } }).select('_id name isActive productType variants sku');

    if (products.length !== uniqueProductIds.length) {
      throw new AppError('One or more bundle products could not be found.', 404);
    }

    return normalizedItems.map((item) => {
      const product = products.find((entry) => entry._id.toString() === item.product);
      if (!product) {
        throw new AppError('One or more bundle products could not be found.', 404);
      }

      if (currentProductId && product._id.toString() === currentProductId) {
        throw new AppError('A bundle cannot include itself.', 400);
      }

      if (product.productType === 'bundle') {
        throw new AppError('Bundles can only include standard products.', 400);
      }

      const resolvedVariantIndex =
        item.variantIndex !== undefined ? item.variantIndex : product.variants.length === 1 ? 0 : undefined;

      if (resolvedVariantIndex === undefined) {
        throw new AppError(`Choose a variant for ${product.name} before saving the bundle.`, 400);
      }

      if (!product.variants[resolvedVariantIndex]) {
        throw new AppError(`Variant ${resolvedVariantIndex + 1} was not found for ${product.name}.`, 400);
      }

      return {
        product: product._id,
        quantity: item.quantity,
        variantIndex: resolvedVariantIndex
      };
    });
  },

  buildBundleOrderItems: async (
    bundleProduct: {
      bundleItems: Array<{ product: Types.ObjectId | string; quantity: number; variantIndex?: number }>;
    }
  ): Promise<BundleOrderItemSnapshot[]> => {
    if (!bundleProduct.bundleItems.length) {
      return [];
    }

    const products = await Product.find({
      _id: { $in: bundleProduct.bundleItems.map((item) => item.product) }
    }).select('name slug images sku variants isActive productType bundleStock');

    return bundleProduct.bundleItems.map((item) => {
      const product = products.find((entry) => entry._id.toString() === item.product.toString());
      if (!product) {
        throw new AppError('A bundled product could not be loaded.', 404);
      }
      if (product.isActive === false) {
        throw new AppError('A bundled product is currently unavailable.', 400);
      }

      const variant = item.variantIndex !== undefined ? product.variants[item.variantIndex] : undefined;

      return {
        product: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images[0]
          ? {
              url: product.images[0].url,
              publicId: product.images[0].publicId,
              alt: product.images[0].alt ?? undefined
            }
          : undefined,
        sku: variant?.sku ?? product.sku,
        quantity: item.quantity,
        variantIndex: item.variantIndex,
        variantLabel: buildVariantLabel(variant)
      };
    });
  },

  recalculateBundleStocksForProductIds: async (
    productIds: Array<string | Types.ObjectId>,
    session?: mongoose.ClientSession
  ): Promise<
    Array<{
      before: {
        _id: Types.ObjectId;
        name: string;
        slug: string;
        productType: 'bundle';
        bundleStock: number;
        variants: ProductVariantLike[];
      };
      after: {
        _id: Types.ObjectId;
        name: string;
        slug: string;
        productType: 'bundle';
        bundleStock: number;
        variants: ProductVariantLike[];
      };
    }>
  > => {
    const normalizedIds = [...new Set(productIds.map((productId) => productId.toString()))].map(
      (productId) => new Types.ObjectId(productId)
    );

    if (!normalizedIds.length) {
      return [];
    }

    const bundles = await Product.find({
      productType: 'bundle',
      $or: [{ _id: { $in: normalizedIds } }, { 'bundleItems.product': { $in: normalizedIds } }]
    })
      .populate({
        path: 'bundleItems.product',
        select: 'name slug images sku variants isActive productType bundleStock'
      })
      .session(session || null);

    const changedBundles: Array<{
      before: {
        _id: Types.ObjectId;
        name: string;
        slug: string;
        productType: 'bundle';
        bundleStock: number;
        variants: ProductVariantLike[];
      };
      after: {
        _id: Types.ObjectId;
        name: string;
        slug: string;
        productType: 'bundle';
        bundleStock: number;
        variants: ProductVariantLike[];
      };
    }> = [];

    for (const bundle of bundles) {
      const bundleItems = bundle.bundleItems.filter(
        (
          item
        ): item is typeof item & {
          product: BundleComponentLike['product'];
        } => Boolean(item.product && typeof item.product === 'object' && 'variants' in item.product)
      );
      const nextBundleStock = calculateBundleStock({ bundleItems });

      if ((bundle.bundleStock ?? 0) === nextBundleStock) {
        continue;
      }

      const before = {
        _id: bundle._id,
        name: bundle.name,
        slug: bundle.slug,
        productType: 'bundle' as const,
        bundleStock: bundle.bundleStock ?? 0,
        variants: bundle.variants.map((variant) => ({
          color: variant.color,
          storage: variant.storage,
          model: variant.model,
          stock: variant.stock,
          sku: variant.sku
        }))
      };
      bundle.bundleStock = nextBundleStock;
      await bundle.save({ session });
      changedBundles.push({
        before,
        after: {
          _id: bundle._id,
          name: bundle.name,
          slug: bundle.slug,
          productType: 'bundle',
          bundleStock: bundle.bundleStock ?? 0,
          variants: bundle.variants.map((variant) => ({
            color: variant.color,
            storage: variant.storage,
            model: variant.model,
            stock: variant.stock,
            sku: variant.sku
          }))
        }
      });
    }

    return changedBundles;
  }
};
