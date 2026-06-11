import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from 'lucide-react';
export const ProgressStepper = ({ steps, currentStep, className = '' }) => {
    return (_jsx("div", { className: `flex w-full items-start justify-between gap-1 sm:gap-2 ${className}`, children: steps.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;
            return (_jsxs("div", { className: "relative flex min-w-0 flex-1 items-start justify-center text-center", children: [_jsxs("div", { className: "relative z-10 flex w-full min-w-0 flex-col items-center gap-2", children: [_jsx("div", { className: `flex h-8 w-8 items-center justify-center rounded-full border-2 bg-[var(--app-stepper-idle-surface,#030712)] text-sm font-medium transition-colors duration-300 ${isCompleted ? "border-gold bg-gold/10 text-gold" :
                                    isActive ? "border-gold bg-gold text-dark" :
                                        "border-[color:var(--app-stepper-idle-border,rgba(255,255,255,0.20))] text-[var(--app-stepper-muted,#6b7280)]"}`, children: isCompleted ? _jsx(Check, { className: "h-4 w-4 stroke-[3]" }) : idx + 1 }), _jsx("span", { className: `block w-full max-w-[6.8rem] px-1 text-[10px] font-medium uppercase leading-3 tracking-wide sm:max-w-[120px] sm:text-[11px] sm:leading-4 ${isCompleted || isActive ? "text-[var(--app-stepper-active-label,#f8fafc)]" : "text-[var(--app-stepper-muted,#6b7280)]"}`, children: step })] }), idx < steps.length - 1 && (_jsx("div", { className: "absolute left-1/2 top-4 w-full -translate-y-1/2 px-5", children: _jsx("div", { className: "h-[2px] w-full rounded-full bg-[var(--app-stepper-line,rgba(255,255,255,0.10))]", children: _jsx("div", { className: "h-full rounded-full bg-gold transition-[width] duration-500 will-change-[width]", style: { width: isCompleted ? "100%" : "0%" } }) }) }))] }, idx));
        }) }));
};
