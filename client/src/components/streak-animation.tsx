// Super simplified version of streak animation with NO state to prevent React update loops
// This stateless component relies completely on parent control

import React from 'react';

type StreakAnimationProps = {
  streakCount: number;
  milestone?: number;
  onAnimationComplete?: () => void;
};

// Completely stateless component to avoid any setState loops
export default function StreakAnimation({ 
  streakCount, 
  milestone = 3, 
  onAnimationComplete 
}: StreakAnimationProps) {
  
  // Simple text-only version
  let displayText = 'Streak Bonus!';
  let bonusText = '';
  
  if (milestone >= 20) {
    displayText = 'INCREDIBLE STREAK!';
  } else if (milestone >= 10) {
    displayText = 'AMAZING STREAK!';
  } else if (milestone >= 5) {
    displayText = 'SUPER STREAK!';
  }
  
  if (milestone >= 5) {
    bonusText = `+${milestone * 2} bonus tokens!`;
  }

  // Simple handler with no state changes in the component
  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Just call the parent callback immediately
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  };

  // Simple static popup
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30"
      onClick={handleDismiss}
      style={{ cursor: 'pointer' }}
    >
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
        <div className="mt-4 text-sm text-gray-400">
          (Click anywhere to continue)
        </div>
      </div>
    </div>
  );
}