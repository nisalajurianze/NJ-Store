import type { HTMLAttributes, PropsWithChildren } from 'react';
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    title?: string;
    description?: string;
    bodyClassName?: string;
}
export declare const Card: ({ children, className, title, description, bodyClassName, ...props }: PropsWithChildren<CardProps>) => JSX.Element;
