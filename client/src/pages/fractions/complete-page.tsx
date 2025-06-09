import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Star, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import { FRACTIONS_PUZZLE_RULES } from "@shared/fractionsPuzzleRules";
import confetti from "canvas-confetti";

interface CompletionResult {
  correct: number;
  total: number;
  tokens: number;
  skill: string;
}

export default function FractionsCompletePage() {
  const [, navigate] = useLocation();
  const [result, setResult] = useState<CompletionResult | null>(null);

  useEffect(() => {
    // Get result from localStorage
    const savedResult = localStorage.getItem("fractionsResult");
    if (savedResult) {
      const parsedResult = JSON.parse(savedResult);
      setResult(parsedResult);

      sessionStorage.removeItem("moduleInProgress");

      // Trigger confetti for good performance
      if (parsedResult.correct >= parsedResult.total * 0.8) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      // Clean up localStorage
      localStorage.removeItem("fractionsResult");
    } else {
      // Redirect if no result found
      navigate("/fractions/setup");
    }
  }, [navigate]);

  if (!result) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <Navigation active="home" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading results...</p>
          </div>
        </main>
      </div>
    );
  }

  const percentage = Math.round((result.correct / result.total) * 100);
  const isPerfect = result.correct === result.total;
  const isGood = percentage >= 80;
  const isOkay = percentage >= 60;

  const getPerformanceMessage = () => {
    if (isPerfect) return "Perfect! Outstanding work! 🎉";
    if (isGood) return "Excellent job! You're mastering fractions! 🌟";
    if (isOkay) return "Good work! Keep practicing to improve! 👍";
    return "Nice try! Practice makes perfect! 💪";
  };

  const getPerformanceColor = () => {
    if (isPerfect) return "text-yellow-600";
    if (isGood) return "text-green-600";
    if (isOkay) return "text-blue-600";
    return "text-orange-600";
  };

  const getSkillTitle = (skill: string) => {
    const skillTitles = {
      define: "Define Fractions",
      gcdSimplify: "GCD & Simplify",
      simplify: "Simplify Fractions",
      equivalent: "Equivalent Fractions",
      addSub: "Add & Subtract",
      mulDiv: "Multiply & Divide",
      mixedImproper: "Mixed & Improper",
    };
    return skillTitles[skill as keyof typeof skillTitles] || skill;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <Navigation active="home" />

      <main className="flex-1 container max-w-4xl py-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-primary">
                Fractions Puzzle Complete!
              </CardTitle>
              <div className="text-lg text-muted-foreground">
                {getSkillTitle(result.skill)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Performance Summary */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4"
                >
                  {isPerfect ? (
                    <Trophy className="h-10 w-10 text-yellow-600" />
                  ) : (
                    <Star className="h-10 w-10 text-primary" />
                  )}
                </motion.div>

                <h2 className={`text-2xl font-bold ${getPerformanceColor()}`}>
                  {getPerformanceMessage()}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {result.correct}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Correct Answers
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {percentage}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Accuracy
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600">
                        {result.tokens}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tokens Earned
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Token Breakdown */}
              <Card className="p-4 bg-yellow-50 border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-3">
                  Token Breakdown:
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      Base tokens ({Math.floor(result.correct / 5)} × 5 correct
                      answers):
                    </span>
                    <span className="font-semibold">
                      {Math.floor(result.correct / 5) *
                        FRACTIONS_PUZZLE_RULES.tokensPer5}{" "}
                      tokens
                    </span>
                  </div>
                  {isPerfect && (
                    <div className="flex justify-between text-yellow-700">
                      <span>Perfect score bonus:</span>
                      <span className="font-semibold">
                        +{FRACTIONS_PUZZLE_RULES.bonusPerfect} tokens
                      </span>
                    </div>
                  )}
                  <div className="border-t border-yellow-300 pt-2 flex justify-between font-bold text-yellow-800">
                    <span>Total:</span>
                    <span>{result.tokens} tokens</span>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate("/fractions/setup")}
                  variant="outline"
                  size="lg"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Another Skill
                </Button>

                <Button onClick={() => navigate("/modules")} size="lg">
                  Back to Modules
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Encouragement Messages */}
              <div className="text-center space-y-2">
                {isPerfect && (
                  <p className="text-green-600 font-semibold">
                    🎯 You've mastered this fraction skill! Try a more
                    challenging one!
                  </p>
                )}
                {isGood && !isPerfect && (
                  <p className="text-blue-600">
                    🌟 Great progress! A few more practice sessions and you'll
                    have this mastered!
                  </p>
                )}
                {isOkay && !isGood && (
                  <p className="text-orange-600">
                    💪 You're on the right track! Keep practicing to build your
                    confidence!
                  </p>
                )}
                {!isOkay && (
                  <p className="text-purple-600">
                    🚀 Every expert was once a beginner! Try the same skill
                    again or start with an easier one!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
