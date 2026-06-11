import { cn } from '@njstore/utils/cn';
import { getColorFromName } from './productVariantUtils';

interface ProductCardSwatchesProps {
  displayColorVariants: Array<{ name: string; colorCode?: string }>;
  mode?: 'default' | 'compact' | 'title';
}

export const ProductCardSwatches = ({ displayColorVariants, mode = 'default' }: ProductCardSwatchesProps): JSX.Element | null => {
  if (displayColorVariants.length <= 1) {
    return null;
  }

  const visibleLimit = mode === 'title' || mode === 'compact' ? 3 : 4;
  const visibleVariants = displayColorVariants.slice(0, visibleLimit);
  const hiddenCount = Math.max(displayColorVariants.length - visibleVariants.length, 0);

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-end',
        mode === 'compact'
          ? 'ml-0 gap-1 min-[480px]:gap-1.5'
          : mode === 'title'
            ? 'ml-auto max-w-[34%] gap-0.5 min-[390px]:gap-0.5 min-[480px]:max-w-[36%] min-[480px]:gap-1 sm:max-w-[42%] sm:gap-1.5'
            : 'ml-auto gap-1 min-[480px]:gap-1.25 sm:gap-2'
      )}
      aria-label={`Available colors: ${displayColorVariants.map((variant) => variant.name).join(', ')}`}
    >
      {visibleVariants.map((variant) => {
        const swatchColor = variant.colorCode ?? getColorFromName(variant.name) ?? '#94a3b8';

        return (
          <span
            key={`${variant.name}-${swatchColor}`}
            data-testid="product-card-color-swatch"
            title={variant.name}
            className={cn(
              'block rounded-full border-white ring-1 ring-slate-200/90',
              mode === 'compact'
                ? 'h-4 w-4 border-[1.5px] min-[480px]:h-[1.125rem] min-[480px]:w-[1.125rem] sm:h-5 sm:w-5'
                : mode === 'title'
                  ? 'h-3 w-3 border-[1.5px] min-[390px]:h-3.5 min-[390px]:w-3.5 min-[480px]:h-4 min-[480px]:w-4 sm:h-6 sm:w-6'
                  : 'h-4 w-4 border-[1.5px] min-[390px]:h-[1.0625rem] min-[390px]:w-[1.0625rem] min-[480px]:h-[1.15rem] min-[480px]:w-[1.15rem] sm:h-6 sm:w-6 lg:h-7 lg:w-7'
            )}
            style={{ backgroundColor: swatchColor }}
          />
        );
      })}
      {hiddenCount > 0 ? (
        <span
          className={cn(
            'flex items-center justify-center rounded-full border border-slate-200 bg-white px-1 font-semibold text-slate-500',
            mode === 'compact'
              ? 'h-4 min-w-4 text-[7px] min-[480px]:h-[1.125rem] min-[480px]:min-w-[1.125rem] min-[480px]:text-[8px] sm:h-5 sm:min-w-5 sm:text-[10px]'
              : mode === 'title'
                ? 'h-3 min-w-3 text-[6px] min-[390px]:h-3.5 min-[390px]:min-w-3.5 min-[390px]:text-[6.5px] min-[480px]:h-4 min-[480px]:min-w-4 min-[480px]:px-1 min-[480px]:text-[7px] sm:h-6 sm:min-w-6 sm:text-[10px]'
                : 'h-4 min-w-4 text-[7px] min-[390px]:h-[1.0625rem] min-[390px]:min-w-[1.0625rem] min-[390px]:text-[7.5px] min-[480px]:h-[1.15rem] min-[480px]:min-w-[1.15rem] min-[480px]:px-1.5 min-[480px]:text-[8px] sm:h-6 sm:min-w-6 sm:text-[10px] lg:h-7 lg:min-w-7 lg:text-[11px]'
          )}
        >
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
};
