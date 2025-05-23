import { FRACTIONS_PUZZLE_RULES } from "@shared/fractionsPuzzleRules";

interface FractionBarProps {
  numerator: number;
  denominator: number;
  colorIndex: number;
  className?: string;
}

export function FractionBar({ numerator, denominator, colorIndex, className = "" }: FractionBarProps) {
  const color = FRACTIONS_PUZZLE_RULES.colors[colorIndex % FRACTIONS_PUZZLE_RULES.colors.length];
  const barWidth = Math.min(460, window.innerWidth * 0.7); // Responsive width
  
  // Calculate section width
  const sectionWidth = barWidth / denominator;
  
  return (
    <div className={`flex flex-col items-center justify-center space-y-2 w-full ${className}`}>
      <div className="flex justify-center w-full">
        <svg 
          width={barWidth} 
          height="60" 
          className="mx-auto"
          style={{ maxWidth: '400px' }}
        >
          {/* Draw all sections */}
          {Array.from({ length: denominator }, (_, i) => (
            <g key={i}>
              {/* Section rectangle */}
              <rect
                x={i * sectionWidth}
                y={5}
                width={sectionWidth}
                height={50}
                fill={i < numerator ? color : "#f3f4f6"}
                stroke="#374151"
                strokeWidth="1"
              />
              {/* Section divider lines (except for the last one) */}
              {i < denominator - 1 && (
                <line
                  x1={(i + 1) * sectionWidth}
                  y1={5}
                  x2={(i + 1) * sectionWidth}
                  y2={55}
                  stroke="#374151"
                  strokeWidth="2"
                />
              )}
            </g>
          ))}
          
          {/* Outer border */}
          <rect
            x="0"
            y="5"
            width={barWidth}
            height="50"
            fill="none"
            stroke="#374151"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}