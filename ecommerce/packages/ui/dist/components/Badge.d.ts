import type { PropsWithChildren } from 'react';
export interface BadgeProps {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    className?: string;
}
export declare const Badge: ({ children, variant, className }: PropsWithChildren<BadgeProps>) => JSX.Element;
