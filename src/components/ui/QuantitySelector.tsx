import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  size?: 'sm' | 'md';
}

export function QuantitySelector({ value, onChange, max, min = 1, size = 'md' }: QuantitySelectorProps) {
  const sizes = size === 'sm'
    ? { btn: 'w-7 h-7', input: 'w-10 text-sm' }
    : { btn: 'w-9 h-9', input: 'w-14 text-sm' };

  const canDecrease = value > min;
  const canIncrease = max === undefined || value < max;

  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => canDecrease && onChange(value - 1)}
        disabled={!canDecrease}
        className={`${sizes.btn} flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        value={value}
        onChange={e => {
          const v = parseInt(e.target.value) || min;
          if (max !== undefined && v > max) return onChange(max);
          if (v < min) return onChange(min);
          onChange(v);
        }}
        className={`${sizes.input} text-center font-semibold text-gray-900 border-x border-gray-200 py-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
      <button
        onClick={() => canIncrease && onChange(value + 1)}
        disabled={!canIncrease}
        className={`${sizes.btn} flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
