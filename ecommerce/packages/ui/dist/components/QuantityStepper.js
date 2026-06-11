import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Minus, Plus } from 'lucide-react';
export const QuantityStepper = ({ value, onChange, min = 1, max = 99, disabled = false, className = '' }) => {
    const handleDecrement = () => {
        if (value > min)
            onChange(value - 1);
    };
    const handleIncrement = () => {
        if (value < max)
            onChange(value + 1);
    };
    return (_jsxs("div", { className: `inline-flex items-center rounded-xl border border-white/10 bg-white/5 ${className}`, children: [_jsx("button", { type: "button", disabled: disabled || value <= min, onClick: handleDecrement, className: "flex h-11 w-11 items-center justify-center rounded-l-xl text-gray-400 opacity-70 transition-colors hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-30", children: _jsx(Minus, { className: "h-4 w-4" }) }), _jsx("div", { className: "flex h-11 w-12 items-center justify-center border-x border-white/5 font-mono text-sm font-medium text-white", children: value }), _jsx("button", { type: "button", disabled: disabled || value >= max, onClick: handleIncrement, className: "flex h-11 w-11 items-center justify-center rounded-r-xl text-gray-400 opacity-70 transition-colors hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-30", children: _jsx(Plus, { className: "h-4 w-4" }) })] }));
};
