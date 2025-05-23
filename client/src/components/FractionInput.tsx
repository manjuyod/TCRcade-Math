import { Input } from '@/components/ui/input';

interface FractionInputProps {
  numerator: string;
  denominator: string;
  onNumeratorChange: (value: string) => void;
  onDenominatorChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FractionInput({ 
  numerator, 
  denominator, 
  onNumeratorChange, 
  onDenominatorChange, 
  onKeyDown,
  disabled = false,
  placeholder = "Enter fraction"
}: FractionInputProps) {
  return (
    <div className="flex items-center justify-center space-x-1">
      <Input
        value={numerator}
        onChange={(e) => onNumeratorChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="num"
        className="w-16 text-center text-sm"
        disabled={disabled}
      />
      <span className="text-xl font-bold text-gray-600">/</span>
      <Input
        value={denominator}
        onChange={(e) => onDenominatorChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="den"
        className="w-16 text-center text-sm"
        disabled={disabled}
      />
    </div>
  );
}