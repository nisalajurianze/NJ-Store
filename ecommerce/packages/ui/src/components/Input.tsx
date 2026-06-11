import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@njstore/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, id, ...props }, ref): JSX.Element => (
  <label className="flex w-full flex-col gap-2 text-sm text-gray-300" htmlFor={id}>
    {label ? <span className="text-[13px] font-medium text-gray-200">{label}</span> : null}
    <input
      ref={ref}
      id={id}
      className={cn(
        'h-11 w-full min-w-0 max-w-full rounded-[14px] border border-white/10 bg-[var(--app-input-surface,rgba(11,16,27,0.86))] px-3.5 text-sm text-white placeholder:text-gray-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/15 focus:border-white/20 focus:bg-[var(--app-input-focus-surface,rgba(11,16,27,0.92))] focus:outline-none focus:ring-2 focus:ring-white/10',
        error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : '',
        className
      )}
      {...props}
    />
    {error ? <span className="text-xs leading-5 text-red-400">{error}</span> : null}
  </label>
));

Input.displayName = 'Input';
