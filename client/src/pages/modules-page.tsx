import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import { motion } from 'framer-motion';
import { 
  Puzzle, 
  MapPin, 
  Building2, 
  Star, 
  Dice5, 
  Calculator, 
  Timer, 
  BarChart4, 
  Shield, 
  Sparkles,
  Clock,
  Trophy,
  UserRoundCheck
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/progress-bar';

// Mini-game module types
enum GameType {
  STANDARD = 'standard',
  HANGMAN = 'hangman',
  TREASURE_MAP = 'treasure',
  TOWER_CLIMB = 'tower',
  PUZZLE_UNLOCK = 'puzzle',
  RACE_GAME = 'race'
}

// Module definition with game type and difficulty
interface Module {
  id: string;
  name: string;
  description: string;
  gameType: GameType;
  icon: JSX.Element;
  difficulty: number; // 1-5
  category: string;
  locked: boolean;
  completeCount: number; // Number of times completed
  bestScore?: number; // Best score achieved
}

export default function ModulesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Stats for the dashboard
  const userStats = {
    minutesPlayed: 15, // Default to 15 minutes (mock value since we don't have dailyEngagementMinutes property)
    totalTokens: user?.tokens || 0,
    totalCorrect: user?.correctAnswers || 0,
    totalQuestions: user?.questionsAnswered || 0, 
    accuracy: user?.questionsAnswered ? Math.round((user.correctAnswers / user.questionsAnswered) * 100) : 0
  };
  
  // Active game filter
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  // Daily goal progress
  const dailyTimeGoal = 20; // minutes
  const timeProgress = Math.min(100, ((userStats.minutesPlayed || 0) / dailyTimeGoal) * 100);
  
  // Game modules list (these would come from API in a real implementation)
  const modules: Module[] = [
    {
      id: 'addition-1',
      name: 'Addition Basics',
      description: 'Learn to add numbers up to 20',
      gameType: GameType.STANDARD,
      icon: <Calculator className="h-12 w-12 text-primary" />,
      difficulty: 1,
      category: 'addition',
      locked: false,
      completeCount: 3
    },
    {
      id: 'subtraction-1',
      name: 'Subtraction Adventure',
      description: 'Subtract numbers to solve the mystery',
      gameType: GameType.HANGMAN,
      icon: <Star className="h-12 w-12 text-amber-500" />,
      difficulty: 1,
      category: 'subtraction',
      locked: false,
      completeCount: 2
    },
    {
      id: 'multiplication-1',
      name: 'Multiplication Island',
      description: 'Find the hidden treasures with multiplication',
      gameType: GameType.TREASURE_MAP,
      icon: <MapPin className="h-12 w-12 text-emerald-500" />,
      difficulty: 2,
      category: 'multiplication',
      locked: false,
      completeCount: 1
    },
    {
      id: 'division-1',
      name: 'Division Tower',
      description: 'Climb the tower by solving division problems',
      gameType: GameType.TOWER_CLIMB,
      icon: <Building2 className="h-12 w-12 text-violet-500" />,
      difficulty: 2,
      category: 'division',
      locked: false,
      completeCount: 0
    },
    {
      id: 'fractions-1',
      name: 'Fraction Puzzle',
      description: 'Complete the puzzle by solving fraction problems',
      gameType: GameType.PUZZLE_UNLOCK,
      icon: <Puzzle className="h-12 w-12 text-blue-500" />,
      difficulty: 3,
      category: 'fractions',
      locked: false,
      completeCount: 0
    },
    {
      id: 'word-problems-1',
      name: 'Math Word Race',
      description: 'Race to the finish by solving word problems',
      gameType: GameType.RACE_GAME,
      icon: <Timer className="h-12 w-12 text-red-500" />,
      difficulty: 3,
      category: 'word-problems',
      locked: false,
      completeCount: 0
    },
    {
      id: 'addition-2',
      name: 'Addition Challenge',
      description: 'More challenging addition problems up to 100',
      gameType: GameType.STANDARD,
      icon: <Calculator className="h-12 w-12 text-primary" />,
      difficulty: 2,
      category: 'addition',
      locked: false,
      completeCount: 0
    },
    {
      id: 'geometry-1',
      name: 'Shape Explorer',
      description: 'Learn about 2D and 3D shapes',
      gameType: GameType.TREASURE_MAP,
      icon: <Dice5 className="h-12 w-12 text-pink-500" />,
      difficulty: 2,
      category: 'geometry',
      locked: false,
      completeCount: 0
    },
    {
      id: 'time-1',
      name: 'Time Trials',
      description: 'Practice telling time and time calculations',
      gameType: GameType.RACE_GAME,
      icon: <Clock className="h-12 w-12 text-amber-500" />,
      difficulty: 2,
      category: 'time',
      locked: false,
      completeCount: 0
    },
    {
      id: 'money-1',
      name: 'Money Matters',
      description: 'Learn to count and calculate with money',
      gameType: GameType.STANDARD,
      icon: <Shield className="h-12 w-12 text-green-500" />,
      difficulty: 2,
      category: 'money',
      locked: false,
      completeCount: 0
    },
    {
      id: 'algebra-1',
      name: 'Pre-Algebra Basics',
      description: 'Introduction to simple algebra concepts',
      gameType: GameType.TOWER_CLIMB,
      icon: <BarChart4 className="h-12 w-12 text-indigo-500" />,
      difficulty: 4,
      category: 'algebra',
      locked: false,
      completeCount: 0
    },
    {
      id: 'challenge-1',
      name: 'Ultimate Challenge',
      description: 'Mixed topics at the highest difficulty',
      gameType: GameType.PUZZLE_UNLOCK,
      icon: <Trophy className="h-12 w-12 text-amber-500" />,
      difficulty: 5,
      category: 'mixed',
      locked: true,
      completeCount: 0
    },
  ];
  
  // Filter modules based on active filter
  const filteredModules = modules.filter(module => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'completed') return module.completeCount > 0;
    if (activeFilter === 'not-started') return module.completeCount === 0 && !module.locked;
    if (activeFilter === 'locked') return module.locked;
    return module.category === activeFilter;
  });
  
  // Get game type label and color
  const getGameTypeInfo = (type: GameType) => {
    switch(type) {
      case GameType.STANDARD:
        return { label: 'Standard Q&A', color: 'bg-primary' };
      case GameType.HANGMAN:
        return { label: 'Math Hangman', color: 'bg-amber-500' };
      case GameType.TREASURE_MAP:
        return { label: 'Treasure Map', color: 'bg-emerald-500' };
      case GameType.TOWER_CLIMB:
        return { label: 'Tower Climb', color: 'bg-violet-500' };
      case GameType.PUZZLE_UNLOCK:
        return { label: 'Puzzle Unlock', color: 'bg-blue-500' };
      case GameType.RACE_GAME:
        return { label: 'Race Game', color: 'bg-red-500' };
      default:
        return { label: 'Standard', color: 'bg-gray-500' };
    }
  };
  
  // Get difficulty stars
  const getDifficultyStars = (difficulty: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };
  
  // Start module handler
  const handleStartModule = (module: Module) => {
    // In a real implementation, you would set up the selected module
    // and redirect to the gameplay page with the module's configuration
    // Store only the module ID rather than the entire object to avoid circular JSON errors
    localStorage.setItem('currentModuleId', module.id);
    setLocation('/');
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-center mb-6">Math Modules Dashboard</h1>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-sm font-medium">Daily Progress</h3>
            </div>
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Daily Goal</span>
                <span className="text-xs font-medium">{Math.floor(userStats.minutesPlayed)}/{dailyTimeGoal} min</span>
              </div>
              <ProgressBar progress={timeProgress} height={10} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow">
            <div className="flex items-center">
              <Sparkles className="h-5 w-5 text-amber-500 mr-2" />
              <h3 className="text-sm font-medium">Rewards</h3>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-500">{userStats.totalTokens}</p>
                <p className="text-xs text-gray-600">Total Tokens</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Next reward at</p>
                <p className="text-sm font-medium">{userStats.totalTokens + 50} tokens</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow">
            <div className="flex items-center">
              <UserRoundCheck className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-sm font-medium">Performance</h3>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-green-500">{userStats.accuracy}%</p>
                <p className="text-xs text-gray-600">Accuracy</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Questions</p>
                <p className="text-sm font-medium">{userStats.totalCorrect}/{userStats.totalQuestions}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex space-x-2 min-w-max">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              className="whitespace-nowrap"
            >
              All Modules
            </Button>
            <Button
              variant={activeFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('completed')}
              className="whitespace-nowrap"
            >
              Completed
            </Button>
            <Button
              variant={activeFilter === 'not-started' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('not-started')}
              className="whitespace-nowrap"
            >
              Not Started
            </Button>
            <Button
              variant={activeFilter === 'addition' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('addition')}
              className="whitespace-nowrap"
            >
              Addition
            </Button>
            <Button
              variant={activeFilter === 'subtraction' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('subtraction')}
              className="whitespace-nowrap"
            >
              Subtraction
            </Button>
            <Button
              variant={activeFilter === 'multiplication' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('multiplication')}
              className="whitespace-nowrap"
            >
              Multiplication
            </Button>
            <Button
              variant={activeFilter === 'division' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('division')}
              className="whitespace-nowrap"
            >
              Division
            </Button>
          </div>
        </div>
        
        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((module) => {
            const gameTypeInfo = getGameTypeInfo(module.gameType);
            
            return (
              <motion.div
                key={module.id}
                whileHover={{ translateY: -5 }}
                className={`bg-white rounded-xl overflow-hidden shadow-md flex flex-col
                  ${module.locked ? 'opacity-60' : ''}`}
              >
                <div className={`${gameTypeInfo.color} p-4 text-white`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      {module.icon}
                      <div className="ml-3">
                        <h3 className="font-bold">{module.name}</h3>
                        <div className="text-xs mt-1 flex">
                          {getDifficultyStars(module.difficulty)}
                        </div>
                      </div>
                    </div>
                    {module.completeCount > 0 && (
                      <div className="bg-white text-primary rounded-full h-8 w-8 flex items-center justify-center text-xs font-bold">
                        {module.completeCount}×
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 flex-grow">
                  <p className="text-sm text-gray-600 mb-2">{module.description}</p>
                  <div className="flex items-center mt-4 mb-1">
                    <span className="text-xs py-1 px-2 rounded-full bg-gray-100 text-gray-700">
                      {gameTypeInfo.label}
                    </span>
                    <span className="text-xs py-1 px-2 ml-2 rounded-full bg-gray-100 text-gray-700">
                      {module.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-4 pt-0">
                  <Button 
                    className="w-full"
                    disabled={module.locked}
                    onClick={() => handleStartModule(module)}
                  >
                    {module.locked ? 'Locked' : module.completeCount > 0 ? 'Play Again' : 'Start Module'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
      
      <Navigation active="play" />
    </div>
  );
}