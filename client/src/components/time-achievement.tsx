import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { playSound } from '@/lib/sounds';
import { Clock } from 'lucide-react';

type TimeAchievementProps = {
  minutesSpent: number;
  onAnimationComplete?: () => void;
};

export default function TimeAchievement({ 
  minutesSpent,
  onAnimationComplete 
}: TimeAchievementProps) {
  
  useEffect(() => {
    // Play appropriate time achievement sound based on minutes
    switch(minutesSpent) {
      case 5:
        playSound('timeAchievement5');
        break;
      case 10:
        playSound('timeAchievement10');
        break;
      case 15:
        playSound('timeAchievement15');
        break;
      case 20:
        playSound('timeAchievement20');
        break;
      default:
        playSound('levelUp');
    }
    
    // Create confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6, x: 0.5 },
      colors: ['#4CAF50', '#2196F3', '#9C27B0'],
      angle: 90,
      startVelocity: 30
    });
    
    // Set timeout for animation complete callback
    const timer = setTimeout(() => {
      onAnimationComplete && onAnimationComplete();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  // Get message based on minutes milestone
  const getMessage = (minutes: number) => {
    switch(minutes) {
      case 5:
        return 'Great start! Keep going!';
      case 10:
        return 'Halfway there! Keep it up!';
      case 15:
        return 'Almost there! Final stretch!';
      case 20:
        return 'Daily goal achieved! Amazing work!';
      default:
        return 'Great progress!';
    }
  };

  // Get bonus tokens based on milestone
  const getBonusTokens = (minutes: number) => {
    return minutes * 3; // 3 tokens per minute milestone
  };

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-blue-500 bg-opacity-20 rounded-2xl p-8 pointer-events-none"
        initial={{ scale: 0.5, y: 20 }}
        animate={{ 
          scale: [0.5, 1.1, 1],
          y: [20, -10, 0]
        }}
        transition={{ 
          duration: 0.8,
          ease: "easeOut"
        }}
      >
        <motion.div
          className="text-center"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: 1,
            repeatType: "reverse"
          }}
        >
          <div className="flex justify-center items-center text-4xl mb-2">
            <Clock className="h-10 w-10 mr-2 text-blue-500" />
            <span>{minutesSpent} minute{minutesSpent !== 1 ? 's' : ''} of learning!</span>
          </div>
          <div className="text-xl font-bold text-blue-600">
            {getMessage(minutesSpent)}
          </div>
          <div className="text-sm mt-2 text-blue-700">
            +{getBonusTokens(minutesSpent)} bonus tokens!
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}