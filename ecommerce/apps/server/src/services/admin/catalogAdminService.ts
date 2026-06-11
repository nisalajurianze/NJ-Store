import { Types } from 'mongoose';
import { parse } from 'csv-parse/sync';
import type { CategoryDto, ImageAsset } from '@njstore/types';
import { slugify } from '@njstore/utils';
import { Category } from '../../models/Category.js';
import { Product } from '../../models/Product.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { serializeCategory } from '../../utils/serializers.js';
import { cacheNamespaces, cacheService } from '../cacheService.js';
import { brandService } from '../brandService.js';
import { buildProductVersionSnapshot, productVersionService } from '../productVersionService.js';
import { removeAsset, uploadBuffer } from '../uploadService.js';
import { escapeRegExp, invalidateCategoryCaches } from './adminShared.js';

const DEFAULT_IMPORTED_DESCRIPTION = 'Imported from CSV. Review and enrich this listing before publishing it live.';
const CATEGORY_TREE_CACHE_TTL_SECONDS = 5 * 60;
const CATEGORY_TREE_SELECT = '_id name slug description metaTitle metaDescription image parent isActive order';

type CategoryTreeDocument = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  image?: { url: string; publicId: string; alt?: string };
  parent?: Types.ObjectId | string | null;
  isActive: boolean;
  order: number;
};

const normalizeCsvKey = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizeCsvValue = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const readCsvField = (record: Record<string, string>, aliases: string[]): string => {
  for (const alias of aliases) {
    const value = record[normalizeCsvKey(alias)];
    if (value) {
      return value;
    }
  }

  return '';
};

const buildNormalizedCsvRecord = (record: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [normalizeCsvKey(key), normalizeCsvValue(value)]));

