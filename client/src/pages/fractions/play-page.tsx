import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { FractionBar } from '@/components/FractionBar';
import { ProgressBar } from '@/components/progress-bar';
import { FractionInput } from '@/components/FractionInput';
import { StackedFraction } from '@/components/StackedFraction';
import { FRACTIONS_PUZZLE_RULES } from '@shared/fractionsPuzzleRules';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface FPQuestion {
  kind: "define" | "gcdSimplify" | "simplify" | "equivalent" | "addSub" | "mulDiv" | "mixedImproper";
  [key: string]: any;
}

export default function FractionsPlayPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [numeratorInput, setNumeratorInput] = useState('');
  const [denominatorInput, setDenominatorInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [gcdStep, setGcdStep] = useState(1); // For gcdSimplify questions
  const [gcdAnswer, setGcdAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Get selected skill from localStorage
  const skill = localStorage.getItem('fractionsSkill') || 'define';
  
  // Get skill display name
  const getSkillDisplayName = (skill: string) => {
    const skillNames = {
      define: 'Define Fractions',
      gcdSimplify: 'GCD & Simplify',
      simplify: 'Simplify Fractions',
      equivalent: 'Equivalent Fractions',
      addSub: 'Add & Subtract',
      mulDiv: 'Multiply & Divide',
      mixedImproper: 'Mixed & Improper'
    };
    return skillNames[skill as keyof typeof skillNames] || 'Fractions Puzzle';
  };
  
  // Fetch questions
  const { data: questionsData, isLoading } = useQuery({
    queryKey: ['/api/fractions/questions', skill],
    queryFn: async () => {
      const response = await fetch(`/api/fractions/questions?skill=${skill}`);
      return response.json();
    }
  });

  const questions: FPQuestion[] = questionsData?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  
  // Calculate progress
  const currentLevel = Math.min(4, Math.floor(currentQuestionIndex / 4)) + 1;
  const progress = ((currentQuestionIndex + 1) / FRACTIONS_PUZZLE_RULES.questionCount) * 100;
  
  // Complete session mutation
  const completeMutation = useMutation({
    mutationFn: async (data: { correct: number; total: number; skill: string }) => {
      const response = await fetch('/api/fractions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('fractionsResult', JSON.stringify({
        correct: userAnswers.filter((_, i) => isAnswerCorrect(questions[i], userAnswers[i])).length,
        total: questions.length,
        tokens: data.tokens,
        skill
      }));
      navigate('/fractions/complete');
    },
    onError: (error) => {
      console.error('Failed to complete session:', error);
      toast({
        title: "Error",
        description: "Failed to save your progress. Please try again.",
        variant: "destructive"
      });
    }
  });

  const isAnswerCorrect = (question: FPQuestion, answer: string): boolean => {
    if (!question || !answer) return false;
    
    switch (question.kind) {
      case 'define':
      case 'simplify':
      case 'addSub':
      case 'mulDiv':
      case 'mixedImproper':
        return answer.trim().toLowerCase() === question.answer.toLowerCase();
      
      case 'gcdSimplify':
        // For GCD simplify, answer should be "gcd,simplified" format
        const parts = answer.split(',');
        return parts.length === 2 && 
               parts[0].trim() === question.gcd.toString() && 
               parts[1].trim() === question.answer;
      
      case 'equivalent':
        if (question.level <= 1) {
          // Single answer for levels 1-2
          return question.answerSet.has(answer.trim());
        } else {
          // Multi-select for levels 3+
          const selected = Array.from(selectedOptions);
          const correct = Array.from(question.answerSet);
          return selected.length === correct.length && 
                 selected.every(opt => correct.includes(opt));
        }
      
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    let finalAnswer = currentAnswer;
    
    // Handle fraction inputs
    if (numeratorInput && denominatorInput) {
      finalAnswer = `${numeratorInput}/${denominatorInput}`;
    }
    
    // Handle special cases
    if (currentQuestion.kind === 'gcdSimplify') {
      finalAnswer = `${gcdAnswer},${finalAnswer || currentAnswer}`;
    } else if (currentQuestion.kind === 'equivalent' && currentQuestion.level > 1) {
      finalAnswer = Array.from(selectedOptions).join(',');
    }
    
    const correct = isAnswerCorrect(currentQuestion, finalAnswer);
    setIsCorrect(correct);
    setShowFeedback(true);
    
    // Store answer
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = finalAnswer;
    setUserAnswers(newAnswers);
    
    // Auto-advance to next question after 1.5 seconds
    setTimeout(() => {
      handleNext();
    }, 1500);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer('');
      setNumeratorInput('');
      setDenominatorInput('');
      setSelectedOptions(new Set());
      setGcdStep(1);
      setGcdAnswer('');
      setShowFeedback(false);
    } else {
      // Complete session
      const correctCount = userAnswers.filter((_, i) => 
        isAnswerCorrect(questions[i], userAnswers[i])
      ).length + (isCorrect ? 1 : 0);
      
      completeMutation.mutate({
        correct: correctCount,
        total: questions.length,
        skill
      });
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    
    switch (currentQuestion.kind) {
      case 'define':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">What fraction does this bar represent?</h3>
              <FractionBar
                numerator={currentQuestion.bar.num}
                denominator={currentQuestion.bar.den}
                colorIndex={currentQuestion.colorIndex}
              />
            </div>
            <div className="flex justify-center">
              <Input
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showFeedback && currentAnswer.trim()) {
                    handleSubmit();
                  }
                }}
                placeholder="Enter fraction (e.g., 3/4)"
                className="w-32 text-center"
                disabled={showFeedback}
              />
            </div>
          </div>
        );
      
      case 'gcdSimplify':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">
                Simplify {currentQuestion.frac.num}/{currentQuestion.frac.den}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Step 1: Find the GCD, then Step 2: Write the simplified form
              </p>
            </div>
            
            {gcdStep === 1 ? (
              <div className="space-y-4">
                <p className="text-center">What is the GCD of {currentQuestion.frac.num} and {currentQuestion.frac.den}?</p>
                <div className="flex justify-center">
                  <Input
                    value={gcdAnswer}
                    onChange={(e) => setGcdAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && gcdAnswer.trim() && !showFeedback) {
                        setGcdStep(2);
                      }
                    }}
                    placeholder="GCD"
                    className="w-24 text-center"
                    disabled={showFeedback}
                  />
                </div>
                <div className="flex justify-center">
                  <Button 
                    onClick={() => setGcdStep(2)}
                    disabled={!gcdAnswer || showFeedback}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center">Now simplify the fraction:</p>
                <div className="flex justify-center">
                  <Input
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !showFeedback && currentAnswer.trim() && gcdAnswer.trim()) {
                        handleSubmit();
                      }
                    }}
                    placeholder="Simplified fraction"
                    className="w-32 text-center"
                    disabled={showFeedback}
                  />
                </div>
              </div>
            )}
          </div>
        );
      
      case 'simplify':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">
                Simplify this fraction to lowest terms:
              </h3>
              <div className="text-2xl font-bold mb-4">
                {currentQuestion.frac.num}/{currentQuestion.frac.den}
              </div>
            </div>
            <div className="flex justify-center">
              <Input
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showFeedback && currentAnswer.trim()) {
                    handleSubmit();
                  }
                }}
                placeholder="Simplified fraction"
                className="w-32 text-center"
                disabled={showFeedback}
              />
            </div>
          </div>
        );
      
      case 'equivalent':
        if (currentQuestion.level <= 1) {
          // Single input for levels 1-2
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Solve for x:</h3>
                <div className="text-xl font-bold mb-4">
                  {currentQuestion.options[0]}
                </div>
              </div>
              <div className="flex justify-center">
                <Input
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !showFeedback && currentAnswer.trim()) {
                      handleSubmit();
                    }
                  }}
                  placeholder={currentQuestion.level === 0 ? "Enter number" : "Enter fraction"}
                  className="w-32 text-center"
                  disabled={showFeedback}
                />
              </div>
            </div>
          );
        } else {
          // Multi-select for levels 3+
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">
                  Which fractions are equivalent to {currentQuestion.frac.num}/{currentQuestion.frac.den}?
                </h3>
                <p className="text-sm text-muted-foreground">Select all that apply</p>
              </div>
              <div className="grid gap-3">
                {currentQuestion.options.map((option: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`option-${index}`}
                      checked={selectedOptions.has(option)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedOptions);
                        if (checked) {
                          newSet.add(option);
                        } else {
                          newSet.delete(option);
                        }
                        setSelectedOptions(newSet);
                      }}
                      disabled={showFeedback}
                    />
                    <label htmlFor={`option-${index}`} className="text-lg">
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        }
      
      case 'addSub':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Calculate:</h3>
              <div className="text-2xl font-bold mb-4">
                {currentQuestion.left.num}/{currentQuestion.left.den} {currentQuestion.op} {currentQuestion.right.num}/{currentQuestion.right.den} = ?
              </div>
              <p className="text-sm text-muted-foreground">Give your answer in lowest terms</p>
            </div>
            <div className="flex justify-center">
              <Input
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Answer"
                className="w-32 text-center"
                disabled={showFeedback}
              />
            </div>
          </div>
        );
      
      case 'mulDiv':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Calculate:</h3>
              <div className="text-2xl font-bold mb-4">
                {currentQuestion.left.num}/{currentQuestion.left.den} {currentQuestion.op} {currentQuestion.right.num}/{currentQuestion.right.den} = ?
              </div>
              <p className="text-sm text-muted-foreground">Give your answer in lowest terms</p>
            </div>
            <div className="flex justify-center">
              <Input
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Answer"
                className="w-32 text-center"
                disabled={showFeedback}
              />
            </div>
          </div>
        );
      
      case 'mixedImproper':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Convert:</h3>
              <div className="text-2xl font-bold mb-4">
                {currentQuestion.given}
              </div>
              <p className="text-sm text-muted-foreground">
                {currentQuestion.given.includes(' ') 
                  ? 'Convert to improper fraction' 
                  : 'Convert to mixed number (format: A B/C)'}
              </p>
            </div>
            <div className="flex justify-center">
              <Input
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Answer"
                className="w-40 text-center"
                disabled={showFeedback}
              />
            </div>
          </div>
        );
      
      default:
        return <div>Unknown question type</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <Navigation active="home" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading your fractions puzzle...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <Navigation active="home" />
      
      <main className="flex-1 w-full max-w-4xl mx-auto py-6 px-4">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/fractions/setup')}
          >
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Setup
          </Button>
          <div className="text-sm text-muted-foreground">
            Level {currentLevel} • Question {currentQuestionIndex + 1} of {FRACTIONS_PUZZLE_RULES.questionCount}
          </div>
        </div>

        <div className="space-y-6">
          <ProgressBar progress={progress} />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Fractions Puzzle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderQuestion()}
                </motion.div>
              </AnimatePresence>

              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-6 p-4 rounded-lg ${
                    isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {isCorrect ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                      {isCorrect ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div className="mt-2 text-sm text-red-700">
                      The correct answer is: {currentQuestion.answer}
                    </div>
                  )}
                </motion.div>
              )}

              <div className="mt-8 flex justify-center">
                {!showFeedback ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      (!currentAnswer && currentQuestion.kind !== 'equivalent') ||
                      (currentQuestion.kind === 'equivalent' && currentQuestion.level > 1 && selectedOptions.size === 0) ||
                      (currentQuestion.kind === 'gcdSimplify' && gcdStep === 1) ||
                      (currentQuestion.kind === 'gcdSimplify' && gcdStep === 2 && !gcdAnswer)
                    }
                    size="lg"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    size="lg"
                    disabled={completeMutation.isPending}
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Puzzle'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}