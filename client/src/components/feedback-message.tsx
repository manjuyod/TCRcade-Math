import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { stopAllSounds } from '@/lib/sounds';
import { useEffect } from 'react';

type FeedbackMessageProps = {
  correct: boolean;
  tokensEarned: number;
  correctAnswer: string;
  onNextQuestion: () => void;
  batchComplete?: boolean; // New prop to indicate session is complete
};

export default function FeedbackMessage({ 
  correct, 
  tokensEarned, 
  correctAnswer, 
  onNextQuestion,
  batchComplete = false // Default to false for backward compatibility 
}: FeedbackMessageProps) {
  // Function to handle clicking Next Question
  const handleNextClick = () => {
    // Clear any remaining confetti
    confetti.reset();
    // Stop any playing sounds to prevent overlap
    stopAllSounds();
    // Call the passed onNextQuestion function
    onNextQuestion();
  };

  // Auto-advance to next question after 1 second
  // Skip auto-advance if batch is complete to prevent showing another question
  useEffect(() => {
    // Only auto-advance if not at the end of a batch
    if (!batchComplete) {
      const timer = setTimeout(() => {
        handleNextClick();
      }, 1000);
      
      // Clean up timer if component unmounts
      return () => clearTimeout(timer);
    }
  }, [batchComplete]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        text-center p-6 rounded-3xl mb-6 
        ${correct 
          ? 'bg-secondary bg-opacity-10' 
          : 'bg-danger bg-opacity-10'
        }
      `}
    >
      <div className="flex justify-center mb-4">
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20 
          }}
          className={`
            h-16 w-16 rounded-full flex items-center justify-center
            ${correct ? 'bg-secondary' : 'bg-danger'}
          `}
        >
          <i className={`ri-${correct ? 'check' : 'close'}-line text-white text-3xl`}></i>
        </motion.div>
      </div>
      
      <h3 className={`text-xl font-bold mb-2 ${correct ? 'text-secondary' : 'text-danger'}`}>
        {correct ? <strong>Correct!</strong> : 'Not quite!'}
      </h3>
      
      {/* Display additional message based on correct/incorrect */}
      {correct ? (
        <p className="text-gray-600 font-medium">Good Job!</p>
      ) : (
        <p className="text-gray-600">The correct answer is {correctAnswer}</p>
      )}
      
      {/* Next button is still here but will rarely be used due to auto-advance */}
      <Button
        onClick={handleNextClick}
        className="animate-pulse-button arcade-btn font-bold py-3 px-6 rounded-xl mt-4 text-white
                  shadow-lg transform transition-all duration-300
                  bg-primary hover:bg-primary/80 hover:scale-105 hover:shadow-xl"
        style={{ minWidth: "180px" }}
      >
        Next Question →
      </Button>
    </motion.div>
  );
}
