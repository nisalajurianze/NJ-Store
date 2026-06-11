import { AppError } from './AppError.js';
const buildResolvedSelection = (product, variantIndex) => ({
    variantIndex,
    variant: variantIndex !== undefined ? product.variants[variantIndex] : undefined
});
const hasValidVariantIndex = (product, variantIndex) => variantIndex !== undefined &&
    Number.isInteger(variantIndex) &&
    variantIndex >= 0 &&
    variantIndex < product.variants.length;
export const resolveRequestedVariantSelection = (product, variantIndex, options) => {
    if (product.productType === 'bundle' || product.variants.length === 0) {
        return buildResolvedSelection(product);
    }
    if (hasValidVariantIndex(product, variantIndex)) {
        return buildResolvedSelection(product, variantIndex);
    }
    if (product.variants.length === 1) {
        return buildResolvedSelection(product, 0);
    }
    if (variantIndex !== undefined) {
        throw new AppError(options?.invalidSelectionMessage ?? 'Selected product option is unavailable.', 400);
    }
    throw new AppError(options?.missingSelectionMessage ?? 'Select all required options first.', 400);
};
export const normalizeStoredVariantSelection = (product, variantIndex) => {
    if (product.productType === 'bundle' || product.variants.length === 0) {
        return buildResolvedSelection(product);
    }
    if (hasValidVariantIndex(product, variantIndex)) {
        return buildResolvedSelection(product, variantIndex);
    }
    if (product.variants.length === 1) {
        return buildResolvedSelection(product, 0);
    }
    return null;
};
