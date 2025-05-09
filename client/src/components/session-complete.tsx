import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { useEffect, useState, useRef } from 'react';
import { playSound, stopAllSounds } from '@/lib/sounds';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useTokenBalance } from '@/hooks/use-token-balance';
import { queryClient } from '@/lib/queryClient';

type SessionCompleteProps = {
  correctAnswers: number;
  totalQuestions: number;
  tokensEarned: number;
  onStartNewSession: () => void;
  isPerfectSession?: boolean; // Add this to pass the hasPerfectSession flag
};

export default function SessionComplete({
  correctAnswers,
  totalQuestions,
  tokensEarned,
  onStartNewSession,
  isPerfectSession = false  // Default to false if not provided
}: SessionCompleteProps) {
  const { user } = useAuth();
  const { updateTokens } = useTokenBalance();
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  
  // Use the passed isPerfectSession flag instead of just comparing scores
  // This ensures we're tracking the session history not just the final numbers
  const isPerfectScore = isPerfectSession;
  
  // Using refs to track if we've already awarded the tokens to prevent duplicate updates
  const tokensAwardedRef = useRef(false);
  const bonusAwardedRef = useRef(false);
  
  // The token awards now happen in the HomePage component
  // No need to award tokens here as they're already awarded when session completes
  // This prevents double-awarding tokens
  
  // Keep the study plan refresh for perfect scores
  useEffect(() => {
    // Skip if conditions aren't met
    if (!isPerfectScore || !user) {
      return;
    }
    
    // After a perfect score, refresh the study plan to update recommendations
    try {
      // Dynamically import to avoid circular dependencies
      import('@/lib/study-plan').then(module => {
        module.refreshStudyPlan().then(success => {
          if (success) {
            console.log('Study plan refreshed successfully after perfect score');
          }
        });
      });
    } catch (error) {
      console.error('Error refreshing study plan after perfect score:', error);
    }
  }, [isPerfectScore, user]);
  
  // Add state to manage cleanup
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  
  // Play celebration sound and trigger confetti on mount
  useEffect(() => {
    // Don't do anything if we already triggered confetti (avoid multiple triggers)
    if (hasTriggeredConfetti) return;
    
    try {
      // Play celebration sound based on performance
      if (isPerfectScore) {
        // Play special perfect score sound for perfect sessions
        playSound('perfectScore');
      } else {
        // Play regular session complete sound
        playSound('sessionComplete');
      }
      
      // Trigger confetti animation - VERY limited to prevent crashes
      if (isPerfectScore) {
        // Two-burst confetti for perfect scores - still limited but more impressive
        // First burst from left side
        confetti({
          particleCount: 20, // Limited particles
          spread: 70,
          origin: { x: 0.2, y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF4500'], // Gold, orange, red-orange
          disableForReducedMotion: true
        });
        
        // Second burst from right side (delayed slightly)
        setTimeout(() => {
          confetti({
            particleCount: 20, // Limited particles
            spread: 70,
            origin: { x: 0.8, y: 0.6 },
            colors: ['#FFD700', '#FF8C00', '#9370DB'], // Gold, dark orange, purple
            disableForReducedMotion: true
          });
        }, 300);
        
        // Optional third burst from center (if performance allows)
        setTimeout(() => {
          confetti({
            particleCount: 15, // Very limited particles for third burst
            spread: 100,
            origin: { x: 0.5, y: 0.5 },
            colors: ['#FFD700', '#FF4500', '#1E90FF'], // Gold, red-orange, blue
            shapes: ['square'],
            disableForReducedMotion: true
          });
        }, 600);
      } else {
        // Even more limited single burst for normal completion
        confetti({
          particleCount: 15, // Reduced from 75
          spread: 60,
          origin: { y: 0.6 },
          disableForReducedMotion: true
        });
      }
      
      // Mark that we've triggered confetti to prevent double-triggering
      setHasTriggeredConfetti(true);
      
      // Force confetti cleanup after 1 second
      const confettiCleanup = setTimeout(() => {
        confetti.reset();
      }, 1000);
      
      // Return cleanup function
      return () => {
        clearTimeout(confettiCleanup);
        confetti.reset();
        stopAllSounds();
      };
    } catch (e) {
      console.error("Error in session complete animation:", e);
      return () => {};
    }
  }, [isPerfectScore, hasTriggeredConfetti]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-8 rounded-3xl shadow-lg text-center relative overflow-hidden"
    >
      {/* Animated celebration background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          className="absolute inset-0 bg-primary"
        />
      </div>
      
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">Session Complete!</h2>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-6 mt-8"
        >
          <div className="text-6xl font-bold text-secondary mb-2">
            {isPerfectScore ? '🏆' : '🎉'}
          </div>
          <p className="text-xl font-medium">
            {isPerfectScore 
              ? 'PERFECT SCORE! Amazing job!' 
              : 'Congratulations!'}
          </p>
          {isPerfectScore && (
            <motion.div 
              className="mt-2 py-2 px-4 bg-yellow-100 rounded-lg border-2 border-yellow-300 inline-block"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: [0, -3, 0] }}
              transition={{ 
                scale: { delay: 0.5, duration: 0.5 },
                opacity: { delay: 0.5, duration: 0.5 },
                y: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🏆</span>
                <span className="text-lg font-extrabold text-yellow-600">+20 PERFECT BONUS!</span>
                <span className="text-2xl">🏆</span>
              </div>
            </motion.div>
          )}
        </motion.div>
        
        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="flex justify-between items-center bg-orange-100 p-6 rounded-xl border-2 border-orange-300">
            <div className="text-lg font-bold text-gray-800">Correct Answers:</div>
            <div className="text-3xl font-extrabold text-orange-600">{correctAnswers}/{totalQuestions}</div>
          </div>
          
          <div className="flex justify-between items-center bg-blue-100 p-6 rounded-xl border-2 border-blue-300">
            <div className="text-lg font-bold text-gray-800">Accuracy:</div>
            <div className="text-3xl font-extrabold text-blue-600">{accuracy}%</div>
          </div>
          
          <div className="flex justify-between items-center bg-green-100 p-6 rounded-xl border-2 border-green-300">
            <div className="text-lg font-bold text-gray-800">Tokens Earned:</div>
            <div className="text-3xl font-extrabold text-green-600">
              +{isPerfectScore ? tokensEarned + 20 : tokensEarned}
              {isPerfectScore && <span className="text-sm text-green-600 ml-2">(+20 bonus)</span>}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => {
              // Stop any playing sounds before starting a new session
              stopAllSounds();
              
              // Refresh study plan before starting a new session
              try {
                import('@/lib/study-plan').then(module => {
                  module.refreshStudyPlan().then(success => {
                    if (success) {
                      console.log('Study plan refreshed successfully before new session');
                    }
                  });
                });
              } catch (error) {
                console.error('Error refreshing study plan before new session:', error);
              }
              
              onStartNewSession();
            }}
            className="arcade-btn bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl w-full transform transition-transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Start New Session
          </Button>
          
          <Link href="/modules">
            <Button 
              className="arcade-btn bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl w-full transform transition-transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Choose Different Module
            </Button>
          </Link>
          
          <Button 
            onClick={() => {
              // Stop any playing sounds before navigating
              stopAllSounds();
              // Use window.location to ensure full page refresh and proper state reset
              window.location.href = '/';
            }}
            className="arcade-btn bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl w-full transform transition-transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Return to Dashboard
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}