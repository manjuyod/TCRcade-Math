import { motion } from 'framer-motion';

type StreakBadgeProps = {
  streakDays: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

export function StreakBadge({ 
  streakDays, 
  size = 'md' 
}: StreakBadgeProps) {
  // Define sizes based on the size prop
  const dimensions = {
    xs: 'h-5 w-5',
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12'
  };
  
  const fontSizes = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  };
  
  const dayTextSizes = {
    xs: 'text-[5px] bottom-0',
    sm: 'text-[7px] bottom-0.5',
    md: 'text-[7px] bottom-0.5',
    lg: 'text-[8px] bottom-1'
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`streak-badge ${dimensions[size]}`}
    >
      <span className={`text-white font-bold ${fontSizes[size]}`}>
        {streakDays}
      </span>
      <span className={`text-white absolute leading-none px-1 ${dayTextSizes[size]}`}>
        {streakDays === 1 ? 'day' : 'days'}
      </span>
    </motion.div>
  );
}
