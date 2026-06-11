import { type ReactNode } from 'react';
interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}
export declare const Tooltip: ({ content, children, className, contentClassName }: TooltipProps) => JSX.Element;
export {};
