import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect, useState, useRef } from 'react';
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
  // Refs to track timers so we can properly clean them up
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initDelayRef = useRef<NodeJS.Timeout | null>(null);
  
  // State to track if animation has been shown and completed
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  
  // Handle completion of the animation safely
  const handleComplete = () => {
    if (isCompleted) return; // Prevent double-calls
    
    setIsCompleted(true);
    
    // Clean up before calling onAnimationComplete
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Always try to clean up confetti
    try {
      confetti.reset();
    } catch (e) {
      console.error("Confetti reset failed:", e);
    }
    
    // Stop sounds
    try {
      stopAllSounds();
    } catch (e) {
      console.error("Sound stop failed:", e);
    }
    
    // Finally call the completion callback
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  };
  
  // Handle one-time effects on mount
  useEffect(() => {
    // Skip if already completed
    if (isCompleted || hasShownConfetti) return;
    
    // Use a small delay to ensure component is fully mounted
    initDelayRef.current = setTimeout(() => {
      // Mark that we've shown confetti to prevent duplicate runs
      setHasShownConfetti(true);
      
      // Play sound (inside try/catch)
      try {
        // Use a simple sound that's less likely to fail
        playSound('streak');
      } catch (e) {
        console.error("Sound play failed:", e);
      }
      
      // Show minimal confetti (inside try/catch)
      try {
        // Use very few particles (5) to reduce risk of crashes
        confetti({
          particleCount: 5,
          spread: 45,
          origin: { y: 0.6, x: 0.5 },
          disableForReducedMotion: true
        });
      } catch (e) {
        console.error("Confetti failed:", e);
      }
      
      // Set a timer to auto-dismiss
      timerRef.current = setTimeout(() => {
        handleComplete();
      }, 2500); // Reduced time to 2.5 seconds
      
    }, 50); // Very short delay
    
    // Cleanup function
    return () => {
      // Clear all pending timers
      if (initDelayRef.current) {
        clearTimeout(initDelayRef.current);
        initDelayRef.current = null;
      }
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      // Always attempt to clean up running animations
      try {
        confetti.reset();
      } catch (e) {
        console.error("Confetti reset failed in cleanup:", e);
      }
      
      try {
        stopAllSounds();
      } catch (e) {
        console.error("Sound stop failed in cleanup:", e);
      }
    };
  }, []);
  
  // Don't render anything if already completed
  if (isCompleted) {
    return null;
  }

  // Static version without animations for maximum stability
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 bg-black bg-opacity-30">
      <div className="bg-white rounded-2xl p-8 pointer-events-none shadow-lg">
        <div className="text-center">
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
        </div>
      </div>
    </div>
  );
}