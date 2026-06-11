import type { ProductDetailDto } from '@njstore/types';
import {
  buildVariantSelection,
  findExactVariantIndex,
  findPreferredVariantIndex,
  getVariantAttributeGroups,
  type VariantSelection
} from './productVariantUtils';

export const buildInitialSelectionState = (
  detailProduct: ProductDetailDto
): { selection: VariantSelection; variantIndex: number | undefined } => {
  if (detailProduct.productType !== 'standard' || !detailProduct.variants.length) {
    return {
      selection: {},
      variantIndex: undefined
    };
  }

  const variantGroups = getVariantAttributeGroups(detailProduct.variants);
  if (!variantGroups.length) {
    return {
      selection: {},
      variantIndex: findPreferredVariantIndex(detailProduct.variants)
    };
  }

  const selection = variantGroups.reduce<VariantSelection>((currentSelection, group) => {
    if (group.options.length === 1) {
      currentSelection[group.key] = group.options[0];
    }

    return currentSelection;
  }, {});
  const exactVariantIndex = findExactVariantIndex(detailProduct.variants, variantGroups, selection);

  return exactVariantIndex !== undefined
    ? {
        selection: buildVariantSelection(detailProduct.variants[exactVariantIndex], variantGroups),
        variantIndex: exactVariantIndex
      }
    : {
        selection,
        variantIndex: undefined
      };
};
