import { AppError } from './AppError.js';

type VariantSelectionProduct<TVariant> = {
  productType?: 'standard' | 'bundle';
  variants: TVariant[];
};

export interface ResolvedVariantSelection<TVariant> {
  variantIndex?: number;
  variant?: TVariant;
}

const buildResolvedSelection = <TVariant>(
  product: VariantSelectionProduct<TVariant>,
  variantIndex?: number
): ResolvedVariantSelection<TVariant> => ({
  variantIndex,
  variant: variantIndex !== undefined ? product.variants[variantIndex] : undefined
});

const hasValidVariantIndex = <TVariant>(
  product: VariantSelectionProduct<TVariant>,
  variantIndex: number | undefined
): variantIndex is number =>
  variantIndex !== undefined &&
  Number.isInteger(variantIndex) &&
  variantIndex >= 0 &&
  variantIndex < product.variants.length;

export const resolveRequestedVariantSelection = <TVariant>(
  product: VariantSelectionProduct<TVariant>,
  variantIndex: number | undefined,
  options?: {
    missingSelectionMessage?: string;
    invalidSelectionMessage?: string;
  }
): ResolvedVariantSelection<TVariant> => {
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

export const normalizeStoredVariantSelection = <TVariant>(
  product: VariantSelectionProduct<TVariant>,
  variantIndex: number | undefined
): ResolvedVariantSelection<TVariant> | null => {
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
