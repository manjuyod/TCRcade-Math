import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface FractionInputProps {
  numerator: string;
  denominator: string;
  onNumeratorChange: (value: string) => void;
  onDenominatorChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function FractionInput({ 
  numerator, 
  denominator, 
  onNumeratorChange, 
  onDenominatorChange, 
  onKeyDown,
  disabled = false,
  placeholder = "Enter fraction",
  autoFocus = false
}: FractionInputProps) {
  const numeratorRef = useRef<HTMLInputElement>(null);
  const denominatorRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (autoFocus && numeratorRef.current && !disabled) {
      numeratorRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const handleNumeratorChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    onNumeratorChange(numericValue);
  };

  const handleDenominatorChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    onDenominatorChange(numericValue);
  };

  const handleNumeratorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '/' && denominatorRef.current) {
      e.preventDefault();
      denominatorRef.current.focus();
    } else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-3">
      <Input
        ref={numeratorRef}
        value={numerator}
        onChange={(e) => handleNumeratorChange(e.target.value)}
        onKeyDown={handleNumeratorKeyDown}
        placeholder="num"
        className="w-16 text-center text-sm"
        disabled={disabled}
      />
      <span className="text-xl font-bold text-gray-600 mx-2">/</span>
      <Input
        ref={denominatorRef}
        value={denominator}
        onChange={(e) => handleDenominatorChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="den"
        className="w-16 text-center text-sm"
        disabled={disabled}
      />
    </div>
  );
}