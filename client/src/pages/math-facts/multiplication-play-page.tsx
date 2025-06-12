import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import QuestionCard from "@/components/question-card";
import SessionComplete from "@/components/session-complete";
import { useSessionPrevention } from "@/hooks/use-session-prevention";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { useSessionDiagnostics } from "@/hooks/use-session-diagnostics";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Question {
  id: number;
  question: {
    text: string;
    style: any;
    isFlashcard: boolean;
  };
  answer: string;
  options: string[];
  grade: string;
  difficulty: number;
  category: string;
  concepts: string[];
}

export default function MultiplicationPlayPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { elapsedTime, progressPercentage } = useSessionTimer();

  // Session prevention
  const { endSession } = useSessionPrevention({
    isActive: !isComplete,
    allowedPaths: ['/modules', '/math-facts'],
    onAttemptExit: () => {
      toast({
        title: "Session in Progress",
        description: "Complete your current session before leaving.",
        variant: "destructive",
      });
    },
  });

  // Session diagnostics
  useSessionDiagnostics({
    isActive: !isComplete && currentQuestion !== null,
    moduleName: "Math Facts Multiplication",
  });

  // Load initial question
  useEffect(() => {
    loadNextQuestion();
  }, []);

  const loadNextQuestion = async () => {
    if (!user?.grade) return;

    setIsLoading(true);

    try {
      const grade = user.grade;
      const operation = 'multiplication';

      // Clear question cache for fresh questions
      queryClient.removeQueries({ queryKey: ['/api/questions/next'] });
      queryClient.removeQueries({ queryKey: ['/api/questions/math-facts'] });

      const response = await fetch(
        `/api/questions/math-facts?grade=${grade}&operation=${operation}&_t=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch question: ${response.status}`);
      }

      const data = await response.json();
      setCurrentQuestion(data);

    } catch (error) {
      console.error('Error loading question:', error);
      toast({
        title: "Error",
        description: "Failed to load question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (selectedAnswer: string) => {
    if (!currentQuestion || isSubmitting) return;

    setIsSubmitting(true);
    const isCorrect = selectedAnswer === currentQuestion.answer;

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }

    setQuestionCount(prev => prev + 1);

    try {
      // Submit answer to server
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedAnswer,
          correctAnswer: currentQuestion.answer,
          isCorrect,
          category: 'math-facts-multiplication',
          grade: user?.grade,
          timeTaken: 5, // Default time
          concepts: currentQuestion.concepts,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      // Check if session should complete (after 10 questions)
      if (questionCount + 1 >= 10) {
        endSession();
        setIsComplete(true);
      } else {
        // Load next question after a brief delay
        setTimeout(() => {
          loadNextQuestion();
        }, 1000);
      }

    } catch (error) {
      console.error('Error submitting answer:', error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (!isComplete && currentQuestion) {
      toast({
        title: "Session in Progress",
        description: "Complete your current session before leaving.",
        variant: "destructive",
      });
      return;
    }
    setLocation('/modules');
  };

  if (isComplete) {
    const accuracy = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-6">
          <SessionComplete
            questionsAnswered={questionCount}
            correctAnswers={correctCount}
            accuracy={accuracy}
            timeSpent={Math.floor(elapsedTime / 60)}
            tokensEarned={correctCount * 10}
            onPlayAgain={() => setLocation('/math-facts/multiplication/play')}
            onBackToModules={() => setLocation('/modules')}
            moduleName="Math Facts: Multiplication"
          />
        </main>
        <Navigation active="home" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center py-6 px-4">
        <div className="w-full max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={!isComplete && currentQuestion !== null}
              className={!isComplete && currentQuestion !== null ? "opacity-50 cursor-not-allowed" : ""}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Modules
            </Button>

            <div className="text-center">
              <h1 className="text-xl font-bold">Math Facts: Multiplication</h1>
              <p className="text-sm text-muted-foreground">
                Question {questionCount + 1} of 10 | Correct: {correctCount}
              </p>
            </div>

            <div className="w-24" /> {/* Spacer for centering */}
          </div>

          <QuestionCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            isLoading={isLoading}
            isSubmitting={isSubmitting}
            questionNumber={questionCount + 1}
            totalQuestions={10}
            correctCount={correctCount}
            timeElapsed={elapsedTime}
            progressPercentage={progressPercentage}
          />
        </div>
      </main>

      <Navigation active="home" />
    </div>
  );
}