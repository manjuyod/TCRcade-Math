import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { playSound } from '@/lib/sounds';
import { Link } from 'wouter';

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
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  
  // Play celebration sound and trigger confetti on mount
  useEffect(() => {
    // Play celebration sound
    playSound('sessionComplete');
    
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    // Fire another round of confetti after a delay
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
    }, 500);
    
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 1000);
  }, []);

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
          <div className="text-6xl font-bold text-secondary mb-2">🎉</div>
          <p className="text-xl font-medium">Congratulations!</p>
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
            <div className="text-2xl font-bold text-accent">+{tokensEarned}</div>
            <div className="text-sm text-gray-600">Tokens</div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button
            onClick={onStartNewSession}
            className="arcade-btn bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl w-full"
          >
            Start New Session
          </Button>
          
          <Link href="/">
            <Button 
              className="arcade-btn bg-secondary hover:bg-secondary/90 text-white font-bold py-3 rounded-xl w-full"
            >
              Return to Dashboard
            </Button>
          </Link>
          
          <Link href="/profile">
            <Button 
              className="arcade-btn bg-accent hover:bg-accent/90 text-white font-bold py-3 rounded-xl w-full"
            >
              View Your Progress
            </Button>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}