import { z } from 'zod';
import type { ProductVersionSnapshot } from './productVersionDiff';

export interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
}

export interface ProductRecord {
  _id: string;
  name: string;
  brand: string;
  brandId?: string | null;
  brandSlug?: string | null;
  brandLogoUrl?: string;
  condition?: 'new' | 'used';
  price: number;
  comparePrice?: number;
  shortDescription: string;
  description: string;
  category?: { _id?: string; id?: string; name?: string };
  isActive: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  flashDealEndsAt?: string;
  productType?: 'standard' | 'bundle';
  stock?: number;
  variants: Array<{
    stock: number;
    sku: string;
    color?: string;
    storage?: string;
    model?: string;
    attributes?: Array<{ name: string; value: string }>;
    glowColor?: string;
    price?: number;
    colorCode?: string;
    images?: Array<{ url: string; publicId: string; alt?: string }>;
  }>;
  bundleItems?: Array<{
    product: string | { _id?: string; id?: string };
    quantity: number;
    variantIndex?: number;
  }>;
  specifications: Array<{ key: string; value: string }>;
  images: Array<{ url: string; publicId: string; alt?: string }>;
  tags?: string[];
  loyaltyPoints?: number;
  sku: string;
  weight?: number;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  publishAt?: string;
  warranty?: string;
  videoUrl?: string;
}

export interface ProductVersionRecord {
  id: string;
  version: number;
  commitMessage: string;
  createdAt: string;
  updatedBy?: {
    id: string;
    name?: string;
    email?: string;
  };
  snapshot: ProductVersionSnapshot;
}

export interface ListQueryResult<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BrandRecord {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export type InventoryFilter = 'all' | 'low_stock';
export type BulkAdjustmentType = 'percentage' | 'fixed';
export type BulkAdjustmentTarget = 'price' | 'comparePrice' | 'both';
export type ProductEditorSection = 'details' | 'pricing' | 'images' | 'variants' | 'bundle' | 'specs' | 'seo';

const requiredNumberString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, `${label} must be a valid positive number`);

const optionalNumberString = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), `${label} must be a valid positive number`);

const hexColorString = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^#(?:[0-9A-Fa-f]{3}){1,2}$/.test(value), 'Use a valid hex code like #111827');

