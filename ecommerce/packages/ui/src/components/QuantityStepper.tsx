import { Minus, Plus } from 'lucide-react';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export const QuantityStepper = ({ 
  value, 
  onChange, 
  min = 1, 
  max = 99, 
  disabled = false,
  className = ''
}: QuantityStepperProps): JSX.Element => {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className={`inline-flex items-center rounded-xl border border-white/10 bg-white/5 ${className}`}>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={handleDecrement}
        className="flex h-11 w-11 items-center justify-center rounded-l-xl text-gray-400 opacity-70 transition-colors hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>
      
      <div className="flex h-11 w-12 items-center justify-center border-x border-white/5 font-mono text-sm font-medium text-white">
        {value}
      </div>
      
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={handleIncrement}
        className="flex h-11 w-11 items-center justify-center rounded-r-xl text-gray-400 opacity-70 transition-colors hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};
