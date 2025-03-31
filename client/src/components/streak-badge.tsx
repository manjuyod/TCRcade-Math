import { motion } from 'framer-motion';

type StreakBadgeProps = {
  streakDays: number;
  size?: 'sm' | 'md' | 'lg';
};

export function StreakBadge({ 
  streakDays, 
  size = 'md' 
}: StreakBadgeProps) {
  // Define sizes based on the size prop
  const dimensions = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12'
  };
  
  const fontSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      className={`streak-badge ${dimensions[size]}`}
    >
      <span className={`text-white font-bold ${fontSizes[size]}`}>
        {streakDays}
      </span>
      <span className="text-[7px] text-white absolute bottom-0.5 leading-none px-1">
        {streakDays === 1 ? 'day' : 'days'}
      </span>
    </motion.div>
  );
}
