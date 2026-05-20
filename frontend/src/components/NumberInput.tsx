import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  className = '',
  placeholder,
  required,
  ...props
}) => {
  const handleIncrement = () => {
    if (props.disabled) return;
    const current = parseFloat(value.toString()) || 0;
    let next = current + step;
    if (max !== undefined && next > max) next = max;
    onChange(parseFloat(next.toFixed(2)).toString());
  };

  const handleDecrement = () => {
    if (props.disabled) return;
    const current = parseFloat(value.toString()) || 0;
    let next = current - step;
    if (min !== undefined && next < min) next = min;
    onChange(parseFloat(next.toFixed(2)).toString());
  };

  return (
    <div className="relative flex items-center w-full group">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        required={required}
        className={`w-full custom-stepper-input pr-3 py-2.5 bg-luxury-dark-900 border border-luxury-dark-800 rounded-lg text-luxury-dark-50 focus:outline-none focus:border-arbaa-cyan-400 focus:ring-1 focus:ring-arbaa-cyan-400 transition-all font-mono ${className}`}
        {...props}
      />
      {/* Custom Stepper buttons styled with slate/metallic luxury dark tones */}
      <div className="absolute left-1 top-1 bottom-1 flex flex-col justify-between py-0.5 px-0.5 border-r border-luxury-dark-800 bg-luxury-dark-950/80 rounded-l-md transition-all duration-300 group-focus-within:border-arbaa-cyan-400/30">
        <button
          type="button"
          onClick={handleIncrement}
          disabled={props.disabled}
          className="p-1 rounded text-luxury-dark-400 hover:text-luxury-gold-500 hover:bg-luxury-dark-800/80 active:scale-90 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          title="زيادة"
        >
          <ChevronUp className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={props.disabled}
          className="p-1 rounded text-luxury-dark-400 hover:text-luxury-gold-500 hover:bg-luxury-dark-800/80 active:scale-90 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          title="نقصان"
        >
          <ChevronDown className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>
      </div>
    </div>
  );
};
