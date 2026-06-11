import type { ReactNode } from 'react';
export interface SectionHeadingProps {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: ReactNode;
    size?: 'default' | 'compact';
}
export declare const SectionHeading: ({ eyebrow, title, description, action, size }: SectionHeadingProps) => JSX.Element;
