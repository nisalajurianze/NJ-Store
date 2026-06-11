import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@njstore/utils/cn';
import { Button } from './Button.js';
const buildPaginationRange = (page, totalPages) => {
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};
export const Pagination = ({ page, totalPages, onPageChange, disabled = false, className }) => {
    if (totalPages <= 1) {
        return null;
    }
    const safePage = Math.min(Math.max(1, page), totalPages);
    const pages = buildPaginationRange(safePage, totalPages);
    return (_jsxs("nav", { className: cn('flex flex-wrap items-center justify-between gap-3', className), "aria-label": "Pagination", children: [_jsxs("p", { className: "text-sm leading-6 text-gray-400", children: ["Page ", safePage, " of ", totalPages] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { type: "button", variant: "secondary", disabled: disabled || safePage <= 1, onClick: () => onPageChange(Math.max(1, safePage - 1)), "aria-label": "Previous page", children: [_jsx(ChevronLeft, { className: "h-4 w-4", "aria-hidden": "true" }), "Previous"] }), _jsx("div", { className: "hidden items-center gap-1 sm:flex", children: pages.map((pageNumber) => (_jsx("button", { type: "button", className: cn('flex h-9 min-w-9 items-center justify-center rounded-xl border px-2 text-sm font-medium transition-colors', pageNumber === safePage
                                ? 'border-gold/30 bg-gold/15 text-gold'
                                : 'border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/15 hover:bg-white/[0.07] hover:text-white'), disabled: disabled, "aria-current": pageNumber === safePage ? 'page' : undefined, onClick: () => onPageChange(pageNumber), children: pageNumber }, pageNumber))) }), _jsxs(Button, { type: "button", variant: "secondary", disabled: disabled || safePage >= totalPages, onClick: () => onPageChange(Math.min(totalPages, safePage + 1)), "aria-label": "Next page", children: ["Next", _jsx(ChevronRight, { className: "h-4 w-4", "aria-hidden": "true" })] })] })] }));
};
