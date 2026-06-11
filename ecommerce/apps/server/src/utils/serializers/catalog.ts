import type { BrandDto, CategoryDto } from '@njstore/types';
import {
  applyBrandLogoTransform,
  type BrandLike,
  type IdValue,
  type ImageLike,
  isDateLike,
  serializeImage,
  toId
} from './helpers.js';

export type CategoryLike = {
  _id: IdValue;
  name: string;
  slug: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  image?: ImageLike;
  parent?: IdValue | null;
  isActive: boolean;
  order: number;
  productCount?: number;
  children?: CategoryLike[];
};

export const serializeBrand = (brand?: BrandLike): BrandDto | undefined => {
  if (!brand || !isDateLike(brand.createdAt) || !isDateLike(brand.updatedAt)) {
    return undefined;
  }

  return {
    id: toId(brand._id),
    name: brand.name,
    slug: brand.slug,
    logo: serializeImage(brand.logo),
    logoUrl: brand.logo?.url ? applyBrandLogoTransform(brand.logo.url) : undefined,
    description: brand.description ?? undefined,
    isActive: brand.isActive,
    sortOrder: brand.sortOrder,
    productCount: brand.productCount,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString()
  };
};

export const serializeCategory = (category: CategoryLike): CategoryDto => ({
  id: toId(category._id),
  name: category.name,
  slug: category.slug,
  description: category.description,
  metaTitle: category.metaTitle ?? undefined,
  metaDescription: category.metaDescription ?? undefined,
  image: serializeImage(category.image),
  parent: category.parent ? toId(category.parent) : null,
  isActive: category.isActive,
  order: category.order,
  productCount: category.productCount,
  children: category.children?.map((child) => serializeCategory(child))
});
