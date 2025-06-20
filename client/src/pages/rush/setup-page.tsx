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
  Loader2
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

  // Fetch question types based on selected operation
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
  
  // Check if assessment is needed when assessment data loads
  useEffect(() => {
    if (assessmentData && !assessmentLoading) {
      const testTaken = assessmentData.testTaken;
      if (!testTaken) {
        // Redirect to assessment page
        navigate(`/math-rush-assessment?operator=${operator}`);
        return;
      }
    }
  }, [assessmentData, assessmentLoading, operator, navigate]);

  // Show loading while checking assessment status
  if (assessmentLoading || !assessmentData) {
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

  // Reset type selection when operation changes
  useEffect(() => {
    setQuestionType('');
  }, [mode]);
  
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
    
    // Navigate to the play page
    navigate('/rush/play');
  };
  
  // Check if we can proceed (type must be selected if types are available)
  const canProceed = !typesLoading && 
    (!(typeData?.types?.length) || questionType !== '');
  
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
          <Card className="w-full">
            <CardHeader className="bg-orange-500 text-white">
              <CardTitle className="text-xl flex items-center">
                <Timer className="h-6 w-6 mr-2" />
                Math Rush Setup
              </CardTitle>
              <CardDescription className="text-orange-100">
                Choose your operation and time limit for a 20-question sprint!
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
                
                {/* Type selection - only shown after operation is selected */}
                {typesLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading question types...</span>
                  </div>
                ) : typeData?.types?.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-medium mb-3">2. Select Type</h3>
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
                  </div>
                ) : null}
                
                <div>
                  <h3 className="text-lg font-medium mb-3">{typeData?.types?.length > 0 ? "3" : "2"}. Select Time</h3>
                  <RadioGroup
                    value={timeOption}
                    onValueChange={(value) => setTimeOption(value as 'SHORT' | 'LONG')}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="SHORT" id="time-short" />
                      <div>
                        <Label htmlFor="time-short" className="flex items-center cursor-pointer">
                          <Timer className="h-5 w-5 mr-2" />
                          <span>Short ({MATH_RUSH_RULES.timeSettings.SHORT.sec} seconds)</span>
                        </Label>
                        <p className="text-sm text-muted-foreground ml-7">
                          {MATH_RUSH_RULES.timeSettings.SHORT.tokensPer5} tokens per 5 correct answers
                          <br />
                          {MATH_RUSH_RULES.timeSettings.SHORT.bonusPerfect} bonus tokens for perfect score
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="LONG" id="time-long" />
                      <div>
                        <Label htmlFor="time-long" className="flex items-center cursor-pointer">
                          <Timer className="h-5 w-5 mr-2" />
                          <span>Long ({MATH_RUSH_RULES.timeSettings.LONG.sec} seconds)</span>
                        </Label>
                        <p className="text-sm text-muted-foreground ml-7">
                          {MATH_RUSH_RULES.timeSettings.LONG.tokensPer5} tokens per 5 correct answers
                          <br />
                          {MATH_RUSH_RULES.timeSettings.LONG.bonusPerfect} bonus tokens for perfect score
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between bg-gray-50">
              <div>
                <p className="text-sm text-muted-foreground">
                  You will have {timeSeconds} seconds to answer {MATH_RUSH_RULES.questionCount} questions
                </p>
              </div>
              <Button 
                onClick={handleStart} 
                size="lg" 
                className="bg-orange-500 hover:bg-orange-600"
                disabled={!canProceed}
              >
                {typesLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Start Rush
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}