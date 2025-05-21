import { useState } from 'react';
import { useLocation } from 'wouter';
import { MATH_RUSH_RULES } from '@shared/mathRushRules';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { 
  ArrowRight, 
  Timer,
  Calculator,
  Star,
  Minus,
  X,
  Divide
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

export default function MathRushSetupPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // State for selected options
  const [mode, setMode] = useState<typeof MATH_RUSH_RULES.modes[number]>('addition');
  const [timeOption, setTimeOption] = useState<'SHORT' | 'LONG'>('SHORT');
  
  // Get time in seconds from the selected time option
  const timeSeconds = MATH_RUSH_RULES.timeSettings[timeOption].sec;
  
  // Handle start button click
  const handleStart = () => {
    // Save settings to localStorage
    localStorage.setItem('mathRushMode', mode);
    localStorage.setItem('mathRushTimeOption', timeOption);
    localStorage.setItem('mathRushTimeSeconds', timeSeconds.toString());
    
    // Navigate to the play page
    navigate('/rush/play');
  };
  
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
                  <h3 className="text-lg font-medium mb-3">Select Operation</h3>
                  <RadioGroup
                    value={mode}
                    onValueChange={(value) => setMode(value as typeof MATH_RUSH_RULES.modes[number])}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    {MATH_RUSH_RULES.modes.map((opMode) => (
                      <div key={opMode} className="flex items-center space-x-2">
                        <RadioGroupItem value={opMode} id={`mode-${opMode}`} />
                        <Label htmlFor={`mode-${opMode}`} className="flex items-center cursor-pointer">
                          {getModeIcon(opMode)}
                          <span className="capitalize">{opMode}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Select Time</h3>
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
              <Button onClick={handleStart} size="lg" className="bg-orange-500 hover:bg-orange-600">
                Start Rush
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}