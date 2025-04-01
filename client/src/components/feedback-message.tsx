import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { stopAllSounds } from '@/lib/sounds';

type FeedbackMessageProps = {
  correct: boolean;
  tokensEarned: number;
  correctAnswer: string;
  onNextQuestion: () => void;
};

export default function FeedbackMessage({ 
  correct, 
  tokensEarned, 
  correctAnswer, 
  onNextQuestion 
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
        {correct ? 'Correct!' : 'Not quite!'}
      </h3>
      
      {correct ? (
        <p className="text-gray-600">You earned {tokensEarned} tokens</p>
      ) : (
        <p className="text-gray-600">The correct answer is {correctAnswer}</p>
      )}
      
      {/* We removed the outer motion.div and placed button directly in the component */}
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
