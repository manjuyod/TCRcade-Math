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
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };
  
  const fontSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      className={`streak-badge ${dimensions[size]}`}
    >
      <span className={`text-white font-bold ${fontSizes[size]}`}>
        {streakDays}
      </span>
      <span className="text-[10px] text-white absolute -bottom-1 leading-tight">
        {streakDays === 1 ? 'day' : 'days'}
      </span>
    </motion.div>
  );
}
