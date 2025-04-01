// Ultra-simplified streak animation that doesn't crash the app
// No animation libraries, no complex timers, just plain HTML with timeout

import { useEffect } from 'react';
import { playSound } from '@/lib/sounds';

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
  // Just use a single useEffect with no dependencies to prevent infinite loops
  useEffect(() => {
    // Try to play sound in a safe way
    try {
      playSound('streak');
    } catch (e) {
      console.error("Error playing streak sound:", e);
    }
    
    // Auto dismiss after 1.5 seconds
    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 1500);
    
    // Clean up on unmount
    return () => {
      clearTimeout(timer);
    };
  }, []); // <-- Empty dependency array is key to prevent infinite loops
  
  // Simple emoji and text without any fancy animations or libraries
  const emoji = milestone >= 20 ? '🏆' : 
               milestone >= 10 ? '⭐' : 
               milestone >= 5 ? '🔥' : '✓';
  
  const title = milestone >= 20 ? 'INCREDIBLE STREAK!' : 
               milestone >= 10 ? 'AMAZING STREAK!' : 
               milestone >= 5 ? 'SUPER STREAK!' : 'Streak Bonus!';
  
  // Simple static popup with no animations
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 bg-black bg-opacity-30">
      <div className="bg-white rounded-xl py-6 px-8 shadow-lg text-center">
        <div className="text-4xl mb-2">
          {emoji} {streakCount} in a row!
        </div>
        <div className="text-xl font-bold text-primary">
          {title}
        </div>
        {milestone >= 5 && (
          <div className="text-sm mt-2 text-primary-dark">
            +{milestone * 2} bonus tokens!
          </div>
        )}
      </div>
    </div>
  );
}