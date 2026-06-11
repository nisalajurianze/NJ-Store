import type { ImageAsset, ProductDetailDto, ProductVariantDto } from '@njstore/types';
import { isKnownUnavailableDemoAsset } from '../../utils/imageAssets';

export const VARIANT_ATTRIBUTE_CONFIG = [
  { key: 'color', label: 'Color', presentation: 'swatch' },
  { key: 'storage', label: 'Storage', presentation: 'chip' },
  { key: 'model', label: 'Model', presentation: 'chip' }
] as const;

export type VariantAttributeKey = string;
export type VariantAttributePresentation = 'swatch' | 'chip';
export type VariantSelection = Partial<Record<VariantAttributeKey, string>>;

export interface VariantAttributeGroup {
  key: VariantAttributeKey;
  label: string;
  presentation: VariantAttributePresentation;
  options: string[];
}

const NEUTRAL_GLOW_COLOR = '#94a3b8';

const colorNameMap: Record<string, string> = {
  black: '#111827',
  white: '#e5e7eb',
  silver: '#cbd5e1',
  gray: '#94a3b8',
  grey: '#94a3b8',
  graphite: '#475569',
  midnight: '#0f172a',
  starlight: '#f6e7bf',
  gold: '#d4af37',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  pink: '#ec4899',
  purple: '#8b5cf6',
  violet: '#7c3aed',
  yellow: '#f59e0b',
  orange: '#f97316',
  natural: '#d6d3d1',
  titanium: '#9ca3af',
  beige: '#d6c4a7'
};

const normalizeValue = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeHexColor = (value?: string | null): string | undefined => {
  const normalized = normalizeValue(value);
  return normalized && /^#(?:[0-9A-Fa-f]{3}){1,2}$/.test(normalized) ? normalized : undefined;
};

export const getVariantAttributeValue = (variant: ProductVariantDto, key: VariantAttributeKey): string | undefined =>
  key === 'color' || key === 'storage' || key === 'model'
    ? normalizeValue(variant[key])
    : normalizeValue(variant.attributes?.find((attribute) => attribute.name.trim().toLowerCase() === key.trim().toLowerCase())?.value);

export const getVariantLabel = (variant: ProductVariantDto, index = 0): string => {
  const firstCustomAttribute = variant.attributes?.find((attribute) => normalizeValue(attribute.value));
  const baseLabel = normalizeValue(variant.color) ?? normalizeValue(variant.model) ?? normalizeValue(firstCustomAttribute?.value) ?? `Variant ${index + 1}`;
  const storage = normalizeValue(variant.storage);
  return storage ? `${baseLabel} - ${storage}` : baseLabel;
};

export const getVariantPickerLabel = (variant: ProductVariantDto, index = 0): string => {
  const customParts = (variant.attributes ?? [])
    .map((attribute) => {
      const name = normalizeValue(attribute.name);
      const value = normalizeValue(attribute.value);
      return name && value ? `${name}: ${value}` : value;
    })
    .filter((value): value is string => Boolean(value));
  const descriptiveParts = [normalizeValue(variant.color), normalizeValue(variant.storage), normalizeValue(variant.model), ...customParts].filter(
    (value): value is string => Boolean(value)
  );

  if (descriptiveParts.length) {
    return descriptiveParts.join(' / ');
  }

  const sku = normalizeValue(variant.sku);
  return sku ?? `Variant ${index + 1}`;
};

export const getStockLabel = (stock: number): string => {
  if (stock <= 0) {
    return 'Out of stock';
  }

  if (stock <= 3) {
    return `Only ${stock} left`;
  }

  return `${stock} in stock`;
};

