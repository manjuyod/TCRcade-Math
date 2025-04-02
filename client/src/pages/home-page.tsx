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
import DailyChallengeComponent from '@/components/daily-challenge';
import MathStorytelling from '@/components/math-storytelling';
import AvatarCreator from '@/components/avatar-creator';
import AiAnalytics from '@/components/ai-analytics';
import MultiplayerMode from '@/components/multiplayer-mode';
import { playSound, preloadSounds } from '@/lib/sounds';
import { fetchQuestion, submitAnswer } from '@/lib/questions';
import { ProgressBar } from '@/components/progress-bar';
import { Button } from '@/components/ui/button';
import { queryClient } from '@/lib/queryClient';
import { Question } from '@shared/schema';
import { Loader2, Clock, Calendar, Book, Users, Brain, Palette, ChevronDown, ChevronUp, Pencil, AlertCircle } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const { minutesPlayed, displayMinutes, progressPercentage, dailyGoal } = useSessionTimer();
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
        // Extract the category from moduleId
        // For most modules, the ID is just the category name (e.g., "addition", "subtraction")
        // For special modules like "addition-advanced", we extract just the main category
        const category = currentModuleId.includes('-') ? 
          currentModuleId.split('-')[0] : currentModuleId;
        setCurrentModuleCategory(category);
        
        // When the module changes, immediately fetch a question
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
    mutationFn: ({ questionId, answer }: { questionId: number; answer: string }) => 
      submitAnswer(questionId, answer),
    onSuccess: (data) => {
      // Play sound based on result
      playSound(data.correct ? 'correct' : 'incorrect');
      
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
      
      // Update session stats
      setSessionStats(prev => ({
        questionsAnswered: prev.questionsAnswered + 1,
        correctAnswers: prev.correctAnswers + (data.correct ? 1 : 0),
        tokensEarned: prev.tokensEarned + data.tokensEarned
      }));
      
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
      
      // Check if session is complete (5 questions)
      if (sessionStats.questionsAnswered + 1 >= sessionSize) {
        // Update final session stats before showing session complete
        const finalStats = {
          questionsAnswered: sessionStats.questionsAnswered + 1,
          correctAnswers: sessionStats.correctAnswers + (data.correct ? 1 : 0),
          tokensEarned: sessionStats.tokensEarned + data.tokensEarned
        };
        
        // Set the final stats
        setSessionStats(finalStats);
        
        setTimeout(() => {
          setSessionCompleted(true);
          setShowFeedback(false);
          
          // Play session complete sound
          playSound('sessionComplete');
          
          console.log("Session completed with stats:", finalStats);
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
      
      <main className="flex-1 container mx-auto p-4">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-dark">Daily Goal</h2>
            <span className="text-primary font-bold flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {displayMinutes}/{dailyGoal} minutes
            </span>
          </div>
          <ProgressBar progress={progressPercentage} />
        </div>
        
        {/* Advanced features showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => window.location.href = '/daily-challenge'}>
            <div className="bg-primary/10 p-2 rounded-full">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Daily Challenge</h3>
              <p className="text-xs text-gray-500">Earn bonus tokens every day</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => window.location.href = '/practice'}>
            <div className="bg-primary/10 p-2 rounded-full">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Create-A-Quiz</h3>
              <p className="text-xs text-gray-500">Create custom quizzes</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => window.location.href = '/avatar'}>
            <div className="bg-primary/10 p-2 rounded-full">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Avatar Creator</h3>
              <p className="text-xs text-gray-500">Customize your character</p>
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
            />
          ) : question ? (
            currentModuleType === 'word_race' ? (
              <WordRaceGame
                question={question}
                isLoading={false}
                onAnswerSubmit={handleAnswerSubmit}
                onTimeUp={() => {
                  // Handle time up event by submitting a blank answer
                  handleAnswerSubmit("");
                }}
              />
            ) : (
              <QuestionCard
                question={question}
                onAnswerSubmit={handleAnswerSubmit}
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
        
        {/* Quick preview of daily challenge */}
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-4">Today's Challenge</h2>
          <div className="h-64 overflow-hidden">
            <DailyChallengeComponent />
          </div>
        </div>
      </main>
      
      <Navigation active="play" />
      
      {/* Streak animation completely removed to prevent React infinite loops */}
      
      {/* Time achievement animation - also using simplified pattern */}
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
