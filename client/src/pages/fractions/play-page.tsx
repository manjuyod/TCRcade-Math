import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, Calculator, Star, Sparkles, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
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
import { MixedNumberInput } from '@/components/MixedNumberInput';
import { StackedFraction } from '@/components/StackedFraction';
import { FRACTIONS_PUZZLE_RULES } from '@shared/fractionsPuzzleRules';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface FPQuestion {
  kind: "define" | "simplify" | "equivalent" | "addSub" | "mulDiv" | "mixedImproper";
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
  const [wholeInput, setWholeInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [gcdStep, setGcdStep] = useState(1); // For gcdSimplify questions
  const [gcdAnswer, setGcdAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  
  // Audio refs for sound effects
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const incorrectSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio elements
  useEffect(() => {
    // Create success sound (high-pitched beep)
    const correctAudio = new Audio();
    correctAudio.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhEAAAFWq79uJbGggAAA==";
    correctSoundRef.current = correctAudio;
    
    // Create error sound (lower tone)
    const incorrectAudio = new Audio();
    incorrectAudio.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhEAAAF0q39uFZGAcAAA==";
    incorrectSoundRef.current = incorrectAudio;
  }, []);
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
  
  // Fetch all questions once at the start
  const { data: questionsData, isLoading } = useQuery({
    queryKey: ['/api/fractions/questions', skill],
    queryFn: async () => {
      const response = await fetch(`/api/fractions/questions?skill=${skill}`);
      return response.json();
    },
    staleTime: Infinity, // Don't refetch once loaded
    refetchOnWindowFocus: false
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
    
    // Helper function to check if two fractions are equivalent
    const areFractionsEquivalent = (ans1: string, ans2: string): boolean => {
      const parseToImproper = (frac: string): { num: number, den: number } | null => {
        const trimmed = frac.trim();
        if (trimmed.includes(' ')) {
          // Mixed number like "2 1/3"
          const parts = trimmed.split(' ');
          if (parts.length === 2) {
            const whole = parseInt(parts[0]);
            const fracParts = parts[1].split('/');
            if (fracParts.length === 2) {
              const num = parseInt(fracParts[0]);
              const den = parseInt(fracParts[1]);
              return { num: whole * den + num, den };
            }
          }
        } else if (trimmed.includes('/')) {
          // Regular fraction like "7/3"
          const fracParts = trimmed.split('/');
          if (fracParts.length === 2) {
            return { num: parseInt(fracParts[0]), den: parseInt(fracParts[1]) };
          }
        }
        return null;
      };
      
      const frac1 = parseToImproper(ans1);
      const frac2 = parseToImproper(ans2);
      
      if (!frac1 || !frac2) return ans1.toLowerCase() === ans2.toLowerCase();
      
      // Check if fractions are equivalent by cross multiplication
      return frac1.num * frac2.den === frac2.num * frac1.den;
    };
    
    switch (question.kind) {
      case 'define':
      case 'mixedImproper':
        return answer.trim().toLowerCase() === question.answer.toLowerCase();
      
      case 'simplify':
        // For levels 1-2 with GCD step: we expect "gcd,simplifiedFraction" format
        // For levels 3+: just the simplified fraction
        if (question.gcd !== undefined && question.level <= 1) {
          const parts = answer.split(',');
          return parts.length === 2 && 
                 parts[0].trim() === question.gcd.toString() && 
                 parts[1].trim() === question.answer;
        } else {
          return answer.trim().toLowerCase() === question.answer.toLowerCase();
        }
      
      case 'addSub':
      case 'mulDiv':
        // Allow both improper fractions and mixed numbers for arithmetic
        return areFractionsEquivalent(answer, question.answer);
      
      case 'equivalent':
        if (question.level === 0) {
          // Level 1: Single input where ? appears
          const answerArray = Array.isArray(question.answerSet) ? question.answerSet : Array.from(question.answerSet);
          return answerArray.includes(answer.trim());
        } else if (question.level === 1) {
          // Level 2: Check if two-part fraction is equivalent
          const parts = answer.split('/');
          if (parts.length !== 2) return false;
          const inputNum = parseInt(parts[0]);
          const inputDen = parseInt(parts[1]);
          if (isNaN(inputNum) || isNaN(inputDen) || inputDen === 0) return false;
          
          const baseFrac = question.frac;
          // Check if fractions are equivalent by cross multiplication
          return inputNum * baseFrac.den === baseFrac.num * inputDen;
        } else {
          // Multi-select for levels 3+
          const selected = Array.from(selectedOptions);
          const correct = Array.isArray(question.answerSet) ? question.answerSet : Array.from(question.answerSet);
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
    if (currentQuestion.kind === 'simplify' && currentQuestion.gcd !== undefined && currentQuestion.level <= 1) {
      finalAnswer = `${gcdAnswer},${finalAnswer || currentAnswer}`;
    } else if (currentQuestion.kind === 'equivalent' && currentQuestion.level === 2) {
      finalAnswer = `${numeratorInput}/${denominatorInput}`;
    } else if (currentQuestion.kind === 'equivalent' && currentQuestion.level > 2) {
      finalAnswer = Array.from(selectedOptions).join(',');
    }
    
    const correct = isAnswerCorrect(currentQuestion, finalAnswer);
    setIsCorrect(correct);
    setShowFeedback(true);
    
    // Trigger sound effects and animations
    if (correct) {
      // Play success sound
      if (correctSoundRef.current) {
        correctSoundRef.current.currentTime = 0;
        correctSoundRef.current.play().catch(() => {
          // Handle autoplay restrictions gracefully
        });
      }
      
      // Trigger confetti animation
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1']
      });
      
      // Show celebration animation
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1000);
    } else {
      // Play error sound
      if (incorrectSoundRef.current) {
        incorrectSoundRef.current.currentTime = 0;
        incorrectSoundRef.current.play().catch(() => {
          // Handle autoplay restrictions gracefully
        });
      }
    }
    
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
      setWholeInput('');
      setSelectedOptions(new Set());
      setGcdStep(1);
      setGcdAnswer('');
      setShowFeedback(false);
      
      // Auto-focus the first input after a brief delay
      setTimeout(() => {
        const firstInput = document.querySelector('input') as HTMLInputElement;
        if (firstInput) firstInput.focus();
      }, 100);
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
              <FractionInput
                numerator={numeratorInput}
                denominator={denominatorInput}
                onNumeratorChange={setNumeratorInput}
                onDenominatorChange={setDenominatorInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showFeedback && numeratorInput.trim() && denominatorInput.trim()) {
                    handleSubmit();
                  }
                }}
                disabled={showFeedback}
                autoFocus={!showFeedback}
              />
            </div>
          </div>
        );
      
      case 'simplify':
        // Levels 1-2: Step-by-step with GCD finding (old gcdSimplify behavior)
        // Levels 3+: Direct simplification only
        if (currentQuestion.gcd !== undefined && currentQuestion.level <= 1) {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Simplify this fraction:</h3>
                <div className="flex justify-center mb-4">
                  <StackedFraction 
                    numerator={currentQuestion.frac.num} 
                    denominator={currentQuestion.frac.den}
                    className="text-2xl"
                  />
                </div>
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
                      onChange={(e) => {
                        // Only allow numbers
                        const numericValue = e.target.value.replace(/[^0-9]/g, '');
                        setGcdAnswer(numericValue);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && gcdAnswer.trim() && !showFeedback) {
                          setGcdStep(2);
                          // Auto-focus the first fraction input after step transition
                          setTimeout(() => {
                            const firstInput = document.querySelector('input[placeholder="num"]') as HTMLInputElement;
                            if (firstInput) firstInput.focus();
                          }, 100);
                        }
                      }}
                      placeholder="GCD"
                      className="w-24 text-center"
                      disabled={showFeedback}
                      autoFocus={!showFeedback}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => {
                        setGcdStep(2);
                        // Auto-focus the first fraction input after step transition
                        setTimeout(() => {
                          const firstInput = document.querySelector('input[placeholder="num"]') as HTMLInputElement;
                          if (firstInput) firstInput.focus();
                        }, 100);
                      }}
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
                    <FractionInput
                      numerator={numeratorInput}
                      denominator={denominatorInput}
                      onNumeratorChange={setNumeratorInput}
                      onDenominatorChange={setDenominatorInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !showFeedback && numeratorInput.trim() && denominatorInput.trim() && gcdAnswer.trim()) {
                          handleSubmit();
                        }
                      }}
                      disabled={showFeedback}
                      autoFocus={!showFeedback}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        } else {
          // Direct simplification (levels 3+)
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Simplify this fraction to lowest terms:</h3>
                <div className="flex justify-center mb-4">
                  <StackedFraction 
                    numerator={currentQuestion.frac.num} 
                    denominator={currentQuestion.frac.den}
                    className="text-2xl"
                  />
                </div>
              </div>
              <div className="flex justify-center">
                <FractionInput
                  numerator={numeratorInput}
                  denominator={denominatorInput}
                  onNumeratorChange={setNumeratorInput}
                  onDenominatorChange={setDenominatorInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !showFeedback && numeratorInput.trim() && denominatorInput.trim()) {
                      handleSubmit();
                    }
                  }}
                  disabled={showFeedback}
                  autoFocus={!showFeedback}
                />
              </div>
            </div>
          );
        }
      

      
      case 'equivalent':
        if (currentQuestion.level === 0) {
          // Single input for level 1 only
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Complete the equation:</h3>
                <div className="flex justify-center items-center space-x-6">
                  {/* Parse and display with proper alignment */}
                  {currentQuestion.options[0].split(' = ').map((part: string, index: number) => (
                    <React.Fragment key={index}>
                      {index > 0 && <span className="text-3xl font-bold text-gray-700">=</span>}
                      <div className="flex items-center">
                        {part.includes('?') ? (
                          // Handle any part containing ?
                          part.includes('/') ? (
                            // Fraction with ? - replace with integrated input box
                            <div className="flex flex-col items-center justify-center min-w-[80px]">
                              {part.split('/')[0] === '?' ? (
                                <>
                                  <Input
                                    value={currentAnswer}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9]/g, '');
                                      setCurrentAnswer(value);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !showFeedback && currentAnswer.trim()) {
                                        handleSubmit();
                                      }
                                    }}
                                    className="w-16 h-10 text-center text-2xl font-bold border-2 border-primary bg-blue-50 rounded-md"
                                    disabled={showFeedback}
                                    autoFocus={!showFeedback}
                                    placeholder="?"
                                  />
                                  <div className="h-0.5 bg-gray-800 w-16 my-2"></div>
                                  <span className="text-2xl font-bold h-10 flex items-center">{part.split('/')[1]}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-2xl font-bold h-10 flex items-center">{part.split('/')[0]}</span>
                                  <div className="h-0.5 bg-gray-800 w-16 my-2"></div>
                                  <Input
                                    value={currentAnswer}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9]/g, '');
                                      setCurrentAnswer(value);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !showFeedback && currentAnswer.trim()) {
                                        handleSubmit();
                                      }
                                    }}
                                    className="w-16 h-10 text-center text-2xl font-bold border-2 border-primary bg-blue-50 rounded-md"
                                    disabled={showFeedback}
                                    autoFocus={!showFeedback}
                                    placeholder="?"
                                  />
                                </>
                              )}
                            </div>
                          ) : (
                            // Standalone ? - just an input box
                            <Input
                              value={currentAnswer}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                setCurrentAnswer(value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !showFeedback && currentAnswer.trim()) {
                                  handleSubmit();
                                }
                              }}
                              className="w-20 h-10 text-center text-2xl font-bold border-2 border-primary bg-blue-50 rounded-md"
                              disabled={showFeedback}
                              autoFocus={!showFeedback}
                              placeholder="?"
                            />
                          )
                        ) : part.includes('/') ? (
                          <div className="flex flex-col items-center justify-center min-w-[80px]">
                            <span className="text-2xl font-bold h-10 flex items-center">{part.split('/')[0]}</span>
                            <div className="h-0.5 bg-gray-800 w-16 my-2"></div>
                            <span className="text-2xl font-bold h-10 flex items-center">{part.split('/')[1]}</span>
                          </div>
                        ) : (
                          <span className="text-2xl font-bold">{part}</span>
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        } else if (currentQuestion.level === 1) {
          // Level 2: Two input fields for complete fraction
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Find an equivalent fraction:</h3>
                <div className="flex justify-center items-center space-x-6 mb-6">
                  {/* Left fraction - same size as input boxes */}
                  <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <span className="text-2xl font-bold h-10 flex items-center">{currentQuestion.frac.num}</span>
                    <div className="h-0.5 bg-gray-800 w-16 my-2"></div>
                    <span className="text-2xl font-bold h-10 flex items-center">{currentQuestion.frac.den}</span>
                  </div>
                  <span className="text-3xl font-bold text-gray-700">=</span>
                  {/* Right fraction - input boxes */}
                  <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <Input
                      value={numeratorInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setNumeratorInput(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !showFeedback && numeratorInput.trim() && denominatorInput.trim()) {
                          handleSubmit();
                        }
                      }}
                      className="w-16 h-10 text-center text-2xl font-bold border-2 border-primary bg-blue-50 rounded-md"
                      disabled={showFeedback}
                      autoFocus={!showFeedback}
                      placeholder="?"
                    />
                    <div className="h-0.5 bg-gray-800 w-16 my-2"></div>
                    <Input
                      value={denominatorInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setDenominatorInput(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !showFeedback && numeratorInput.trim() && denominatorInput.trim()) {
                          handleSubmit();
                        }
                      }}
                      className="w-16 h-10 text-center text-2xl font-bold border-2 border-primary bg-blue-50 rounded-md"
                      disabled={showFeedback}
                      placeholder="?"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Enter any equivalent fraction (multiply or divide both parts by the same number)</p>
              </div>
            </div>
          );
        } else {
          // Levels 3+: Multiple choice selection
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Select all equivalent fractions:</h3>
                <div className="mb-6">
                  <StackedFraction 
                    numerator={currentQuestion.frac.num} 
                    denominator={currentQuestion.frac.den}
                    className="text-2xl"
                  />
                </div>
                <p className="text-sm text-muted-foreground mb-4">Choose all fractions that equal the one above</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {currentQuestion.options.map((option: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
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
                      disabled={showFeedback}
                    />
                    <label htmlFor={`option-${index}`} className="text-lg cursor-pointer flex-1">
                      <StackedFraction 
                        numerator={option.split('/')[0]} 
                        denominator={option.split('/')[1]}
                        className="inline-block"
                      />
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
              <div className="flex items-center justify-center space-x-4 mb-4">
                <StackedFraction 
                  numerator={currentQuestion.left.num} 
                  denominator={currentQuestion.left.den}
                  className="text-xl"
                />
                <span className="text-2xl font-bold">{currentQuestion.op}</span>
                <StackedFraction 
                  numerator={currentQuestion.right.num} 
                  denominator={currentQuestion.right.den}
                  className="text-xl"
                />
                <span className="text-2xl font-bold">=</span>
                <span className="text-2xl font-bold text-gray-400">?</span>
              </div>
              <p className="text-sm text-muted-foreground">Answer as a fraction in lowest terms</p>
            </div>
            <div className="flex justify-center">
              <FractionInput
                numerator={numeratorInput}
                denominator={denominatorInput}
                onNumeratorChange={setNumeratorInput}
                onDenominatorChange={setDenominatorInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showFeedback && numeratorInput.trim() && denominatorInput.trim()) {
                    handleSubmit();
                  }
                }}
                disabled={showFeedback}
                autoFocus={!showFeedback}
              />
            </div>
          </div>
        );
      
      case 'mulDiv':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Calculate:</h3>
              <div className="flex items-center justify-center space-x-4 mb-4">
                <StackedFraction 
                  numerator={currentQuestion.left.num} 
                  denominator={currentQuestion.left.den}
                  className="text-xl"
                />
                <span className="text-2xl font-bold">{currentQuestion.op}</span>
                <StackedFraction 
                  numerator={currentQuestion.right.num} 
                  denominator={currentQuestion.right.den}
                  className="text-xl"
                />
                <span className="text-2xl font-bold">=</span>
                <span className="text-2xl font-bold text-gray-400">?</span>
              </div>
              <p className="text-sm text-muted-foreground">Answer as a fraction in lowest terms</p>
            </div>
            <div className="flex justify-center">
              <FractionInput
                numerator={numeratorInput}
                denominator={denominatorInput}
                onNumeratorChange={setNumeratorInput}
                onDenominatorChange={setDenominatorInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showFeedback && numeratorInput.trim() && denominatorInput.trim()) {
                    handleSubmit();
                  }
                }}
                disabled={showFeedback}
                autoFocus={!showFeedback}
              />
            </div>
          </div>
        );
      
      case 'mixedImproper':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Convert:</h3>
              <div className="flex justify-center mb-4">
                {currentQuestion.given.includes('/') ? (
                  currentQuestion.given.includes(' ') ? (
                    // Mixed number like "2 3/4"
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold">{currentQuestion.given.split(' ')[0]}</span>
                      <StackedFraction 
                        numerator={currentQuestion.given.split(' ')[1].split('/')[0]} 
                        denominator={currentQuestion.given.split(' ')[1].split('/')[1]}
                        className="text-xl"
                      />
                    </div>
                  ) : (
                    // Improper fraction like "11/4"
                    <StackedFraction 
                      numerator={currentQuestion.given.split('/')[0]} 
                      denominator={currentQuestion.given.split('/')[1]}
                      className="text-2xl"
                    />
                  )
                ) : (
                  // Whole number
                  <span className="text-2xl font-bold">{currentQuestion.given}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {currentQuestion.given.includes(' ') 
                  ? 'Convert to improper fraction' 
                  : 'Convert to mixed number (format: A B/C)'}
              </p>
            </div>
            <div className="flex justify-center">
              {currentQuestion.given.includes(' ') ? (
                // Converting mixed number to improper fraction - use fraction input
                <FractionInput
                  numerator={numeratorInput}
                  denominator={denominatorInput}
                  onNumeratorChange={setNumeratorInput}
                  onDenominatorChange={setDenominatorInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !showFeedback && numeratorInput.trim() && denominatorInput.trim()) {
                      handleSubmit();
                    }
                  }}
                  disabled={showFeedback}
                  autoFocus={!showFeedback}
                />
              ) : (
                // Converting improper fraction to mixed number - use 3-box input
                <MixedNumberInput
                  whole={wholeInput}
                  numerator={numeratorInput}
                  denominator={denominatorInput}
                  onWholeChange={setWholeInput}
                  onNumeratorChange={setNumeratorInput}
                  onDenominatorChange={setDenominatorInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !showFeedback && wholeInput.trim() && numeratorInput.trim() && denominatorInput.trim()) {
                      handleSubmit();
                    }
                  }}
                  disabled={showFeedback}
                  autoFocus={!showFeedback}
                />
              )}
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
            onClick={() => {
              if (currentQuestionIndex > 0) {
                setShowExitDialog(true);
              } else {
                navigate('/fractions/setup');
              }
            }}
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
                {getSkillDisplayName(skill)}
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
                  className={`mt-6 p-4 rounded-lg relative overflow-hidden ${
                    isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {/* Celebration overlay for correct answers */}
                  {isCorrect && showCelebration && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 pointer-events-none"
                    >
                      {/* Sparkle animations */}
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ 
                            opacity: 0, 
                            scale: 0,
                            x: Math.random() * 100 - 50,
                            y: Math.random() * 100 - 50
                          }}
                          animate={{ 
                            opacity: [0, 1, 0], 
                            scale: [0, 1.5, 0],
                            rotate: 360
                          }}
                          transition={{ 
                            duration: 1,
                            delay: i * 0.1,
                            ease: "easeOut"
                          }}
                          className="absolute"
                          style={{
                            left: `${20 + (i * 10)}%`,
                            top: `${20 + (i % 3) * 20}%`
                          }}
                        >
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        </motion.div>
                      ))}
                      
                      {/* Sparkles effect */}
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={`sparkle-${i}`}
                          initial={{ 
                            opacity: 0, 
                            scale: 0,
                            x: Math.random() * 120 - 60,
                            y: Math.random() * 120 - 60
                          }}
                          animate={{ 
                            opacity: [0, 1, 0], 
                            scale: [0, 1, 0],
                            x: Math.random() * 200 - 100,
                            y: Math.random() * 200 - 100
                          }}
                          transition={{ 
                            duration: 0.8,
                            delay: i * 0.05,
                            ease: "easeOut"
                          }}
                          className="absolute"
                          style={{
                            left: '50%',
                            top: '50%'
                          }}
                        >
                          <Sparkles className="h-2 w-2 text-blue-400 fill-current" />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                  
                  <div className="flex items-center space-x-2 relative z-10">
                    {isCorrect ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 20,
                          delay: 0.1
                        }}
                      >
                        <Check className="h-5 w-5 text-green-600" />
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 200, 
                          damping: 15
                        }}
                      >
                        <X className="h-5 w-5 text-red-600" />
                      </motion.div>
                    )}
                    <motion.span 
                      className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {isCorrect ? 'Excellent work!' : 'Not quite right'}
                    </motion.span>
                  </div>
                  {!isCorrect && (
                    <motion.div 
                      className="mt-2 text-sm text-red-700"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {currentQuestion.kind === 'equivalent' ? (
                        <div className="space-y-2">
                          <div className="font-medium">
                            {currentQuestion.frac.num}/{currentQuestion.frac.den} is equivalent to:
                          </div>
                          <div className="space-y-1">
                            <div>• {currentQuestion.frac.num * 2}/{currentQuestion.frac.den * 2} (multiply by 2)</div>
                            <div>• {currentQuestion.frac.num * 3}/{currentQuestion.frac.den * 3} (multiply by 3)</div>
                          </div>
                          <div className="text-xs italic mt-1">
                            Tip: Multiply or divide both parts by the same number!
                          </div>
                        </div>
                      ) : (
                        <div>The correct answer is: {currentQuestion.answer}</div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              <div className="mt-8 flex justify-center">
                {!showFeedback ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      // Check for fraction inputs first
                      (currentQuestion.kind === 'define' && (!numeratorInput || !denominatorInput)) ||
                      (currentQuestion.kind === 'simplify' && (!numeratorInput || !denominatorInput)) ||
                      (currentQuestion.kind === 'addSub' && (!numeratorInput || !denominatorInput)) ||
                      (currentQuestion.kind === 'mulDiv' && (!numeratorInput || !denominatorInput)) ||
                      // Check for text inputs
                      (currentQuestion.kind === 'equivalent' && currentQuestion.level <= 1 && !currentAnswer) ||
                      (currentQuestion.kind === 'mixedImproper' && !currentAnswer) ||
                      // Check for multi-select
                      (currentQuestion.kind === 'equivalent' && currentQuestion.level > 1 && selectedOptions.size === 0) ||
                      // Check for GCD step (levels 1-2 of simplify)
                      (currentQuestion.kind === 'simplify' && currentQuestion.gcd !== undefined && currentQuestion.level <= 1 && gcdStep === 1) ||
                      (currentQuestion.kind === 'simplify' && currentQuestion.gcd !== undefined && currentQuestion.level <= 1 && gcdStep === 2 && (!gcdAnswer || !numeratorInput || !denominatorInput))
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

        {/* Exit confirmation dialog */}
        <AnimatePresence>
          {showExitDialog && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowExitDialog(false)}
              />
              
              {/* Dialog */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="w-full max-w-md">
                  <Card className="border-2 border-orange-200 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-full bg-orange-100 p-2">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Exit Skill?
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          You're making great progress!
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-700">
                      If you leave now, you'll lose your progress in this skill and need to start over.
                    </p>
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowExitDialog(false)}
                        className="flex-1"
                      >
                        Keep Playing
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setShowExitDialog(false);
                          navigate('/fractions/setup');
                        }}
                        className="flex-1"
                      >
                        Exit Anyway
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}