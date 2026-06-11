import { type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@njstore/ui';
import { cn } from '@njstore/utils/cn';
import type { ProductDetailDto } from '@njstore/types';
import {
  getStockLabel,
  getVariantSummary,
  type VariantAttributeGroup,
  type VariantAttributeKey,
  type VariantSelection
} from './productVariantUtils';
import { ProductCardOptionButton } from './ProductCardColorPicker';

const optionsDrawerSectionVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: custom * 0.04, duration: 0.24, ease: [0.16, 1, 0.3, 1] }
  })
};

export interface ProductCardOptionsProps {
  detailProduct: ProductDetailDto | null;
  variantGroups: VariantAttributeGroup[];
  selectedOptions: VariantSelection;
  selectedVariantIndex: number | undefined;
  isOptionsLoading: boolean;
  hasOptionsError: boolean;
  isCompact?: boolean;
  tone?: 'dark' | 'light';
  onRetryLoad: (event: MouseEvent<HTMLButtonElement>) => void;
  onVariantCardSelect: (event: MouseEvent<HTMLButtonElement>, index: number) => void;
  onVariantOptionSelect: (event: MouseEvent<HTMLButtonElement>, key: VariantAttributeKey, option: string) => void;
}

export const ProductCardDefaultOptions = ({
  detailProduct,
  variantGroups,
  selectedOptions,
  selectedVariantIndex,
  isOptionsLoading,
  hasOptionsError,
  isCompact,
  onRetryLoad,
  onVariantCardSelect,
  onVariantOptionSelect
}: ProductCardOptionsProps): JSX.Element => {
  if (isOptionsLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 rounded-2xl bg-white/10" />
        <div className="h-10 rounded-2xl bg-white/10" />
        <div className="h-10 rounded-2xl bg-white/10" />
      </div>
    );
  }

  if (hasOptionsError) {
    return (
      <div className="rounded-[22px] border border-red-400/20 bg-red-500/10 p-4">
        <p className="text-sm font-medium text-white">Unable to load the latest options.</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">Try again to unlock the full option set for this product.</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3 border-white/10 bg-white/10 text-white hover:bg-white/16"
          onClick={onRetryLoad}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!detailProduct) {
    return <p className="text-sm leading-6 text-slate-300">Preparing the option drawer.</p>;
  }

  if (detailProduct.productType !== 'standard' || !detailProduct.variants.length) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
        <p className="text-sm font-medium text-white">No extra selections needed.</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">This product is ready to order, so the action buttons are unlocked below.</p>
      </div>
    );
  }

  if (!variantGroups.length) {
    return (
      <div className="grid gap-2.5">
        {detailProduct.variants.map((variant, index) => {
          const isSelected = selectedVariantIndex === index;

          return (
            <button
              key={variant.sku}
              type="button"
              onClick={(event) => {
                onVariantCardSelect(event, index);
              }}
              className={cn(
                'rounded-[22px] border px-4 py-3 text-left transition-[border-color,background-color,color,box-shadow,opacity] duration-200 ease-out',
                isSelected
                  ? 'border-gold bg-gold/12 text-white shadow-[0_14px_36px_rgba(212,175,55,0.16)]'
                  : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.08]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{getVariantSummary(variant, [], index)}</p>
                  <p className="mt-1 text-xs text-slate-400">{variant.sku}</p>
                </div>
                <span className={cn('text-[11px] font-medium', variant.stock > 0 ? 'text-emerald-300' : 'text-red-300')}>
                  {getStockLabel(variant.stock)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn(isCompact ? 'space-y-3' : 'space-y-4')}>
      {variantGroups.map((group, index) => (
        <motion.section
          key={group.key}
          custom={index}
          initial="hidden"
          animate="visible"
          variants={optionsDrawerSectionVariants}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={cn('font-medium uppercase tracking-[0.22em] text-slate-400', isCompact ? 'text-[9px]' : 'text-[10px]')}>{group.label}</p>
            {selectedOptions[group.key] ? <p className={cn('text-slate-200', isCompact ? 'text-[11px]' : 'text-xs')}>{selectedOptions[group.key]}</p> : null}
          </div>
          <div className={cn(isCompact ? 'mt-1.5 flex flex-wrap gap-1.5' : 'mt-2 flex flex-wrap gap-2.5', group.presentation === 'swatch' && 'items-center')}>
            {group.options.map((option) => {
              return (
                <ProductCardOptionButton
                  key={`${group.key}-${option}`}
                  option={option}
                  group={group}
                  detailProduct={detailProduct}
                  variantGroups={variantGroups}
                  selectedOptions={selectedOptions}
                  onVariantOptionSelect={onVariantOptionSelect}
                  isCompact={isCompact}
                  immersive={false}
                />
              );
            })}
          </div>
        </motion.section>
      ))}
    </div>
  );
};

export const ProductCardImmersiveOptions = ({
  detailProduct,
  variantGroups,
  selectedOptions,
  selectedVariantIndex,
  isOptionsLoading,
  hasOptionsError,
  tone = 'dark',
  onRetryLoad,
  onVariantCardSelect,
  onVariantOptionSelect
}: ProductCardOptionsProps): JSX.Element => {
  const isLightTone = tone === 'light';

  if (isOptionsLoading) {
    return (
      <div className="space-y-2.5 pt-1">
        <div className={cn('h-9 rounded-[18px]', isLightTone ? 'bg-slate-200/55' : 'bg-white/10')} />
        <div className={cn('h-9 rounded-[18px]', isLightTone ? 'bg-slate-200/55' : 'bg-white/10')} />
        <div className={cn('h-9 rounded-[18px]', isLightTone ? 'bg-slate-200/55' : 'bg-white/10')} />
      </div>
    );
  }

  if (hasOptionsError) {
    return (
      <div className={cn('rounded-[24px] border p-5 text-center', isLightTone ? 'border-slate-200 bg-white/72' : 'border-white/12 bg-white/8')}>
        <p className={cn('text-sm font-semibold', isLightTone ? 'text-slate-800' : 'text-white')}>Unable to load options.</p>
        <p className={cn('mt-2 text-sm leading-6', isLightTone ? 'text-slate-500' : 'text-white/72')}>Try again to open the latest product combinations.</p>
        <Button
          variant="secondary"
          size="sm"
          className={cn('mt-4 rounded-full px-4', isLightTone ? 'border-slate-200 bg-white text-slate-800 hover:bg-white' : 'border-white/12 bg-white/10 text-white hover:bg-white/16')}
          onClick={onRetryLoad}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!detailProduct) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center text-center">
        <p className={cn('max-w-[16rem] text-sm leading-6', isLightTone ? 'text-slate-500' : 'text-white/78')}>Preparing the option block.</p>
      </div>
    );
  }

  if (detailProduct.productType !== 'standard' || !detailProduct.variants.length) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center text-center">
        <p className={cn('max-w-[16rem] text-sm leading-6', isLightTone ? 'text-slate-500' : 'text-white/78')}>No extra selections needed. This item is ready to order.</p>
      </div>
    );
  }

  if (!variantGroups.length) {
    return (
      <div className="grid gap-2.5">
        {detailProduct.variants.map((variant, index) => {
          const isSelected = selectedVariantIndex === index;

          return (
            <button
              key={variant.sku}
              type="button"
              onClick={(event) => {
                onVariantCardSelect(event, index);
              }}
              className={cn(
                'rounded-[18px] border px-3.5 py-3 text-left transition-[border-color,background-color,color,box-shadow,opacity] duration-200 ease-out',
                isLightTone
                  ? isSelected
                    ? 'border-[#d8a918]/70 bg-white text-slate-800 shadow-[0_10px_22px_rgba(15,23,42,0.08)]'
                    : 'border-slate-200/90 bg-white/78 text-slate-700 hover:border-slate-300 hover:bg-white'
                  : isSelected
                    ? 'border-white/75 bg-white text-slate-800 shadow-[0_14px_30px_rgba(0,0,0,0.12)]'
                    : 'border-white/12 bg-white/[0.06] text-white hover:border-white/20 hover:bg-white/[0.1]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold leading-5">{getVariantSummary(variant, [], index)}</p>
                  <p className={cn('mt-0.5 text-[11px]', isLightTone ? 'text-slate-500' : isSelected ? 'text-slate-500' : 'text-white/65')}>{variant.sku}</p>
                </div>
                <span className={cn('text-[10px] font-medium', variant.stock > 0 ? (isLightTone || isSelected ? 'text-emerald-600' : 'text-emerald-200') : isLightTone ? 'text-rose-500' : 'text-rose-200')}>
                  {getStockLabel(variant.stock)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1 min-[480px]:space-y-1.5 sm:space-y-2">
      {variantGroups.map((group) => (
        <section key={group.key}>
          <div className="flex flex-wrap items-center justify-between gap-1.5 min-[480px]:gap-2">
            <p className={cn('text-[7.5px] font-semibold uppercase tracking-[0.16em] min-[480px]:text-[8px] min-[480px]:tracking-[0.18em] sm:text-[8.5px] sm:tracking-[0.2em]', isLightTone ? 'text-slate-400' : 'text-white/62')}>{group.label}</p>
            {selectedOptions[group.key] ? <p className={cn('text-[8.5px] min-[480px]:text-[9px] sm:text-[10px]', isLightTone ? 'text-slate-600' : 'text-white/82')}>{selectedOptions[group.key]}</p> : null}
          </div>
          <div
            className={cn(
              'mt-1 grid gap-1.5 min-[480px]:gap-2',
              group.presentation === 'swatch'
                ? 'grid-cols-2'
                : 'grid-cols-2',
              group.options.length % 2 === 1 && '[&>*:last-child]:col-span-full'
            )}
          >
            {group.options.map((option) => {
              return (
                <ProductCardOptionButton
                  key={`${group.key}-${option}`}
                  option={option}
                  group={group}
                  detailProduct={detailProduct}
                  variantGroups={variantGroups}
                  selectedOptions={selectedOptions}
                  onVariantOptionSelect={onVariantOptionSelect}
                  immersive={true}
                  tone={tone}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
