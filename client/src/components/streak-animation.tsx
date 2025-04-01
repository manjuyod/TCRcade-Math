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
  // Use refs to safely track state that shouldn't cause re-renders
  const isUnmountedRef = useRef(false);
  const animationShownRef = useRef(false);
  
  // Timer refs that need to be cleared
  const timerRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  
  // Simplified state management
  const [isVisible, setIsVisible] = useState(true);
  
  // Safe completion handler that won't crash the app
  const safeComplete = () => {
    if (isUnmountedRef.current) return;
    
    // Clear any timers
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    
    // Try to reset confetti
    try {
      if (window && confetti) {
        confetti.reset();
      }
    } catch (e) {
      console.error("Safe error in confetti reset:", e);
    }
    
    // Try to stop sounds
    try {
      stopAllSounds();
    } catch (e) {
      console.error("Safe error in stopping sounds:", e);
    }
    
    // Hide first
    setIsVisible(false);
    
    // Then call callback after a brief delay
    setTimeout(() => {
      if (isUnmountedRef.current) return;
      if (onAnimationComplete && typeof onAnimationComplete === 'function') {
        try {
          onAnimationComplete();
        } catch (e) {
          console.error("Error in animation complete callback:", e);
        }
      }
    }, 100);
  };
  
  // Simplified effect with better error handling
  useEffect(() => {
    // Make sure we don't run animations if we've already shown them
    if (animationShownRef.current) return;
    animationShownRef.current = true;
    
    const runAnimation = () => {
      // Play sound effect first (in try/catch)
      try {
        playSound('streak');
      } catch (e) {
        console.error("Safe error in playing sound:", e);
      }
      
      // Show simplified confetti effect (in try/catch)
      try {
        if (window && confetti) {
          confetti({
            particleCount: milestone >= 5 ? 30 : 15, // More particles for bigger milestones
            spread: 45,
            origin: { y: 0.6, x: 0.5 },
            disableForReducedMotion: true
          });
        }
      } catch (e) {
        console.error("Safe error in confetti:", e);
      }
    };
    
    // Use window timeout instead of React's setTimeout for better stability
    timerRef.current = window.setTimeout(() => {
      runAnimation();
      
      // Set auto-dismiss timer
      dismissTimerRef.current = window.setTimeout(() => {
        safeComplete();
      }, 2000); // Auto-dismiss after 2 seconds
    }, 50);
    
    // Cleanup function to prevent memory leaks
    return () => {
      isUnmountedRef.current = true;
      
      // Clear timers
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      
      // Try to clean up
      try {
        if (window && confetti) {
          confetti.reset();
        }
      } catch (e) {
        console.error("Safe cleanup error:", e);
      }
      
      try {
        stopAllSounds();
      } catch (e) {
        console.error("Safe cleanup error:", e);
      }
    };
  }, [milestone]);
  
  // Don't render anything if not visible
  if (!isVisible) {
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