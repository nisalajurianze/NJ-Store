import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@njstore/utils/cn';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  error?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, error, className, id, ...props }, ref): JSX.Element => (
    <label className="flex w-full items-center justify-between gap-3 text-sm text-gray-300" htmlFor={id}>
      <span className="grid gap-1">
        {label ? <span className="text-[13px] font-medium leading-5 text-gray-200">{label}</span> : null}
        {error ? <span className="text-xs leading-5 text-red-400">{error}</span> : null}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          role="switch"
          className={cn(
            'peer sr-only',
            className
          )}
          aria-invalid={Boolean(error) || undefined}
          {...props}
        />
        <span className="h-6 w-11 rounded-full border border-white/12 bg-white/10 transition-colors duration-200 peer-checked:border-gold/60 peer-checked:bg-gold/85 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold/40 peer-disabled:opacity-60" />
        <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5 peer-checked:bg-dark" />
      </span>
    </label>
  )
);

Switch.displayName = 'Switch';
