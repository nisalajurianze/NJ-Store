import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@njstore/utils/cn';

export interface RadioGroupOption {
  label: ReactNode;
  value: string;
  disabled?: boolean;
}

export interface RadioGroupProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  label?: string;
  error?: string;
  name: string;
  value?: string;
  options: RadioGroupOption[];
}

export const RadioGroup = ({
  label,
  error,
  className,
  name,
  value,
  options,
  onChange,
  readOnly,
  ...props
}: RadioGroupProps): JSX.Element => (
  <fieldset className="grid w-full gap-2 text-sm text-gray-300">
    {label ? <legend className="text-[13px] font-medium text-gray-200">{label}</legend> : null}
    <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'flex min-h-11 items-center gap-3 rounded-[14px] border border-white/10 bg-dark-light/70 px-3.5 text-[13px] font-medium text-gray-200 transition-[border-color,background-color,box-shadow] duration-200 hover:border-white/15',
            value === option.value && 'border-gold/60 bg-gold/10 text-white',
            option.disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={onChange}
            readOnly={readOnly ?? !onChange}
            className="h-4 w-4 border-white/20 bg-dark-light text-gold focus:ring-gold/30"
            aria-invalid={Boolean(error) || undefined}
            {...props}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
    {error ? <span className="text-xs leading-5 text-red-400">{error}</span> : null}
  </fieldset>
);
