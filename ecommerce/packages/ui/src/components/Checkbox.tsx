import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@njstore/utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, id, ...props }, ref): JSX.Element => (
    <label className="flex w-full items-start gap-3 text-sm text-gray-300" htmlFor={id}>
      <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className={cn(
            'peer h-5 w-5 appearance-none rounded-md border border-white/14 bg-dark-light/80 transition-[border-color,background-color,box-shadow] duration-200 checked:border-gold checked:bg-gold focus:outline-none focus:ring-2 focus:ring-gold/30 disabled:cursor-not-allowed disabled:opacity-60',
            error ? 'border-red-400 focus:ring-red-400/20' : '',
            className
          )}
          aria-invalid={Boolean(error) || undefined}
          {...props}
        />
        <Check className="pointer-events-none absolute h-3.5 w-3.5 text-dark opacity-0 transition-opacity duration-150 peer-checked:opacity-100" aria-hidden="true" />
      </span>
      <span className="grid gap-1">
        {label ? <span className="text-[13px] font-medium leading-5 text-gray-200">{label}</span> : null}
        {error ? <span className="text-xs leading-5 text-red-400">{error}</span> : null}
      </span>
    </label>
  )
);

Checkbox.displayName = 'Checkbox';
