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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export default function DivisionPlayPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<any[]>([]);

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
    moduleName: "Math Facts Division",
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
      const operation = 'division';

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

    // Update counts first
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    const newQuestionCount = questionCount + 1;

    if (isCorrect) {
      setCorrectCount(newCorrectCount);
    }
    setQuestionCount(newQuestionCount);

    // Store answer locally (don't submit to server until session completion)
    const answerData = {
      questionId: currentQuestion.id,
      selectedAnswer,
      correctAnswer: currentQuestion.answer,
      isCorrect,
      category: 'math-facts-division',
      grade: user?.grade,
      timeTaken: 5,
      concepts: currentQuestion.concepts,
    };

    // Add answer to session collection
    const updatedAnswers = [...sessionAnswers, answerData];
    setSessionAnswers(updatedAnswers);

    // Check if session should complete (after 10 questions)
    if (newQuestionCount >= 10) {
      try {
        // Submit all answers from the session
        for (const answer of updatedAnswers) {
          const response = await fetch('/api/answers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(answer),
          });

          if (!response.ok) {
            throw new Error('Failed to submit answer');
          }
        }

        endSession();
        setIsComplete(true);
      } catch (error) {
        console.error('Error submitting answers:', error);
        toast({
          title: "Error",
          description: "Failed to submit answers. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Load next question immediately (feedback delay is handled in QuestionCard)
      loadNextQuestion();
    }

    setIsSubmitting(false);
  };

  const handleBack = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = () => {
    // Clear session and navigate
    endSession();
    sessionStorage.removeItem('moduleInProgress');
    sessionStorage.removeItem('moduleSessionData');
    window.dispatchEvent(new Event('moduleSessionChange'));
    setLocation('/modules');
  };

  if (isComplete) {
    const accuracy = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-6">
          <SessionComplete
            correctAnswers={correctCount}
            totalQuestions={questionCount}
            tokensEarned={correctCount * 10}
            onStartNewSession={() => setLocation('/math-facts/division/play')}
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
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Modules
            </Button>

            <div className="text-center">
              <h1 className="text-xl font-bold">Math Facts: Division</h1>
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

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Math Facts Session?</AlertDialogTitle>
            <AlertDialogDescription>
              You're currently {questionCount > 0 ? `${questionCount}/10 questions` : 'starting your session'}. 
              If you leave now, your progress will be lost and no tokens will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Playing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Exit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}