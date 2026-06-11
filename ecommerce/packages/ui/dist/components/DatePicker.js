import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '@njstore/utils/cn';
export const DatePicker = forwardRef(({ label, mode = 'date', id, className, error, ...props }, ref) => {
    const inputId = id ?? props.name ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return (_jsxs("label", { className: "block text-sm font-medium text-gray-200", htmlFor: inputId, children: [_jsx("span", { children: label }), _jsx("input", { ref: ref, id: inputId, type: mode, className: cn('mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-gold/50 focus:ring-2 focus:ring-gold/20', error && 'border-rose-400/60 focus:border-rose-300 focus:ring-rose-400/20', className), ...props }), error ? _jsx("span", { className: "mt-1 block text-xs text-rose-300", children: error }) : null] }));
});
DatePicker.displayName = 'DatePicker';
