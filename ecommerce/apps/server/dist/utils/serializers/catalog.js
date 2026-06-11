import { applyBrandLogoTransform, isDateLike, serializeImage, toId } from './helpers.js';
export const serializeBrand = (brand) => {
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
export const serializeCategory = (category) => ({
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
