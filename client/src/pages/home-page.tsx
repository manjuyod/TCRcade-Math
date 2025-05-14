import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useSessionTimer } from '@/hooks/use-session-timer';
import { useQuestionWithHistory } from '@/hooks/use-question-with-history';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import QuestionCard from '@/components/question-card';
import FeedbackMessage from '@/components/feedback-message';
import SessionComplete from '@/components/session-complete';
import StreakAnimation from '@/components/streak-animation';
import TimeAchievement from '@/components/time-achievement';
import LevelUpAnimation from '@/components/level-up-animation';
import WordRaceGame from '@/components/word-race-game';
// Daily Challenge removed as per user request
import MathStorytelling from '@/components/math-storytelling';
import AiMathTutor from '@/components/ai-math-tutor';
import AiAnalytics from '@/components/ai-analytics';
import MultiplayerMode from '@/components/multiplayer-mode';
import { playSound, preloadSounds } from '@/lib/sounds';
import { fetchQuestion, submitAnswer } from '@/lib/questions';
import { ProgressBar } from '@/components/progress-bar';
import { Button } from '@/components/ui/button';
import { queryClient } from '@/lib/queryClient';
import { Question } from '@shared/schema';
import { Loader2, Clock, Calendar, Book, BookOpen, Users, Brain, ChevronDown, ChevronUp, Pencil, AlertCircle } from 'lucide-react';

