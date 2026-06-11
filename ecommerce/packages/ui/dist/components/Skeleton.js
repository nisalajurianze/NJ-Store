import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@njstore/utils/cn';
export const Skeleton = ({ className }) => (_jsx("div", { className: cn('animate-pulse rounded-2xl bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]', className), "aria-hidden": "true" }));