export const getColorFromName = (value?: string | null): string | undefined => {
  const hexColor = normalizeHexColor(value);
  if (hexColor) {
    return hexColor;
  }

  const normalized = normalizeValue(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (colorNameMap[normalized]) {
    return colorNameMap[normalized];
  }

  const matchedToken = normalized
    .split(/[\s/-]+/)
    .find((token) => token in colorNameMap);

  return matchedToken ? colorNameMap[matchedToken] : undefined;
};

export const getVariantOptionColor = (variants: ProductVariantDto[], option: string): string | undefined => {
  const matchedVariant = variants.find((variant) => normalizeValue(variant.color) === option);
  return normalizeHexColor(matchedVariant?.colorCode) ?? getColorFromName(option);
};

export const getVariantAttributeGroups = (variants: ProductVariantDto[]): VariantAttributeGroup[] =>
  [
    ...VARIANT_ATTRIBUTE_CONFIG,
    ...Array.from(
      new Set(
        variants.flatMap((variant) =>
          (variant.attributes ?? [])
            .map((attribute) => normalizeValue(attribute.name))
            .filter((value): value is string => Boolean(value))
        )
      )
    ).map((name) => ({ key: name, label: name, presentation: 'chip' as const }))
  ].reduce<VariantAttributeGroup[]>((groups, config) => {
    const options = Array.from(
      new Set(
        variants
          .map((variant) => getVariantAttributeValue(variant, config.key))
          .filter((value): value is string => Boolean(value))
      )
    );

    if (!options.length) {
      return groups;
    }

    groups.push({
      key: config.key,
      label: config.label,
      presentation: config.presentation,
      options
    });

    return groups;
  }, []);

export const buildVariantSelection = (variant: ProductVariantDto, groups: VariantAttributeGroup[]): VariantSelection =>
  groups.reduce<VariantSelection>((selection, group) => {
    const value = getVariantAttributeValue(variant, group.key);
    if (value) {
      selection[group.key] = value;
    }
    return selection;
  }, {});

const matchesSelection = (variant: ProductVariantDto, selection: VariantSelection, groups: VariantAttributeGroup[]): boolean =>
  groups.every((group) => {
    const selectedValue = selection[group.key];
    if (!selectedValue) {
      return true;
    }

    return getVariantAttributeValue(variant, group.key) === selectedValue;
  });

export const isVariantOptionSelectable = (
  variants: ProductVariantDto[],
  _groups: VariantAttributeGroup[],
  _selection: VariantSelection,
  key: VariantAttributeKey,
  option: string
): boolean => variants.some((variant) => getVariantAttributeValue(variant, key) === option && variant.stock > 0);

export const isVariantOptionCompatible = (
  variants: ProductVariantDto[],
  groups: VariantAttributeGroup[],
  selection: VariantSelection,
  key: VariantAttributeKey,
  option: string
): boolean =>
  variants.some((variant) => {
    if (getVariantAttributeValue(variant, key) !== option) {
      return false;
    }

    return groups.every((group) => {
      if (group.key === key) {
        return true;
      }

      const selectedValue = selection[group.key];
      if (!selectedValue) {
        return true;
      }

      return getVariantAttributeValue(variant, group.key) === selectedValue;
    });
  });

export const isVariantOptionSoldOut = (
  variants: ProductVariantDto[],
  _groups: VariantAttributeGroup[],
  _selection: VariantSelection,
  key: VariantAttributeKey,
  option: string
): boolean => {
  const matchingVariants = variants.filter((variant) => getVariantAttributeValue(variant, key) === option);

  return matchingVariants.length > 0 && matchingVariants.every((variant) => variant.stock <= 0);
};

export const findExactVariantIndex = (
  variants: ProductVariantDto[],
  groups: VariantAttributeGroup[],
  selection: VariantSelection
): number | undefined => {
  if (!groups.length || groups.some((group) => !selection[group.key])) {
    return undefined;
  }

  const variantIndex = variants.findIndex((variant) => matchesSelection(variant, selection, groups));
  return variantIndex >= 0 ? variantIndex : undefined;
};

export const findPreferredVariantIndex = (variants: ProductVariantDto[]): number | undefined => {
  if (!variants.length) {
    return undefined;
  }

  const inStockIndex = variants.findIndex((variant) => variant.stock > 0);
  return inStockIndex >= 0 ? inStockIndex : 0;
};

export const resolveVariantSelectionChange = (
  variants: ProductVariantDto[],
  groups: VariantAttributeGroup[],
  currentSelection: VariantSelection,
  key: VariantAttributeKey,
  option: string
): { variantIndex: number; selection: VariantSelection } | undefined => {
  const candidates = variants
    .map((variant, index) => ({ variant, index }))
    .filter(({ variant }) => getVariantAttributeValue(variant, key) === option);

  if (!candidates.length) {
    return undefined;
  }

  const desiredSelection = {
    ...currentSelection,
    [key]: option
  };

  const rankedCandidates = candidates
    .map(({ variant, index }) => {
      const candidateSelection = buildVariantSelection(variant, groups);
      const exactMatch = groups.every((group) => {
        const desiredValue = desiredSelection[group.key];
        if (!desiredValue) {
          return true;
        }

        return candidateSelection[group.key] === desiredValue;
      });

      const selectionScore = groups.reduce((score, group) => {
        const desiredValue = desiredSelection[group.key];
        if (!desiredValue || candidateSelection[group.key] !== desiredValue) {
          return score;
        }

        return score + (group.key === key ? 40 : 12);
      }, 0);

      return {
        index,
        selection: candidateSelection,
        exactMatch,
        stockScore: variant.stock > 0 ? 1 : 0,
        selectionScore
      };
    })
    .sort((left, right) => {
      if (right.exactMatch !== left.exactMatch) {
        return Number(right.exactMatch) - Number(left.exactMatch);
      }

      if (right.stockScore !== left.stockScore) {
        return right.stockScore - left.stockScore;
      }

      if (right.selectionScore !== left.selectionScore) {
        return right.selectionScore - left.selectionScore;
      }

      return left.index - right.index;
    });

  const nextCandidate = rankedCandidates[0];
  return nextCandidate
    ? {
        variantIndex: nextCandidate.index,
        selection: nextCandidate.selection
      }
    : undefined;
};

export const getVariantDisplayImages = (
  product: Pick<ProductDetailDto, 'images' | 'thumbnail'>,
  selectedVariant?: ProductVariantDto
): ImageAsset[] => {
  const isUsableImage = (image?: ImageAsset | null): image is ImageAsset => Boolean(image?.url && !isKnownUnavailableDemoAsset(image.url));
  const variantImages = selectedVariant?.images?.filter(isUsableImage) ?? [];

  if (variantImages.length) {
    return variantImages;
  }

  const productImages = product.images.filter(isUsableImage);
  if (productImages.length) {
    return productImages;
  }

  return isUsableImage(product.thumbnail) ? [product.thumbnail] : [];
};

export const getVariantGlowColor = (
  selectedVariant?: Pick<ProductVariantDto, 'glowColor' | 'colorCode' | 'color'>,
  selection?: VariantSelection
): string =>
  normalizeHexColor(selectedVariant?.glowColor) ??
  normalizeHexColor(selectedVariant?.colorCode) ??
  getColorFromName(selectedVariant?.color ?? selection?.color) ??
  NEUTRAL_GLOW_COLOR;

export const getVariantSummary = (variant: ProductVariantDto, groups: VariantAttributeGroup[], index = 0): string => {
  const summary = groups
    .map((group) => getVariantAttributeValue(variant, group.key))
    .filter((value): value is string => Boolean(value))
    .join(' / ');

  return summary || getVariantPickerLabel(variant, index);
};
