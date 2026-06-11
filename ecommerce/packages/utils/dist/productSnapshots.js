export const toProductDetailSnapshot = (product) => {
    if ('images' in product && 'variants' in product && 'specifications' in product && 'bundleItems' in product) {
        return product;
    }
    return {
        ...product,
        description: product.shortDescription,
        images: product.previewImages?.length ? product.previewImages : product.thumbnail ? [product.thumbnail] : [],
        variants: [],
        specifications: [],
        tags: [],
        loyaltyPoints: 0,
        sku: product.id,
        bundleItems: []
    };
};
