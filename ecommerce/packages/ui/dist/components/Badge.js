import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@njstore/utils/cn';
const badgeClasses = {
    default: 'bg-white/10 text-white',
    success: 'bg-emerald-500/20 text-emerald-300',
    warning: 'bg-amber-500/20 text-amber-300',
    danger: 'bg-red-500/20 text-red-300',
    info: 'bg-blue-500/20 text-blue-300'
};
export const Badge = ({ children, variant = 'default', className }) => (_jsx("span", { className: cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.02em]', badgeClasses[variant], className), children: children }));
