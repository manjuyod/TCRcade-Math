
import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Question } from '@shared/schema';
import { Loader2, Shield, Heart } from 'lucide-react';
import { playSound } from '@/lib/sounds';
import QuestionCard from '@/components/question-card';

type BossRunGameProps = {
  question: Question | undefined;
  isLoading: boolean;
  onAnswerSubmit: (answer: string) => void;
  onGameOver: (won: boolean) => void;
};

export default function BossRunGame({
  question,
  isLoading,
  onAnswerSubmit,
  onGameOver
}: BossRunGameProps) {
  // Game settings
  const totalTime = 10; // 10 seconds per question
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [bossLevel, setBossLevel] = useState(1);
  const [bossHealth, setBossHealth] = useState(100 * bossLevel);
  const [bossPosition, setBossPosition] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  
  // Animation controls
  const containerControls = useAnimation();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up timer
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Time's up - increment boss position
      handleBossAdvance();
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isTimerActive]);
  
  // Reset timer when question changes
  useEffect(() => {
    setTimeLeft(totalTime);
    setIsTimerActive(true);
  }, [question]);
  
  const handleBossAdvance = () => {
    setBossPosition(prev => {
      const newPosition = prev + 1;
      if (newPosition >= 10) {
        onGameOver(false);
      }
      return newPosition;
    });
  };
  
  // Handle answer submission
  const handleAnswerSubmit = (answer: string) => {
    setIsTimerActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Calculate damage based on remaining time
    const damage = timeLeft * 10;
    
    onAnswerSubmit(answer);
    
    // Update boss health if answer was correct
    if (answer === question?.answer) {
      setBossHealth(prev => {
        const newHealth = prev - damage;
        if (newHealth <= 0) {
          // Boss defeated
          playSound('victory');
          setBossLevel(prev => prev + 1);
          setBossHealth(100 * (bossLevel + 1));
          setBossPosition(0);
        }
        return Math.max(0, newHealth);
      });
    }
    
    // Increment question count and check for boss advance
    setQuestionCount(prev => {
      const newCount = prev + 1;
      if (newCount % 2 === 0) {
        handleBossAdvance();
      }
      return newCount;
    });
  };
  
  // Calculate health percentage
  const healthPercentage = (bossHealth / (100 * bossLevel)) * 100;
  
  return (
    <motion.div
      animate={containerControls}
      className="flex flex-col"
    >
      {/* Boss health bar */}
      <div className="mb-4 bg-white p-4 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold flex items-center text-gray-700">
            <Shield className="mr-2 h-5 w-5 text-purple-500" />
            Boss Level {bossLevel}
          </span>
          <span className="font-bold text-red-500 flex items-center">
            <Heart className="mr-2 h-5 w-5" />
            {bossHealth} HP
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${healthPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Boss position indicator */}
      <div className="mb-4 bg-white p-4 rounded-xl shadow-md">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${(bossPosition / 10) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-600 text-center">
          Boss is {10 - bossPosition} steps away!
        </div>
      </div>
      
      {/* Timer */}
      <div className="mb-4 bg-white p-4 rounded-xl shadow-md">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(timeLeft / totalTime) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-center font-bold">
          {timeLeft}s - Damage potential: {timeLeft * 10}
        </div>
      </div>
      
      {/* Question card */}
      {isLoading ? (
        <div className="question-card bg-white p-6 rounded-3xl shadow-md mb-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : question ? (
        <QuestionCard
          question={question}
          onAnswer={handleAnswerSubmit}
        />
      ) : (
        <div className="question-card bg-white p-6 rounded-3xl shadow-md mb-6 text-center">
          <p className="text-gray-500">No questions available.</p>
        </div>
      )}
    </motion.div>
  );
}
