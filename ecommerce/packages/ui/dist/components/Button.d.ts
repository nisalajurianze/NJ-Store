import { type ButtonHTMLAttributes } from 'react';
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    loadingLabel?: string;
}
/**
 * Shared action button for store and admin apps.
 */
export declare const Button: import("react").ForwardRefExoticComponent<ButtonProps & {
    children?: import("react").ReactNode | undefined;
} & import("react").RefAttributes<HTMLButtonElement>>;
export {};
