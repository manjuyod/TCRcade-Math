import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
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
  
  useEffect(() => {
    // Play streak reward sound based on milestone level
    if (milestone >= 20) {
      playSound('streak20');
    } else if (milestone >= 10) {
      playSound('streak10');
    } else if (milestone >= 5) {
      playSound('streak5');
    } else {
      playSound('streak');
    }
    
    // Create confetti animation with limited intensity to prevent crashes
    // For all milestone levels, use a safe amount of particles
    const safeParticleCount = Math.min(30, milestone >= 10 ? 30 : milestone >= 5 ? 25 : 20);
    
    confetti({
      particleCount: safeParticleCount,
      spread: 45,
      origin: { y: 0.6, x: 0.5 },
      colors: ['#FFD700', '#FFA500', '#FF4500', '#4CAF50', '#2196F3'],
      angle: 90,
      startVelocity: 20
    });
    
    // For higher milestones, add just one extra burst with limited particles
    if (milestone >= 5) {
      setTimeout(() => {
        confetti({
          particleCount: safeParticleCount,
          spread: 60,
          origin: { y: 0.7, x: 0.3 },
          angle: 120,
          startVelocity: 20
        });
      }, 300);
    }
    
    // CRITICAL: Ensure animation auto-dismisses after 3 seconds max
    const timer = setTimeout(() => {
      // Stop any remaining confetti
      confetti.reset();
      // Stop any sounds before completing the animation
      stopAllSounds();
      if (onAnimationComplete) onAnimationComplete();
    }, 3000); // 3 second max animation duration for all streak types
    
    // Set a backup timer in case the primary one fails
    const backupTimer = setTimeout(() => {
      confetti.reset();
      stopAllSounds();
      if (onAnimationComplete) onAnimationComplete();
    }, 3500); // Backup timer 0.5 seconds after primary
    
    // Clear confetti, sounds, and timers on unmount/cleanup
    return () => {
      confetti.reset();
      stopAllSounds();
      clearTimeout(timer);
      clearTimeout(backupTimer);
    };
  }, [onAnimationComplete, milestone]);

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
            {milestone >= 20 ? '🏆' : milestone >= 10 ? '⭐' : '🔥'} {streakCount} in a row! {milestone >= 20 ? '🏆' : milestone >= 10 ? '⭐' : '🔥'}
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