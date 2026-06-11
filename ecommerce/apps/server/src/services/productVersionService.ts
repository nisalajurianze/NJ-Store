import { Types } from 'mongoose';
import { ProductVersion } from '../models/ProductVersion.js';

type ProductVersionSnapshotInput = {
  _id?: Types.ObjectId | string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  comparePrice?: number | null;
  category?: unknown;
  brand?: unknown;
  brandName?: string | null;
  condition?: 'new' | 'used';
  images?: Array<{ url: string; publicId: string; alt?: string | null }>;
  variants?: Array<{
    color?: string | null;
    colorCode?: string | null;
    storage?: string | null;
    model?: string | null;
    attributes?: Array<{ name: string; value: string }>;
    glowColor?: string | null;
    images?: Array<{ url: string; publicId: string; alt?: string | null }>;
    price?: number | null;
    stock: number;
    sku: string;
  }>;
  specifications?: Array<{ key: string; value: string }>;
  productType?: 'standard' | 'bundle';
  bundleItems?: Array<{
    product?: unknown;
    quantity: number;
    variantIndex?: number | null;
  }>;
  bundleStock?: number | null;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  flashDealEndsAt?: Date | string | null;
  isActive?: boolean;
  publishAt?: Date | string | null;
  tags?: string[];
  loyaltyPoints?: number;
  sku: string;
  weight?: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  warranty?: string | null;
  videoUrl?: string | null;
};

type ProductVersionDocumentShape = {
  _id: Types.ObjectId | string;
  version: number;
  commitMessage?: string | null;
  createdAt: Date | string;
  updatedBy?: {
    _id?: unknown;
    id?: unknown;
    name?: string | null;
    email?: string | null;
  } | null;
  snapshot: ReturnType<typeof buildProductVersionSnapshot>;
};

const toReferenceId = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === 'object' && value !== null) {
    const candidate = value as { _id?: unknown; id?: unknown };
    return toReferenceId(candidate._id ?? candidate.id);
  }

  return undefined;
};

const toReferenceName = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as { name?: unknown };
  return typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : undefined;
};

const normalizeDateValue = (value?: Date | string | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

export const buildProductVersionSnapshot = (product: ProductVersionSnapshotInput) => ({
  name: product.name,
  description: product.description,
  shortDescription: product.shortDescription,
  price: product.price,
  comparePrice: product.comparePrice ?? undefined,
  category: toReferenceId(product.category),
  categoryName: toReferenceName(product.category),
  brand: toReferenceId(product.brand) ?? undefined,
  brandName: product.brandName ?? toReferenceName(product.brand) ?? undefined,
  condition: product.condition ?? 'new',
  images: (product.images ?? []).map((image) => ({
    url: image.url,
    publicId: image.publicId,
    alt: image.alt ?? undefined
  })),
  variants: (product.variants ?? []).map((variant) => ({
    color: variant.color ?? undefined,
    colorCode: variant.colorCode ?? undefined,
    storage: variant.storage ?? undefined,
    model: variant.model ?? undefined,
    attributes: variant.attributes?.map((attribute) => ({ name: attribute.name, value: attribute.value })) ?? [],
    glowColor: variant.glowColor ?? undefined,
    images: (variant.images ?? []).map((image) => ({
      url: image.url,
      publicId: image.publicId,
      alt: image.alt ?? undefined
    })),
    price: variant.price ?? undefined,
    stock: variant.stock,
    sku: variant.sku
  })),
  specifications: (product.specifications ?? []).map((specification) => ({
    key: specification.key,
    value: specification.value
  })),
  productType: product.productType ?? 'standard',
  bundleItems: (product.bundleItems ?? []).map((item) => ({
    product: toReferenceId(item.product) ?? '',
    quantity: item.quantity,
    variantIndex: item.variantIndex ?? undefined
  })),
  bundleStock: product.bundleStock ?? 0,
  isBestSeller: product.isBestSeller ?? false,
  isFeatured: product.isFeatured ?? false,
  isFlashDeal: product.isFlashDeal ?? false,
  flashDealEndsAt: normalizeDateValue(product.flashDealEndsAt),
  isActive: product.isActive ?? true,
  publishAt: normalizeDateValue(product.publishAt),
  tags: [...(product.tags ?? [])],
  loyaltyPoints: product.loyaltyPoints ?? 0,
  sku: product.sku,
  weight: product.weight ?? undefined,
  metaTitle: product.metaTitle ?? undefined,
  metaDescription: product.metaDescription ?? undefined,
  canonicalUrl: product.canonicalUrl ?? undefined,
  warranty: product.warranty ?? undefined,
  videoUrl: product.videoUrl ?? undefined
});

const serializeProductVersion = (version: ProductVersionDocumentShape) => ({
  id: toReferenceId(version._id) ?? '',
  version: version.version,
  commitMessage: version.commitMessage ?? 'Updated product details',
  createdAt: normalizeDateValue(version.createdAt) ?? new Date(0).toISOString(),
  updatedBy: version.updatedBy
    ? {
        id: toReferenceId(version.updatedBy._id ?? version.updatedBy.id) ?? '',
        name: version.updatedBy.name ?? undefined,
        email: version.updatedBy.email ?? undefined
      }
    : undefined,
  snapshot: version.snapshot
});

const createVersionRecord = async (payload: {
  productId: string;
  snapshot: ReturnType<typeof buildProductVersionSnapshot>;
  updatedBy?: string;
  commitMessage?: string;
}): Promise<void> => {
  const latestVersion = await ProductVersion.findOne({ product: payload.productId }).sort({ version: -1 }).select('version').lean();
  const nextVersion = (latestVersion?.version ?? 0) + 1;

  await ProductVersion.create({
    product: new Types.ObjectId(payload.productId),
    version: nextVersion,
    snapshot: payload.snapshot,
    ...(payload.updatedBy ? { updatedBy: new Types.ObjectId(payload.updatedBy) } : {}),
    ...(payload.commitMessage ? { commitMessage: payload.commitMessage } : {})
  });
};

export const productVersionService = {
  recordVersion: async (payload: {
    productId: string;
    snapshot: ReturnType<typeof buildProductVersionSnapshot>;
    updatedBy?: string;
    commitMessage?: string;
  }): Promise<void> => {
    let remainingAttempts = 2;

    while (remainingAttempts > 0) {
      try {
        await createVersionRecord(payload);
        return;
      } catch (error) {
        const isDuplicateVersionError =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          Number((error as { code?: unknown }).code) === 11000;

        remainingAttempts -= 1;
        if (!isDuplicateVersionError || remainingAttempts === 0) {
          throw error;
        }
      }
    }
  },

  listVersions: async (productId: string, limit = 5) => {
    const versions = await ProductVersion.find({ product: productId })
      .sort({ version: -1 })
      .limit(limit)
      .populate('updatedBy', 'name email')
      .lean();

    return versions.map((version) => serializeProductVersion(version as unknown as ProductVersionDocumentShape));
  },

  getVersionById: async (productId: string, versionId: string) => {
    const version = await ProductVersion.findOne({
      _id: versionId,
      product: productId
    })
      .populate('updatedBy', 'name email')
      .lean();

    return version ? serializeProductVersion(version as unknown as ProductVersionDocumentShape) : null;
  },

  deleteVersionsForProduct: async (productId: string): Promise<void> => {
    await ProductVersion.deleteMany({ product: productId });
  }
};
