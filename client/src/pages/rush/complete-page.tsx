import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { MATH_RUSH_RULES } from '@shared/mathRushRules';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { 
  ArrowRight, 
  Trophy,
  Timer,
  Star,
  CheckCircle2,
  XCircle,
  Home,
  Repeat
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

// Result data structure
type MathRushResults = {
  correct: number;
  total: number;
  durationSec: number;
  mode: string;
  tokens: number;
  timeOption: 'SHORT' | 'LONG';
};

export default function MathRushCompletePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // State for results
  const [results, setResults] = useState<MathRushResults | null>(null);
  const [statsUpdated, setStatsUpdated] = useState(false);
  
  // Load results from localStorage when component mounts
  useEffect(() => {
    const storedResults = localStorage.getItem('mathRushResults');
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults);
        setResults(parsedResults);
      } catch (error) {
        console.error('Error parsing results:', error);
        // If there's an error, redirect back to setup
        navigate('/rush/setup');
      }
    } else {
      // If no results found, redirect back to setup
      navigate('/rush/setup');
    }
  }, []);
  
  // Update user stats when results are loaded
  useEffect(() => {
    // We don't need to update stats here anymore since they're already updated
    // in the /api/rush/complete endpoint on the server
    setStatsUpdated(true);
  }, [results, user]);
  
  // Handle "Try Again" button click
  const handleTryAgain = () => {
    navigate('/rush/setup');
  };
  
  // Handle "Back to Modules" button click
  const handleBackToModules = () => {
    navigate('/modules');
  };
  
  // If results aren't loaded yet, show loading state
  if (!results) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <Navigation active="home" />
        
        <main className="flex-1 container max-w-4xl py-6 px-4 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
        </main>
      </div>
    );
  }
  
  // Calculate percentage correct
  const percentCorrect = results.total > 0 
    ? Math.round((results.correct / results.total) * 100) 
    : 0;
  
  // Get time settings
  const timeSettings = MATH_RUSH_RULES.timeSettings[results.timeOption];
  
  // Calculate tokens breakdown
  const regularTokens = Math.floor(results.correct / 5) * timeSettings.tokensPer5;
  const perfectBonus = results.correct === MATH_RUSH_RULES.questionCount && results.total === MATH_RUSH_RULES.questionCount
    ? timeSettings.bonusPerfect
    : 0;
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <Navigation active="home" />
      
      <main className="flex-1 container max-w-4xl py-6 px-4">
        <div className="mb-6 flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={handleBackToModules}
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
                <Trophy className="h-6 w-6 mr-2" />
                Math Rush Complete!
              </CardTitle>
              <CardDescription className="text-orange-100">
                You've completed a {results.mode} rush in {results.durationSec} seconds
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="text-5xl font-bold text-orange-500 mb-2">
                    {results.tokens}
                  </div>
                  <div className="text-xl">
                    Tokens Earned
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                      Performance
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Accuracy</span>
                          <span className="font-medium">{percentCorrect}%</span>
                        </div>
                        <Progress value={percentCorrect} className="h-2" />
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Correct answers</span>
                        <span className="font-medium text-green-600">{results.correct} / {results.total}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Time taken</span>
                        <span className="font-medium">{results.durationSec} seconds</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Questions per minute</span>
                        <span className="font-medium">
                          {results.durationSec > 0 
                            ? Math.round((results.total / results.durationSec) * 60) 
                            : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <Star className="h-5 w-5 mr-2 text-amber-500" />
                      Token Breakdown
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Base tokens ({timeSettings.tokensPer5} per 5 correct)</span>
                        <span className="font-medium">{regularTokens}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Perfect score bonus</span>
                        <span className={`font-medium ${perfectBonus > 0 ? 'text-amber-600' : ''}`}>
                          {perfectBonus > 0 ? `+${perfectBonus}` : '0'}
                        </span>
                      </div>
                      
                      <div className="h-px bg-gray-200 my-2"></div>
                      
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total tokens</span>
                        <span className="text-orange-500">{results.tokens}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between bg-gray-50 py-6">
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleBackToModules}
                className="flex items-center"
              >
                <Home className="mr-2 h-4 w-4" />
                Back to Modules
              </Button>
              
              <Button 
                onClick={handleTryAgain} 
                size="lg" 
                className="bg-orange-500 hover:bg-orange-600 flex items-center"
              >
                <Repeat className="mr-2 h-4 w-4" />
                Try Another Rush
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}