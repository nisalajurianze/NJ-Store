import { useEffect, useRef } from 'react';
import { cn } from '@njstore/utils/cn';

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

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const PriceRangeSlider = ({
  min,
  max,
  step,
  value,
  onChange,
  onCommit,
  formatValue = (amount) => String(amount),
  className
}: PriceRangeSliderProps): JSX.Element => {
  const [selectedMin, selectedMax] = value;
  const latestRangeRef = useRef<[number, number]>(value);
  const span = Math.max(max - min, 1);
  const fillStart = ((selectedMin - min) / span) * 100;
  const fillWidth = ((selectedMax - selectedMin) / span) * 100;

  const updateThumb = (thumb: 'min' | 'max', rawValue: number): void => {
    const nextValue = clamp(rawValue, min, max);
    const nextRange: [number, number] =
      thumb === 'min' ? [Math.min(nextValue, selectedMax), selectedMax] : [selectedMin, Math.max(nextValue, selectedMin)];

    latestRangeRef.current = nextRange;
    onChange(nextRange);
  };

  const commit = (): void => {
    onCommit?.(latestRangeRef.current);
  };

  useEffect(() => {
    latestRangeRef.current = value;
  }, [value]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
      <div className="price-range-slider">
        <div className="price-range-slider__track" />
        <div
          className="price-range-slider__fill"
          style={{
            left: `${fillStart}%`,
            width: `${fillWidth}%`
          }}
        />
        <input
          aria-label="Minimum price"
          type="range"
          min={min}
          max={max}
          step={step}
          value={selectedMin}
          onChange={(event) => updateThumb('min', Number(event.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
        <input
          aria-label="Maximum price"
          type="range"
          min={min}
          max={max}
          step={step}
          value={selectedMax}
          onChange={(event) => updateThumb('max', Number(event.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
      </div>
    </div>
  );
};
