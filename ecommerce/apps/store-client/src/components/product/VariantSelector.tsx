import type { ProductVariantDto } from '@njstore/types';
import { motion, useReducedMotion } from 'framer-motion';
import {
  type VariantAttributeGroup,
  type VariantAttributeKey,
  type VariantSelection,
  getStockLabel,
  getVariantPickerLabel,
  getVariantOptionColor,
  getVariantSummary,
  isVariantOptionSelectable,
  isVariantOptionSoldOut
} from './productVariantUtils';

interface VariantSelectorProps {
  groups: VariantAttributeGroup[];
  onSelectOption: (key: VariantAttributeKey, option: string) => void;
  onSelectVariant?: (index: number) => void;
  selectedOptions: VariantSelection;
  selectedVariant?: ProductVariantDto;
  selectedVariantIndex?: number;
  variants: ProductVariantDto[];
}

const optionHoverScale = {
  scale: 1.02,
  y: -1
};

export const VariantSelector = ({
  groups,
  onSelectOption,
  onSelectVariant,
  selectedOptions,
  selectedVariant,
  selectedVariantIndex,
  variants
}: VariantSelectorProps): JSX.Element | null => {
  const reduceMotion = useReducedMotion();

  if (!variants.length) {
    return null;
  }

  if (!groups.length) {
    return (
      <div className="mt-5 border-t border-white/10 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase text-gray-500">Configuration</p>
            <h3 className="mt-1 text-lg font-semibold leading-tight text-white">Choose your edition</h3>
          </div>
          {selectedVariant ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-right">
              <p className="text-[11px] font-medium uppercase text-gray-500">Selected</p>
              <p className="mt-2 text-sm font-medium text-white">
                {getVariantSummary(selectedVariant, groups, selectedVariantIndex ?? 0)}
              </p>
              <p className={`mt-1 text-xs ${selectedVariant.stock > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {getStockLabel(selectedVariant.stock)}
              </p>
            </div>
          ) : null}
        </div>

        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase text-gray-500">Available variants</p>
            {selectedVariant?.sku ? <p className="text-sm text-gray-300">SKU {selectedVariant.sku}</p> : null}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {variants.map((variant, index) => {
              const selected = selectedVariantIndex === index;
              const label = getVariantPickerLabel(variant, index);
              const variantPrice = variant.price ?? 0;

              return (
                <motion.button
                  key={variant.sku ?? `${label}-${index}`}
                  type="button"
                  onClick={() => onSelectVariant?.(index)}
                  whileHover={!reduceMotion ? optionHoverScale : undefined}
                  whileTap={!reduceMotion ? { scale: 0.98 } : undefined}
                  className={`group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-[border-color,background-color,color,box-shadow,opacity] duration-200 ${
                    selected
                      ? 'border-gold bg-gold/12 text-white shadow-[0_14px_30px_rgba(212,175,55,0.12)]'
                      : 'border-white/10 bg-white/[0.025] text-gray-300 hover:border-white/20 hover:bg-white/[0.04] hover:text-white'
                  }`}
                  aria-pressed={selected}
                  aria-label={`Select variant ${label}`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.11),transparent_58%)] opacity-70" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{label}</p>
                      {variant.sku && variant.sku !== label ? <p className="mt-1 text-xs text-gray-500">SKU {variant.sku}</p> : null}
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        variant.stock > 0 ? 'bg-emerald-500/12 text-emerald-300' : 'bg-red-500/12 text-red-300'
                      }`}
                    >
                      {getStockLabel(variant.stock)}
                    </span>
                  </div>
                  {variantPrice > 0 ? (
                    <p className="relative mt-4 text-lg font-semibold text-white/95">LKR {variantPrice.toLocaleString()}</p>
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase text-gray-500">Configuration</p>
          <h3 className="mt-1 text-lg font-semibold leading-tight text-white">Choose your finish</h3>
        </div>
        {selectedVariant ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-right">
            <p className="text-[11px] font-medium uppercase text-gray-500">Selected</p>
            <p className="mt-2 text-sm font-medium text-white">{getVariantSummary(selectedVariant, groups, selectedVariantIndex ?? 0)}</p>
            <p className={`mt-1 text-xs ${selectedVariant.stock > 0 ? 'text-emerald-300' : 'text-red-300'}`}>{getStockLabel(selectedVariant.stock)}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <section key={group.key}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase text-gray-500">{group.label}</p>
              {selectedOptions[group.key] ? <p className="text-sm text-gray-300">{selectedOptions[group.key]}</p> : null}
            </div>

            <div className={`mt-3 flex flex-wrap gap-3 ${group.presentation === 'swatch' ? 'items-center' : ''}`}>
              {group.options.map((option) => {
                const selected = selectedOptions[group.key] === option;
                const selectable = isVariantOptionSelectable(variants, groups, selectedOptions, group.key, option);
                const soldOut = isVariantOptionSoldOut(variants, groups, selectedOptions, group.key, option);
                const previewColor = group.presentation === 'swatch' ? getVariantOptionColor(variants, option) : undefined;

                return (
                  <motion.button
                    key={`${group.key}-${option}`}
                    type="button"
                    onClick={() => onSelectOption(group.key, option)}
                    disabled={!selectable}
                    whileHover={!reduceMotion && selectable ? optionHoverScale : undefined}
                    whileTap={!reduceMotion && selectable ? { scale: 0.98 } : undefined}
                    className={
                      group.presentation === 'swatch'
                        ? `inline-flex items-center gap-3 rounded-full border px-3 py-2.5 text-left transition-[border-color,background-color,color,box-shadow,opacity] duration-200 ${
                            selected
                              ? 'border-gold bg-gold/12 text-white shadow-[0_14px_40px_rgba(212,175,55,0.14)]'
                              : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:text-white'
                          } ${!selectable ? 'cursor-not-allowed opacity-45' : ''}`
                        : `inline-flex min-h-[3.35rem] items-center rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,color,box-shadow,opacity] duration-200 ${
                            selected
                              ? 'border-gold bg-gold/14 font-semibold text-white shadow-[0_14px_40px_rgba(212,175,55,0.12)]'
                              : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:text-white'
                          } ${!selectable ? 'cursor-not-allowed opacity-45' : ''}`
                    }
                    aria-pressed={selected}
                    aria-label={`Select ${group.label} ${option}`}
                  >
                    {group.presentation === 'swatch' ? (
                      <>
                        <span
                          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                            selected ? 'border-white/70' : 'border-white/15'
                          } bg-black/15`}
                        >
                          <span
                            className={`h-6 w-6 rounded-full ${previewColor ? '' : 'bg-slate-500'}`}
                            style={previewColor ? { backgroundColor: previewColor } : undefined}
                          />
                        </span>
                        <span className="flex flex-col">
                          <span className="text-sm font-medium">{option}</span>
                          <span className={`text-xs ${soldOut ? 'text-red-300' : 'text-gray-500'}`}>
                            {soldOut ? 'Sold out' : !selectable ? 'Unavailable' : 'Available'}
                          </span>
                        </span>
                      </>
                    ) : (
                      <span className="flex flex-col">
                        <span className="text-sm">{option}</span>
                        {!selectable || soldOut ? (
                          <span className={`mt-1 text-[11px] ${soldOut ? 'text-red-300' : 'text-gray-500'}`}>
                            {soldOut ? 'Sold out' : 'Unavailable'}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
