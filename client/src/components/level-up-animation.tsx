import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { playSound } from '@/lib/sounds';
import { TrendingUp } from 'lucide-react';
import { getGradeLabel } from '@/lib/utils';

type LevelUpAnimationProps = {
  newGrade: string;
  onAnimationComplete?: () => void;
};

export default function LevelUpAnimation({ 
  newGrade,
  onAnimationComplete 
}: LevelUpAnimationProps) {
  
  useEffect(() => {
    // Play grade level up fanfare
    playSound('gradeUp');
    
    // More elaborate confetti burst for level up
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    
    // First burst
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6, x: 0.5 },
      colors: ['#FFD700', '#FFA500', '#40E0D0', '#9370DB', '#FF6347'],
      zIndex: 999,
      disableForReducedMotion: true
    });
    
    // Continuous bursts
    (function frame() {
      confetti({
        particleCount: 20,
        angle: 60,
        spread: 75,
        origin: { x: 0, y: 0.8 },
        colors: ['#FFD700', '#FFA500', '#40E0D0']
      });
      
      confetti({
        particleCount: 20,
        angle: 120,
        spread: 75,
        origin: { x: 1, y: 0.8 },
        colors: ['#9370DB', '#FF6347', '#7CFC00']
      });
      
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
    
    // Set timeout for animation complete callback - shorter duration
    const timer = setTimeout(() => {
      onAnimationComplete && onAnimationComplete();
    }, 2500); // Fixed animation duration of 2.5 seconds
    
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  // Get bonus tokens for level up
  const getLevelUpBonus = () => {
    return 50; // Fixed bonus for level up
  };

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 bg-black bg-opacity-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-8 shadow-lg pointer-events-none"
        initial={{ scale: 0.5, y: 20 }}
        animate={{ 
          scale: [0.5, 1.1, 1],
          y: [20, -10, 0],
          rotate: [0, -5, 5, 0]
        }}
        transition={{ 
          duration: 1,
          ease: "easeOut"
        }}
      >
        <motion.div
          className="text-center"
          animate={{
            scale: [1, 1.3, 1.1],
          }}
          transition={{
            duration: 0.8,
            repeat: 1,
            repeatType: "reverse"
          }}
        >
          <div className="flex justify-center items-center text-5xl mb-4 text-white">
            <TrendingUp className="h-12 w-12 mr-3 text-yellow-300" />
            <span>LEVEL UP!</span>
          </div>
          <div className="text-3xl font-bold text-white mb-6">
            You've advanced to {getGradeLabel(newGrade)}!
          </div>
          <motion.div 
            className="text-xl mt-2 text-yellow-300 font-bold"
            animate={{ 
              y: [0, -10, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "loop"
            }}
          >
            +{getLevelUpBonus()} bonus tokens!
          </motion.div>
          <div className="mt-6 text-sm text-white opacity-80">
            New challenges and questions await you!
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}