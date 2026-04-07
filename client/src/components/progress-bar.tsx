import { motion } from 'framer-motion';

type ProgressBarProps = {
  progress: number; // 0-100 percentage
  height?: number; // in pixels
  color?: string;
  className?: string;
};

export function ProgressBar({ 
  progress, 
  height = 12, 
  color = 'primary',
  className
}: ProgressBarProps) {
  const progressBarClassName = className ? `progress-bar ${className}` : 'progress-bar';

  return (
    <div 
      className={progressBarClassName}
      data-color={color}
      style={{ height: `${height}px` }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5 }}
        className="progress-value"
      />
    </div>
  );
}
