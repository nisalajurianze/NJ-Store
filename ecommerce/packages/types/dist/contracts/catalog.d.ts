import type { ProductCondition, ProductSort, ProductType } from '../constants/enums.js';
import type { ImageAsset } from './common.js';
export interface BrandDto {
    id: string;
    name: string;
    slug: string;
    logo?: ImageAsset;
    logoUrl?: string;
    description?: string;
    isActive: boolean;
    sortOrder: number;
    productCount?: number;
    createdAt: string;
    updatedAt: string;
}
export interface CategoryDto {
    id: string;
    name: string;
    slug: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    image?: ImageAsset;
    parent?: string | null;
    isActive: boolean;
    order: number;
    productCount?: number;
    children?: CategoryDto[];
}
export interface ProductVariantDto {
    color?: string;
    colorCode?: string;
    storage?: string;
    model?: string;
    attributes?: Array<{
        name: string;
        value: string;
    }>;
    glowColor?: string;
    images?: ImageAsset[];
    price?: number;
    stock: number;
    sku: string;
}
export interface ProductSpecificationDto {
    key: string;
    value: string;
}
export interface ProductBundleItemDto {
    product: string;
    name: string;
    slug: string;
    image?: ImageAsset;
    sku: string;
    quantity: number;
    variantIndex?: number;
    variantLabel?: string;
}
export interface ProductColorVariantDto {
    name: string;
    colorCode?: string;
}
export interface ProductCardDto {
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    price: number;
    comparePrice?: number;
    thumbnail?: ImageAsset;
    previewImages?: ImageAsset[];
    category?: CategoryDto;
    brand: string;
    brandId?: string | null;
    brandSlug?: string | null;
    brandLogoUrl?: string;
    condition?: ProductCondition;
    ratings: {
        average: number;
        count: number;
    };
    isBestSeller: boolean;
    isFeatured: boolean;
    isFlashDeal?: boolean;
    flashDealEndsAt?: string;
    isActive: boolean;
    publishAt?: string;
    stock: number;
    discountPercentage: number;
    productType: ProductType;
    colorVariants?: ProductColorVariantDto[];
}
export interface ProductDetailDto extends ProductCardDto {
    description: string;
    images: ImageAsset[];
    variants: ProductVariantDto[];
    specifications: ProductSpecificationDto[];
    tags: string[];
    loyaltyPoints: number;
    sku: string;
    weight?: number;
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    warranty?: string;
    videoUrl?: string;
    bundleItems: ProductBundleItemDto[];
}
export interface ProductSuggestionDto {
    id: string;
    name: string;
    slug: string;
    price: number;
    thumbnail?: ImageAsset;
    colorVariants?: ProductColorVariantDto[];
}
export interface ProductFilterQuery {
    q?: string;
    category?: string[];
    brand?: string[];
    condition?: ProductCondition;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    inStock?: boolean;
    featured?: boolean;
    bestSeller?: boolean;
    flashDeal?: boolean;
    excludeIds?: string[];
    sort?: ProductSort;
    page?: number;
    limit?: number;
}
export interface ProductPriceRangeDto {
    min: number;
    max: number;
}
export interface ProductUpsellRequestItemDto {
    productId: string;
    quantity?: number;
    variantIndex?: number;
}
export interface ProductUpsellRequestDto {
    items: ProductUpsellRequestItemDto[];
    limit?: number;
}
export interface ProductUpsellQueryDto {
    ids: string[];
    limit?: number;
}
export interface ProductComparisonDto {
    id: string;
    name: string;
    brand: string;
    brandId?: string | null;
    brandSlug?: string | null;
    brandLogoUrl?: string;
    price: number;
    comparePrice?: number;
    ratings: {
        average: number;
        count: number;
    };
    thumbnail?: ImageAsset;
    specifications: ProductSpecificationDto[];
}
export interface ProductQuestionDto {
    id: string;
    product: string;
    productName?: string;
    productSlug?: string;
    question: string;
    answer: string;
    askedBy: {
        name: string;
    };
    answeredBy?: {
        id?: string;
        name?: string;
    };
    createdAt: string;
    answeredAt?: string;
}
export interface AdminProductQuestionDto {
    id: string;
    product: {
        id: string;
        name: string;
        slug: string;
    };
    customer: {
        id?: string;
        name: string;
        email: string;
    };
    question: string;
    answer?: string;
    status: 'pending' | 'answered';
    createdAt: string;
    answeredAt?: string;
    answeredBy?: {
        id?: string;
        name?: string;
        email?: string;
    };
}
