import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { useEffect, useState, useRef } from 'react';
import { playSound, stopAllSounds } from '@/lib/sounds';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';

type SessionCompleteProps = {
  correctAnswers: number;
  totalQuestions: number;
  tokensEarned: number;
  onStartNewSession: () => void;
};

export default function SessionComplete({
  correctAnswers,
  totalQuestions,
  tokensEarned,
  onStartNewSession
}: SessionCompleteProps) {
  const { user } = useAuth();
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  
  // Check for perfect score (all answers correct)
  const isPerfectScore = correctAnswers === totalQuestions && totalQuestions > 0;
  
  // Award bonus tokens for perfect score (only once when component mounts)
  // Using a ref to track if we've already awarded the bonus
  const bonusAwardedRef = useRef(false);
  
  useEffect(() => {
    // Skip if we've already awarded the bonus or if conditions aren't met
    if (bonusAwardedRef.current || !isPerfectScore || !user) {
      return;
    }
    
    // Award 20 bonus tokens for perfect score
    const perfectScoreBonus = 20;
    
    // Mark that we've awarded the bonus to prevent infinite loop
    bonusAwardedRef.current = true;
    
    // Update user tokens in the cache
    queryClient.setQueryData(['/api/user'], (oldData: any) => {
      // If there's no previous data, do nothing
      if (!oldData) return oldData;
      
      // Return the updated data
      return {
        ...oldData,
        tokens: oldData.tokens + perfectScoreBonus
      };
    });
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
        // Drastically reduced particle count for perfect scores to prevent crashes
        confetti({
          particleCount: 25, // Reduced from 100
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#9370DB'],
          disableForReducedMotion: true
        });
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
            <motion.p 
              className="text-sm text-green-600 font-bold mt-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              +20 bonus tokens for perfect accuracy!
            </motion.p>
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
          
          <Link href="/">
            <Button 
              className="arcade-btn bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl w-full transform transition-transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}