function DashboardStats({ myScore, cohortScore, questionsAnswered, studyTime }) {
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
  const { minutesPlayed, displayMinutes, progressPercentage } = useSessionTimer();
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [feedbackData, setFeedbackData] = useState<{
    correct: boolean;
    tokensEarned: number;
    correctAnswer: string;
  } | null>(null);

  // Get current module from localStorage if it exists
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [currentModuleType, setCurrentModuleType] = useState<string>('standard');

  useEffect(() => {
    // Check if we have a current module when the component mounts
    const moduleId = localStorage.getItem('currentModuleId');
    const moduleType = localStorage.getItem('currentModuleType');

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
    tokensEarned: 0
  });

  // Streak tracking
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  // Streak animation removed - keeping counter for token bonus calculations only

  // Time achievement tracking
  const [timeAchievement, setTimeAchievement] = useState<number>(0);
  const [showTimeAchievement, setShowTimeAchievement] = useState<boolean>(false);

  // Level-up tracking
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState<boolean>(false);
  const [newLevel, setNewLevel] = useState<string>("");

  // Milestone tracking
  const STREAK_MILESTONES = [3, 5, 10, 20]; // Milestones for streak animations
  const TIME_MILESTONES = [5, 10, 15, 20]; // Milestones for time achievements (in minutes)

  // Grade advancement token thresholds
  const GRADE_ADVANCEMENT_TOKENS = {
    'k': 500,    // Kindergarten to 1st grade
    '1': 1000,   // 1st to 2nd grade 
    '2': 1500,   // 2nd to 3rd grade
    '3': 2000,   // 3rd to 4th grade
    '4': 2500,   // 4th to 5th grade
    '5': 3000,   // 5th to 6th grade
    '6': 3500    // 6th grade (max level)
  };

  // Track answered questions to prevent repetition
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<number[]>([]);
  const sessionSize = 5; // Size of a question session (changed from 20 to 5)

  // Custom loading state we can control (separate from React Query's isLoading)
  const [isManuallyLoading, setIsManuallyLoading] = useState<boolean>(false);

  // Using TIME_MILESTONES defined above for achievements

  // Reference for user activity
  const lastActivityTimeRef = useRef<Date>(new Date());

  // Preload sounds and fetch initial question when component mounts
  useEffect(() => {
    preloadSounds();

    // Initial fetch of a question when the component mounts
    // Add special handling for Math Facts modules using our non-authenticated endpoint
    const moduleId = localStorage.getItem('currentModuleId');

    // Check if this is a Math Facts module
    if (moduleId && moduleId.startsWith('math-facts-')) {
      // Extract operation from module ID (math-facts-addition -> addition)
      const operation = moduleId.split('-').pop();
      const grade = user?.grade || '3';

      console.log(`Loading MATH FACTS module: ${moduleId}`);

      // Use our non-authenticated endpoint for Math Facts
      fetch(`/api/questions/math-facts?grade=${grade}&operation=${operation}&_t=${Date.now()}`, {
        cache: 'no-store'
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch Math Facts question: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          // Update the query client directly with the fetched data
          console.log('Successfully loaded Math Facts question:', data?.question?.text || 'Unknown');
          const newQuestion = data;

          // Store in the query cache
          queryClient.setQueryData(['/api/questions/next', moduleId], newQuestion);
        })
        .catch(error => {
          console.error('Error fetching Math Facts question:', error);
        });
    } else {
      // Regular module - use the standard endpoint
      fetch(`/api/questions/next?forceDynamic=true`, {
        credentials: 'include'
      })
        .then(response => response.json())
        .then(data => {
          // Update the query client directly with the fetched data
          const newQuestion = data.question || data;
          queryClient.setQueryData(['/api/questions/next', currentModuleCategory], newQuestion);
        })
        .catch(error => {
          console.error('Error fetching initial question:', error);
        });
    }

    // Set up effect to check for time milestone achievements (5, 10, 15, 20 minutes)
    const checkMilestones = () => {
      // Previous minute value stored in the ref
      const prevMinute = Math.floor(lastCheckedMinuteRef.current);
      // Current minute from the timer hook
      const currentMinute = displayMinutes;

      // Only trigger achievement once per milestone
      if (prevMinute !== currentMinute && TIME_MILESTONES.includes(currentMinute)) {
        // Trigger time milestone celebration
        setTimeAchievement(currentMinute);
        setTimeout(() => {
          setShowTimeAchievement(true);

          // Add bonus tokens for time milestone
          if (user) {
            const bonusTokens = currentMinute * 3; // 3 tokens per minute of time milestone
            queryClient.setQueryData(['/api/user'], {
              ...user,
              tokens: user.tokens + bonusTokens
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
  const [currentModuleCategory, setCurrentModuleCategory] = useState<string | undefined>(undefined);

  // When the currentModuleId changes, look up the corresponding module details
  useEffect(() => {
    if (currentModuleId) {
      // Find the module in localStorage
      try {
        // For Math Facts modules, we need to keep the full moduleId (e.g., "math-facts-addition")
        // For other modules, we extract just the main category
        const isMathFactsModule = currentModuleId.startsWith('math-facts-');

        // Use the full module ID for math facts, otherwise extract just the category
        const category = isMathFactsModule 
          ? currentModuleId
          : (currentModuleId.includes('-') ? currentModuleId.split('-')[0] : currentModuleId);

        setCurrentModuleCategory(category);

        // Log which type of module we're using
        console.log(`Loading ${isMathFactsModule ? 'MATH FACTS' : 'standard'} module: ${category}`);

        // Special handling for Math Facts modules
        if (isMathFactsModule) {
          // Extract operation from the module ID (math-facts-addition -> addition)
          const operation = currentModuleId.split('-').pop();
          const grade = user?.grade || '3';

          console.log(`Loading Math Facts with grade=${grade}, operation=${operation}`);

          // Use our non-authenticated endpoint for Math Facts
          fetch(`/api/questions/math-facts?grade=${grade}&operation=${operation}&_t=${Date.now()}`, {
            cache: 'no-store'
          })
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to fetch Math Facts question: ${response.status}`);
              }
              return response.json();
            })
            .then(data => {
              // Update the query client directly with the fetched data
              console.log('Successfully loaded Math Facts question:', data?.question?.text || 'Unknown');
              const newQuestion = data;
              queryClient.setQueryData(['/api/questions/next', category], newQuestion);
            })
            .catch(error => {
              console.error('Error fetching Math Facts question:', error);
            });
        } else {
          // Regular module - use the standard endpoint
          fetch(`/api/questions/next?category=${category}&forceDynamic=true`, {
            credentials: 'include'
          })
            .then(response => response.json())
            .then(data => {
              // Update the query client directly with the fetched data
              const newQuestion = data.question || data;
              queryClient.setQueryData(['/api/questions/next', category], newQuestion);
            })
            .catch(error => {
              console.error('Error fetching question for new module:', error);
            });
        }
      } catch (e) {
        console.error("Error getting module details:", e);
      }
    } else {
      setCurrentModuleCategory(undefined);
    }
  }, [currentModuleId]);

  // Use our enhanced question hook with duplicate prevention
  // This is more reliable than the previous code
  const {
    question,
    loading: isLoading, 
    fetchNewQuestion,
    seenQuestions
  } = useQuestionWithHistory(
    user?.grade || '3',
    currentModuleCategory
  );

  // Submit answer mutation
  const answerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: number; answer: string }) => {
      console.log(`Submitting answer for question ID: ${questionId}, answer: ${answer}`);

      try {
        // Check if this is a Math Facts module
        const isMathFactsModule = currentModuleId?.startsWith('math-facts-');

        // Extract the operation from module ID
        const operation = isMathFactsModule 
          ? currentModuleId?.split('-').pop() 
          : '';

        // For Math Facts modules, we still need to track stats and tokens in the database,
        // but we'll handle the answer validation locally first for better UX
        if (isMathFactsModule && question) {
          console.log(`Math Facts answer processing (${currentModuleId})`);

          // Check if the answer is correct for Math Facts
          const isCorrect = answer === question.answer;
          const tokensEarned = isCorrect ? 3 : 0;

          try {
            // Make API call to server to update tokens and stats
            const response = await fetch('/api/answer', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                questionId: questionId,
                answer: answer,
                originalAnswer: question.answer,
                category: `math-facts-${operation}`,
                grade: user?.grade || '3',
                isCorrect: isCorrect,
                tokensEarned: tokensEarned
              }),
            });

            if (response.ok) {
              const apiResult = await response.json();
              return apiResult;
            } else {
              console.warn("Math Facts API call failed, falling back to local handling");
            }
          } catch (error) {
            console.warn("Error making Math Facts API call:", error);
          }

          // Fallback to simulated response if API call fails
          return {
            correct: isCorrect,
            tokensEarned: tokensEarned,
            totalTokens: user?.tokens || 0,
            correctAnswer: question.answer
          };
        }

        // For regular authenticated questions, proceed with normal API call
        if (question && questionId === question.id) {
          const result = await submitAnswer(
            questionId, 
            answer, 
            question.answer,  // Pass the original correct answer
            question.question // Pass the original question text
          );
          return result;
        } else {
          // Fallback if we don't have the current question context
          const result = await submitAnswer(questionId, answer);
          return result;
        }
      } catch (error) {
        console.error(`Error submitting answer: ${error}`);

        // If error is authentication related and we're in a Math Facts module,
        // continue with local answer handling
        if (String(error).includes('401') && 
            currentModuleId?.startsWith('math-facts-') && 
            question) {

          console.log("401 error, handling Math Facts answer locally");

          // Check if the answer is correct
          const isCorrect = answer === question.answer;
          const tokensEarned = isCorrect ? 3 : 0;

          // DON'T update session stats here - it will be handled in onSuccess
          // to prevent double-counting when the component re-renders

          // Return a simulated API response
          return {
            correct: isCorrect,
            tokensEarned: tokensEarned,
            totalTokens: 0,
            correctAnswer: question.answer
          };
        }

        // For other errors, force a new dynamic question
        fetchNewQuestion(true);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Play sound based on result
      playSound(data.correct ? 'correct' : 'incorrect');

      // Invalidate user data to refresh token count and question stats in the header and profile
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });

      // Also invalidate progress data to ensure analytics are updated
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });

      // Show feedback
      setFeedbackData({
        correct: data.correct,
        tokensEarned: data.tokensEarned,
        correctAnswer: data.correctAnswer
      });
      setShowFeedback(true);

      // Add question to answered questions
      if (question) {
        setAnsweredQuestionIds(prev => [...prev, question.id]);
      }

      // Always update session stats for any module type (including Math Facts modules)
      // This ensures we always track correct answers consistently
      setSessionStats(prev => ({
        questionsAnswered: prev.questionsAnswered + 1,
        correctAnswers: prev.correctAnswers + (data.correct ? 1 : 0),
        tokensEarned: prev.tokensEarned + data.tokensEarned
      }));

      // Log for debugging purposes
      console.log("Updated session stats after answer");

      // Update streak counter
      if (data.correct) {
        // Calculate the new streak count
        const newStreakCount = currentStreak + 1;

        // Increment the streak counter for correct answers
        setCurrentStreak(newStreakCount);

        // Check if we've hit a milestone - EVEN MORE SIMPLIFIED VERSION
        // This won't create any new objects or cause React update issues
        let milestone = 0;
        for (let i = 0; i < STREAK_MILESTONES.length; i++) {
          if (STREAK_MILESTONES[i] === newStreakCount) {
            milestone = STREAK_MILESTONES[i];
            break;
          }
        }

        if (milestone) {
          try {
            // Add bonus tokens for streak milestones
            if (user) {
              const bonusTokens = milestone * 2; // 2x tokens for each milestone

              // First update local user data 
              queryClient.setQueryData(['/api/user'], {
                ...user,
                tokens: user.tokens + bonusTokens
              });

              // Streak animation completely removed - all state updates removed

              // STREAK ANIMATION REMOVED - Don't show any streak animations
              // They were causing React maximum update depth errors
              console.log(`Reached ${newStreakCount} streak milestone, awarding bonus tokens only`);

              // NO ANIMATIONS, just silently award the bonus tokens
            }
          } catch (e) {
            console.error("Error handling streak bonus:", e);
          }
        }
      } else {
        // Reset streak counter for incorrect answers
        setCurrentStreak(0);
      }

      // Update user data
      if (user) {
        // Check if user has enough tokens to advance to the next grade
        let updatedGrade = user.grade;
        let shouldShowLevelUp = false;

        // Only check if user is not at the highest grade (6th)
        if (user.grade && user.grade !== '6' && GRADE_ADVANCEMENT_TOKENS[user.grade as keyof typeof GRADE_ADVANCEMENT_TOKENS]) {
          const requiredTokens = GRADE_ADVANCEMENT_TOKENS[user.grade as keyof typeof GRADE_ADVANCEMENT_TOKENS];

          // If user will have enough tokens after this answer
          if (data.totalTokens >= requiredTokens) {
            // Get the next grade level
            const currentGradeIdx = Object.keys(GRADE_ADVANCEMENT_TOKENS).indexOf(user.grade);
            updatedGrade = Object.keys(GRADE_ADVANCEMENT_TOKENS)[currentGradeIdx + 1];
            shouldShowLevelUp = true;

            // Set level up details to trigger animation
            setNewLevel(updatedGrade);

            // Queue level up animation after a short delay
            setTimeout(() => {
              setShowLevelUpAnimation(true);

              // Force dismissal after 2 seconds to prevent app crash
              setTimeout(() => {
                setShowLevelUpAnimation(false);
              }, 2000);
            }, 1500);
          }
        }

        // Store current token count to avoid infinite loop when updating user data
        const finalTokens = data.totalTokens;
        const updatedQuestionsAnswered = user.questionsAnswered + 1;
        const updatedCorrectAnswers = user.correctAnswers + (data.correct ? 1 : 0);

        // Update user data including grade if advanced - but don't trigger a re-render cascade
        // by avoiding multiple updates to the same data
        queryClient.setQueryData(['/api/user'], prevUser => {
          if (!prevUser) return null;

          // If the data is the same as what we just set, don't update to avoid infinite loop
          if (
            (prevUser as any).tokens === finalTokens && 
            (prevUser as any).grade === updatedGrade &&
            (prevUser as any).questionsAnswered === updatedQuestionsAnswered
          ) {
            return prevUser;
          }

          return {
            ...prevUser,
            tokens: finalTokens,
            grade: updatedGrade,
            questionsAnswered: updatedQuestionsAnswered,
            correctAnswers: updatedCorrectAnswers
          };
        });
      }

      // Check if batch is complete from server response
      // The server tracks batches of 5 questions and sets batchComplete flag
      if (data.batchComplete) {
        // Update final session stats before showing session complete
        // Include any bonus tokens from perfect score
        const finalStats = {
          questionsAnswered: sessionSize, // Always exactly 5 questions
          correctAnswers: sessionStats.correctAnswers + (data.correct ? 1 : 0),
          tokensEarned: sessionStats.tokensEarned + data.tokensEarned + (data.bonusTokens || 0)
        };

        // Log session completion for debugging
        console.log("Batch complete! Stats:", 
          `${finalStats.correctAnswers}/${finalStats.questionsAnswered} correct, ` +
          `${finalStats.tokensEarned} tokens earned` +
          (data.bonusAwarded ? ` (includes ${data.bonusTokens} bonus tokens)` : "")
        );

        // Set the final stats
        setSessionStats(finalStats);

        // Immediately mark as completed to prevent loading another question
        setSessionCompleted(true);

        // Show feedback for a moment before transitioning to the completion screen
        setTimeout(() => {
          setShowFeedback(false);

          // Play session complete sound based on whether bonus was awarded
          if (data.bonusAwarded) {
            // Play perfect score sound if bonus was awarded (all 5 correct)
            playSound('perfectScore');
          } else {
            // Play regular completion sound
            playSound('sessionComplete');
          }
        }, 2000); // Show feedback for 2 seconds before showing session complete
      } 
      // Legacy fallback check in case server doesn't send batchComplete flag
      else if (sessionStats.questionsAnswered + 1 >= sessionSize) {
        console.log("Using legacy batch completion check (5 questions)");

        // Update final session stats before showing session complete
        const finalStats = {
          questionsAnswered: sessionSize, // Always exactly 5 questions
          correctAnswers: sessionStats.correctAnswers + (data.correct ? 1 : 0),
          tokensEarned: sessionStats.tokensEarned + data.tokensEarned
        };

        // Set the final stats
        setSessionStats(finalStats);

        // Immediately mark as completed to prevent loading another question
        setSessionCompleted(true);

        // Show feedback for a moment before transitioning to the completion screen
        setTimeout(() => {
          setShowFeedback(false);

          // Play session complete sound based on performance
          if (finalStats.correctAnswers === sessionSize) {
            // Play perfect score sound if all questions are correct
            playSound('perfectScore');
          } else {
            // Play regular completion sound
            playSound('sessionComplete');
          }
        }, 2000); // Show feedback for 2 seconds before showing session complete
      }
    }
  });

  const handleAnswerSubmit = (answer: string) => {
    // Update last activity time to track user engagement
    lastActivityTimeRef.current = new Date();

    if (question) {
      answerMutation.mutate({ questionId: question.id, answer });
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
    fetchNewQuestion(true)
      .finally(() => {
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
      tokensEarned: 0
    });

    // Clear tracking for a new session
    setAnsweredQuestionIds([]);

    // Set loading to show spinner during fetch
    setIsManuallyLoading(true);

    // Refresh the study plan after a session completes
    // This will update recommendations based on latest performance
    try {
      import('@/lib/study-plan').then(module => {
        module.refreshStudyPlan().then(success => {
          if (success) {
            console.log('Study plan refreshed successfully after session');
          }
        });
      });
    } catch (error) {
      console.error('Error refreshing study plan:', error);
    }

    // Use the improved hook's fetchNewQuestion function with forceDynamic=true
    // This handles all the caching and duplicate prevention automatically
    fetchNewQuestion(true)
      .finally(() => {
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

          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => window.location.href = '/practice'}>
            <div className="bg-primary/10 p-2 rounded-full">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Create-A-Quiz</h3>
              <p className="text-xs text-gray-500">Create custom quizzes</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => window.location.href = '/tutor'}>
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
          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => window.location.href = '/multiplayer'}>
            <div className="bg-primary/10 p-2 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Multiplayer Matches</h3>
              <p className="text-xs text-gray-500">Compete with friends in real-time</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => window.location.href = '/analytics'}>
            <div className="bg-primary/10 p-2 rounded-full">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI Analytics</h3>
              <p className="text-xs text-gray-500">Get personalized learning insights</p>
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
            />
          ) : question ? (
            currentModuleType === 'boss_run' ? (
              <BossRunGame
                question={getNextMathFact(userGrade || '6', ['addition', 'subtraction', 'multiplication', 'division'][Math.floor(Math.random() * 4)])}
                onAnswerSubmit={handleAnswerSubmit}
                bossLevel={1}
              />
            ) : currentModuleType === 'word_race' ? (
              <WordRaceGame
                question={question}
                isLoading={false}
                onAnswerSubmit={handleAnswerSubmit}
                onTimeUp={() => {
                  // Handle time up event by marking answer as incorrect
                  // We need to submit the question and mark it as incorrect
                  if (question) {
                    playSound('incorrect');

                    // Show incorrect feedback
                    setFeedbackData({
                      correct: false,
                      tokensEarned: 0,
                      correctAnswer: question.answer
                    });

                    setShowFeedback(true);

                    // Add question to answered questions
                    setAnsweredQuestionIds(prev => [...prev, question.id]);

                    // Update session stats - timed out answer counts as incorrect
                    setSessionStats(prev => ({
                      questionsAnswered: prev.questionsAnswerd + 1,
                      correctAnswers: prev.correctAnswers, // No increment for incorrect answers
                      tokensEarned: prev.tokensEarned
                    }));

                    // Log for debugging
                    console.log("Updated session stats after timeout");

                    // Reset streak counter for timeouts
                    setCurrentStreak(0);

                    // Check if session is complete (exactly 5 questions)
                    // For all module types, we want exactly 5 questions per session
                    if (sessionStats.questionsAnswered + 1 >= sessionSize) {
                      // Update final session stats before showing session complete
                      const finalStats = {
                        questionsAnswered: sessionSize, // Always exactly 5 questions
                        correctAnswers: sessionStats.correctAnswers, // No increment for timeouts
                        tokensEarned: sessionStats.tokensEarned
                      };

                      // Log session completion for debugging
                      console.log("Session completed after timeout with stats:", 
                        `${finalStats.correctAnswers}/${finalStats.questionsAnswered} correct, ` +
                        `${finalStats.tokensEarned} tokens earned`
                      );

                      // Set the final stats
                      setSessionStats(finalStats);

                      setTimeout(() => {
                        setSessionCompleted(true);
                        setShowFeedback(false);

                        // Play session complete sound - always regular since we timed out the last question
                        playSound('sessionComplete');
                      }, 2000); // Show feedback for 2 seconds before showing session complete
                    }
                  }
                }}
              />
            ) : (
              <QuestionCard
                question={question}
                onAnswer={handleAnswerSubmit}
              />
            )
          ) : (
            <div className="question-card bg-white p-6 rounded-3xl shadow-md mb-6 text-center">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
              <h3 className="text-lg font-semibold mb-2">No Questions Available</h3>
              <p className="text-gray-600 mb-4">
                We couldn't find any questions for grade {user?.grade || 'K'} 
                {currentModuleCategory ? ` in the ${currentModuleCategory} category` : ''}.
              </p>
              <p className="text-gray-500 text-sm mb-4">
                This could be because your current grade level doesn't have enough questions,
                or because you've seen most of the available questions already.
              </p>
              <div className="flex justify-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Set a different grade
                    const availableGrades = ['K', '1', '2', '3', '4', '5', '6'];
                    const currentIndex = availableGrades.indexOf(user?.grade || 'K');
                    const nextGrade = availableGrades[(currentIndex + 1) % availableGrades.length];

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
                Session Progress: {sessionStats.questionsAnswered}/{sessionSize} questions
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

// GameType enum and BossRunGame component needs to be defined.
// This can be added to a new file and imported, or directly added here.

// Example of adding GameType to a separate modules-page.tsx, but we'll add it here for simplicity:
enum GameType {
    STANDARD = 'standard',
    WORD_RACE = 'word_race',
    BOSS_RUN = 'boss_run',
  }

// Example of a simple BossRunGame component - needs actual implementation
function BossRunGame({ question, isLoading, onAnswerSubmit, onGameOver }: { question: any, isLoading: boolean, onAnswerSubmit: (answer: string) => void, onGameOver: (won: boolean) => void }) {
    return (
      <div>
        <h3>Boss Run Game</h3>
        {isLoading ? (
          <div>Loading...</div>
        ) : question ? (
          <>
            <p>{question.text}</p>
            <input type="text" id="answer" name="answer" />
            <button onClick={() => {
                const answer = (document.getElementById("answer") as HTMLInputElement).value;
                onAnswerSubmit(answer);
                // Placeholder - replace with actual game logic
                const won = Math.random() > 0.5;
                onGameOver(won);
            }}>Submit Answer</button>
          </>
        ) : (
          <div>No question available.</div>
        )}
      </div>
    );
  }