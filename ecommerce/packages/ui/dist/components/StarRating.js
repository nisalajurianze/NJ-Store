import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Star } from 'lucide-react';
export const StarRating = ({ value, max = 5, size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'h-3.5 w-3.5',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    };
    return (_jsx("div", { className: `flex items-center gap-[2px] ${className}`, children: Array.from({ length: max }).map((_, i) => {
            const fillPercentage = Math.max(0, Math.min(100, (value - i) * 100));
            return (_jsxs("div", { className: "relative", style: { width: 'max-content' }, children: [_jsx(Star, { className: `text-gray-600 ${sizeClasses[size]}`, fill: "currentColor" }), _jsx("div", { className: "absolute inset-0 overflow-hidden", style: { width: `${fillPercentage}%` }, children: _jsx(Star, { className: `text-gold ${sizeClasses[size]}`, fill: "currentColor" }) })] }, i));
        }) }));
};
