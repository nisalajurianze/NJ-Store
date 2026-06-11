import type { InputHTMLAttributes, ReactNode } from 'react';
export interface RadioGroupOption {
    label: ReactNode;
    value: string;
    disabled?: boolean;
}
export interface RadioGroupProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
    label?: string;
    error?: string;
    name: string;
    value?: string;
    options: RadioGroupOption[];
}
export declare const RadioGroup: ({ label, error, className, name, value, options, onChange, readOnly, ...props }: RadioGroupProps) => JSX.Element;
