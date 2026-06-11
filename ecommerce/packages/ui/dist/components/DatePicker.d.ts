import { type InputHTMLAttributes } from 'react';
export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label: string;
    mode?: 'date' | 'datetime-local' | 'time';
    error?: string;
}
export declare const DatePicker: import("react").ForwardRefExoticComponent<DatePickerProps & import("react").RefAttributes<HTMLInputElement>>;
