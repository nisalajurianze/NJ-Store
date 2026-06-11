import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@njstore/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className, id, ...props }, ref): JSX.Element => (
  <label className="flex w-full flex-col gap-2.5 text-sm text-gray-300" htmlFor={id}>
    {label ? <span className="font-medium text-gray-200">{label}</span> : null}
    <textarea
      ref={ref}
      id={id}
      className={cn(
        'min-h-32 w-full min-w-0 max-w-full resize-y rounded-xl border border-white/10 bg-dark-light/80 px-4 py-3.5 text-white placeholder:text-gray-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/15 focus:border-white/20 focus:bg-dark-light/90 focus:outline-none focus:ring-2 focus:ring-white/10',
        error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : '',
        className
      )}
      {...props}
    />
    {error ? <span className="text-xs leading-5 text-red-400">{error}</span> : null}
  </label>
));

Textarea.displayName = 'Textarea';
