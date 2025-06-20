
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
  AlertCircle,
  Clock
} from 'lucide-react';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSessionPrevention } from '@/hooks/use-session-prevention';
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
  timestamp: number;
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
  const [timerExpired, setTimerExpired] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentType, setCurrentType] = useState<string | null>(null);

  // Get settings from localStorage
  const mode = localStorage.getItem('mathRushOperator') || 'addition';
  const questionType = localStorage.getItem('mathRushQuestionType') || '';
  const timeOption = localStorage.getItem('mathRushTimeOption') || 'SHORT';
  const timeSeconds = parseInt(localStorage.getItem('mathRushTimeSeconds') || '60');
  const forceProgression = localStorage.getItem('mathRushForceProgression') === 'true';

  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);

  // Session prevention - prevent exit during active game
  const { endSession } = useSessionPrevention({
    isActive: sessionActive && gameStarted && !gameOver,
    onAttemptExit: () => {
      toast({
        title: "Game in Progress",
        description: "You're in the middle of a Math Rush session. Please complete it before leaving.",
        variant: "destructive"
      });
    },
    allowedPaths: ['/rush/complete']
  });

  // Timer setup
  const { 
    timeRemaining, 
    startTimer, 
    stopTimer, 
    isRunning 
  } = useCountdownTimer(timeSeconds);

  // Load and cache questions when component mounts
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        // Check sessionStorage first
        const cacheKey = `mathRush_${mode}_${questionType || 'default'}_${forceProgression}`;
        const cachedQuestions = sessionStorage.getItem(cacheKey);
        
        if (cachedQuestions) {
          console.log('Loading questions from sessionStorage cache');
          const parsed = JSON.parse(cachedQuestions);
          setQuestions(parsed);
          setSessionActive(true);
          setLoading(false);
          return;
        }

        // Build the API URL with query parameters
        let url = `/api/rush/questions?mode=${mode}`;

        // Add type parameter if available
        if (questionType) {
          url += `&type=${questionType}`;
        }

        if (forceProgression) {
          url += `&forceProgression=true`;
        }

        console.log(`Fetching Math Rush questions with mode: ${mode}${questionType ? `, type: ${questionType}` : ''}${forceProgression ? ', forceProgression: true' : ''}`);
        const response = await apiRequest('GET', url);
        const data = await response.json();
        
        // Use the server-determined current type for progression
        if (data.currentType) {
          console.log(`Server selected progression type: ${data.currentType}`);
          setCurrentType(data.currentType);
        } else if (questionType) {
          console.log(`Using preset question type: ${questionType}`);
          setCurrentType(questionType);
        }

        if (data.questions && Array.isArray(data.questions)) {
          // Cache questions in both RAM and sessionStorage
          setQuestions(data.questions);
          sessionStorage.setItem(cacheKey, JSON.stringify(data.questions));
          console.log(`Cached ${data.questions.length} questions to sessionStorage`);
          
          // Extract current type from first question if not already set
          if (data.questions.length > 0 && data.questions[0].type && !currentType) {
            setCurrentType(data.questions[0].type);
            console.log(`Current progression type from questions: ${data.questions[0].type}`);
          } else if (currentType) {
            console.log(`Current progression type already set: ${currentType}`);
          }
          
          setSessionActive(true);
          setLoading(false);
          
          // Clear forced progression flag after questions are loaded
          if (forceProgression) {
            localStorage.removeItem('mathRushForceProgression');
          }
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
      // Clear sessionStorage on navigation away
      const cacheKey = `mathRush_${mode}_${questionType || 'default'}_${forceProgression}`;
      sessionStorage.removeItem(cacheKey);
    };
  }, []);

  // Start timer when questions are loaded
  useEffect(() => {
    if (!loading && questions.length > 0 && !gameStarted) {
      startTimer();
      setGameStarted(true);
      setSessionActive(true);
      sessionStorage.setItem('moduleInProgress', 'true');
    }
  }, [loading, questions, gameStarted]);

  // Effect to handle game over when timer reaches zero
  useEffect(() => {
    if (timeRemaining === 0 && gameStarted && !gameOver) {
      // Only end the game if we're not on the final question
      if (currentQuestionIndex < MATH_RUSH_RULES.questionCount - 1) {
        handleGameOver();
      } else {
        // Just show the timer has expired, but don't end the game yet
        setTimerExpired(true);
      }
    }
  }, [timeRemaining, gameStarted, currentQuestionIndex]);

  // Effect to focus the input when the question changes
  useEffect(() => {
    if (gameStarted && !gameOver && inputRef.current && questions.length > 0) {
      // Focus with a slight delay to ensure UI has updated
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [gameStarted, gameOver, currentQuestionIndex, questions.length]);

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

  // Handle answer submission with instant feedback
  const handleSubmitAnswer = () => {
    if (!questions[currentQuestionIndex] || gameOver) return;

    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = getCorrectAnswer(currentQuestion);
    const isAnswerCorrect = answer.trim() === correctAnswer;

    // Show instant feedback
    setIsCorrect(isAnswerCorrect);
    setFeedbackText(isAnswerCorrect ? 'Correct!' : 'Incorrect!');
    setFeedbackVisible(true);

    // Create the new result with timestamp
    const newResult = {
      correct: isAnswerCorrect,
      userAnswer: answer,
      correctAnswer,
      timestamp: Date.now()
    };

    // Save result locally
    const nextResults = [...answerResults, newResult];
    setAnswerResults(nextResults);

    // Clear input
    setAnswer('');

    // Move to next question or end game immediately
    const isLastQuestion = currentQuestionIndex >= MATH_RUSH_RULES.questionCount - 1;

    if (isLastQuestion) {
      // We've finished the last question, now end the game
      console.log("Final question completed! Ending game.");
      setTimeout(() => {
        setFeedbackVisible(false);
        handleGameOver(nextResults);
      }, 1000); // Brief delay to show feedback
    } else if (timeRemaining <= 0 && !isLastQuestion) {
      // Time ran out and we're not on the last question
      console.log("Time expired before reaching final question. Ending game.");
      setTimeout(() => {
        setFeedbackVisible(false);
        handleGameOver(nextResults);
      }, 1000);
    } else {
      // Move to next question immediately after brief feedback
      setTimeout(() => {
        setFeedbackVisible(false);
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);

        // Focus input for next question
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 500); // Shorter delay for instant feel
    }
  };

  // Handle game over with local scoring
  const handleGameOver = async (
    finalResults: AnswerResult[] = answerResults
  ) => {
    // Stop the timer
    stopTimer();
    setGameOver(true);

    // Calculate total duration in seconds
    const endTime = Date.now();
    const durationSec = Math.round((endTime - startTimeRef.current) / 1000);

    // Calculate stats locally
    const totalAnswered = finalResults.length;
    const correctCount = finalResults.filter(r => r.correct).length;

    // Calculate tokens locally using shared utility
    const setting = durationSec <= MATH_RUSH_RULES.timeSettings.SHORT.sec
      ? MATH_RUSH_RULES.timeSettings.SHORT
      : MATH_RUSH_RULES.timeSettings.LONG;

    const baseTokens = Math.floor(correctCount / 5) * setting.tokensPer5;
    const perfectBonus = (correctCount === totalAnswered && totalAnswered > 0) ? setting.bonusPerfect : 0;
    const tokensEarned = baseTokens + perfectBonus;

    // Detailed logging for debugging
    console.log('Final answer results:', JSON.stringify(finalResults));
    console.log(`Total questions attempted: ${totalAnswered}`);
    console.log(`Total correct answers: ${correctCount}`);
    console.log(`Tokens calculated locally: ${tokensEarned} (base: ${baseTokens}, bonus: ${perfectBonus})`);

    // Log correct and incorrect question arrays
    const correctQuestions = finalResults
      .map((result, index) => result.correct ? `Question ${index + 1}: ${questions[index]?.question || 'Question not available'}` : null)
      .filter(Boolean);
    
    const incorrectQuestions = finalResults
      .map((result, index) => !result.correct ? `Question ${index + 1}: ${questions[index]?.question || 'Question not available'} (Answer: ${result.userAnswer}, Correct: ${result.correctAnswer})` : null)
      .filter(Boolean);

    console.log('CORRECT QUESTIONS:', correctQuestions);
    console.log('INCORRECT QUESTIONS:', incorrectQuestions);

    try {
      console.log('Submitting results:', { correct: correctCount, total: totalAnswered, tokensEarned });

      // Submit results to server with local calculations (trust but verify)
      const response = await apiRequest('POST', '/api/rush/complete', {
        correct: correctCount,
        total: totalAnswered,
        durationSec,
        mode,
        currentType: currentType || (questions.length > 0 ? questions[0].type : null),
        tokensCalculated: tokensEarned // Include our local calculation
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      console.log('Server response:', data);

      // Use server-verified tokens if provided, otherwise use local calculation
      const finalTokens = data.tokens !== undefined ? data.tokens : tokensEarned;

      // Store results for the completion page
      localStorage.setItem('mathRushResults', JSON.stringify({
        correct: correctCount,
        total: totalAnswered,
        durationSec,
        mode,
        tokens: finalTokens,
        timeOption
      }));

      // Clear cache on completion
      const cacheKey = `mathRush_${mode}_${questionType || 'default'}_${forceProgression}`;
      sessionStorage.removeItem(cacheKey);

      // Navigate to completion page after a small delay
      setTimeout(() => {
        sessionStorage.setItem('moduleInProgress', 'false');
        endSession(); // End session prevention
        navigate('/rush/complete');
      }, 500);
    } catch (error) {
      console.error('Error submitting results:', error);

      // Log correct and incorrect question arrays even in error case
      const correctQuestions = finalResults
        .map((result, index) => result.correct ? `Question ${index + 1}: ${questions[index]?.question || 'Question not available'}` : null)
        .filter(Boolean);
      
      const incorrectQuestions = finalResults
        .map((result, index) => !result.correct ? `Question ${index + 1}: ${questions[index]?.question || 'Question not available'} (Answer: ${result.userAnswer}, Correct: ${result.correctAnswer})` : null)
        .filter(Boolean);

      console.log('CORRECT QUESTIONS (Error fallback):', correctQuestions);
      console.log('INCORRECT QUESTIONS (Error fallback):', incorrectQuestions);

      // Even if API fails, still save results and navigate to completion
      localStorage.setItem('mathRushResults', JSON.stringify({
        correct: correctCount,
        total: totalAnswered,
        durationSec,
        mode,
        currentType,
        tokens: tokensEarned, // Use local calculation as fallback
        timeOption
      }));

      // Clear cache on error
      const cacheKey = `mathRush_${mode}_${questionType || 'default'}_${forceProgression}`;
      sessionStorage.removeItem(cacheKey);

      setTimeout(() => {
        sessionStorage.setItem('moduleInProgress', 'false');
        endSession(); // End session prevention
        navigate('/rush/complete');
      }, 500);

      toast({
        title: 'Note',
        description: 'Your results were saved but tokens may not be awarded.',
        variant: 'default'
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

                  {/* Instant feedback message */}
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

                  {/* Timer expired message for final question */}
                  <AnimatePresence>
                    {timerExpired && currentQuestionIndex === MATH_RUSH_RULES.questionCount - 1 && !gameOver && !feedbackVisible && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center mt-6 p-3 rounded-md bg-amber-100 text-amber-800"
                      >
                        <Clock className="h-5 w-5 mr-2" />
                        Time's up! But you can still finish this final question to complete your session.
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
