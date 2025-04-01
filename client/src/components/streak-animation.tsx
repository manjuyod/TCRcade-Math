// Emergency fixed version of streak animation
// No sound effects, no external libraries, just a static display that self-dismisses

import { useState, useEffect } from 'react';

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
  // Local state to track if component is mounted
  const [isMounted, setIsMounted] = useState(true);
  
  // Self-dismissing logic that doesn't rely on parent state
  useEffect(() => {
    // Safety - only set timer if component is mounted
    if (!isMounted) return;
    
    // NO sound effects - they may be causing crashes
    
    // Auto dismiss after 2 seconds using local state first
    const timer = setTimeout(() => {
      setIsMounted(false);
      
      // Then call the parent callback only after state is updated
      setTimeout(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, 50);
    }, 2000);
    
    // Clean up on unmount
    return () => {
      clearTimeout(timer);
    };
  }, [isMounted, onAnimationComplete]); // Include dependencies to prevent React warnings
  
  // If not mounted, render nothing
  if (!isMounted) return null;
  
  // Simple text-only version, no emoji to prevent potential display issues
  let displayText = 'Streak Bonus!';
  let bonusText = '';
  
  // Simple if-else instead of ternary chains for better reliability
  if (milestone >= 20) {
    displayText = 'INCREDIBLE STREAK!';
  } else if (milestone >= 10) {
    displayText = 'AMAZING STREAK!';
  } else if (milestone >= 5) {
    displayText = 'SUPER STREAK!';
  }
  
  // Calculate bonus tokens
  if (milestone >= 5) {
    bonusText = `+${milestone * 2} bonus tokens!`;
  }
  
  // Simple static popup with no fancy effects
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 bg-black bg-opacity-30">
      <div className="bg-white rounded-xl py-6 px-8 shadow-lg text-center">
        <div className="text-4xl mb-2">
          {streakCount} in a row!
        </div>
        <div className="text-xl font-bold text-primary">
          {displayText}
        </div>
        {bonusText && (
          <div className="text-sm mt-2 text-primary-dark">
            {bonusText}
          </div>
        )}
      </div>
    </div>
  );
}