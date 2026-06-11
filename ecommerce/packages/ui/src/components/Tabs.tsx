import { type ReactNode, useId } from 'react';
import { cn } from '@njstore/utils/cn';

export interface TabItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  className?: string;
  tabClassName?: string;
}

export const Tabs = ({
  items,
  value,
  onValueChange,
  label = 'Tabs',
  className,
  tabClassName
}: TabsProps): JSX.Element => {
  const fallbackId = useId();

  return (
    <div role="tablist" aria-label={label} className={cn('inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1', className)}>
      {items.map((item) => {
        const selected = item.value === value;
        const tabId = `${fallbackId}-${item.value}`;

        return (
          <button
            key={item.value}
            id={tabId}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={item.disabled}
            className={cn(
              'inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-gray-400 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'bg-white/12 text-white shadow-[0_10px_20px_rgba(0,0,0,0.18)]' : 'hover:bg-white/[0.06] hover:text-gray-200',
              tabClassName
            )}
            onClick={() => {
              if (!item.disabled) {
                onValueChange(item.value);
              }
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
