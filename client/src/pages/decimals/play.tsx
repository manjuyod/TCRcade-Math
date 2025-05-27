
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, Home } from 'lucide-react';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { playSound } from '@/lib/sounds';

interface DecimalQuestion {
  id: number;
  question: string;
  answer: string;
  options: string[];
  skill: string;
  category: string;
}

export default function DecimalDefenderPlayPage() {
  const [, navigate] = useLocation();
  const [questions, setQuestions] = useState<DecimalQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Fetch decimal defender questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        console.log('🔢 Fetching Decimal Defender questions...');
        const response = await fetch('/api/modules/decimal-defender/questions', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'same-origin'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch questions: ${response.status}`);
        }

        const data = await response.json();
        console.log('🔢 Received questions:', data);

        if (Array.isArray(data) && data.length > 0) {
          // Take first 5 questions for the session
          const sessionQuestions = data.slice(0, 5);
          setQuestions(sessionQuestions);
          console.log('🔢 Set up session with', sessionQuestions.length, 'questions');
        } else {
          throw new Error('No questions received or invalid format');
        }
      } catch (err) {
        console.error('🔢 Error fetching questions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback || selectedAnswer) return;
    
    setSelectedAnswer(answer);
    const current = questions[currentIndex];
    const correct = answer === current.answer;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Play sound effect
    if (correct) {
      playSound('correct');
    } else {
      playSound('incorrect');
    }

    // Store the answer
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = answer;
    setUserAnswers(newAnswers);

    // Auto-advance after 1.5 seconds
    setTimeout(() => {
      handleNext();
    }, 1500);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      // Move to next question
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      // Session complete
      setSessionComplete(true);
    }
  };

  const calculateScore = () => {
    return userAnswers.filter((answer, index) => 
      answer === questions[index]?.answer
    ).length;
  };

  const getScoreMessage = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 90) return "Excellent work! You're a decimal defender champion! 🏆";
    if (percentage >= 80) return "Great job! You've mastered decimal skills! 🌟";
    if (percentage >= 70) return "Good work! Keep practicing to improve further! 👍";
    if (percentage >= 60) return "Nice effort! Review the concepts and try again! 📚";
    return "Keep practicing! Decimals take time to master! 💪";
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <Navigation active="home" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">Loading Decimal Defender questions...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <Navigation active="home" />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Error Loading Questions</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p>{error}</p>
              <div className="space-x-2">
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/modules')}>
                  Back to Modules
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (sessionComplete) {
    const score = calculateScore();
    const total = questions.length;

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <Navigation active="home" />
        <main className="flex-1 container max-w-4xl py-6 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <Card className="w-full max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl">🔢 Decimal Defender Complete!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-4">
                    {score}/{total}
                  </div>
                  <div className="text-xl text-gray-600 mb-4">
                    {Math.round((score / total) * 100)}% Correct
                  </div>
                  <p className="text-lg text-gray-700">
                    {getScoreMessage(score, total)}
                  </p>
                </div>

                {/* Question Review */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Question Review:</h3>
                  {questions.map((question, index) => {
                    const userAnswer = userAnswers[index];
                    const isCorrect = userAnswer === question.answer;
                    
                    return (
                      <div key={index} className={`p-3 rounded-lg border ${
                        isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Q{index + 1}: {question.skill}</span>
                          {isCorrect ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        {!isCorrect && (
                          <div className="text-sm text-gray-600 mt-1">
                            Your answer: {userAnswer} | Correct: {question.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-4 justify-center">
                  <Button onClick={() => window.location.reload()} className="bg-primary">
                    Play Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/modules')}>
                    <Home className="h-4 w-4 mr-2" />
                    Back to Modules
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <Navigation active="home" />
      
      <main className="flex-1 container max-w-4xl py-6 px-4">
        {/* Header with progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => navigate('/modules')}>
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Modules
            </Button>
            <div className="text-sm text-gray-600">
              Question {currentIndex + 1} of {questions.length}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-center">
                  🔢 Decimal Defender
                </CardTitle>
                <div className="text-center text-sm text-gray-600">
                  Skill: {currentQuestion?.skill || 'Decimals'}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question */}
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-6">
                    {currentQuestion?.question}
                  </h3>
                </div>

                {/* Answer options */}
                <div className="grid grid-cols-2 gap-4">
                  {currentQuestion?.options.map((option, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={showFeedback}
                      className={`
                        p-4 rounded-lg border-2 text-lg font-semibold transition-all
                        ${selectedAnswer === option 
                          ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')
                          : 'border-gray-200 hover:border-primary bg-white hover:bg-gray-50'
                        }
                        ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>

                {/* Feedback */}
                <AnimatePresence>
                  {showFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-4 rounded-lg ${
                        isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {isCorrect ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <X className="h-5 w-5" />
                        )}
                        <span className="font-semibold">
                          {isCorrect ? 'Correct!' : 'Incorrect'}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div className="text-center mt-2">
                          The correct answer is: <strong>{currentQuestion?.answer}</strong>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
