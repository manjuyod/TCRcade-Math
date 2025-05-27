
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Shield, Star, Trophy, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { useToast } from '@/hooks/use-toast';
import { DECIMAL_DEFENDER_RULES } from '@shared/decimalDefenderRules';
import confetti from 'canvas-confetti';

interface CompletionResult {
  correct: number;
  total: number;
  skill: string;
  answers: string[];
  tokens?: number;
  totalTokens?: number;
}

export default function DecimalDefenderCompletePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processCompletion = async () => {
      try {
        // Get result from localStorage
        const savedResult = localStorage.getItem('decimalDefenderResult');
        if (!savedResult) {
          navigate('/decimals/setup');
          return;
        }

        const parsedResult: CompletionResult = JSON.parse(savedResult);
        
        // Calculate tokens
        const baseTokens = parsedResult.correct * DECIMAL_DEFENDER_RULES.tokensPerCorrectAnswer;
        const bonusTokens = parsedResult.correct === parsedResult.total ? DECIMAL_DEFENDER_RULES.bonusTokensOnPerfect : 0;
        const totalTokens = baseTokens + bonusTokens;

        // Submit completion to server
        const response = await fetch('/api/decimal-defender/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            correct: parsedResult.correct,
            total: parsedResult.total,
            skill: parsedResult.skill
          })
        });

        if (response.ok) {
          const serverResult = await response.json();
          parsedResult.tokens = serverResult.tokens;
          parsedResult.totalTokens = serverResult.totalTokens;
        } else {
          // Fallback to calculated tokens if server fails
          parsedResult.tokens = totalTokens;
        }

        setResult(parsedResult);

        // Trigger confetti for good performance
        if (parsedResult.correct >= parsedResult.total * 0.8) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }

        // Clean up localStorage
        localStorage.removeItem('decimalDefenderResult');
        
      } catch (error) {
        console.error('Error processing completion:', error);
        toast({
          title: "Error",
          description: "Failed to process session results",
          variant: "destructive"
        });
        navigate('/decimals/setup');
      } finally {
        setLoading(false);
      }
    };

    processCompletion();
  }, [navigate, toast]);

  const handleTryAgain = () => {
    navigate('/decimals/setup');
  };

  const handleBackToModules = () => {
    navigate('/modules');
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Processing your results...</p>
          </div>
        </main>
        <Navigation active="home" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p>No results found.</p>
            <Button onClick={() => navigate('/decimals/setup')} className="mt-4">
              Start New Session
            </Button>
          </div>
        </main>
        <Navigation active="home" />
      </div>
    );
  }

  const accuracy = Math.round((result.correct / result.total) * 100);
  const isPerfect = result.correct === result.total;
  const isGood = accuracy >= 80;

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
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              {isPerfect ? (
                <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              ) : isGood ? (
                <Star className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              ) : (
                <Shield className="h-16 w-16 text-cyan-500 mx-auto mb-4" />
              )}
            </motion.div>
            
            <h1 className="text-3xl font-bold mb-2">
              {isPerfect ? "Perfect Score!" : isGood ? "Great Job!" : "Session Complete!"}
            </h1>
            <p className="text-muted-foreground">
              You completed the {result.skill.replace('_', ' & ')} challenge
            </p>
          </div>

          {/* Results Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-500" />
                Your Results
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Score */}
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {result.correct}/{result.total}
                </div>
                <div className="text-lg text-muted-foreground mb-4">
                  {accuracy}% Accuracy
                </div>
                <Progress value={accuracy} className="h-3" />
              </div>

              {/* Tokens Earned */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Tokens Earned</span>
                  <span className="text-2xl font-bold text-primary">
                    +{result.tokens || 0}
                  </span>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Correct answers ({result.correct} × {DECIMAL_DEFENDER_RULES.tokensPerCorrectAnswer})</span>
                    <span>+{result.correct * DECIMAL_DEFENDER_RULES.tokensPerCorrectAnswer}</span>
                  </div>
                  {isPerfect && (
                    <div className="flex justify-between">
                      <span>Perfect score bonus</span>
                      <span>+{DECIMAL_DEFENDER_RULES.bonusTokensOnPerfect}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Message */}
              <div className="text-center">
                {isPerfect ? (
                  <p className="text-green-600 font-medium">
                    Outstanding! You mastered every decimal question!
                  </p>
                ) : isGood ? (
                  <p className="text-blue-600 font-medium">
                    Excellent work! You're really getting the hang of decimals!
                  </p>
                ) : accuracy >= 60 ? (
                  <p className="text-yellow-600 font-medium">
                    Good effort! Keep practicing to improve your decimal skills.
                  </p>
                ) : (
                  <p className="text-orange-600 font-medium">
                    Keep practicing! Decimals take time to master.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleTryAgain}
              className="flex-1"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Another Skill
            </Button>
            
            <Button
              size="lg"
              onClick={handleBackToModules}
              className="flex-1"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Modules
            </Button>
          </div>

          {/* Next Steps */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3">Continue Learning</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Try other decimal skills to build comprehensive understanding</p>
                <p>• Practice regularly to improve speed and accuracy</p>
                <p>• Challenge yourself with harder skills as you improve</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Navigation active="home" />
    </div>
  );
}
