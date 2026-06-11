import { type ReactNode } from 'react';
export interface TabItem {
    value: string;
    label: ReactNode;
    icon?: ReactNode;
    disabled?: boolean;
}
interface TabsProps {
    items: TabItem[];
    value: string;
    onValueChange: (value: string) => void;
    label?: string;
    className?: string;
    tabClassName?: string;
}
export declare const Tabs: ({ items, value, onValueChange, label, className, tabClassName }: TabsProps) => JSX.Element;
export {};
