import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface MixedNumberInputProps {
  whole: string;
  numerator: string;
  denominator: string;
  onWholeChange: (value: string) => void;
  onNumeratorChange: (value: string) => void;
  onDenominatorChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function MixedNumberInput({ 
  whole,
  numerator, 
  denominator, 
  onWholeChange,
  onNumeratorChange, 
  onDenominatorChange, 
  onKeyDown,
  disabled = false,
  autoFocus = false
}: MixedNumberInputProps) {
  const wholeRef = useRef<HTMLInputElement>(null);
  const numeratorRef = useRef<HTMLInputElement>(null);
  const denominatorRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (autoFocus && wholeRef.current && !disabled) {
      wholeRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const handleWholeChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    onWholeChange(numericValue);
  };

  const handleNumeratorChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    onNumeratorChange(numericValue);
  };

  const handleDenominatorChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    onDenominatorChange(numericValue);
  };

  const handleWholeKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Tab') && numeratorRef.current) {
      e.preventDefault();
      numeratorRef.current.focus();
    } else if (onKeyDown) {
      onKeyDown(e);
    }
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
    <div className="flex items-center justify-center space-x-2">
      <Input
        ref={wholeRef}
        value={whole}
        onChange={(e) => handleWholeChange(e.target.value)}
        onKeyDown={handleWholeKeyDown}
        placeholder="whole"
        className="w-16 text-center text-sm"
        disabled={disabled}
      />
      <Input
        ref={numeratorRef}
        value={numerator}
        onChange={(e) => handleNumeratorChange(e.target.value)}
        onKeyDown={handleNumeratorKeyDown}
        placeholder="num"
        className="w-12 text-center text-sm"
        disabled={disabled}
      />
      <span className="text-lg font-bold text-gray-600">/</span>
      <Input
        ref={denominatorRef}
        value={denominator}
        onChange={(e) => handleDenominatorChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="den"
        className="w-12 text-center text-sm"
        disabled={disabled}
      />
    </div>
  );
}