interface StackedFractionProps {
  numerator: number | string;
  denominator: number | string;
  className?: string;
}

export function StackedFraction({ numerator, denominator, className = "" }: StackedFractionProps) {
  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className="text-lg font-bold leading-none">{numerator}</div>
      <div className="w-full border-t-2 border-gray-800 my-1"></div>
      <div className="text-lg font-bold leading-none">{denominator}</div>
    </div>
  );
}