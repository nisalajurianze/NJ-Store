export interface PriceRangeSliderProps {
    min: number;
    max: number;
    step: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
    onCommit?: (value: [number, number]) => void;
    formatValue?: (value: number) => string;
    className?: string;
}
export declare const PriceRangeSlider: ({ min, max, step, value, onChange, onCommit, formatValue, className }: PriceRangeSliderProps) => JSX.Element;
