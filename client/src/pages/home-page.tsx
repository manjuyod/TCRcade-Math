import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import QuestionCard from '@/components/question-card';
import FeedbackMessage from '@/components/feedback-message';
import SessionComplete from '@/components/session-complete';
import StreakAnimation from '@/components/streak-animation';
import TimeAchievement from '@/components/time-achievement';
import LevelUpAnimation from '@/components/level-up-animation';
import WordRaceGame from '@/components/word-race-game';
import { playSound, preloadSounds } from '@/lib/sounds';
import { fetchQuestion, submitAnswer } from '@/lib/questions';
import { ProgressBar } from '@/components/progress-bar';
import { queryClient } from '@/lib/queryClient';
import { Question } from '@shared/schema';
import { Loader2, Clock } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
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
  const [showStreakAnimation, setShowStreakAnimation] = useState<boolean>(false);
  const [streakMilestone, setStreakMilestone] = useState<number>(0);
  
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
  
  // Daily time tracking (in minutes)
  const [dailyTimeSpent, setDailyTimeSpent] = useState<number>(0);
  const dailyTimeGoal = 20; // 20 minutes goal
  
  // Time tracking reference for actual duration
  const startTimeRef = useRef<Date | null>(null);
  const lastActivityTimeRef = useRef<Date>(new Date());
  const lastDateRef = useRef<string>(new Date().toDateString());
  
  // Preload sounds when component mounts
  useEffect(() => {
    preloadSounds();
    
    // Initialize time tracking when component mounts
    if (!startTimeRef.current) {
      startTimeRef.current = new Date();
    }
    
    // Set up time tracking interval
    const timeTrackingInterval = setInterval(() => {
      // Only count time if user is active (within last 2 minutes)
      const now = new Date();
      const todayDateString = now.toDateString();
      
      // Check if the date has changed (a new day has started)
      if (todayDateString !== lastDateRef.current) {
        console.log("New day detected, resetting daily time counter");
        setDailyTimeSpent(0);
        lastDateRef.current = todayDateString;
        
        // If user data exists, also reset their daily engagement time
        if (user) {
          queryClient.setQueryData(['/api/user'], {
            ...user,
            dailyEngagementMinutes: 0
          });
        }
      }
      
      const timeSinceLastActivity = now.getTime() - lastActivityTimeRef.current.getTime();
      const userIsActive = timeSinceLastActivity < 2 * 60 * 1000; // 2 minutes inactivity threshold
      
      if (userIsActive) {
        // Increment time in minutes (1/60 minute = 1 second)
        setDailyTimeSpent(prev => {
          const newValue = Math.min(prev + (1/60), dailyTimeGoal); // Update every second, convert to minutes
          return newValue;
        });
        
        // Update user's engagement time in database every 10 seconds to ensure UI updates
        // This is more frequent than originally designed but ensures the timer display updates properly
        if (user && now.getSeconds() % 10 === 0) {
          const updatedEngagementTime = Math.min(dailyTimeSpent + (1/60), dailyTimeGoal);
          queryClient.setQueryData(['/api/user'], {
            ...user,
            dailyEngagementMinutes: updatedEngagementTime
          });
          
          // Check for time milestone achievements (5, 10, 15, 20 minutes)
          const previousMinute = Math.floor(dailyTimeSpent);
          const currentMinute = Math.floor(updatedEngagementTime);
          
          if (previousMinute !== currentMinute && [5, 10, 15, 20].includes(currentMinute)) {
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
        }
      }
    }, 1000); // Update every second
    
    // Clean up interval on unmount
    return () => clearInterval(timeTrackingInterval);
  }, [dailyTimeGoal]);
  
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
      } catch (e) {
        console.error("Error getting module details:", e);
      }
    } else {
      setCurrentModuleCategory(undefined);
    }
  }, [currentModuleId]);
  
  // Fetch a question (now with module category filtering)
  const { data: question, isLoading, refetch } = useQuery<Question>({
    queryKey: ['/api/questions', { answeredIds: answeredQuestionIds, forceDynamic, category: currentModuleCategory }],
    queryFn: () => fetchQuestion(answeredQuestionIds, forceDynamic, currentModuleCategory),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: 3,
    enabled: !sessionCompleted // Don't fetch new questions when session is complete
  });
  
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
        
        // Check if we've hit a milestone
        const milestone = STREAK_MILESTONES.find(milestone => milestone === newStreakCount);
        
        if (milestone) {
          // Set the milestone for the animation
          setStreakMilestone(milestone);
          
          // Short delay to show the streak animation after feedback
          setTimeout(() => {
            setShowStreakAnimation(true);
            // Add bonus tokens for streak milestones
            if (user) {
              const bonusTokens = milestone * 2; // 2x tokens for each streak milestone
              queryClient.setQueryData(['/api/user'], {
                ...user,
                tokens: user.tokens + bonusTokens
              });
            }
            
            // Ensure streak animation is auto-dismissed after 3 seconds max
            setTimeout(() => {
              setShowStreakAnimation(false);
            }, 3000);
          }, 500);
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
        
        // Update user data including grade if advanced
        queryClient.setQueryData(['/api/user'], {
          ...user,
          tokens: data.totalTokens,
          grade: updatedGrade,
          questionsAnswered: user.questionsAnswered + 1,
          correctAnswers: user.correctAnswers + (data.correct ? 1 : 0)
        });
      }
      
      // Check if session is complete (5 questions)
      if (sessionStats.questionsAnswered + 1 >= sessionSize) {
        setTimeout(() => {
          setSessionCompleted(true);
          setShowFeedback(false);
          
          // Play session complete sound
          playSound('sessionComplete');
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
  
  const handleNextQuestion = () => {
    // Update last activity time to track user engagement
    lastActivityTimeRef.current = new Date();
    
    setShowFeedback(false);
    setFeedbackData(null);
    
    // When moving to a new question, set forceDynamic to true to avoid repeats
    setForceDynamic(true);
    
    // Pass the answeredQuestionIds to the server to avoid repeated questions
    refetch();
    
    // Reset forceDynamic after a small delay
    setTimeout(() => {
      setForceDynamic(false);
    }, 500);
  };
  
  const handleStartNewSession = () => {
    // Reset session
    setSessionCompleted(false);
    setSessionStats({
      questionsAnswered: 0,
      correctAnswers: 0,
      tokensEarned: 0
    });
    
    // Important: Keep track of previously answered question IDs to avoid repeats
    // But clear the tracking for the new session
    setAnsweredQuestionIds([]);
    
    // Force dynamic question generation when starting a new session
    setForceDynamic(true);
    
    // Force refetch with cache busting by using a timestamp to ensure new questions
    queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
    
    // Add a slight delay before refetching to ensure we get a fresh question
    setTimeout(() => {
      refetch();
      
      // Reset forceDynamic after we've fetched the first question
      setTimeout(() => {
        setForceDynamic(false);
      }, 500);
    }, 100);
  };
  
  // Calculate daily goal progress based on time
  const timeProgress = Math.min(100, (dailyTimeSpent / dailyTimeGoal) * 100);
  
  // Check if current question has already been answered in this session
  useEffect(() => {
    if (question && answeredQuestionIds.includes(question.id) && answeredQuestionIds.length < 100) {
      // If we've already seen this question, force dynamic generation and fetch a new one
      console.log("Duplicate question detected, fetching new dynamic one");
      setForceDynamic(true);
      refetch();
      
      // Reset the flag after a delay
      setTimeout(() => {
        setForceDynamic(false);
      }, 500);
    }
  }, [question, answeredQuestionIds, refetch]);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto p-4">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-dark">Daily Goal</h2>
            <span className="text-primary font-bold flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {Math.floor(Math.min(dailyTimeSpent, dailyTimeGoal))}/{dailyTimeGoal} minutes
            </span>
          </div>
          <ProgressBar progress={timeProgress} />
        </div>
        
        {sessionCompleted ? (
          <SessionComplete
            correctAnswers={sessionStats.correctAnswers}
            totalQuestions={sessionStats.questionsAnswered}
            tokensEarned={sessionStats.tokensEarned}
            onStartNewSession={handleStartNewSession}
          />
        ) : isLoading || answerMutation.isPending ? (
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
            <p className="text-gray-500">No questions available for your grade level.</p>
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
      </main>
      
      <Navigation active="play" />
      
      {/* Streak animation */}
      {showStreakAnimation && (
        <StreakAnimation 
          streakCount={currentStreak}
          milestone={streakMilestone}
          onAnimationComplete={() => setShowStreakAnimation(false)} 
        />
      )}
      
      {/* Time achievement animation */}
      {showTimeAchievement && (
        <TimeAchievement
          minutesSpent={timeAchievement}
          onAnimationComplete={() => setShowTimeAchievement(false)}
        />
      )}
      
      {/* Level up animation */}
      {showLevelUpAnimation && (
        <LevelUpAnimation
          newGrade={newLevel}
          onAnimationComplete={() => setShowLevelUpAnimation(false)}
        />
      )}
    </div>
  );
}