const toOptionalNumber = (value: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
};
const toRequiredPositiveNumber = (value: string): number | undefined => {
  const normalized = toOptionalNumber(value);
  return normalized !== undefined && normalized > 0 ? normalized : undefined;
};
const toNonNegativeNumber = (value: string, fallback = 0): number => {
  const normalized = toOptionalNumber(value);
  return normalized !== undefined && normalized >= 0 ? normalized : fallback;
};
const toBoolean = (value: string, fallback = false): boolean => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'active', 'featured'].includes(normalized)) {
    return true;
  }
  if (['false', 'no', 'n', '0', 'inactive'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const resolveCategoryIdForCsvImport = async (value: string): Promise<string | undefined> => {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  if (Types.ObjectId.isValid(normalized)) {
    const category = await Category.findById(normalized)
      .select('_id')
      .lean<{ _id: Types.ObjectId } | null>();
    return category?._id.toString();
  }

  const category = await Category.findOne({
    $or: [{ slug: slugify(normalized) }, { name: new RegExp(`^${escapeRegExp(normalized)}$`, 'i') }]
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId } | null>();

  return category?._id.toString();
};

const generateUniqueProductSlugFromCsv = async (name: string, currentId?: string): Promise<string> => {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let attempt = 1;

  while (true) {
    const existing = await Product.findOne({
      slug,
      ...(currentId ? { _id: { $ne: currentId } } : {})
    })
      .select('_id')
      .lean<{ _id: Types.ObjectId } | null>();

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${attempt}`;
    attempt += 1;
  }
};

const buildImportedShortDescription = (name: string, brand: string, provided?: string): string => {
  if (provided?.trim()) {
    return provided.trim();
  }

  return `${brand} ${name} imported via CSV for admin review.`.slice(0, 500);
};

const buildImportedDescription = (name: string, brand: string, provided?: string): string => {
  if (provided?.trim()) {
    return provided.trim();
  }

  return `${name} by ${brand}. ${DEFAULT_IMPORTED_DESCRIPTION}`;
};

const generateUniqueCategorySlug = async (name: string, categoryId?: string): Promise<string> => {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let attempt = 1;

  while (true) {
    const existing = await Category.findOne({
      slug,
      ...(categoryId ? { _id: { $ne: categoryId } } : {})
    })
      .select('_id')
      .lean<{ _id: Types.ObjectId } | null>();
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${attempt}`;
    attempt += 1;
  }
};

const buildCategoryTree = (
  categories: Array<{
    _id: string;
    name: string;
    slug: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    image?: { url: string; publicId: string; alt?: string };
    parent?: string | null;
    isActive: boolean;
    order: number;
    productCount?: number;
  }>
): CategoryDto[] => {
  const map = new Map<string, CategoryDto>();
  const roots: CategoryDto[] = [];

  categories.forEach((category) => {
    map.set(category._id, {
      id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      metaTitle: category.metaTitle,
      metaDescription: category.metaDescription,
      image: category.image,
      parent: category.parent ?? null,
      isActive: category.isActive,
      order: category.order,
      productCount: category.productCount,
      children: []
    });
  });

  map.forEach((category) => {
    if (category.parent && map.has(category.parent)) {
      map.get(category.parent)?.children?.push(category);
    } else {
      roots.push(category);
    }
  });

  return roots.sort((a, b) => a.order - b.order);
};

export const catalogAdminService = {
  importProductsCsv: async (fileBuffer: Buffer, actorUserId?: string): Promise<{ success: number; failed: number }> => {
    const records = parse(fileBuffer, { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;
    let success = 0;
    let failed = 0;

    for (const rawRecord of records) {
      try {
        const record = buildNormalizedCsvRecord(rawRecord);
        const name = readCsvField(record, ['name']);
        const brand = readCsvField(record, ['brand']);
        const sku = readCsvField(record, ['sku']);
        const price = toRequiredPositiveNumber(readCsvField(record, ['price']));
        const categoryValue = readCsvField(record, ['category', 'categoryname', 'categoryslug', 'categoryid']);
        const categoryId = await resolveCategoryIdForCsvImport(categoryValue);

        if (!name || !brand || !sku || price === undefined || !categoryId) {
          failed++;
          continue;
        }

        const comparePrice = toOptionalNumber(readCsvField(record, ['compareprice', 'saleprice']));
        const shortDescription = buildImportedShortDescription(name, brand, readCsvField(record, ['shortdescription']));
        const description = buildImportedDescription(name, brand, readCsvField(record, ['description']));
        const stock = toNonNegativeNumber(readCsvField(record, ['stock']), 0);
        const loyaltyPoints = toNonNegativeNumber(readCsvField(record, ['loyaltypoints']), 0);
        const weight = toOptionalNumber(readCsvField(record, ['weight']));
        const isActive = toBoolean(readCsvField(record, ['active', 'isactive']), false);
        const isFeatured = toBoolean(readCsvField(record, ['featuredstatus', 'featured', 'isfeatured']));
        const isBestSeller = toBoolean(readCsvField(record, ['bestseller', 'isbestseller']));
        const isFlashDeal = toBoolean(readCsvField(record, ['flashdeal', 'isflashdeal']));
        const flashDealEndsAtRaw = readCsvField(record, ['flashdealendsat', 'flashsaleendsat']);
        const flashDealEndsAt = flashDealEndsAtRaw ? new Date(flashDealEndsAtRaw) : undefined;
        const publishAtRaw = readCsvField(record, ['publishat', 'scheduledpublishat', 'scheduledfor']);
        const publishAt = publishAtRaw ? new Date(publishAtRaw) : undefined;
        const tags = readCsvField(record, ['tags'])
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
        const backgroundImageUrl = readCsvField(record, ['imageurl']);
        const backgroundImagePublicId = readCsvField(record, ['imagepublicid']);
        const backgroundImageAlt = readCsvField(record, ['imagealt']);
        const metaTitle = readCsvField(record, ['metatitle', 'seo title']);
        const metaDescription = readCsvField(record, ['metadescription', 'seo description']);
        const canonicalUrl = readCsvField(record, ['canonicalurl', 'canonical']);
        const basePayload = {
          name,
          description,
          shortDescription,
          price,
          comparePrice,
          category: categoryId,
          images:
            backgroundImageUrl && backgroundImagePublicId
              ? [{ url: backgroundImageUrl, publicId: backgroundImagePublicId, alt: backgroundImageAlt || undefined }]
              : [],
          specifications: [],
          isBestSeller,
          isFeatured,
          isFlashDeal,
          flashDealEndsAt:
            flashDealEndsAt && !Number.isNaN(flashDealEndsAt.getTime()) ? flashDealEndsAt : undefined,
          isActive,
          publishAt: publishAt && !Number.isNaN(publishAt.getTime()) ? publishAt : undefined,
          tags,
          loyaltyPoints,
          sku,
          weight,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          canonicalUrl: canonicalUrl || undefined
        };

        if (isFlashDeal && (comparePrice === undefined || comparePrice <= price)) {
          failed++;
          continue;
        }

        const resolvedBrand = await brandService.resolveOrCreateBrandByName(brand);
        const existing = await Product.findOne({ sku });

        if (existing) {
          const nextVariants =
            existing.variants.length <= 1
              ? [
                  {
                    color: existing.variants[0]?.color,
                    colorCode: existing.variants[0]?.colorCode,
                    storage: existing.variants[0]?.storage,
                    model: existing.variants[0]?.model,
                    price: existing.variants[0]?.price,
                    stock,
                    sku
                  }
                ]
              : undefined;

          existing.set({
            ...basePayload,
            brand: resolvedBrand.brand,
            brandName: resolvedBrand.brandName,
            slug: await generateUniqueProductSlugFromCsv(name, existing._id.toString()),
            ...(nextVariants ? { variants: nextVariants } : {})
          });
          await existing.save();
          await productVersionService.recordVersion({
            productId: existing._id.toString(),
            snapshot: buildProductVersionSnapshot(existing.toObject({ virtuals: true }) as Parameters<typeof buildProductVersionSnapshot>[0]),
            updatedBy: actorUserId,
            commitMessage: 'Updated product via CSV import'
          });
        } else {
          const created = await Product.create({
            ...basePayload,
            brand: resolvedBrand.brand,
            brandName: resolvedBrand.brandName,
            slug: await generateUniqueProductSlugFromCsv(name),
            variants: [
              {
                stock,
                sku
              }
            ]
          });
          await productVersionService.recordVersion({
            productId: created._id.toString(),
            snapshot: buildProductVersionSnapshot(created.toObject({ virtuals: true }) as Parameters<typeof buildProductVersionSnapshot>[0]),
            updatedBy: actorUserId,
            commitMessage: 'Created product via CSV import'
          });
        }
        success++;
      } catch (error) {
        logger.error('Failed to import CSV row', error);
        failed++;
      }
    }

    if (success > 0) {
      await Promise.all([
        cacheService.bumpNamespace(cacheNamespaces.products),
        cacheService.bumpNamespace(cacheNamespaces.brands)
      ]);
    }
    return { success, failed };
  },

  listCategories: async (): Promise<CategoryDto[]> => {
    const categoryVersion = await cacheService.getNamespaceVersion(cacheNamespaces.categories);

    return cacheService.rememberVersioned(
      cacheNamespaces.products,
      `category-tree:v${categoryVersion}`,
      CATEGORY_TREE_CACHE_TTL_SECONDS,
      async () => {
        const [categories, productCounts] = await Promise.all([
          Category.find()
            .select(CATEGORY_TREE_SELECT)
            .sort({ order: 1, name: 1 })
            .lean<CategoryTreeDocument[]>(),
          Product.aggregate<{ _id: Types.ObjectId; count: number }>([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
          ])
        ]);

        const countMap = new Map(productCounts.map((entry) => [entry._id.toString(), entry.count]));
        const serialized = categories.map((category) => {
          const categoryId = category._id.toString();
          return {
            _id: categoryId,
            name: category.name,
            slug: category.slug,
            description: category.description,
            metaTitle: category.metaTitle,
            metaDescription: category.metaDescription,
            image: category.image,
            parent: category.parent?.toString() ?? null,
            isActive: category.isActive,
            order: category.order,
            productCount: countMap.get(categoryId) ?? 0
          };
        });

        return buildCategoryTree(serialized);
      }
    );
  },

  createCategory: async (payload: {
    name: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    parent?: string;
    order?: number;
    isActive?: boolean;
    image?: { url: string; publicId: string; alt?: string };
  }): Promise<CategoryDto> => {
    const slug = await generateUniqueCategorySlug(payload.name);
    const category = await Category.create({ ...payload, slug });
    await invalidateCategoryCaches();
    return serializeCategory(category.toObject());
  },

  updateCategory: async (
    categoryId: string,
    payload: Partial<{
      name: string;
      description?: string;
      metaTitle?: string;
      metaDescription?: string;
      parent?: string | null;
      order?: number;
      isActive?: boolean;
      image?: { url: string; publicId: string; alt?: string } | null;
    }>
  ): Promise<CategoryDto> => {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (payload.parent === categoryId) {
      throw new AppError('A category cannot be its own parent', 400);
    }

    if (payload.name && payload.name !== category.name) {
      category.slug = await generateUniqueCategorySlug(payload.name, categoryId);
    }

    if (payload.image === null && category.image?.publicId) {
      await removeAsset(category.image.publicId);
    }

    category.set({
      ...payload,
      ...(payload.image === null ? { image: undefined } : {})
    });
    await category.save();
    await invalidateCategoryCaches();
    return serializeCategory(category.toObject());
  },

  removeCategory: async (categoryId: string): Promise<void> => {
    await Category.findByIdAndUpdate(categoryId, { isActive: false });
    await invalidateCategoryCaches();
  },

  permanentlyDeleteCategory: async (categoryId: string): Promise<void> => {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
      throw new AppError(
        `Cannot delete a category that still has ${productCount} product${productCount > 1 ? 's' : ''}. Reassign them first.`,
        400
      );
    }

    const childCount = await Category.countDocuments({ parent: category._id });
    if (childCount > 0) {
      throw new AppError(
        `Cannot delete a category with ${childCount} sub-categor${childCount > 1 ? 'ies' : 'y'}. Remove or reassign them first.`,
        400
      );
    }

    if (category.image?.publicId) {
      await removeAsset(category.image.publicId);
    }

    await category.deleteOne();
    await invalidateCategoryCaches();
  },

  uploadCategoryImage: async (file: Express.Multer.File, baseUrl: string, alt?: string): Promise<ImageAsset> =>
    uploadBuffer({
      file,
      folder: 'categories',
      baseUrl,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      alt,
      resourceType: 'image'
    }),

  uploadProductImages: async (files: Express.Multer.File[], baseUrl: string): Promise<ImageAsset[]> =>
    Promise.all(
      files.map((file) =>
        uploadBuffer({
          file,
          folder: 'products',
          baseUrl,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          resourceType: 'image'
        })
      )
    )
};
