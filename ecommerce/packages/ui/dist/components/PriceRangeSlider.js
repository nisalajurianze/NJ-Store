import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { cn } from '@njstore/utils/cn';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const PriceRangeSlider = ({ min, max, step, value, onChange, onCommit, formatValue = (amount) => String(amount), className }) => {
    const [selectedMin, selectedMax] = value;
    const latestRangeRef = useRef(value);
    const span = Math.max(max - min, 1);
    const fillStart = ((selectedMin - min) / span) * 100;
    const fillWidth = ((selectedMax - selectedMin) / span) * 100;
    const updateThumb = (thumb, rawValue) => {
        const nextValue = clamp(rawValue, min, max);
        const nextRange = thumb === 'min' ? [Math.min(nextValue, selectedMax), selectedMax] : [selectedMin, Math.max(nextValue, selectedMin)];
        latestRangeRef.current = nextRange;
        onChange(nextRange);
    };
    const commit = () => {
        onCommit?.(latestRangeRef.current);
    };
    useEffect(() => {
        latestRangeRef.current = value;
    }, [value]);
    return (_jsxs("div", { className: cn('space-y-3', className), children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500", children: [_jsx("span", { children: formatValue(min) }), _jsx("span", { children: formatValue(max) })] }), _jsxs("div", { className: "price-range-slider", children: [_jsx("div", { className: "price-range-slider__track" }), _jsx("div", { className: "price-range-slider__fill", style: {
                            left: `${fillStart}%`,
                            width: `${fillWidth}%`
                        } }), _jsx("input", { "aria-label": "Minimum price", type: "range", min: min, max: max, step: step, value: selectedMin, onChange: (event) => updateThumb('min', Number(event.target.value)), onMouseUp: commit, onTouchEnd: commit, onKeyUp: commit, onBlur: commit }), _jsx("input", { "aria-label": "Maximum price", type: "range", min: min, max: max, step: step, value: selectedMax, onChange: (event) => updateThumb('max', Number(event.target.value)), onMouseUp: commit, onTouchEnd: commit, onKeyUp: commit, onBlur: commit })] })] }));
};
