import { useCallback, useState } from 'react';
import type { ProductDetailDto } from '@njstore/types';
import type { VariantSelection } from './productVariantUtils';
import { buildInitialSelectionState } from './ProductCardSelection';

export const useProductCardSelection = () => {
  const [selectedOptions, setSelectedOptions] = useState<VariantSelection>({});
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | undefined>(undefined);

  const resetSelection = useCallback((): void => {
    setSelectedOptions({});
    setSelectedVariantIndex(undefined);
  }, []);

  const applyInitialSelection = useCallback((detailProduct: ProductDetailDto): void => {
    const initialSelectionState = buildInitialSelectionState(detailProduct);
    setSelectedOptions(initialSelectionState.selection);
    setSelectedVariantIndex(initialSelectionState.variantIndex);
  }, []);

  return {
    selectedOptions,
    selectedVariantIndex,
    setSelectedOptions,
    setSelectedVariantIndex,
    resetSelection,
    applyInitialSelection
  };
};
