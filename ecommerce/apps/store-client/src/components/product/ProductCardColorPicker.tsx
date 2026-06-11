import { type MouseEvent } from 'react';
import { cn } from '@njstore/utils/cn';
import type { ProductDetailDto } from '@njstore/types';
import {
  getVariantOptionColor,
  isVariantOptionCompatible,
  resolveVariantSelectionChange,
  type VariantAttributeGroup,
  type VariantAttributeKey,
  type VariantSelection
} from './productVariantUtils';

interface ProductCardOptionButtonProps {
  option: string;
  group: VariantAttributeGroup;
  detailProduct: ProductDetailDto;
  variantGroups: VariantAttributeGroup[];
  selectedOptions: VariantSelection;
  onVariantOptionSelect: (event: MouseEvent<HTMLButtonElement>, key: VariantAttributeKey, option: string) => void;
  isCompact?: boolean;
  immersive?: boolean;
  tone?: 'dark' | 'light';
}

export const ProductCardOptionButton = ({
  option,
  group,
  detailProduct,
  variantGroups,
  selectedOptions,
  onVariantOptionSelect,
  isCompact,
  immersive = false,
  tone = 'dark'
}: ProductCardOptionButtonProps): JSX.Element => {
  const isSelected = selectedOptions[group.key] === option;
  const isCompatible = isVariantOptionCompatible(detailProduct.variants, variantGroups, selectedOptions, group.key, option);
  const optionResolution = resolveVariantSelectionChange(detailProduct.variants, variantGroups, selectedOptions, group.key, option);
  const isSelectable = Boolean(optionResolution);
  const isSoldOut = optionResolution ? detailProduct.variants[optionResolution.variantIndex]?.stock <= 0 : false;
  const willSwitchCombination = !isSelected && isSelectable && !isCompatible;
  const swatchColor = group.presentation === 'swatch' ? getVariantOptionColor(detailProduct.variants, option) : undefined;

  if (immersive) {
    const isLightTone = tone === 'light';

    return (
      <button
        key={`${group.key}-${option}`}
        type="button"
        onClick={(event) => {
          onVariantOptionSelect(event, group.key, option);
        }}
        disabled={!isSelectable}
        className={
          group.presentation === 'swatch'
            ? cn(
                'product-card-option-button grid h-8 w-full max-w-full grid-cols-[1.625rem_minmax(0,1fr)] items-center gap-1.5 rounded-full border py-0 pl-1 pr-2 text-left transition-[border-color,background-color,color,box-shadow,opacity] duration-200 ease-out min-[480px]:h-[2.15rem] min-[480px]:grid-cols-[1.75rem_minmax(0,1fr)] min-[480px]:gap-2 min-[480px]:pr-2.5 sm:h-9',
                isLightTone
                  ? isSelected
                    ? 'border-[#d8a918]/75 bg-white text-slate-800 shadow-none'
                    : 'border-slate-300/70 bg-transparent text-slate-700 shadow-none hover:border-slate-400/80 hover:bg-transparent'
                  : isSelected
                    ? 'border-white/85 bg-white text-slate-800 shadow-[0_10px_22px_rgba(0,0,0,0.1)]'
                    : 'border-white/42 bg-white/[0.04] text-white hover:border-white/62 hover:bg-white/[0.08]',
                willSwitchCombination && (isLightTone ? 'border-slate-300 bg-white' : 'border-white/30 bg-white/[0.1]'),
                !isSelectable &&
                  (isLightTone
                    ? 'cursor-not-allowed border-slate-300/70 bg-transparent text-slate-700 opacity-100 shadow-none hover:border-slate-300/70 hover:bg-transparent'
                    : 'cursor-not-allowed border-white/18 bg-white/[0.035] text-white/58 opacity-100 hover:border-white/18 hover:bg-white/[0.035]')
              )
            : cn(
                'product-card-option-button inline-flex h-8 w-full max-w-full items-center justify-center rounded-full border px-2.5 text-center transition-[border-color,background-color,color,box-shadow,opacity] duration-200 ease-out min-[480px]:h-[2.15rem] min-[480px]:px-3 sm:h-9',
                isLightTone
                  ? isSelected
                    ? 'border-[#d8a918]/75 bg-white text-slate-800 shadow-none'
                    : 'border-slate-300/70 bg-transparent text-slate-700 shadow-none hover:border-slate-400/80 hover:bg-transparent'
                  : isSelected
                    ? 'border-white/85 bg-white text-slate-800 shadow-[0_10px_22px_rgba(0,0,0,0.1)]'
                    : 'border-white/42 bg-white/[0.04] text-white hover:border-white/62 hover:bg-white/[0.08]',
                willSwitchCombination && (isLightTone ? 'border-slate-300 bg-white' : 'border-white/30 bg-white/[0.1]'),
                !isSelectable &&
                  (isLightTone
                    ? 'cursor-not-allowed border-slate-300/70 bg-transparent text-slate-700 opacity-100 shadow-none hover:border-slate-300/70 hover:bg-transparent'
                    : 'cursor-not-allowed border-white/18 bg-white/[0.035] text-white/58 opacity-100 hover:border-white/18 hover:bg-white/[0.035]')
              )
        }
        aria-pressed={isSelected}
        aria-label={`Select ${group.label} ${option}`}
      >
        {group.presentation === 'swatch' ? (
          <>
            <span
              className={cn(
                'relative flex h-6 w-6 shrink-0 items-center justify-center justify-self-start rounded-full border min-[480px]:h-7 min-[480px]:w-7',
                isLightTone
                  ? isSelected
                    ? 'border-slate-300 bg-slate-100/70'
                    : 'border-slate-200 bg-white'
                  : isSelected
                    ? 'border-slate-300/70 bg-slate-100/80'
                    : 'border-white/48 bg-white/8'
              )}
            >
              <span
                className={cn('h-4 w-4 rounded-full min-[480px]:h-[1.125rem] min-[480px]:w-[1.125rem]', swatchColor ? '' : 'bg-slate-500')}
                style={swatchColor ? { backgroundColor: swatchColor } : undefined}
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[11px] font-semibold leading-4 min-[480px]:text-[12px]">{option}</span>
              <span className={cn('sr-only', isSelected ? 'text-slate-500' : isSoldOut ? 'text-rose-200' : isLightTone ? 'text-slate-500' : 'text-white/62')}>
                {!isSelectable ? 'Unavailable' : isSoldOut ? 'Sold out' : willSwitchCombination ? 'Switch' : 'Available'}
              </span>
            </span>
          </>
        ) : (
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold leading-4 min-[480px]:text-[12px]">{option}</span>
            {!isSelectable || isSoldOut || willSwitchCombination ? (
              <span className={cn('sr-only', isSoldOut ? 'text-rose-200' : isLightTone ? 'text-slate-500' : 'text-white/62')}>
                {!isSelectable ? 'Unavailable' : isSoldOut ? 'Sold out' : 'Switch'}
              </span>
            ) : null}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      key={`${group.key}-${option}`}
      type="button"
      onClick={(event) => {
        onVariantOptionSelect(event, group.key, option);
      }}
      disabled={!isSelectable}
      className={
        group.presentation === 'swatch'
          ? cn(
              'product-card-option-button inline-flex max-w-full items-center rounded-full border text-left transition-[border-color,background-color,color,box-shadow,opacity] duration-200 ease-out',
              isCompact ? 'gap-1.5 px-2 py-1' : 'gap-2 px-2.5 py-1.5',
              isSelected
                ? 'border-gold bg-gold/12 text-white shadow-[0_14px_34px_rgba(212,175,55,0.14)]'
                : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.08]',
              willSwitchCombination && 'border-white/24 bg-white/[0.07] text-white',
              !isSelectable && 'cursor-not-allowed opacity-40'
            )
          : cn(
              'product-card-option-button inline-flex max-w-full flex-1 items-center justify-center border text-left transition-[border-color,background-color,color,box-shadow,opacity] duration-200 ease-out sm:flex-none',
              isCompact ? 'min-h-[2rem] min-w-[3.75rem] rounded-xl px-2.5 py-1.5' : 'min-h-[2.35rem] min-w-[4.25rem] rounded-2xl px-3 py-2',
              isSelected
                ? 'border-gold bg-gold/12 text-white shadow-[0_14px_34px_rgba(212,175,55,0.14)]'
                : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.08]',
              willSwitchCombination && 'border-white/24 bg-white/[0.07] text-white',
              !isSelectable && 'cursor-not-allowed opacity-40'
            )
      }
      aria-pressed={isSelected}
      aria-label={`Select ${group.label} ${option}`}
    >
      {group.presentation === 'swatch' ? (
        <>
          <span
            className={cn(
              'relative flex shrink-0 items-center justify-center rounded-full border',
              isCompact ? 'h-6 w-6' : 'h-7 w-7',
              isSelected ? 'border-white/65' : 'border-white/12'
            )}
          >
            <span
              className={cn(isCompact ? 'h-4 w-4' : 'h-5 w-5', 'rounded-full', swatchColor ? '' : 'bg-slate-500')}
              style={swatchColor ? { backgroundColor: swatchColor } : undefined}
            />
          </span>
          <span className="flex flex-col leading-tight">
            <span className={cn('font-medium', isCompact ? 'text-[11px]' : 'text-[12.5px]')}>{option}</span>
            <span className={cn(isCompact ? 'text-[9.5px]' : 'text-[11px]', isSoldOut ? 'text-red-300' : 'text-slate-400')}>
              {!isSelectable ? 'Unavailable' : isSoldOut ? 'Sold out' : willSwitchCombination ? 'Switch' : 'Available'}
            </span>
          </span>
        </>
      ) : (
        <span className="flex flex-col leading-tight">
          <span className={cn('font-medium', isCompact ? 'text-[11px]' : 'text-[12.5px]')}>{option}</span>
          {!isSelectable || isSoldOut || willSwitchCombination ? (
            <span className={cn(isCompact ? 'mt-0.5 text-[10px]' : 'mt-1 text-[11px]', isSoldOut ? 'text-red-300' : 'text-slate-400')}>
              {!isSelectable ? 'Unavailable' : isSoldOut ? 'Sold out' : 'Switch'}
            </span>
          ) : null}
        </span>
      )}
    </button>
  );
};
