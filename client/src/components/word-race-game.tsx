import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Button } from '@/components/ui/button';
import QuestionCard from '@/components/question-card';
import { Question } from '@shared/schema';
import { Loader2, Timer } from 'lucide-react';
import { playSound, stopAllSounds } from '@/lib/sounds';

type WordRaceGameProps = {
  question: Question | undefined;
  isLoading: boolean;
  onAnswerSubmit: (answer: string) => void;
  onTimeUp: () => void;
};

export default function WordRaceGame({ 
  question, 
  isLoading, 
  onAnswerSubmit,
  onTimeUp
}: WordRaceGameProps) {
  // Time settings
  const totalTime = 20; // 20 seconds per question
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [isTimerActive, setIsTimerActive] = useState(true);
  
  // Animation controls
  const containerControls = useAnimation();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Warning thresholds
  const warningThreshold = 10; // 10 seconds
  const dangerThreshold = 5; // 5 seconds
  
  // Set up timer
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
        
        // At 5 seconds left, play warning sound and shake screen
        if (timeLeft === dangerThreshold) {
          playSound('streak');
          containerControls.start({
            x: [0, -10, 10, -10, 10, 0],
            transition: { duration: 0.5 }
          });
        }
      }, 1000);
    } else if (timeLeft === 0) {
      // Time's up
      // Stop any warning sounds when time is up
      stopAllSounds();
      onTimeUp();
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isTimerActive, containerControls, onTimeUp]);
  
  // Reset timer when question changes
  useEffect(() => {
    setTimeLeft(totalTime);
    setIsTimerActive(true);
  }, [question]);
  
  // Handle answer submission with time bonus
  const handleAnswerSubmit = (answer: string) => {
    setIsTimerActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Stop warning sounds if any are playing
    stopAllSounds();
    onAnswerSubmit(answer);
  };
  
  // Calculate progress percentage
  const timeProgress = (timeLeft / totalTime) * 100;
  
  // Generate appropriate styling based on time left
  const getTimerStyles = () => {
    if (timeLeft <= dangerThreshold) {
      return { indicatorClass: 'bg-red-500', textClass: 'text-red-600' };
    }
    if (timeLeft <= warningThreshold) {
      return { indicatorClass: 'bg-yellow-500', textClass: 'text-yellow-600' };
    }
    return { indicatorClass: 'bg-green-500', textClass: 'text-green-600' };
  };
  
  const timerStyles = getTimerStyles();
  
  return (
    <motion.div
      animate={containerControls}
      className="flex flex-col"
    >
      {/* Timer display */}
      <div className="mb-4 bg-white p-4 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold flex items-center text-gray-700">
            <Timer className="mr-2 h-5 w-5 text-red-500" />
            Time Remaining
          </span>
          <span className={`font-bold ${timerStyles.textClass}`}>
            {timeLeft} seconds
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full ${timerStyles.indicatorClass} transition-all`}
            style={{ width: `${timeProgress}%` }}
          />
        </div>
      </div>
      
      {/* Question card */}
      {isLoading ? (
        <div className="question-card bg-white p-6 rounded-3xl shadow-md mb-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : question ? (
        <div className="relative">
          <QuestionCard
            question={question}
            onAnswerSubmit={handleAnswerSubmit}
          />
          {timeLeft <= dangerThreshold && (
            <motion.div 
              className="absolute -inset-1 rounded-3xl border-2 border-red-500 pointer-events-none"
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
        </div>
      ) : (
        <div className="question-card bg-white p-6 rounded-3xl shadow-md mb-6 text-center">
          <p className="text-gray-500">No questions available for this challenge.</p>
        </div>
      )}
      
      {/* Tips */}
      <div className="mt-4 bg-yellow-50 p-3 rounded-xl text-sm text-yellow-800 border border-yellow-200">
        <p className="font-medium">⚡ Word Race Tips:</p>
        <ul className="mt-1 list-disc list-inside">
          <li>Answer quickly to earn time bonuses</li>
          <li>The screen will shake when time is running low</li>
          <li>Consecutive correct answers build bigger point multipliers</li>
        </ul>
      </div>
    </motion.div>
  );
}