const isValidCanonicalUrl = (value: string): boolean => {
  if (!value) {
    return true;
  }

  if (value.startsWith('/')) {
    return true;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const canonicalUrlString = z
  .string()
  .trim()
  .refine((value) => !value || isValidCanonicalUrl(value), 'Enter a valid canonical URL or path like /product/item');

const bundleItemSchema = z.object({
  product: z.string().trim().min(1, 'Choose a bundled product'),
  quantity: requiredNumberString('Quantity'),
  variantIndex: z.string().trim().optional()
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a product name'),
    productType: z.enum(['standard', 'bundle']).default('standard'),
    brand: z.string().trim().optional(),
    condition: z.enum(['new', 'used']).default('new'),
    category: z.string().trim().min(1, 'Select a category'),
    price: requiredNumberString('Price'),
    comparePrice: optionalNumberString('Compare price'),
    shortDescription: z.string().trim().min(10, 'Short description is too short').max(500, 'Keep the short description within 500 characters'),
    description: z.string().trim().min(10, 'Enter a fuller description'),
    sku: z.string().trim().min(2, 'Enter a master SKU'),
    weight: optionalNumberString('Weight'),
    loyaltyPoints: requiredNumberString('Loyalty points'),
    tags: z.string().optional(),
    isBestSeller: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    isFlashDeal: z.boolean().default(false),
    flashDealEndsAt: z.string().trim().optional(),
    isActive: z.boolean().default(true),
    metaTitle: z.string().trim().max(60, 'SEO title must be 60 characters or fewer').optional(),
    metaDescription: z.string().trim().max(160, 'Meta description must be 160 characters or fewer').optional(),
    canonicalUrl: canonicalUrlString.optional().or(z.literal('')),
    publishAt: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || Number.isNaN(new Date(value).getTime()) === false, 'Enter a valid publish date'),
    warranty: z.string().trim().optional(),
    videoUrl: z.string().trim().url('Enter a valid video URL').optional().or(z.literal('')),
    images: z
      .array(
        z.object({
          url: z.string().trim().url('Use a valid image URL'),
          publicId: z.string().trim().min(2, 'Enter a Cloudinary public ID'),
          alt: z.string().trim().optional()
        })
      )
      .min(1, 'Add at least one product image'),
    variants: z
      .array(
        z.object({
          color: z.string().trim().optional(),
          colorCode: hexColorString,
          storage: z.string().trim().optional(),
          model: z.string().trim().optional(),
          attributes: z
            .array(
              z.object({
                name: z.string().trim().optional(),
                value: z.string().trim().optional()
              })
            )
            .default([]),
          glowColor: hexColorString,
          images: z
            .array(
              z.object({
                url: z.string().trim().url('Use a valid image URL'),
                publicId: z.string().trim().min(2, 'Enter a Cloudinary public ID'),
                alt: z.string().trim().optional()
              })
            )
            .default([]),
          price: optionalNumberString('Variant price'),
          stock: requiredNumberString('Stock'),
          sku: z.string().trim().min(2, 'Enter a variant SKU')
        })
      )
      .default([]),
    bundleItems: z.array(bundleItemSchema).default([]),
    specifications: z
      .array(
        z.object({
          key: z.string().trim().min(1, 'Enter a specification label'),
          value: z.string().trim().min(1, 'Enter a specification value')
        })
      )
      .min(1, 'Add at least one specification')
  })
  .superRefine((value, ctx) => {
    const price = Number(value.price);
    const comparePrice = value.comparePrice?.trim() ? Number(value.comparePrice) : undefined;

    if (value.isFlashDeal && (!comparePrice || comparePrice <= price)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Flash deals require a compare price greater than the active price.',
        path: ['comparePrice']
      });
    }

    if (value.isFlashDeal && !value.flashDealEndsAt?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Flash deals need an end date so the storefront countdown can be shown.',
        path: ['flashDealEndsAt']
      });
    }

    if (value.flashDealEndsAt?.trim()) {
      const parsed = new Date(value.flashDealEndsAt);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid flash deal end date.',
          path: ['flashDealEndsAt']
        });
      } else if (parsed.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Flash deal end date must be in the future.',
          path: ['flashDealEndsAt']
        });
      }
    }

    if (value.productType === 'standard' && value.variants.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add at least one variant to standard products.',
        path: ['variants']
      });
    }

    if (value.productType === 'bundle' && value.bundleItems.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add at least one product to the bundle.',
        path: ['bundleItems']
      });
    }
  });

export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductImageFormValue = ProductFormValues['images'][number];

export const createEmptyImage = (): ProductFormValues['images'][number] => ({
  url: '',
  publicId: '',
  alt: ''
});

export const createEmptyVariant = (): ProductFormValues['variants'][number] => ({
  color: '',
  colorCode: '',
  storage: '',
  model: '',
  attributes: [],
  glowColor: '',
  images: [],
  price: '',
  stock: '0',
  sku: ''
});

export const createEmptySpecification = (): ProductFormValues['specifications'][number] => ({
  key: '',
  value: ''
});

export const createEmptyBundleItem = (): ProductFormValues['bundleItems'][number] => ({
  product: '',
  quantity: '1',
  variantIndex: ''
});

export const toFormImageValue = (image: { url: string; publicId: string; alt?: string }): ProductImageFormValue => ({
  url: image.url,
  publicId: image.publicId,
  alt: image.alt ?? ''
});

export const isBlankImageValue = (image?: Partial<ProductImageFormValue> | null): boolean =>
  !image?.url?.trim() && !image?.publicId?.trim() && !image?.alt?.trim();

export const flattenCategories = (items: CategoryNode[]): Array<{ id: string; name: string }> =>
  items.flatMap((item) => [{ id: item.id, name: item.name }, ...(item.children ? flattenCategories(item.children) : [])]);

