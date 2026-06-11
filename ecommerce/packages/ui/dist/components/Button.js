import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@njstore/utils/cn';
const variantClasses = {
    primary: 'bg-gradient-to-r from-gold to-gold-dark text-dark shadow-[0_10px_24px_rgba(212,175,55,0.14)] hover:-translate-y-px hover:from-gold-light hover:to-gold hover:shadow-[0_14px_28px_rgba(212,175,55,0.16)] active:translate-y-0 active:from-gold active:to-gold-dark',
    secondary: 'border border-white/12 bg-white/[0.045] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-px hover:border-white/18 hover:bg-white/[0.075] hover:shadow-[0_10px_22px_rgba(0,0,0,0.14)] active:translate-y-0',
    ghost: 'bg-transparent text-white hover:bg-white/[0.07] hover:text-white',
    danger: 'bg-red-500/90 text-white shadow-[0_10px_22px_rgba(239,68,68,0.14)] hover:-translate-y-px hover:bg-red-500 hover:shadow-[0_14px_26px_rgba(239,68,68,0.16)] active:translate-y-0'
};
const sizeClasses = {
    sm: 'h-9 px-3.5 text-[13px]',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm sm:text-[15px]'
};
/**
 * Shared action button for store and admin apps.
 */
export const Button = forwardRef(({ children, className, variant = 'primary', size = 'md', isLoading = false, loadingLabel, disabled, ...props }, ref) => (_jsxs("button", { ref: ref, className: cn('relative inline-flex min-w-0 max-w-full shrink-0 transform-gpu items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] font-medium leading-none transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:translate-y-0 disabled:scale-100 disabled:shadow-none disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none', variantClasses[variant], sizeClasses[size], className), disabled: disabled || isLoading, "aria-busy": isLoading, ...props, children: [_jsx("span", { className: cn('inline-flex min-w-0 max-w-full items-center justify-center gap-2 transition-opacity duration-150', isLoading && 'opacity-0'), children: children }), isLoading ? (_jsxs("span", { className: "pointer-events-none absolute inset-0 inline-flex items-center justify-center gap-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin", "aria-hidden": "true" }), loadingLabel ? _jsx("span", { children: loadingLabel }) : null] })) : null] })));
Button.displayName = 'Button';
