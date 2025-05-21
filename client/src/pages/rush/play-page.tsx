import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { MATH_RUSH_RULES } from '@shared/mathRushRules';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/header';
import { useCountdownTimer } from '@/hooks/use-countdown-timer';
import { 
  Timer,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ProgressBar } from '@/components/progress-bar';

// Type for rush questions
type RushQuestion = {
  id: number | string;
  type?: string;
  operation?: string;
  question: string;
  answer: string;
  options: string[];
  int1?: number;
  int2?: number;
  int3?: number;
};

// Type for answer result
type AnswerResult = {
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
};

export default function MathRushPlayPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // State for questions and game progress
  const [questions, setQuestions] = useState<RushQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answerResults, setAnswerResults] = useState<AnswerResult[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Get settings from localStorage
  const mode = localStorage.getItem('mathRushMode') || 'addition';
  const questionType = localStorage.getItem('mathRushQuestionType') || '';
  const timeOption = localStorage.getItem('mathRushTimeOption') || 'SHORT';
  const timeSeconds = parseInt(localStorage.getItem('mathRushTimeSeconds') || '60');
  
  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);
  
  // Timer setup
  const { 
    timeRemaining, 
    startTimer, 
    stopTimer, 
    isRunning 
  } = useCountdownTimer(timeSeconds);
  
  // Load questions when component mounts
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        // Build the API URL with query parameters
        let url = `/api/rush/questions?mode=${mode}`;
        
        // Add type parameter if available
        if (questionType) {
          url += `&type=${questionType}`;
        }
        
        console.log(`Fetching Math Rush questions with mode: ${mode}${questionType ? `, type: ${questionType}` : ''}`);
        const response = await apiRequest('GET', url);
        const data = await response.json();
        
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
          setLoading(false);
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load questions. Please try again.',
            variant: 'destructive'
          });
          navigate('/rush/setup');
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load questions. Please try again.',
          variant: 'destructive'
        });
        navigate('/rush/setup');
      }
    };
    
    fetchQuestions();
    // Record start time
    startTimeRef.current = Date.now();
    
    // Start with focus on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
    
    // Cleanup function for navigation away
    return () => {
      stopTimer();
    };
  }, []);
  
  // Start timer when questions are loaded
  useEffect(() => {
    if (!loading && questions.length > 0 && !gameStarted) {
      startTimer();
      setGameStarted(true);
    }
  }, [loading, questions, gameStarted]);
  
  // Effect to handle game over when timer reaches zero
  useEffect(() => {
    if (timeRemaining === 0 && gameStarted && !gameOver) {
      handleGameOver();
    }
  }, [timeRemaining, gameStarted]);
  
  // Function to format question text - now just returns the question text directly
  const formatQuestionText = (question: RushQuestion) => {
    // The question text is already formatted by the server
    return question.question;
  };
  
  // Function to get correct answer for a question
  const getCorrectAnswer = (question: RushQuestion): string => {
    // The correct answer is already provided by the server
    return question.answer;
  };
  
  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (!questions[currentQuestionIndex] || gameOver) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = getCorrectAnswer(currentQuestion);
    const isAnswerCorrect = answer.trim() === correctAnswer;
    
    // Show feedback
    setIsCorrect(isAnswerCorrect);
    setFeedbackText(isAnswerCorrect ? 'Correct!' : 'Incorrect!');
    setFeedbackVisible(true);
    
    // Save result
    setAnswerResults(prev => [
      ...prev,
      {
        correct: isAnswerCorrect,
        userAnswer: answer,
        correctAnswer
      }
    ]);
    
    // Clear input
    setAnswer('');
    
    // Hide feedback after a short delay and move to next question
    setTimeout(() => {
      setFeedbackVisible(false);
      
      // Check if we've reached the end or if we're out of time
      if (currentQuestionIndex >= MATH_RUSH_RULES.questionCount - 1 || timeRemaining <= 0) {
        handleGameOver();
      } else {
        // Move to next question
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        
        // Focus input for next question
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }, 800);
  };
  
  // Handle game over
  const handleGameOver = async () => {
    // Stop the timer
    stopTimer();
    setGameOver(true);
    
    // Calculate total duration in seconds
    const endTime = Date.now();
    const durationSec = Math.round((endTime - startTimeRef.current) / 1000);
    
    // Calculate stats
    const totalAnswered = answerResults.length;
    const correctCount = answerResults.filter(r => r.correct).length;
    
    try {
      // Submit results to server
      const response = await apiRequest('POST', '/api/rush/complete', {
        correct: correctCount,
        total: totalAnswered,
        durationSec,
        mode
      });
      
      const data = await response.json();
      
      // Store results for the completion page
      localStorage.setItem('mathRushResults', JSON.stringify({
        correct: correctCount,
        total: totalAnswered,
        durationSec,
        mode,
        tokens: data.tokens,
        timeOption
      }));
      
      // Navigate to completion page
      navigate('/rush/complete');
    } catch (error) {
      console.error('Error submitting results:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit results. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && answer.trim() !== '') {
      handleSubmitAnswer();
    }
  };
  
  // Current question or loading state
  const currentQuestion = !loading && questions.length > 0 
    ? questions[currentQuestionIndex] 
    : null;
    
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 container max-w-4xl py-6 px-4 flex flex-col items-center">
        {/* Timer bar */}
        <div className="w-full mb-6">
          <div className="flex justify-between mb-2">
            <div className="flex items-center">
              <Timer className="h-5 w-5 mr-2 text-orange-500" />
              <span className="font-bold">{timeRemaining} seconds remaining</span>
            </div>
            <div>
              Question {currentQuestionIndex + 1} of {MATH_RUSH_RULES.questionCount}
            </div>
          </div>
          <ProgressBar 
            progress={(timeRemaining / timeSeconds) * 100} 
            height={8}
            color={timeRemaining < 10 ? 'bg-red-500' : 'bg-orange-500'}
          />
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-lg">Loading questions...</p>
          </div>
        ) : currentQuestion ? (
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <Card className="w-full">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center">
                  <div className="text-4xl md:text-5xl font-bold mb-8 text-center">
                    {formatQuestionText(currentQuestion)}
                  </div>
                  
                  {/* Always use text input for answers */}
                  <div className="flex w-full max-w-md items-center space-x-2">
                    <Input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Enter your answer"
                      className="text-xl py-6"
                      disabled={feedbackVisible || gameOver}
                    />
                    <Button 
                      onClick={handleSubmitAnswer}
                      disabled={!answer.trim() || feedbackVisible || gameOver}
                      size="lg"
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      Submit
                    </Button>
                  </div>
                  
                  {/* Feedback message */}
                  <AnimatePresence>
                    {feedbackVisible && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex items-center mt-6 p-3 rounded-md ${
                          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isCorrect ? (
                          <Check className="h-5 w-5 mr-2" />
                        ) : (
                          <X className="h-5 w-5 mr-2" />
                        )}
                        {feedbackText}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-lg text-center">No questions available. Please try again.</p>
            <Button 
              onClick={() => navigate('/rush/setup')}
              className="mt-4"
            >
              Back to Setup
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}