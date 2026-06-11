import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@njstore/utils/cn';
import { Check, ChevronDown } from 'lucide-react';

export interface ShopSelectOption {
  value: string;
  label: string;
  selectionLabel?: string;
  disabled?: boolean;
}

export type ShopSelectProps =
  | {
      label?: string;
      hint?: string;
      accent?: 'default' | 'gold';
      compact?: boolean;
      value: string;
      options: ShopSelectOption[];
      placeholder?: string;
      ariaLabel?: string;
      multiple?: false;
      onChange: (value: string) => void;
    }
  | {
      label?: string;
      hint?: string;
      accent?: 'default' | 'gold';
      compact?: boolean;
      values: string[];
      options: ShopSelectOption[];
      placeholder?: string;
      ariaLabel?: string;
      multiple: true;
      onChange: (values: string[]) => void;
    };

const getEnabledOptionIndex = (options: ShopSelectOption[], direction: 1 | -1, startIndex: number): number => {
  if (!options.some((option) => !option.disabled)) {
    return -1;
  }

  let index = startIndex;
  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) {
      return index;
    }
  }

  return -1;
};

const getOptionSelectionSummary = (selectedOptions: ShopSelectOption[], placeholder: string): string => {
  if (!selectedOptions.length) {
    return placeholder;
  }

  const labels = selectedOptions.map((option) => option.selectionLabel ?? option.label);
  if (labels.length === 1) {
    return labels[0]!;
  }

  return `${labels[0]} +${labels.length - 1}`;
};

export const ShopSelect = (props: ShopSelectProps): JSX.Element => {
  const { label, hint, accent = 'default', compact = false, options, placeholder = 'Select an option', ariaLabel } = props;
  const multiple = props.multiple === true;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const selectId = useId();
  const selectedValues = props.multiple === true ? props.values : props.value ? [props.value] : [];
  const selectedOptions = useMemo(
    () => options.filter((option) => option.value && selectedValues.includes(option.value)),
    [options, selectedValues]
  );
  const selectedLabel = useMemo(() => getOptionSelectionSummary(selectedOptions, placeholder), [placeholder, selectedOptions]);
  const hasUserSelection = selectedValues.length > 0;
  const selectedIndex = useMemo(() => {
    if (!selectedValues.length) {
      return options.findIndex((option) => option.value === '');
    }

    return options.findIndex((option) => option.value === selectedValues[0]);
  }, [options, selectedValues]);
  const firstEnabledIndex = useMemo(() => options.findIndex((option) => !option.disabled), [options]);
  const lastEnabledIndex = useMemo(() => {
    for (let index = options.length - 1; index >= 0; index -= 1) {
      if (!options[index]?.disabled) {
        return index;
      }
    }
    return -1;
  }, [options]);

  const isOptionSelected = (optionValue: string): boolean =>
    multiple ? (optionValue === '' ? selectedValues.length === 0 : selectedValues.includes(optionValue)) : selectedValues[0] === optionValue;

  const close = (): void => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const open = (): void => {
    setIsOpen(true);
    setActiveIndex(selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : firstEnabledIndex);
  };

  const moveActive = (direction: 1 | -1): void => {
    if (!options.length) {
      return;
    }

    setIsOpen(true);
    setActiveIndex((current) => {
      const fallbackIndex = selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : direction === 1 ? -1 : 0;
      const startingIndex = current >= 0 ? current : fallbackIndex;
      return getEnabledOptionIndex(options, direction, startingIndex);
    });
  };

  const commitSelection = (nextValue: string): void => {
    const matchedOption = options.find((option) => option.value === nextValue);
    if (matchedOption?.disabled) {
      return;
    }

    if (props.multiple === true) {
      const nextValues =
        nextValue === ''
          ? []
          : selectedValues.includes(nextValue)
            ? selectedValues.filter((value) => value !== nextValue)
            : [...selectedValues, nextValue];

      props.onChange(nextValues);
      setActiveIndex(options.findIndex((option) => option.value === nextValue));
      return;
    }

    props.onChange(nextValue);
    close();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent): void => {
      if (event.target instanceof Node && containerRef.current?.contains(event.target)) {
        return;
      }

      close();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : firstEnabledIndex);
  }, [firstEnabledIndex, isOpen, options, selectedIndex]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) {
      return;
    }

    const activeOption = optionsRef.current?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`);
    if (activeOption && typeof activeOption.scrollIntoView === 'function') {
      activeOption.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(firstEnabledIndex);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(lastEnabledIndex);
      return;
    }

    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        close();
      }
      return;
    }

    if (event.key === 'Tab') {
      close();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen && activeIndex >= 0 && options[activeIndex]) {
        commitSelection(options[activeIndex].value);
        return;
      }

      open();
    }
  };

  return (
    <div className={cn('shop-filter-select-field flex flex-col gap-2.5 text-sm text-gray-300', !compact && 'rounded-[22px] border border-white/10 bg-white/[0.03] p-3.5')}>
      {label ? (
        <div className="flex min-w-0 items-start justify-between gap-2">
          <span className="text-[13px] font-semibold leading-5 text-gray-200">{label}</span>
          {hint ? (
            <span className="max-w-[62%] rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-right text-[11px] font-medium leading-4 text-gray-500">
              {hint}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        ref={containerRef}
        className={cn(
          'shop-select-shell',
          accent === 'gold' && 'shop-select-shell--gold',
          compact && 'shop-select-shell--compact',
          hasUserSelection && 'shop-select-shell--active'
        )}
      >
        <button
          id={`${selectId}-trigger`}
          type="button"
          className="shop-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${selectId}-listbox`}
          aria-label={ariaLabel ?? label ?? placeholder}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown
            className={cn(
              'pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-[color,transform] duration-200',
              isOpen && 'rotate-180 text-gold'
            )}
          />
        </button>

        {isOpen ? (
          <div
            ref={optionsRef}
            id={`${selectId}-listbox`}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            aria-label={ariaLabel ?? label ?? placeholder}
            className="shop-select-popover"
          >
            {options.map((option, index) => {
              const isSelected = isOptionSelected(option.value);
              const isActive = activeIndex === index;

              return (
                <button
                  key={`${selectId}-${option.value || 'empty'}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  disabled={option.disabled}
                  data-option-index={index}
                  className={cn(
                    'shop-select-option',
                    isActive && 'shop-select-option--active',
                    isSelected && 'shop-select-option--selected',
                    option.disabled && 'shop-select-option--disabled',
                    accent === 'gold' && isSelected && 'shop-select-option--gold'
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => {
                    if (!option.disabled) {
                      setActiveIndex(index);
                    }
                  }}
                  onClick={() => commitSelection(option.value)}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-gold" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};
