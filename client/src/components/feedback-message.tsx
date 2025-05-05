import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { stopAllSounds } from '@/lib/sounds';
import { useEffect, useRef } from 'react';

type FeedbackMessageProps = {
  correct: boolean;
  tokensEarned: number;
  correctAnswer: string;
  onNextQuestion: () => void;
  isSessionComplete?: boolean; // Add flag to check if session is complete
};

export default function FeedbackMessage({ 
  correct, 
  tokensEarned, 
  correctAnswer, 
  onNextQuestion,
  isSessionComplete = false // Default to false if not provided
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

  // Create a ref for the container div to position the confetti
  const containerRef = useRef<HTMLDivElement>(null);

  // Show confetti celebration for correct answers
  useEffect(() => {
    if (correct && containerRef.current) {
      // Shoot confetti from the top center of the screen
      const duration = 800; // Duration of confetti in milliseconds
      const particleCount = 150; // Number of confetti particles

      // Create a colorful celebration with confetti
      confetti({
        particleCount: particleCount,
        spread: 100,
        origin: { y: 0.3, x: 0.5 }, // Start from top middle of screen
        colors: ['#FFA500', '#FFD700', '#FF4500', '#FF6347', '#00FF00', '#1E90FF'],
        zIndex: 1000,
        disableForReducedMotion: true, // Accessibility consideration
        scalar: 1.2 // Make confetti slightly larger
      });

      console.log('🎉 Playing confetti animation for correct answer!');
    }

    // Auto-advance to next question after 1 second, but only if the session is not complete
    const timer = setTimeout(() => {
      // Only advance to next question if the session is not complete
      if (!isSessionComplete) {
        handleNextClick();
      }
      // Otherwise, do nothing - the session complete screen will appear
    }, 1200); // Slightly increased to allow confetti to be visible
    
    // Clean up timer if component unmounts
    return () => clearTimeout(timer);
  }, [correct]);
  
  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        text-center p-6 rounded-3xl mb-6 relative z-10
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
      
      {/* Only show correct answer for incorrect responses, no token display */}
      {!correct && (
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
