import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { playSound } from '@/lib/sounds';

type StreakAnimationProps = {
  streakCount: number;
  onAnimationComplete?: () => void;
};

export default function StreakAnimation({ 
  streakCount, 
  onAnimationComplete 
}: StreakAnimationProps) {
  
  useEffect(() => {
    // Play streak reward sound
    playSound('streak');
    
    // Create confetti animation
    confetti({
      particleCount: 50,
      spread: 45,
      origin: { y: 0.6, x: 0.5 },
      colors: ['#FFD700', '#FFA500', '#FF4500'],
      angle: 90,
      startVelocity: 25
    });
    
    // Set timeout for animation complete callback
    const timer = setTimeout(() => {
      onAnimationComplete && onAnimationComplete();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-primary bg-opacity-20 rounded-2xl p-8 pointer-events-none"
        initial={{ scale: 0.5, y: 20 }}
        animate={{ 
          scale: [0.5, 1.1, 1],
          y: [20, -10, 0],
          rotate: [0, -5, 5, 0]
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
          <div className="text-4xl mb-2">
            🔥 {streakCount} in a row! 🔥
          </div>
          <div className="text-xl font-bold text-primary">
            Streak Bonus!
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}