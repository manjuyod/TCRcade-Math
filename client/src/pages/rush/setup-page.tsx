import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { MATH_RUSH_RULES } from '@shared/mathRushRules';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowRight, 
  Timer,
  Calculator,
  Star,
  Minus,
  X,
  Divide,
  Loader2,
  Flame,
  Sparkles,
  Crown
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MathRushSetupPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Get the operator from localStorage (set by modules page)
  const operator = localStorage.getItem('mathRushOperator') || 'addition';

  // State for selected options
  const [mode] = useState<typeof MATH_RUSH_RULES.modes[number]>(operator as any);
  const [questionType, setQuestionType] = useState<string>('');
  const [timeOption, setTimeOption] = useState<'SHORT' | 'LONG'>('SHORT');
  const [checkingAssessment, setCheckingAssessment] = useState(true);
  const [needsAssessment, setNeedsAssessment] = useState(false);

  // Get time in seconds from the selected time option
  const timeSeconds = MATH_RUSH_RULES.timeSettings[timeOption].sec;

  // Check assessment status for this operator
  const { data: assessmentData, isLoading: assessmentLoading } = useQuery({
    queryKey: ['/api/rush/assessment-status', operator],
    queryFn: async () => {
      const response = await fetch(`/api/rush/assessment-status?operator=${operator}`);
      if (!response.ok) {
        throw new Error('Failed to check assessment status');
      }
      return response.json();
    },
    enabled: !!operator,
  });

  // Get current progression type and available types
  const { data: progressionData, isLoading: progressionLoading } = useQuery({
    queryKey: ['/api/rush/progression', operator],
    queryFn: async () => {
      const response = await fetch(`/api/rush/progression?operator=${operator}`);
      if (!response.ok) {
        throw new Error('Failed to fetch progression data');
      }
      return response.json();
    },
    enabled: !!operator && !needsAssessment,
  });

  // Get available question types for this mode
  const { data: typeData, isLoading: typesLoading } = useQuery({
    queryKey: ['/api/rush/types', mode],
    queryFn: async () => {
      const response = await fetch(`/api/rush/types?operation=${mode}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch question types');
      }
      const data = await response.json();
      console.log('Fetched question types:', data);
      return data;
    },
    enabled: !!mode,
  });

  // Reset type selection when operation changes
  useEffect(() => {
    setQuestionType('');
  }, [mode]);

  // Check if assessment is needed when assessment data loads
  useEffect(() => {
    if (assessmentData && !assessmentLoading) {
      const testTaken = assessmentData.testTaken;
      const masteryLevel = assessmentData.masteryLevel;

      console.log('Assessment data:', { testTaken, masteryLevel, operator });

      if (!testTaken) {
        // Redirect to assessment page
        console.log('No test taken - redirecting to assessment');
        navigate(`/math-rush-assessment?operator=${operator}`);
        return;
      }

      // If test is taken but mastery not achieved, force progression
      else if (testTaken && !masteryLevel) {
        // Get the next required progression step and auto-navigate to play
        console.log('Test taken but mastery not achieved - forcing progression');

        // Set up automatic progression - go directly to play with forced progression
        localStorage.setItem('mathRushMode', operator);
        localStorage.setItem('mathRushTimeOption', 'SHORT'); // Default to short
        localStorage.setItem('mathRushTimeSeconds', '60');
        localStorage.setItem('mathRushForceProgression', 'true'); // Flag for forced progression
        localStorage.removeItem('mathRushQuestionType'); // Let server determine next step

        navigate('/rush/play');
        return;
      }

      // If test is taken and mastery achieved, user stays on setup page to choose
      else if (testTaken && masteryLevel) {
        console.log('Mastery achieved - staying on setup page for type selection');
        setCheckingAssessment(false);
        return;
      }

      // Fallback - should not reach here
      console.log('Unexpected assessment state - allowing setup page access');
      setCheckingAssessment(false);
    }
  }, [assessmentData, assessmentLoading, operator, navigate]);

  // Check if user has achieved mastery
  const hasMastery = assessmentData?.testTaken && assessmentData?.masteryLevel;

  // Show loading while checking assessment status
  if (assessmentLoading || !assessmentData || checkingAssessment) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <Navigation active="home" />

        <main className="flex-1 container max-w-4xl py-6 px-4 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-center text-muted-foreground">
                  Checking assessment status...
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Handle start button click
  const handleStart = () => {
    // Save settings to localStorage
    localStorage.setItem('mathRushMode', mode);
    localStorage.setItem('mathRushTimeOption', timeOption);
    localStorage.setItem('mathRushTimeSeconds', timeSeconds.toString());

    // Save question type if selected
    if (questionType) {
      localStorage.setItem('mathRushQuestionType', questionType);
    } else {
      localStorage.removeItem('mathRushQuestionType');
    }

    // Remove forced progression flag for mastery users - they have free choice
    if (hasMastery) {
      localStorage.removeItem('mathRushForceProgression');
    }

    // Navigate to the play page
    navigate('/rush/play');
  };

  // Check if we can proceed (type must be selected if types are available, especially for mastery users)
  const canProceed = !typesLoading && 
    (!(typeData?.types?.length) || questionType !== '') &&
    (!hasMastery || questionType !== ''); // Mastery users MUST select a type

  // Get icon for each mode
  const getModeIcon = (mode: typeof MATH_RUSH_RULES.modes[number]) => {
    switch (mode) {
      case 'addition':
        return <Calculator className="h-5 w-5 mr-2" />;
      case 'subtraction':
        return <Minus className="h-5 w-5 mr-2" />;
      case 'multiplication':
        return <X className="h-5 w-5 mr-2" />;
      case 'division':
        return <Divide className="h-5 w-5 mr-2" />;
      case 'mixed':
        return <Star className="h-5 w-5 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <Navigation active="home" />

      <main className="flex-1 container max-w-4xl py-6 px-4">
        <div className="mb-6 flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => navigate('/modules')}
          >
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Modules
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Mastery Celebration Banner */}
          {hasMastery && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6"
            >
              <Card className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center space-x-3">
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Crown className="h-8 w-8" />
                    </motion.div>
                    <div className="text-center">
                      <h2 className="text-2xl font-bold">Mastery Achieved!</h2>
                      <p className="text-yellow-100">Free Play Mode Unlocked</p>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className="h-8 w-8" />
                    </motion.div>
                  </div>
                  <motion.div
                    className="flex justify-center space-x-2 mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.div
                      animate={{ y: [-5, 5, -5] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    >
                      <Flame className="h-6 w-6 text-yellow-200" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [-5, 5, -5] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    >
                      <Flame className="h-6 w-6 text-orange-200" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [-5, 5, -5] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    >
                      <Flame className="h-6 w-6 text-red-200" />
                    </motion.div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Card className="w-full">
            <CardHeader className={hasMastery ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" : "bg-orange-500 text-white"}>
              <CardTitle className="text-xl flex items-center">
                <Timer className="h-6 w-6 mr-2" />
                {hasMastery ? "Free Play Setup" : "Math Rush Setup"}
              </CardTitle>
              <CardDescription className={hasMastery ? "text-purple-100" : "text-orange-100"}>
                {hasMastery 
                  ? "Choose any type and time limit - you've earned the freedom to practice however you want!"
                  : "Choose your operation and time limit for a 20-question sprint!"
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Operation</h3>
                  <div className="flex items-center space-x-3 p-4 bg-secondary rounded-lg">
                    {getModeIcon(mode)}
                    <span className="text-lg font-semibold capitalize">{operator}</span>
                  </div>
                </div>

                {/* Type selection - enhanced for mastery users */}
                {typesLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading question types...</span>
                  </div>
                ) : typeData?.types?.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      2. Select Type
                      {hasMastery && (
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="ml-2"
                        >
                          <Star className="h-5 w-5 text-yellow-500" />
                        </motion.div>
                      )}
                    </h3>
                    
                    {hasMastery ? (
                      // Enhanced grid selection for mastery users
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-lg border-l-4 border-purple-500">
                          <Sparkles className="h-4 w-4 inline mr-2 text-purple-600" />
                          You've mastered {operator}! Choose any type you want to practice.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {typeData.types.map((type: string) => (
                            <motion.div
                              key={type}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <label
                                className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  questionType === type
                                    ? 'border-purple-500 bg-purple-50 shadow-md'
                                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="questionType"
                                  value={type}
                                  checked={questionType === type}
                                  onChange={(e) => setQuestionType(e.target.value)}
                                  className="sr-only"
                                />
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </span>
                                  {questionType === type && (
                                    <Crown className="h-4 w-4 text-purple-600" />
                                  )}
                                </div>
                              </label>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Standard dropdown for non-mastery users
                      <Select
                        value={questionType}
                        onValueChange={setQuestionType}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select question type" />
                        </SelectTrigger>
                        <SelectContent>
                          {typeData.types.map((type: string) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : null}

                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    {typeData?.types?.length > 0 ? "3" : "2"}. Select Time
                    {hasMastery && (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="ml-2"
                      >
                        <Timer className="h-5 w-5 text-purple-600" />
                      </motion.div>
                    )}
                  </h3>
                  
                  {hasMastery && (
                    <p className="text-sm text-muted-foreground bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border-l-4 border-green-500 mb-4">
                      <Flame className="h-4 w-4 inline mr-2 text-green-600" />
                      Take your time or go for speed - you've earned the right to choose!
                    </p>
                  )}

                  <RadioGroup
                    value={timeOption}
                    onValueChange={(value) => setTimeOption(value as 'SHORT' | 'LONG')}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    <motion.div
                      whileHover={{ scale: hasMastery ? 1.02 : 1 }}
                      className={`${hasMastery ? 'transition-transform' : ''}`}
                    >
                      <div className={`flex items-start space-x-2 p-4 border-2 ${
                        timeOption === 'SHORT' 
                          ? hasMastery 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <RadioGroupItem value="SHORT" id="time-short" />
                        <div>
                          <Label htmlFor="time-short" className="flex items-center cursor-pointer">
                            <Timer className="h-5 w-5 mr-2" />
                            <span className="font-semibold">Short ({MATH_RUSH_RULES.timeSettings.SHORT.sec} seconds)</span>
                          </Label>
                          <p className="text-sm text-muted-foreground ml-7">
                            {MATH_RUSH_RULES.timeSettings.SHORT.tokensPer5} tokens per 5 correct answers
                            <br />
                            {MATH_RUSH_RULES.timeSettings.SHORT.bonusPerfect} bonus tokens for perfect score
                          </p>
                          {hasMastery && timeOption === 'SHORT' && (
                            <p className="text-sm text-purple-600 ml-7 mt-1 font-medium">
                              ⚡ Perfect for quick practice sessions!
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: hasMastery ? 1.02 : 1 }}
                      className={`${hasMastery ? 'transition-transform' : ''}`}
                    >
                      <div className={`flex items-start space-x-2 p-4 border-2 ${
                        timeOption === 'LONG' 
                          ? hasMastery 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <RadioGroupItem value="LONG" id="time-long" />
                        <div>
                          <Label htmlFor="time-long" className="flex items-center cursor-pointer">
                            <Timer className="h-5 w-5 mr-2" />
                            <span className="font-semibold">Long ({MATH_RUSH_RULES.timeSettings.LONG.sec} seconds)</span>
                          </Label>
                          <p className="text-sm text-muted-foreground ml-7">
                            {MATH_RUSH_RULES.timeSettings.LONG.tokensPer5} tokens per 5 correct answers
                            <br />
                            {MATH_RUSH_RULES.timeSettings.LONG.bonusPerfect} bonus tokens for perfect score
                          </p>
                          {hasMastery && timeOption === 'LONG' && (
                            <p className="text-sm text-purple-600 ml-7 mt-1 font-medium">
                              🎯 Great for thorough practice!
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>

            <CardFooter className={hasMastery ? "flex justify-between bg-gradient-to-r from-purple-50 to-indigo-50" : "flex justify-between bg-gray-50"}>
              <div>
                <p className="text-sm text-muted-foreground">
                  You will have {timeSeconds} seconds to answer {MATH_RUSH_RULES.questionCount} questions
                </p>
                {hasMastery && questionType && (
                  <p className="text-sm text-purple-600 font-medium mt-1">
                    <Sparkles className="h-3 w-3 inline mr-1" />
                    Playing: {questionType.charAt(0).toUpperCase() + questionType.slice(1)}
                  </p>
                )}
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={handleStart} 
                  size="lg" 
                  className={hasMastery 
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
                    : "bg-orange-500 hover:bg-orange-600"
                  }
                  disabled={!canProceed}
                >
                  {typesLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {hasMastery ? (
                        <>
                          <Crown className="mr-2 h-4 w-4" />
                          Start Free Play
                        </>
                      ) : (
                        <>
                          Start Rush
                        </>
                      )}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}