
import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, Star, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { useToast } from '@/hooks/use-toast';
import { useModuleSession } from '@/hooks/use-module-session';
import { DECIMAL_DEFENDER_RULES } from '@shared/decimalDefenderRules';
import confetti from 'canvas-confetti';

interface DecimalQuestion {
  id: number;
  type: "multiple-choice" | "written" | "multi-select";
  question: string;
  answer: string | string[];
  options?: string[];
  instructions?: string;
  skill: string;
  category: string;
}

export default function DecimalDefenderPlayPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [questions, setQuestions] = useState<DecimalQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [writtenAnswer, setWrittenAnswer] = useState<string>('');
  
  const [userAnswers, setUserAnswers] = useState<(string | string[])[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [skill, setSkill] = useState<string>('');
  const [sessionActive, setSessionActive] = useState(false);

  // Audio refs for sound effects
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const incorrectSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Module session management
  const {
    isModuleActive,
    startModule,
    endModule,
    nextQuestion,
    currentQuestion,
    questionsCompleted,
    canEndModule
  } = useModuleSession({
    maxQuestions: questions.length,
    onModuleComplete: () => {
      console.log('Decimals module completed');
    },
    onAttemptExit: () => setShowExitDialog(true)
  });

  // Initialize audio elements
  useEffect(() => {
    // Create success sound (high-pitched beep)
    const correctAudio = new Audio();
    correctAudio.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhEAAAFWq79uJbGggAAA==";
    correctSoundRef.current = correctAudio;
    
    // Create error sound (lower tone)
    const incorrectAudio = new Audio();
    incorrectAudio.src = "data:audio/wav;base64,UklGRhQFAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfAEAAC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4";
    incorrectSoundRef.current = incorrectAudio;
  }, []);

  // Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const savedSkill = localStorage.getItem('decimalDefenderSkill');
        if (!savedSkill) {
          navigate('/decimals/setup');
          return;
        }
        
        setSkill(savedSkill);
        const response = await fetch(`/api/decimals/questions?skill=${savedSkill}`, {
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
        
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions.slice(0, DECIMAL_DEFENDER_RULES.questionsPerSession));
          setSessionActive(true); // Activate session prevention
        } else {
          throw new Error('Invalid response format');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching decimal questions:', error);
        setError('Failed to load questions. Please try again.');
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [navigate]);

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return;
    setSelectedAnswer(answer);
  };

  const handleMultiSelectToggle = (option: string) => {
    if (showFeedback) return;
    setSelectedAnswers(prev => 
      prev.includes(option) 
        ? prev.filter(a => a !== option)
        : [...prev, option]
    );
  };

  

  const resetAnswerStates = () => {
    setSelectedAnswer(null);
    setSelectedAnswers([]);
    setWrittenAnswer('');
  };

  const handleSubmitAnswer = () => {
    if (showFeedback) return;

    const currentQuestion = questions[currentIndex];
    let userAnswer: string | string[];
    let correct = false;

    switch (currentQuestion.type) {
      case 'multiple-choice':
        if (!selectedAnswer) return;
        userAnswer = selectedAnswer;
        correct = selectedAnswer === currentQuestion.answer;
        break;
      
      case 'written':
        if (!writtenAnswer.trim()) return;
        userAnswer = writtenAnswer.trim();
        correct = writtenAnswer.trim().toLowerCase() === (currentQuestion.answer as string).toLowerCase();
        break;
      
      
      
      case 'multi-select':
        if (selectedAnswers.length === 0) return;
        userAnswer = selectedAnswers;
        const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
        correct = selectedAnswers.length === correctAnswers.length && 
                 selectedAnswers.every(ans => correctAnswers.includes(ans));
        break;
      
      default:
        return;
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    // Play sound effect
    if (correct) {
      correctSoundRef.current?.play();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } else {
      incorrectSoundRef.current?.play();
    }

    // Store the user's answer
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = userAnswer;
    setUserAnswers(newAnswers);

    // Auto-advance after 2 seconds
    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      // Session complete - calculate score and navigate to complete page
      const correctCount = userAnswers.reduce((count, answer, index) => {
        const question = questions[index];
        if (question.type === 'multi-select') {
          const correctAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];
          const userAnswerArray = Array.isArray(answer) ? answer : [answer];
          return count + (userAnswerArray.length === correctAnswers.length && 
                         userAnswerArray.every(ans => correctAnswers.includes(ans)) ? 1 : 0);
        }
        return count + (answer === question.answer ? 1 : 0);
      }, 0) + (isCorrect ? 1 : 0);

      const sessionResult = {
        correct: correctCount,
        total: questions.length,
        skill,
        answers: [...userAnswers, getCurrentAnswer()]
      };

      // Store result and navigate to complete page
      localStorage.setItem('decimalDefenderResult', JSON.stringify(sessionResult));
      localStorage.removeItem('decimalDefenderSkill');
      endSession(); // End session prevention
      navigate('/decimals/complete');
    } else {
      // Move to next question
      setCurrentIndex(prev => prev + 1);
      resetAnswerStates();
      setShowFeedback(false);
    }
  };

  const getCurrentAnswer = () => {
    const currentQuestion = questions[currentIndex];
    switch (currentQuestion.type) {
      case 'multiple-choice':
        return selectedAnswer || '';
      case 'written':
        return writtenAnswer;
      case 'multi-select':
        return selectedAnswers;
      default:
        return '';
    }
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    localStorage.removeItem('decimalDefenderSkill');
    endSession(); // End session prevention
    navigate('/modules');
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading decimal questions...</p>
          </div>
        </main>
        <Navigation active="home" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Questions</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/decimals/setup')}>
              Back to Setup
            </Button>
          </div>
        </main>
        <Navigation active="home" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p>No questions available. Please try again.</p>
            <Button onClick={() => navigate('/decimals/setup')} className="mt-4">
              Back to Setup
            </Button>
          </div>
        </main>
        <Navigation active="home" />
      </div>
    );
  }

  const isAnswerReady = () => {
    const currentQuestion = questions[currentIndex];
    switch (currentQuestion.type) {
      case 'multiple-choice':
        return !!selectedAnswer;
      case 'written':
        return writtenAnswer.trim().length > 0;
      case 'multi-select':
        return selectedAnswers.length > 0;
      default:
        return false;
    }
  };

  const renderQuestionContent = (question: DecimalQuestion) => {
    switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="grid grid-cols-1 gap-3">
            {question.options?.map((option, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswerSelect(option)}
                disabled={showFeedback}
                className={`p-4 text-left border-2 rounded-lg transition-all ${
                  selectedAnswer === option
                    ? showFeedback
                      ? isCorrect
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-primary bg-primary/10'
                    : showFeedback && option === question.answer
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
              </motion.button>
            ))}
          </div>
        );

      case 'written':
        return (
          <div className="space-y-4">
            <input
              type="text"
              value={writtenAnswer}
              onChange={(e) => setWrittenAnswer(e.target.value)}
              disabled={showFeedback}
              placeholder="Type your answer here..."
              className="w-full p-4 border-2 border-border rounded-lg text-center text-lg font-medium focus:border-primary focus:outline-none disabled:bg-gray-50"
            />
            {showFeedback && (
              <div className={`p-3 rounded-lg ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="font-medium">
                  {isCorrect 
                    ? 'Correct!' 
                    : `Incorrect.`}
                </p>
              </div>
            )}
          </div>
        );

      

      case 'multi-select':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select all that apply:</p>
            <div className="grid grid-cols-1 gap-3">
              {question.options?.map((option, index) => (
                <motion.label
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedAnswers.includes(option)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  } ${showFeedback ? 'pointer-events-none' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAnswers.includes(option)}
                    onChange={() => handleMultiSelectToggle(option)}
                    disabled={showFeedback}
                    className="w-4 h-4"
                  />
                  <span>{option}</span>
                  {showFeedback && Array.isArray(question.answer) && question.answer.includes(option) && (
                    <span className="ml-auto text-green-600">✓</span>
                  )}
                </motion.label>
              ))}
            </div>
            {showFeedback && (
              <div className={`p-3 rounded-lg ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="font-medium">
                  {isCorrect ? 'Excellent execution!' : 'Not quite right.'}
                </p>
              </div>
            )}
          </div>
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-cyan-500" />
              <h1 className="text-2xl font-bold">Decimal Defender</h1>
            </div>
           
            <Button variant="outline" size="sm" onClick={handleExit}>
              Exit
            </Button>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-sm text-muted-foreground capitalize">
                {skill.replace('_', ' & ')}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">
                {currentQuestion.question}
              </CardTitle>
              {currentQuestion.instructions && (
                <p className="text-sm text-muted-foreground mt-1">
                  {currentQuestion.instructions}
                </p>
              )}
            </CardHeader>
            
            <CardContent>
              {renderQuestionContent(currentQuestion)}
            </CardContent>
          </Card>


          {/* Feedback */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                <Card className={`border-2 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      {isCorrect ? (
                        <Star className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      <span className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {isCorrect ? 'Direct Decimal Hit!' : 'Decimal Misfire — Recalibrate!'}
                      </span>
                    </div>
                    {!isCorrect && (
                <p className="text-sm text-muted-foreground">
                  The correct answer is:<br />
                  {Array.isArray(currentQuestion.answer)
                    ? currentQuestion.answer.map((ans, i) => (
                        <span key={i} className="font-mono text-black">
                          “{ans}”{i < currentQuestion.answer.length - 1
                            ? i === currentQuestion.answer.length - 2
                              ? ' and '
                              : ', '
                            : ''}
                        </span>
                      ))
                    : <span className="font-mono text-black">“{currentQuestion.answer}”</span>}
                </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <div className="flex justify-center">
            {!showFeedback && (
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={!isAnswerReady()}
                size="lg" 
                className="min-w-40"
              >
                Submit Answer
              </Button>
            )}
          </div>
        </motion.div>
      </main>

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Decimal Defender?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be lost if you exit now. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Playing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Navigation active="home" />
    </div>
  );
}
