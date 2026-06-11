export interface QuantityStepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
    className?: string;
}
export declare const QuantityStepper: ({ value, onChange, min, max, disabled, className }: QuantityStepperProps) => JSX.Element;
