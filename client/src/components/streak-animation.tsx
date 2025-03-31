import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';
import { playSound, stopAllSounds } from '@/lib/sounds';

type StreakAnimationProps = {
  streakCount: number;
  milestone?: number;
  onAnimationComplete?: () => void;
};

export default function StreakAnimation({ 
  streakCount, 
  milestone = 3, 
  onAnimationComplete 
}: StreakAnimationProps) {
  // State to track if animation is completed
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Handle completion of the animation
  const handleComplete = () => {
    setIsCompleted(true);
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  };
  
  useEffect(() => {
    // Prevent any further execution if we're already completed
    if (isCompleted) return;
    
    let timer: ReturnType<typeof setTimeout>;
    
    // Use a small delay to prevent immediate execution on mounting
    const initDelay = setTimeout(() => {
      // Play appropriate sound based on milestone
      try {
        // Use a single sound to reduce complexity
        playSound('streak');
      } catch (e) {
        console.error("Sound playback failed:", e);
      }
      
      // Create basic confetti - using minimal particles for stability
      try {
        // Static particle count for all milestone levels to ensure stability
        const particleCount = 5; // Very conservative
        
        // Single burst for all milestone levels
        confetti({
          particleCount,
          spread: 45,
          origin: { y: 0.6, x: 0.5 },
          colors: ['#FFD700', '#4CAF50', '#2196F3'],
          angle: 90,
          startVelocity: 20,
          disableForReducedMotion: true
        });
      } catch (e) {
        console.error("Confetti failed:", e);
      }
      
      // Auto-dismiss after 3 seconds
      timer = setTimeout(() => {
        try {
          confetti.reset();
          stopAllSounds();
          handleComplete();
        } catch (e) {
          console.error("Cleanup failed:", e);
        }
      }, 3000);
    }, 100); // Short delay to prevent immediate execution
    
    // Cleanup function
    return () => {
      try {
        clearTimeout(initDelay); // Clear the initialization delay
        clearTimeout(timer);     // Clear the auto-dismiss timer
        confetti.reset();        // Reset any running confetti
        stopAllSounds();         // Stop any playing sounds
      } catch (e) {
        console.error("Effect cleanup failed:", e);
      }
    };
  }, [milestone, onAnimationComplete, isCompleted]);
  
  // Don't render if animation is completed
  if (isCompleted) {
    return null;
  }

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
          y: [20, -10, 0]
        }}
        transition={{ 
          duration: 0.6,
          ease: "easeOut"
        }}
      >
        <motion.div
          className="text-center"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 0.5
          }}
        >
          <div className="text-4xl mb-2">
            {milestone >= 20 ? '🏆' : milestone >= 10 ? '⭐' : '🔥'} {streakCount} in a row!
          </div>
          <div className="text-xl font-bold text-primary">
            {milestone >= 20 ? 'INCREDIBLE STREAK!' : 
              milestone >= 10 ? 'AMAZING STREAK!' : 
              milestone >= 5 ? 'SUPER STREAK!' : 'Streak Bonus!'}
          </div>
          {milestone >= 5 && (
            <div className="text-sm mt-2 text-primary-dark">
              +{milestone * 2} bonus tokens!
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}