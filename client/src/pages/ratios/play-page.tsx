import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, BarChart4, Star, Sparkles, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { ProgressBar } from '@/components/progress-bar';
import { RATIOS_RULES } from '@shared/ratiosRules';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSessionPrevention } from '@/hooks/use-session-prevention';

interface RatiosQuestion {
  skill: "write_form" | "equivalents" | "visual_identification";
  [key: string]: any;
}

export default function RatiosPlayPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<boolean[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [ratioFirst, setRatioFirst] = useState('');
  const [ratioSecond, setRatioSecond] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  useSessionPrevention({ isActive: sessionActive });

  // Audio refs for sound effects
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const incorrectSoundRef = useRef<HTMLAudioElement | null>(null);

  // Get selected skill from localStorage
  const selectedSkill = localStorage.getItem('ratiosSkill') || 'write_form';

  // Fetch questions
  const { data: questionsData, isLoading, error } = useQuery({
    queryKey: ['/api/ratios/questions', selectedSkill],
    queryFn: async () => {
      const response = await fetch(`/api/ratios/questions?skill=${selectedSkill}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      return response.json();
    },
    enabled: !!selectedSkill
  });

  // Type guard to ensure questions data structure
  const questions = (questionsData as any)?.questions || [];

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async (answerData: any) => {
      return apiRequest('POST', '/api/ratios/submit', answerData);
    },
    onSuccess: (data) => {
      console.log('Answer submitted:', data);
    },
    onError: (error) => {
      console.error('Error submitting answer:', error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (questions.length > 0) {
      setSessionActive(true);
    }
  }, [questions]);

  useEffect(() => {
    // Initialize audio elements
    correctSoundRef.current = new Audio('/sounds/correct.mp3');
    incorrectSoundRef.current = new Audio('/sounds/incorrect.mp3');
    
    // Add global Enter key handler
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !showFeedback && !submitAnswerMutation.isPending) {
        if (currentAnswer.trim() || selectedOptions.size > 0) {
          handleSubmitAnswer();
        }
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    
    return () => {
      setSessionActive(false);
      document.removeEventListener('keypress', handleKeyPress);
    };
  }, [currentAnswer, selectedOptions, showFeedback, submitAnswerMutation.isPending]);

  const playSound = (isCorrect: boolean) => {
    try {
      const audio = isCorrect ? correctSoundRef.current : incorrectSoundRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn('Audio play failed:', e));
      }
    } catch (error) {
      console.warn('Audio not available:', error);
    }
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSubmitAnswer = async () => {
    if (!questions || currentQuestionIndex >= questions.length) return;

    const currentQuestion = questions[currentQuestionIndex];
    let answerToSubmit = '';

    // Handle different answer types
    if (currentQuestion.skill === 'visual_identification') {
      // Use separate ratio inputs for visual identification
      if (!ratioFirst.trim() || !ratioSecond.trim()) {
        toast({
          title: "Incomplete Answer",
          description: "Please fill in both parts of the ratio.",
          variant: "destructive"
        });
        return;
      }
      answerToSubmit = `${ratioFirst.trim()}:${ratioSecond.trim()}`;
    } else if (currentQuestion.skill === 'write_form') {
      answerToSubmit = currentAnswer.trim();
    } else if (currentQuestion.skill === 'equivalents' && currentQuestion.level >= 3) {
      // Multi-select for level 3+ equivalents
      answerToSubmit = Array.from(selectedOptions).join(',');
    } else {
      answerToSubmit = currentAnswer.trim();
    }

    if (!answerToSubmit) {
      toast({
        title: "Answer Required",
        description: "Please provide an answer before submitting.",
        variant: "destructive"
      });
      return;
    }

    // Store the answer
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answerToSubmit;
    setUserAnswers(newAnswers);

    // Submit to backend
    const answerData = {
      questionIndex: currentQuestionIndex,
      answer: answerToSubmit,
      skill: selectedSkill,
      question: currentQuestion
    };

    try {
      const result = await submitAnswerMutation.mutateAsync(answerData);
      const isCorrect = (result as any)?.correct;

      console.log(`Answer ${isCorrect ? 'correct' : 'incorrect'}:`, result)
      
      // Update all states together to avoid race conditions
      setLastAnswerCorrect(isCorrect);
      setShowFeedback(true);
      
      // Track correct answers for session completion
      const newCorrectAnswers = [...correctAnswers];
      newCorrectAnswers[currentQuestionIndex] = isCorrect;
      setCorrectAnswers(newCorrectAnswers);
      
      playSound(isCorrect);
      
      if (isCorrect) {
        triggerCelebration();
      }

      // Auto-advance after feedback
      setTimeout(() => {
        setShowFeedback(false);
        
        if (currentQuestionIndex < RATIOS_RULES.questionCount - 1) {
          // Move to next question
          setCurrentQuestionIndex(prev => prev + 1);
          setCurrentAnswer('');
          setRatioFirst('');
          setRatioSecond('');
          setSelectedOptions(new Set());
        } else {
          // Session complete - store results for completion page
          const totalCorrect = newCorrectAnswers.filter(Boolean).length;
          const accuracy = Math.round((totalCorrect / RATIOS_RULES.questionCount) * 100);
          
          localStorage.setItem('ratiosSessionResults', JSON.stringify({
            correct: totalCorrect,
            total: RATIOS_RULES.questionCount,
            accuracy,
            skill: selectedSkill
          }));
          
          setShowCelebration(true);
          setSessionActive(false);
          
          setTimeout(() => {
            navigate('/ratios/complete');
          }, 3000);
        }
      }, 2000);

    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const renderVisualQuestion = (question: any) => {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-4">{question.prompt}</h3>
          
          {/* Visual display area */}
          <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300 max-w-md mx-auto">
            <div 
              className="flex flex-wrap justify-center gap-3"
              style={{ maxWidth: '80%', margin: '0 auto' }}
            >
              {question.shapes?.map((shape: any, index: number) => (
                <div
                  key={index}
                  className={`w-10 h-10 flex items-center justify-center transition-all hover:scale-110 ${
                    shape.color === 'blue' ? 'bg-blue-500' : 'bg-orange-500'
                  } ${
                    shape.type === 'circle' ? 'rounded-full' : 
                    shape.type === 'triangle' ? '' : 'rounded-sm'
                  }`}
                  style={{
                    clipPath: shape.type === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined
                  }}
                  title={`${shape.color} ${shape.type}`}
                />
              ))}
            </div>

          </div>
          
          <p className="text-sm text-gray-600 mt-4">
            Answer format: a:b (e.g., "3:2")
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
          <Input
            value={ratioFirst}
            onChange={(e) => setRatioFirst(e.target.value)}
            placeholder="0"
            className="text-center text-lg w-20"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && ratioFirst.trim() && ratioSecond.trim()) {
                handleSubmitAnswer();
              }
            }}
          />
          <span className="text-2xl font-bold text-gray-600">:</span>
          <Input
            value={ratioSecond}
            onChange={(e) => setRatioSecond(e.target.value)}
            placeholder="0"
            className="text-center text-lg w-20"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && ratioFirst.trim() && ratioSecond.trim()) {
                handleSubmitAnswer();
              }
            }}
          />
        </div>
      </div>
    );
  };

  const renderWriteFormQuestion = (question: any) => {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-4">{question.prompt}</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter your answer in the requested format
          </p>
        </div>
        
        <Input
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          placeholder="Enter your answer"
          className="text-center text-lg"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && currentAnswer.trim()) {
              handleSubmitAnswer();
            }
          }}
        />
      </div>
    );
  };

  const renderEquivalentsQuestion = (question: any) => {
    if (question.level >= 3) {
      // Multi-select for level 3+
      return (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-4">{question.prompt}</h3>
            <p className="text-xl font-bold text-primary mb-4">
              {question.baseRatio}
            </p>
            <p className="text-sm text-gray-600">
              Select all equivalent ratios (at least one is correct)
            </p>
          </div>
          
          <div className="space-y-2">
            {question.options?.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`option-${index}`}
                  checked={selectedOptions.has(option)}
                  onCheckedChange={(checked) => {
                    const newSelected = new Set(selectedOptions);
                    if (checked) {
                      newSelected.add(option);
                    } else {
                      newSelected.delete(option);
                    }
                    setSelectedOptions(newSelected);
                  }}
                />
                <label 
                  htmlFor={`option-${index}`}
                  className="text-lg cursor-pointer p-2 rounded hover:bg-gray-50"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // Fill-in-the-blank for levels 1-2
      return (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-4">{question.prompt}</h3>
            <p className="text-xl font-bold text-primary mb-4">
              {question.equation}
            </p>
            <p className="text-sm text-gray-600">
              Fill in the missing value(s)
            </p>
          </div>
          
          <Input
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Enter missing value(s)"
            className="text-center text-lg"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && currentAnswer.trim()) {
                handleSubmitAnswer();
              }
            }}
          />
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BarChart4 className="h-12 w-12 animate-spin text-amber-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600">Loading questions...</p>
          </div>
        </main>
        <Navigation active="home" />
      </div>
    );
  }

  if (error || !questions.length) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center p-6">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Error Loading Questions</h2>
              <p className="text-gray-600 mb-4">
                Unable to load questions. Please try again.
              </p>
              <Button onClick={() => navigate('/ratios/setup')}>
                Back to Setup
              </Button>
            </CardContent>
          </Card>
        </main>
        <Navigation active="home" />
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / RATIOS_RULES.questionCount) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Progress header */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart4 className="h-5 w-5 text-amber-600" />
                  Question {currentQuestionIndex + 1} of {RATIOS_RULES.questionCount}
                </CardTitle>
                <span className="text-sm text-gray-500">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <ProgressBar progress={progress} height={8} />
            </CardHeader>
          </Card>

          {/* Question content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="mb-6">
                <CardContent className="p-6">
                  {currentQuestion.skill === 'visual_identification' && renderVisualQuestion(currentQuestion)}
                  {currentQuestion.skill === 'write_form' && renderWriteFormQuestion(currentQuestion)}
                  {currentQuestion.skill === 'equivalents' && renderEquivalentsQuestion(currentQuestion)}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Submit button */}
          <Card>
            <CardContent className="p-4">
              <Button
                onClick={handleSubmitAnswer}
                disabled={submitAnswerMutation.isPending || showFeedback || 
                  (currentQuestion.skill === 'visual_identification' ? (!ratioFirst || !ratioSecond) :
                   currentQuestion.skill === 'equivalents' && currentQuestion.level >= 3 ? selectedOptions.size === 0 :
                   !currentAnswer)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submitAnswerMutation.isPending ? (
                  'Submitting...'
                ) : (
                  <>
                    Submit Answer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Feedback overlay */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  className="bg-white rounded-lg p-6 text-center max-w-sm mx-4"
                >
                  <div className="mb-4">
                    {lastAnswerCorrect ? (
                      <Check className="h-16 w-16 text-green-500 mx-auto" />
                    ) : (
                      <X className="h-16 w-16 text-red-500 mx-auto" />
                    )}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${lastAnswerCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {lastAnswerCorrect ? 'Excellent work!' : 'Not quite right'}
                  </h3>
                  <p className="text-gray-600">
                    {lastAnswerCorrect ? 'Moving to the next question...' : 'Keep practicing! Moving to the next question...'}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Celebration overlay */}
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.8, y: 20 }}
                  className="bg-white rounded-lg p-8 text-center max-w-md mx-4"
                >
                  <div className="mb-4">
                    <Sparkles className="h-20 w-20 text-amber-500 mx-auto animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-amber-600 mb-4">
                    Ratios Session Complete!
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Great job working through all {RATIOS_RULES.questionCount} questions!
                  </p>
                  <p className="text-sm text-gray-500">
                    Redirecting to results...
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      <Navigation active="home" />
    </div>
  );
}