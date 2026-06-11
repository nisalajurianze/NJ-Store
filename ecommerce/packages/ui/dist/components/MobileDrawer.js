import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
export const MobileDrawer = ({ isOpen, onClose, title, children, className = '' }) => {
    const panelRef = useRef(null);
    const reduceMotion = useReducedMotion();
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);
    return createPortal(_jsx(AnimatePresence, { children: isOpen ? (_jsxs(motion.div, { className: "fixed inset-0 z-[100] lg:hidden", initial: reduceMotion ? false : { opacity: 0 }, animate: reduceMotion ? undefined : { opacity: 1 }, exit: reduceMotion ? undefined : { opacity: 0 }, transition: { duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }, onPointerDown: (event) => {
                if (panelRef.current && event.target instanceof Node && panelRef.current.contains(event.target)) {
                    return;
                }
                onClose();
            }, children: [_jsx(motion.div, { className: "fixed inset-0 bg-dark/80 backdrop-blur-sm", "aria-hidden": "true", initial: reduceMotion ? false : { opacity: 0 }, animate: reduceMotion ? undefined : { opacity: 1 }, exit: reduceMotion ? undefined : { opacity: 0 }, transition: { duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] } }), _jsxs(motion.div, { ref: panelRef, className: `fixed inset-x-0 bottom-0 z-[101] flex max-h-[min(88dvh,calc(100dvh-0.75rem))] min-w-0 flex-col rounded-t-[22px] border-t border-white/10 bg-dark-light pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-t-[28px] ${className}`, initial: reduceMotion ? false : { y: '104%', opacity: 0.88 }, animate: reduceMotion ? undefined : { y: 0, opacity: 1 }, exit: reduceMotion ? undefined : { y: '104%', opacity: 0.96 }, transition: { duration: reduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }, children: [_jsxs("div", { className: "flex h-14 min-w-0 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 sm:h-16 sm:px-5", children: [_jsx("h3", { className: "min-w-0 truncate font-display text-base text-white sm:text-lg", children: title }), _jsx("button", { type: "button", onClick: onClose, className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-gray-400 transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/10 hover:text-white active:scale-95", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "custom-scrollbar min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5", children: children })] })] })) : null }), document.body);
};
