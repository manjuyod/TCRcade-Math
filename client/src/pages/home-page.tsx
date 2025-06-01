import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { useQuestionWithHistory } from "@/hooks/use-question-with-history";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import QuestionCard from "@/components/question-card";
import FeedbackMessage from "@/components/feedback-message";
import SessionComplete from "@/components/session-complete";
import StreakAnimation from "@/components/streak-animation";
import TimeAchievement from "@/components/time-achievement";
import LevelUpAnimation from "@/components/level-up-animation";
import WordRaceGame from "@/components/word-race-game";
// Daily Challenge removed as per user request
import MathStorytelling from "@/components/math-storytelling";
import AiMathTutor from "@/components/ai-math-tutor";
import AiAnalytics from "@/components/ai-analytics";
import MultiplayerMode from "@/components/multiplayer-mode";
import { playSound, preloadSounds } from "@/lib/sounds";
import { fetchQuestion, submitAnswer } from "@/lib/questions";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { Question } from "@shared/schema";
import {
  Loader2,
  Clock,
  Calendar,
  Book,
  BookOpen,
  Users,
  Brain,
  ChevronDown,
  ChevronUp,
  Pencil,
  AlertCircle,
} from "lucide-react";

function DashboardStats({
  myScore,
  cohortScore,
  questionsAnswered,
  studyTime,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-2">My Score</h3>
        <p className="text-3xl font-bold">{myScore}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Cohort Average</h3>
        <p className="text-3xl font-bold">{cohortScore}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Progress</h3>
        <p className="text-xl">Questions Answered: {questionsAnswered}</p>
        <p className="text-xl">Study Time: {studyTime}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { minutesPlayed, displayMinutes, progressPercentage } =
    useSessionTimer();
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [feedbackData, setFeedbackData] = useState<{
    correct: boolean;
    tokensEarned: number;
    correctAnswer: string;
  } | null>(null);

  // Get current module from localStorage if it exists
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [currentModuleType, setCurrentModuleType] =
    useState<string>("standard");

  useEffect(() => {
    // Check if we have a current module when the component mounts
    const moduleId = localStorage.getItem("currentModuleId");
    const moduleType = localStorage.getItem("currentModuleType");

    if (moduleId) {
      setCurrentModuleId(moduleId);
    }

    if (moduleType) {
      setCurrentModuleType(moduleType);
    }
  }, []);

  // Session stats
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [sessionStats, setSessionStats] = useState({
    questionsAnswered: 0,
    correctAnswers: 0,
    tokensEarned: 0,
  });

  // Streak tracking
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  // Streak animation removed - keeping counter for token bonus calculations only

  // Time achievement tracking
  const [timeAchievement, setTimeAchievement] = useState<number>(0);
  const [showTimeAchievement, setShowTimeAchievement] =
    useState<boolean>(false);

  // Level-up tracking
  const [showLevelUpAnimation, setShowLevelUpAnimation] =
    useState<boolean>(false);
  const [newLevel, setNewLevel] = useState<string>("");

  // Milestone tracking
  const STREAK_MILESTONES = [3, 5, 10, 20]; // Milestones for streak animations
  const TIME_MILESTONES = [5, 10, 15, 20]; // Milestones for time achievements (in minutes)

  // Grade advancement token thresholds
  const GRADE_ADVANCEMENT_TOKENS = {
    k: 500, // Kindergarten to 1st grade
    "1": 1000, // 1st to 2nd grade
    "2": 1500, // 2nd to 3rd grade
    "3": 2000, // 3rd to 4th grade
    "4": 2500, // 4th to 5th grade
    "5": 3000, // 5th to 6th grade
    "6": 3500, // 6th grade (max level)
  };

  // Track answered questions to prevent repetition
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<number[]>([]);
  const sessionSize = 5; // Size of a question session (changed from 20 to 5)

  // Custom loading state we can control (separate from React Query's isLoading)
  const [isManuallyLoading, setIsManuallyLoading] = useState<boolean>(false);

  // Using TIME_MILESTONES defined above for achievements

  // Reference for user activity
  const lastActivityTimeRef = useRef<Date>(new Date());

  // Add state for error handling and session monitoring
  const [error, setError] = useState<string | null>(null);
  const [lastQuestionId, setLastQuestionId] = useState<number | null>(null);

  // Preload sounds and fetch initial question when component mounts
  useEffect(() => {
    preloadSounds();

    // Initial fetch of a question when the component mounts
    // Add special handling for Math Facts modules using our non-authenticated endpoint
    const moduleId = localStorage.getItem("currentModuleId");

    // Check if this is a Math Facts module
    if (moduleId && moduleId.startsWith("math-facts-")) {
      // Extract operation from module ID (math-facts-addition -> addition)
      const operation = moduleId.split("-").pop();
      const grade = user?.grade || "3";

      console.log(`Loading MATH FACTS module: ${moduleId}`);

      // Use our non-authenticated endpoint for Math Facts
      fetch(
        `/api/questions/math-facts?grade=${grade}&operation=${operation}&_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        },
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to fetch Math Facts question: ${response.status}`,
            );
          }
          return response.json();
        })
        .then((data) => {
          // Update the query client directly with the fetched data
          console.log(
            "Successfully loaded initial Math Facts question:",
            data?.question?.text || "Unknown",
            "ID:", data?.id
          );
          const newQuestion = data;

          // Store in the query cache
          queryClient.setQueryData(
            ["/api/questions/next", moduleId],
            newQuestion,
          );
        })
        .catch((error) => {
          console.error("Error fetching initial Math Facts question:", error);
          setError("Failed to load initial question. Please refresh the page.");
        });
    } else {
      // Regular module - use the standard endpoint
      fetch(`/api/questions/next?forceDynamic=true`, {
        credentials: "include",
      })
        .then((response) => response.json())
        .then((data) => {
          // Update the query client directly with the fetched data
          const newQuestion = data.question || data;
          queryClient.setQueryData(
            ["/api/questions/next", currentModuleCategory],
            newQuestion,
          );
        })
        .catch((error) => {
          console.error("Error fetching initial question:", error);
          setError("Failed to load initial question. Please refresh the page.");
        });
    }

    // Set up effect to check for time milestone achievements (5, 10, 15, 20 minutes)
    const checkMilestones = () => {
      // Previous minute value stored in the ref
      const prevMinute = Math.floor(lastCheckedMinuteRef.current);
      // Current minute from the timer hook
      const currentMinute = displayMinutes;

      // Only trigger achievement once per milestone
      if (
        prevMinute !== currentMinute &&
        TIME_MILESTONES.includes(currentMinute)
      ) {
        // Trigger time milestone celebration
        setTimeAchievement(currentMinute);
        setTimeout(() => {
          setShowTimeAchievement(true);

          // Add bonus tokens for time milestone
          if (user) {
            const bonusTokens = currentMinute * 3; // 3 tokens per minute of time milestone
            queryClient.setQueryData(["/api/user"], {
              ...user,
              tokens: user.tokens + bonusTokens,
            });
          }
        }, 500);
      }

      // Update the last checked minute
      lastCheckedMinuteRef.current = currentMinute;
    };

    // Create interval to periodically check milestones
    const milestoneInterval = setInterval(checkMilestones, 5000); // Check every 5 seconds

    // Initial check
    checkMilestones();

    // Clean up interval on unmount
    return () => clearInterval(milestoneInterval);
  }, [displayMinutes, user]);

  // Reference to track the last minute we checked for milestones
  const lastCheckedMinuteRef = useRef<number>(0);

  // Track the need for dynamic questions
  const [forceDynamic, setForceDynamic] = useState<boolean>(false);

  // Fetch a question
  // Get the current module data if a module ID has been set
  const [currentModuleCategory, setCurrentModuleCategory] = useState<
    string | undefined
  >(undefined);

  // When the currentModuleId changes, look up the corresponding module details
  useEffect(() => {
    if (currentModuleId) {
      // Find the module in localStorage
      try {
        // For Math Facts modules, we need to keep the full moduleId (e.g., "math-facts-addition")
        // For other modules, we extract just the main category
        const isMathFactsModule = currentModuleId.startsWith("math-facts-");

        // Use the full module ID for math facts, otherwise extract just the category
        let category = isMathFactsModule
          ? currentModuleId
          : currentModuleId.includes("-")
            ? currentModuleId.split("-")[0]
            : currentModuleId;

        if (currentModuleId === "decimal-defender") {
          category = "decimals";
        }

        setCurrentModuleCategory(category);

        // Log which type of module we're using
        console.log(
          `Loading ${isMathFactsModule ? "MATH FACTS" : "standard"} module: ${category}`,
        );

        // Special handling for Math Facts modules
        if (isMathFactsModule) {
          // Extract operation from the module ID (math-facts-addition -> addition)
          const operation = currentModuleId.split("-").pop();
          const grade = user?.grade || "3";

          console.log(
            `Loading Math Facts with grade=${grade}, operation=${operation}`,
          );

          // Use our non-authenticated endpoint for Math Facts
          fetch(
            `/api/questions/math-facts?grade=${grade}&operation=${operation}&_t=${Date.now()}`,
            {
              cache: "no-store",
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            },
          )
            .then((response) => {
              if (!response.ok) {
                throw new Error(
                  `Failed to fetch Math Facts question: ${response.status}`,
                );
              }
              return response.json();
            })
            .then((data) => {
              // Update the query client directly with the fetched data
              console.log(
                "Successfully loaded Math Facts question:",
                data?.question?.text || "Unknown",
              );
              const newQuestion = data;
              queryClient.setQueryData(
                ["/api/questions/next", category],
                newQuestion,
              );
            })
            .catch((error) => {
              console.error("Error fetching Math Facts question:", error);
              setError("Failed to load question. Please refresh the page.");
            });
        } else {
          // Regular module - use the standard endpoint, except for decimals which uses dedicated endpoint
          const url =
            category === "decimals"
              ? "/api/modules/decimal-defender/questions"
              : `/api/questions/next?category=${category}&forceDynamic=true`;

          fetch(url, {
            credentials: "include",
          })
            .then((response) => response.json())
            .then((data) => {
              // Update the query client directly with the fetched data
              const newQuestion = data.question || data;
              queryClient.setQueryData(
                ["/api/questions/next", category],
                newQuestion,
              );
            })
            .catch((error) => {
              console.error("Error fetching question for new module:", error);
              setError("Failed to load question. Please refresh the page.");
            });
        }
      } catch (e) {
        console.error("Error getting module details:", e);
        setError("Failed to load module details. Please refresh the page.");
      }
    } else {
      setCurrentModuleCategory(undefined);
    }
  }, [currentModuleId, user?.grade]);

  // Use our enhanced question hook with duplicate prevention
  // This is more reliable than the previous code
  const {
    question,
    loading: isLoading,
    fetchNewQuestion,
    seenQuestions,
  } = useQuestionWithHistory(user?.grade || "3", currentModuleCategory);

  // Monitor question changes and add fallback logic
  const currentQuestion = question;

  // Monitor question changes and detect stuck sessions
  useEffect(() => {
    if (currentQuestion?.id && currentQuestion.id !== lastQuestionId) {
      console.log('Question changed from', lastQuestionId, 'to', currentQuestion.id);
      setLastQuestionId(currentQuestion.id);
      setError(null); // Clear any previous errors
    }
  }, [currentQuestion?.id, lastQuestionId]);

  // Add fallback for stuck sessions
  useEffect(() => {
    if (currentModuleCategory?.startsWith('math-facts-') && questionsAnswered > 0 && isAnswering) {
      const timeout = setTimeout(() => {
        console.warn('Session appears stuck, attempting recovery...');
        setIsAnswering(false);
        setShowFeedback(false);
        fetchNewQuestion(true).catch(error => {
          console.error('Recovery failed:', error);
          setError('Session recovery failed. Please refresh the page.');
        });
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [questionsAnswered, isAnswering, currentModuleCategory, fetchNewQuestion]);

  // State variable to track if the user is currently answering a question
  const [isAnswering, setIsAnswering] = useState(false);

  // State variables for tracking the user's performance
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);

  // State variables for the display
  const [selectedGrade, setSelectedGrade] = useState(user?.grade || "3");
  const [tokens, setTokens] = useState(user?.tokens || 0);

  // Handle answer submission
  const handleAnswer = async (selectedAnswer: string) => {
    if (!currentQuestion || isAnswering) return;

    setIsAnswering(true);
    setShowFeedback(false);

    // Calculate if answer is correct
    const isCorrect = selectedAnswer === currentQuestion.answer;
    setLastAnswerCorrect(isCorrect);

    // Update session stats
    const newQuestionsAnswered = questionsAnswered + 1;
    setQuestionsAnswered(newQuestionsAnswered);
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }

    console.log(`Question ${newQuestionsAnswered} answered. Correct: ${isCorrect}`);

    try {
      // Submit answer to server
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answer: selectedAnswer,
          correct: isCorrect,
          timeSpent: 0,
          category: currentModuleCategory,
          grade: selectedGrade
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTokens(result.userTokens || tokens);

        // Show feedback
        setShowFeedback(true);

        // Play appropriate sound
        if (isCorrect) {
          playSound('correct');
        } else {
          playSound('incorrect');
        }

        // Wait for feedback, then fetch new question (unless session is complete)
        setTimeout(async () => {
          setShowFeedback(false);

          // Check if session should continue (Math Facts typically runs indefinitely until user stops)
          const shouldContinue = currentModuleCategory?.startsWith('math-facts-') || newQuestionsAnswered < 10;

          if (shouldContinue) {
            // Fetch new question using the hook
            try {
              console.log('Fetching new question after answer submission...');
              await fetchNewQuestion(true);
            } catch (error) {
              console.error('Error fetching new question:', error);
              // Retry once
              setTimeout(async () => {
                try {
                  await fetchNewQuestion(true);
                } catch (retryError) {
                  console.error('Retry failed:', retryError);
                  setError('Failed to load next question. Please refresh the page.');
                }
              }, 1000);
            }
          }

          setIsAnswering(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer');
      setIsAnswering(false);
    }
  };

  // Effect to start initial session
  useEffect(() => {
    if (!user) return;

    const moduleId = user.currentModule;
    if (!moduleId) return;

    // Set current module category for consistent state
    setCurrentModuleCategory(moduleId);

    // Extract grade and category for Math Facts modules
    const isMathFactsModule = moduleId.startsWith("math-facts-");
    if (isMathFactsModule) {
      // Math Facts modules: grade stored in user profile, category is the module ID
      const grade = user.grade || "3";
      const category = moduleId; // e.g., "math-facts-addition"
      const operation = moduleId.split("-").pop(); // Extract operation

      setSelectedGrade(grade);

      // Use our non-authenticated endpoint for Math Facts
      fetch(
        `/api/questions/math-facts?grade=${grade}&operation=${operation}&_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        },
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to fetch Math Facts question: ${response.status}`,
            );
          }
          return response.json();
        })
        .then((data) => {
          // Update the query client directly with the fetched data
          console.log(
            "Successfully loaded initial Math Facts question:",
            data?.question?.text || "Unknown",
            "ID:", data?.id
          );
          const newQuestion = data;
          queryClient.setQueryData(
            ["/api/questions/next", category],
            newQuestion,
          );
        })
        .catch((error) => {
          console.error("Error fetching initial Math Facts question:", error);
          setError("Failed to load initial question. Please refresh the page.");
        });
    } else {
      // Regular module - use the standard endpoint, except for decimals which uses dedicated endpoint
      const url =
        category === "decimals"
          ? "/api/modules/decimal-defender/questions"
          : `/api/questions/next?category=${category}&forceDynamic=true`;

      fetch(url, { credentials: "include" })
        .then((response) => response.json())
        .then((data) => {
          const newQuestion = data.question || data;
          queryClient.setQueryData(
            ["/api/questions/next", currentModuleCategory],
            newQuestion,
          );
        })
        .catch((error) => {
          console.error("Error fetching initial question:", error);
          setError("Failed to load initial question. Please refresh the page.");
        });
    }
  }, [user, currentModuleCategory]);

  const handleAnswerSubmit = (answer: string) => {
    // Update last activity time to track user engagement
    lastActivityTimeRef.current = new Date();

    if (question) {
      handleAnswer(answer);
    }
  };

  // Much simpler next question handler using our improved hook
  const handleNextQuestion = () => {
    // Skip loading next question if session is completed
    if (sessionCompleted) {
      console.log("Session completed - skipping next question fetch");
      return;
    }

    // Update last activity time to track user engagement
    lastActivityTimeRef.current = new Date();

    // First set loading state to prevent showing old questions
    setIsManuallyLoading(true);

    // Clear feedback
    setShowFeedback(false);
    setFeedbackData(null);

    // Use the improved fetchNewQuestion method from our custom hook
    // This handles all the caching and duplicate prevention automatically
    fetchNewQuestion(true).finally(() => {
      // Set loading to false after a brief delay to prevent flickering
      setTimeout(() => {
        setIsManuallyLoading(false);
      }, 100);
    });
  };

  // Simpler version with our improved hook
  const handleStartNewSession = () => {
    // Reset session
    setSessionCompleted(false);
    setSessionStats({
      questionsAnswered: 0,
      correctAnswers: 0,
      tokensEarned: 0,
    });

    // Reset all session stats
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setLastAnswerCorrect(false);

    // Clear tracking for a new session
    setAnsweredQuestionIds([]);

    // Set loading to show spinner during fetch
    setIsManuallyLoading(true);

    // Refresh the study plan after a session completes
    // This will update recommendations based on latest performance
    try {
      import("@/lib/study-plan").then((module) => {
        module.refreshStudyPlan().then((success) => {
          if (success) {
            console.log("Study plan refreshed successfully after session");
          }
        });
      });
    } catch (error) {
      console.error("Error refreshing study plan:", error);
    }

    // Use the improved hook's fetchNewQuestion function with forceDynamic=true
    // This handles all the caching and duplicate prevention automatically
    fetchNewQuestion(true).finally(() => {
      // Turn off loading after a short delay
      setTimeout(() => {
        setIsManuallyLoading(false);
      }, 100);
    });
  };

  // Using progress percentage from the timer hook instead of manual calculation

  // DISABLED duplicate question detection to fix infinite loop
  // We'll rely on the server-side exclusion instead
  /*
  useEffect(() => {
    if (question && 
        answeredQuestionIds.includes(question.id) && 
        answeredQuestionIds.length < 1000 && // Don't run if we have too many answered questions
        !isManuallyLoading // Don't run if we're already loading
    ) {
      // If we've already seen this question in this session, log it and fetch a new one
      console.log(`Duplicate question detected in session: ID ${question.id}, fetching new question`);

      // Set loading state to prevent showing the duplicate
      setIsManuallyLoading(true);

      // Use our improved question hook to fetch a new question with duplicate prevention
      fetchNewQuestion(true) // forceDynamic=true to ensure variety
        .finally(() => {
          // Turn off loading after a short delay
          setTimeout(() => {
            setIsManuallyLoading(false);
          }, 200);
        });
    }
  }, [question, answeredQuestionIds, fetchNewQuestion, isManuallyLoading]);
  */

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 container mx-auto p-4 space-y-8">
        <DashboardStats
          myScore={user?.correctAnswers || 0}
          cohortScore={0} // Will be updated when cohort data is available
          questionsAnswered={user?.questionsAnswered || 0}
          studyTime={`${Math.floor(minutesPlayed / 60)}h ${Math.round(minutesPlayed % 60)}min`}
        />
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-dark">Session Timer</h2>
            <span className="text-primary font-bold flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {displayMinutes} minutes
            </span>
          </div>
          {/* Progress bar removed - daily goals removed as per user request */}
        </div>

        {/* Advanced features showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Daily Challenge removed as per user request */}

          <div
            className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors"
            onClick={() => (window.location.href = "/practice")}
          >
            <div className="bg-primary/10 p-2 rounded-full">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Create-A-Quiz</h3>
              <p className="text-xs text-gray-500">Create custom quizzes</p>
            </div>
          </div>

          <div
            className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors"
            onClick={() => (window.location.href = "/tutor")}
          >
            <div className="bg-primary/10 p-2 rounded-full">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI Math Tutor</h3>
              <p className="text-xs text-gray-500">Get personalized help</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div
            className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors"
            onClick={() => (window.location.href = "/multiplayer")}
          >
            <div className="bg-primary/10 p-2 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Multiplayer Matches</h3>
              <p className="text-xs text-gray-500">
                Compete with friends in real-time
              </p>
            </div>
          </div>

          <div
            className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors"
            onClick={() => (window.location.href = "/analytics")}
          >
            <div className="bg-primary/10 p-2 rounded-full">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI Analytics</h3>
              <p className="text-xs text-gray-500">
                Get personalized learning insights
              </p>
            </div>
          </div>
        </div>

        {/* Math practice section */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4">Math Practice</h2>

          {sessionCompleted ? (
            <SessionComplete
              correctAnswers={sessionStats.correctAnswers}
              totalQuestions={sessionStats.questionsAnswered}
              tokensEarned={sessionStats.tokensEarned}
              bonusTokens={sessionStats.correctAnswers === sessionSize ? 20 : 0}
              bonusAwarded={sessionStats.correctAnswers === sessionSize}
              onStartNewSession={handleStartNewSession}
            />
          ) : isLoading || isManuallyLoading || answerMutation.isPending ? (
            <div className="question-card bg-white p-6 rounded-3xl shadow-md mb-6 flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : showFeedback && feedbackData ? (
            <FeedbackMessage
              correct={feedbackData.correct}
              tokensEarned={feedbackData.tokensEarned}
              correctAnswer={feedbackData.correctAnswer}
              onNextQuestion={handleNextQuestion}
              batchComplete={sessionStats.questionsAnswered >= sessionSize - 1}
              autoAdvance={true}
            />
          ) : question ? (
            currentModuleType === "word_race" ? (
              <WordRaceGame
                question={question}
                isLoading={false}
                onAnswerSubmit={handleAnswerSubmit}
                onTimeUp={() => {
                  // Handle time up event by marking answer as incorrect
                  // We need to submit the question and mark it as incorrect
                  if (question) {
                    playSound("incorrect");

                    // Show incorrect feedback
                    setFeedbackData({
                      correct: false,
                      tokensEarned: 0,
                      correctAnswer: question.answer,
                    });

                    setShowFeedback(true);

                    // Add question to answered questions
                    setAnsweredQuestionIds((prev) => [...prev, question.id]);

                    // Update session stats - timed out answer counts as incorrect
                    setSessionStats((prev) => ({
                      questionsAnswered: prev.questionsAnswered + 1,
                      correctAnswers: prev.correctAnswers, // No increment for incorrect answers
                      tokensEarned: prev.tokensEarned,
                    }));

                    // Log for debugging
                    console.log("Updated session stats after timeout");

                    // Reset streak counter for timeouts
                    setCurrentStreak(0);

                    // Continue session until 5 questions are answered, regardless of correctness
                    if (sessionStats.questionsAnswered + 1 >= sessionSize) {
                      // Update final session stats before showing session complete
                      const finalStats = {
                        questionsAnswered: sessionSize,
                        correctAnswers:
                          sessionStats.correctAnswers + (isCorrect ? 1 : 0),
                        tokensEarned:
                          sessionStats.tokensEarned +
                          (isCorrect ? tokensEarned : 0),
                      };

                      // Log session completion for debugging
                      console.log(
                        "Session completed after timeout with stats:",
                        `${finalStats.correctAnswers}/${finalStats.questionsAnswered} correct, ` +
                          `${finalStats.tokensEarned} tokens earned`,
                      );

                      // Set the final stats
                      setSessionStats(finalStats);

                      setTimeout(() => {
                        setSessionCompleted(true);
                        setShowFeedback(false);

                        // Play session complete sound - always regular since we timed out the last question
                        playSound("sessionComplete");
                      }, 2000); // Show feedback for 2 seconds before showing session complete
                    }
                  }
                }}
              />
            ) : (
              <QuestionCard question={question} onAnswer={handleAnswerSubmit} />
            )
          ) : (
            <div className="question-card bg-white p-6 rounded-3xl shadow-md mb-6 text-center">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
              <h3 className="text-lg font-semibold mb-2">
                No Questions Available
              </h3>
              {error && <p className="text-red-500">{error}</p>}
              <p className="text-gray-600 mb-4">
                We couldn't find any questions for grade {user?.grade || "K"}
                {currentModuleCategory
                  ? ` in the ${currentModuleCategory} category`
                  : ""}
                .
              </p>
              <p className="text-gray-500 text-sm mb-4">
                This could be because your current grade level doesn't have
                enough questions, or because you've seen most of the available
                questions already.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Set a different grade
                    const availableGrades = ["K","1", "2", "3", "4", "5", "6"];
                    const currentIndex = availableGrades.indexOf(
                      user?.grade || "K",
                    );
                    const nextGrade =
                      availableGrades[
                        (currentIndex + 1) % availableGrades.length
                      ];

                    // Update user grade through API (optional implementation)
                    console.log(`Would switch to grade ${nextGrade}`);

                    // For now, just try to fetch a new question with forceDynamic=true
                    fetchNewQuestion(true);
                  }}
                >
                  Try Different Grade
                </Button>
                <Button
                  onClick={() => {
                    // Force dynamic question generation
                    fetchNewQuestion(true);
                  }}
                >
                  Generate Question
                </Button>
              </div>
            </div>
          )}

          {/* Show session progress */}
          {!sessionCompleted && (
            <div className="mt-4 text-center">
              <span className="text-gray-600 text-sm">
                Session Progress: {questionsAnswered}/{sessionSize}{" "}
                questions
              </span>
            </div>
          )}
        </div>

        {/* Daily Challenge completely removed as per user request */}
      </main>

      <Navigation active="play" />

      {/* Streak animation completely removed to prevent React infinite loops */}

      {/* Time achievement animation - alsousing simplified pattern */}
      {showTimeAchievement && (
        <TimeAchievement
          minutesSpent={timeAchievement}
          onAnimationComplete={() => {
            // Immediately set to false without any side effects
            setShowTimeAchievement(false);
            return;
          }}
        />
      )}

      {/* Level up animation - also using simplified pattern */}
      {showLevelUpAnimation && (
        <LevelUpAnimation
          newGrade={newLevel}
          onAnimationComplete={() => {
            // Immediately set to false without any side effects
            setShowLevelUpAnimation(false);
            return;
          }}
        />
      )}
    </div>
  );
}