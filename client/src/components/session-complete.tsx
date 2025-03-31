import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
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
  useEffect(() => {
    if (isPerfectScore && user) {
      // Award 20 bonus tokens for perfect score
      const perfectScoreBonus = 20;
      
      // Update user tokens in the cache
      queryClient.setQueryData(['/api/user'], {
        ...user,
        tokens: user.tokens + perfectScoreBonus
      });
    }
  }, [isPerfectScore, user]);
  
  // Play celebration sound and trigger confetti on mount
  useEffect(() => {
    // Play celebration sound based on performance
    if (isPerfectScore) {
      // Play special perfect score sound for perfect sessions
      playSound('perfectScore');
    } else {
      // Play regular session complete sound
      playSound('sessionComplete');
    }
    
    // Trigger confetti animation - simplified to prevent crashes
    if (isPerfectScore) {
      // Just do a single burst for perfect scores to prevent crashes
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#9370DB'],
      });
      
      // Second burst with slight delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 90,
          spread: 70,
          origin: { x: 0.5, y: 0.5 },
          colors: ['#FFD700', '#FFA500']
        });
      }, 300);
    } else {
      // Single burst for normal completion
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    
    // Cleanup any running confetti after 2 seconds to prevent crashes
    return () => {
      // This will stop any continuous confetti animations
      setTimeout(() => {
        // Stop any remaining confetti
        confetti.reset();
        // Stop any playing sounds
        stopAllSounds();
      }, 2000);
    };
  }, [isPerfectScore]);

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
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-primary bg-opacity-10 p-4 rounded-xl">
            <div className="text-2xl font-bold text-primary">{correctAnswers}</div>
            <div className="text-sm text-gray-600">Correct</div>
          </div>
          
          <div className="bg-secondary bg-opacity-10 p-4 rounded-xl">
            <div className="text-2xl font-bold text-secondary">{accuracy}%</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          
          <div className="bg-accent bg-opacity-10 p-4 rounded-xl">
            <div className="text-2xl font-bold text-accent">
              +{isPerfectScore ? tokensEarned + 20 : tokensEarned}
            </div>
            <div className="text-sm text-gray-600">Tokens</div>
            {isPerfectScore && (
              <div className="text-xs text-green-600 mt-1">
                (includes perfect bonus)
              </div>
            )}
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
          
          <Link href="/modules">
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