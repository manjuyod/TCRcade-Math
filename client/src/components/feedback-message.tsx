import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

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
      
      <motion.div
        animate={{ 
          scale: [1, 1.05, 1],
          boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 15px rgba(0,0,0,0.2)", "0px 0px 0px rgba(0,0,0,0)"]
        }}
        transition={{ 
          duration: 1.5,
          repeat: Infinity,
          repeatType: "loop"
        }}
        className="inline-block"
      >
        <Button
          onClick={onNextQuestion}
          className={`
            arcade-btn font-bold py-3 px-6 rounded-xl mt-4 text-white
            border-2 border-white shadow-lg transform transition-transform hover:scale-105
            ${correct ? 'bg-secondary hover:bg-opacity-90' : 'bg-danger hover:bg-opacity-90'}
          `}
          style={{ minWidth: "180px" }}
        >
          Next Question →
        </Button>
      </motion.div>
    </motion.div>
  );
}
