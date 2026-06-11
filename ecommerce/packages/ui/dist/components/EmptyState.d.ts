import type { ReactNode } from 'react';
export interface EmptyStateProps {
    title: string;
    description: string;
    icon?: ReactNode;
    action?: ReactNode;
}
export declare const EmptyState: ({ title, description, icon, action }: EmptyStateProps) => JSX.Element;