export const resolveCategoryId = (product?: ProductRecord): string => {
  const rawValue = product?.category?.id ?? product?.category?._id;
  return rawValue ? String(rawValue) : '';
};

export const parseOptionalNumber = (value?: string): number | undefined => {
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue ? Number(trimmedValue) : undefined;
};

const toDateTimeInputValue = (value?: string): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (input: number): string => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const parseOptionalDateTime = (value?: string): string | undefined => {
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue ? new Date(trimmedValue).toISOString() : undefined;
};

export const parseNullableDateTime = (value?: string): string | null => {
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue ? new Date(trimmedValue).toISOString() : null;
};

export const resolveBundleProductId = (value: NonNullable<ProductRecord['bundleItems']>[number]['product']): string => {
  if (typeof value === 'string') {
    return value;
  }

  return value.id ?? value._id ?? '';
};

export const buildDefaults = (product?: ProductRecord): ProductFormValues => ({
  name: product?.name ?? '',
  productType: product?.productType ?? 'standard',
  brand: product?.brandId ?? '',
  condition: product?.condition ?? 'new',
  category: resolveCategoryId(product),
  price: product?.price != null ? String(product.price) : '0',
  comparePrice: product?.comparePrice != null ? String(product.comparePrice) : '',
  shortDescription: product?.shortDescription ?? '',
  description: product?.description ?? '',
  sku: product?.sku ?? '',
  weight: product?.weight != null ? String(product.weight) : '',
  loyaltyPoints: product?.loyaltyPoints != null ? String(product.loyaltyPoints) : '0',
  tags: product?.tags?.join(', ') ?? '',
  isBestSeller: product?.isBestSeller ?? false,
  isFeatured: product?.isFeatured ?? false,
  isFlashDeal: product?.isFlashDeal ?? false,
  flashDealEndsAt: toDateTimeInputValue(product?.flashDealEndsAt),
  isActive: product?.isActive ?? true,
  metaTitle: product?.metaTitle ?? '',
  metaDescription: product?.metaDescription ?? '',
  canonicalUrl: product?.canonicalUrl ?? '',
  publishAt: toDateTimeInputValue(product?.publishAt),
  warranty: product?.warranty ?? '',
  videoUrl: product?.videoUrl ?? '',
  images: product?.images.length
    ? product.images.map((image) => ({
        url: image.url,
        publicId: image.publicId,
        alt: image.alt ?? ''
      }))
    : [createEmptyImage()],
  variants: product?.variants.length
    ? product.variants.map((variant) => ({
        color: variant.color ?? '',
        colorCode: variant.colorCode ?? '',
        storage: variant.storage ?? '',
        model: variant.model ?? '',
        attributes:
          variant.attributes?.map((attribute) => ({
            name: attribute.name ?? '',
            value: attribute.value ?? ''
          })) ?? [],
        glowColor: variant.glowColor ?? '',
        images:
          variant.images?.map((image) => ({
            url: image.url,
            publicId: image.publicId,
            alt: image.alt ?? ''
          })) ?? [],
        price: variant.price != null ? String(variant.price) : '',
        stock: String(variant.stock),
        sku: variant.sku
      }))
    : product?.productType === 'bundle'
      ? []
      : [createEmptyVariant()],
  bundleItems: product?.bundleItems?.length
    ? product.bundleItems.map((bundleItem) => ({
        product: resolveBundleProductId(bundleItem.product),
        quantity: String(bundleItem.quantity),
        variantIndex: bundleItem.variantIndex != null ? String(bundleItem.variantIndex) : ''
      }))
    : product?.productType === 'bundle'
      ? [createEmptyBundleItem()]
      : [],
  specifications: product?.specifications.length
    ? product.specifications.map((specification) => ({
        key: specification.key,
        value: specification.value
      }))
    : [createEmptySpecification()]
});

export const parseInventoryFilter = (value: string | null): InventoryFilter => (value === 'low_stock' ? 'low_stock' : 'all');

export const productPageSize = 25;

export const parsePositivePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};
