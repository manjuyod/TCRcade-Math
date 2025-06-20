import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import { motion } from "framer-motion";
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
  UserRoundCheck,
  Ruler,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import { useSessionTimer } from "@/hooks/use-session-timer";

// Mini-game module types
enum GameType {
  STANDARD = "standard",
  WORD_RACE = "word_race", // New game type with countdown timer
  MATH_RUSH = "math_rush", // Timed 20-question sprint
  FRACTIONS_PUZZLE = "fractions_puzzle", // 20-question fractions mastery module
  SKILL_SELECTOR = "skill_selector", // Skill-based game selection
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
  const { minutesPlayed, progressPercentage } = useSessionTimer();

  // Stats for the dashboard
  const userStats = {
    minutesPlayed: minutesPlayed, // Use real-time session data
    totalTokens: user?.tokens || 0,
    totalCorrect: user?.correctAnswers || 0,
    totalQuestions: user?.questionsAnswered || 0,
    accuracy: user?.questionsAnswered
      ? Math.round((user.correctAnswers / user.questionsAnswered) * 100)
      : 0,
  };

  // Active game filter
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Use the progress percentage from the timer hook
  const timeProgress = progressPercentage;

  // Game modules list (these would come from API in a real implementation)
  const modules: Module[] = [
    // Math Facts modules (pure computation only, no word problems)
    {
      id: "math-facts-addition",
      name: "Math Facts: Addition",
      description: 'Pure computation addition practice (e.g., "7 + 5 = ?")',
      gameType: GameType.STANDARD,
      icon: <Calculator className="h-12 w-12 text-blue-500" />,
      difficulty: 1,
      category: "addition",
      locked: false,
      completeCount: 0,
    },
    {
      id: "math-facts-subtraction",
      name: "Math Facts: Subtraction",
      description: 'Pure computation subtraction practice (e.g., "12 - 5 = ?")',
      gameType: GameType.STANDARD,
      icon: <Calculator className="h-12 w-12 text-red-500" />,
      difficulty: 1,
      category: "subtraction",
      locked: false,
      completeCount: 0,
    },
    {
      id: "math-facts-multiplication",
      name: "Math Facts: Multiplication",
      description:
        'Pure computation multiplication practice (e.g., "7 × 6 = ?")',
      gameType: GameType.STANDARD,
      icon: <Calculator className="h-12 w-12 text-green-500" />,
      difficulty: 1,
      category: "multiplication",
      locked: false,
      completeCount: 0,
    },
    {
      id: "math-facts-division",
      name: "Math Facts: Division",
      description: 'Pure computation division practice (e.g., "42 ÷ 7 = ?")',
      gameType: GameType.STANDARD,
      icon: <Calculator className="h-12 w-12 text-purple-500" />,
      difficulty: 1,
      category: "division",
      locked: false,
      completeCount: 0,
    },
    // Original modules - COMMENTED OUT FOR REMOVAL FROM HOME PAGE
    // Can be uncommented later to restore these modules
    /*
    {
      id: 'addition',
      name: 'Addition Basics',
      description: 'Learn to add numbers and practice basic addition skills',
      gameType: GameType.STANDARD,
      icon: <Calculator className="h-12 w-12 text-primary" />,
      difficulty: 1,
      category: 'addition',
      locked: false,
      completeCount: 3
    },
    {
      id: 'subtraction',
      name: 'Subtraction Adventure',
      description: 'Master subtraction skills across different difficulty levels',
      gameType: GameType.STANDARD,
      icon: <Star className="h-12 w-12 text-amber-500" />,
      difficulty: 1,
      category: 'subtraction',
      locked: false,
      completeCount: 2
    },
    {
      id: 'multiplication',
      name: 'Multiplication Island',
      description: 'Build multiplication skills with progressive difficulty levels',
      gameType: GameType.STANDARD,
      icon: <MapPin className="h-12 w-12 text-emerald-500" />,
      difficulty: 2,
      category: 'multiplication',
      locked: false,
      completeCount: 1
    },
    {
      id: 'division',
      name: 'Division Tower',
      description: 'Learn long division concepts and practice division skills',
      gameType: GameType.STANDARD,
      icon: <Building2 className="h-12 w-12 text-violet-500" />,
      difficulty: 2,
      category: 'division',
      locked: false,
      completeCount: 0
    },
    */
    {
      id: "fractions_puzzle",
      name: "Fractions Puzzle",
      description: "Master fractions through 10 progressively harder questions",
      gameType: GameType.FRACTIONS_PUZZLE,
      icon: <Puzzle className="h-12 w-12 text-blue-500" />,
      difficulty: 3,
      category: "fractions",
      locked: false,
      completeCount: 0,
    },
    // COMMENTED OUT FOR REMOVAL FROM HOME PAGE
    // Can be uncommented later to restore this module
    /*
    {
      id: 'word-race',
      name: 'Math Word Race',
      description: 'Solve math problems against the clock - fast-paced challenge',
      gameType: GameType.WORD_RACE,
      icon: <Timer className="h-12 w-12 text-red-500" />,
      difficulty: 3,
      category: 'word-problems',
      locked: false,
      completeCount: 0
    },
    */
    /*
    {
      id: 'addition-advanced',
      name: 'Addition Challenge',
      description: 'Advanced addition with carrying and multi-digit problems',
      gameType: GameType.STANDARD,
      icon: <Calculator className="h-12 w-12 text-primary" />,
      difficulty: 2,
      category: 'addition',
      locked: false,
      completeCount: 0
    },
    {
      id: 'time',
      name: 'Time Trials',
      description: 'Learn to tell time, calculate elapsed time, and time math',
      gameType: GameType.STANDARD,
      icon: <Clock className="h-12 w-12 text-amber-500" />,
      difficulty: 2,
      category: 'time',
      locked: false,
      completeCount: 0
    },
    */
    {
      id: "decimal-defender",
      name: "Decimal Defender",
      description:
        "Master decimal skills through rounding, comparing, and operations",
      gameType: GameType.STANDARD,
      icon: <Shield className="h-12 w-12 text-cyan-500" />,
      difficulty: 4,
      category: "decimals",
      locked: false,
      completeCount: 0,
    },
    /*
    {
      id: "measurement",
      name: "Measurement Mastery",
      description: "Convert between units of length, volume, and weight",
      gameType: GameType.STANDARD,
      icon: <Ruler className="h-12 w-12 text-purple-500" />,
      difficulty: 4,
      category: "measurement",
      locked: false,
      completeCount: 0,
    },
    {
      id: "ratios_proportions",
      name: "Ratios & Proportions",
      description:
        "Practice comparing quantities and identifying proportional relationships.",
      gameType: GameType.SKILL_SELECTOR,
      icon: <BarChart4 className="h-12 w-12 text-amber-600" />,
      difficulty: 5,
      category: "ratios",
      locked: false,
      completeCount: 0,
    },
    */
    {
      id: "algebra",
      name: "Pre-Algebra Basics",
      description:
        "Master fundamental algebra skills through interactive practice",
      gameType: GameType.STANDARD,
      icon: <Calculator className="h-12 w-12 text-purple-600" />,
      difficulty: 5,
      category: "algebra",
      locked: false,
      completeCount: 0,
    },
    {
      id: "mixed",
      name: "Ultimate Challenge",
      description:
        "Test your skills with a mix of all topics at maximum difficulty",
      gameType: GameType.STANDARD,
      icon: <Trophy className="h-12 w-12 text-amber-500" />,
      difficulty: 5,
      category: "mixed",
      locked: true,
      completeCount: 0,
    },
    {
      id: "math_rush",
      name: "Math Rush",
      description: "Timed 20-question sprint in the operation of your choice",
      gameType: GameType.MATH_RUSH,
      icon: <Timer className="h-12 w-12 text-orange-500" />,
      difficulty: 3,
      category: "mixed",
      locked: false,
      completeCount: 0,
    },
  ];

  // Filter modules based on active filter
  const filteredModules = modules.filter((module) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "completed") return module.completeCount > 0;
    if (activeFilter === "not-started")
      return module.completeCount === 0 && !module.locked;
    if (activeFilter === "locked") return module.locked;
    return module.category === activeFilter;
  });

  // Get game type label and color
  const getGameTypeInfo = (type: GameType) => {
    switch (type) {
      case GameType.STANDARD:
        return { label: "Standard Q&A", color: "bg-primary" };
      case GameType.WORD_RACE:
        return { label: "Timed Challenge", color: "bg-red-500" };
      case GameType.MATH_RUSH:
        return { label: "Timed Sprint", color: "bg-orange-500" };
      case GameType.FRACTIONS_PUZZLE:
        return { label: "Skill Mastery", color: "bg-blue-500" };
      case GameType.SKILL_SELECTOR:
        return { label: "Skill Selector", color: "bg-amber-500" };
      default:
        return { label: "Standard", color: "bg-gray-500" };
    }
  };

  // Get difficulty stars
  const getDifficultyStars = (difficulty: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < difficulty ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
        />
      ));
  };

  // Start module handler
  const handleStartModule = (module: Module) => {
    console.log(`Loading ${module.gameType} module: ${module.id}`);

    // Check if this is a Math Facts module
    const isMathFactsModule = module.id.startsWith("math-facts-");

    // Clear question cache and session data for fresh question generation
    // This ensures "Play Again" gives new questions instead of repeating the same ones
    if (
      isMathFactsModule ||
      ["addition", "subtraction", "multiplication", "division"].includes(
        module.id,
      )
    ) {
      console.log("Clearing question cache for fresh session");

      // Clear React Query cache for questions
      import("@/lib/queryClient").then(({ queryClient, apiRequest }) => {
        queryClient.removeQueries({ queryKey: ["/api/questions/next"] });
        queryClient.removeQueries({ queryKey: ["/api/questions/math-facts"] });

        // Clear server session data
        apiRequest("POST", "/api/session/clear").catch((error) => {
          console.warn("Failed to clear server session:", error);
        });
      });

      // Clear localStorage question history for this user
      const userId = user?.id;
      if (userId) {
        const historyKey = `questionHistory_${userId}`;
        localStorage.removeItem(historyKey);
      }

      // Clear global seen questions cache
      localStorage.removeItem("globalSeenQuestions");
    }

    // Store the module ID and its game type
    localStorage.setItem("currentModuleId", module.id);
    localStorage.setItem("currentModuleType", module.gameType);

    // Handle different module types
    if (module.gameType === GameType.MATH_RUSH) {
      // For Math Rush, navigate to the rush setup page
      console.log("Loading math rush module, navigating to setup page");
      setLocation("/rush/setup");
      return;
    }

    if (module.gameType === GameType.FRACTIONS_PUZZLE) {
      // For Fractions Puzzle, navigate to the setup page
      console.log("Loading fractions puzzle module, navigating to setup page");
      setLocation("/fractions/setup");
      return;
    }

    if (module.id === "decimal-defender") {
      // For Decimal Defender, navigate to the setup page
      console.log("Loading decimal defender module, navigating to setup page");
      setLocation("/decimals/setup");
      return;
    }

    if (module.id === "ratios_proportions") {
      // For Ratios & Proportions, navigate to the setup page
      console.log(
        "Loading ratios proportions module, navigating to setup page",
      );
      setLocation("/ratios/setup");
      return;
    }

    if (module.id === "measurement") {
      // For Measurement Mastery, navigate to the setup page
      console.log("Loading measurement module, navigating to setup page");
      setLocation("/measurement/setup");
      return;
    }

    if (module.id === "algebra") {
      // For Pre-Algebra Basics, navigate to the setup page
      console.log("Loading algebra module, navigating to setup page");
      setLocation("/algebra/setup");
      return;
    }

    // For Math Facts modules, navigate to loading page which handles assessment flow
    if (isMathFactsModule) {
      // Extract the operation (e.g., 'addition' from 'math-facts-addition')
      const operation = module.id.split("-").pop() || "addition";
      console.log(
        `Loading Math Facts with grade=${user?.grade || "K"}, operation=${operation}`,
      );

      // Navigate to the loading page which will check if assessment is needed
      setLocation(`/math-facts/${operation}/loading`);
      return;
    }

    // Navigate to home page (question session) for non-math-facts modules
    setLocation("/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          Math Modules Dashboard
        </h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-sm font-medium">Study Progress</h3>
            </div>
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Study Time</span>
                <span className="text-xs font-medium">
                  {Math.floor(userStats.minutesPlayed)} min
                </span>
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
                <p className="text-2xl font-bold text-amber-500">
                  {userStats.totalTokens}
                </p>
                <p className="text-xs text-gray-600">Total Tokens</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Next reward at</p>
                <p className="text-sm font-medium">
                  {userStats.totalTokens + 50} tokens
                </p>
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
                <p className="text-2xl font-bold text-green-500">
                  {userStats.accuracy}%
                </p>
                <p className="text-xs text-gray-600">Accuracy</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Questions</p>
                <p className="text-sm font-medium">
                  {userStats.totalCorrect}/{userStats.totalQuestions}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex space-x-2 min-w-max">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="whitespace-nowrap"
            >
              All Modules
            </Button>
            <Button
              variant={activeFilter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("completed")}
              className="whitespace-nowrap"
            >
              Completed
            </Button>
            <Button
              variant={activeFilter === "not-started" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("not-started")}
              className="whitespace-nowrap"
            >
              Not Started
            </Button>
            <Button
              variant={activeFilter === "addition" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("addition")}
              className="whitespace-nowrap"
            >
              Addition
            </Button>
            <Button
              variant={activeFilter === "subtraction" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("subtraction")}
              className="whitespace-nowrap"
            >
              Subtraction
            </Button>
            <Button
              variant={
                activeFilter === "multiplication" ? "default" : "outline"
              }
              size="sm"
              onClick={() => setActiveFilter("multiplication")}
              className="whitespace-nowrap"
            >
              Multiplication
            </Button>
            <Button
              variant={activeFilter === "division" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("division")}
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

            // Determine if module should be locked based on grade and difficulty
            const shouldLock = () => {
              if (!user?.grade) return true;

              switch (user.grade) {
                case "K":
                  return module.difficulty > 1;
                case "1":
                  return module.difficulty > 2;
                case "2":
                  return module.difficulty > 3;
                case "3":
                  return module.difficulty > 4;
                default:
                  return false; // 4th and above have full access
              }
            };

            // Apply the lock status
            const isLocked = module.locked || shouldLock();

            return (
              <motion.div
                key={module.id}
                whileHover={{ translateY: -5 }}
                className={`bg-white rounded-xl overflow-hidden shadow-md flex flex-col
                  ${isLocked ? "opacity-60" : ""}`}
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
                  <p className="text-sm text-gray-600 mb-2">
                    {module.description}
                  </p>
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
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transform transition-transform hover:scale-105 shadow-lg hover:shadow-xl"
                    disabled={isLocked}
                    onClick={() => handleStartModule(module)}
                  >
                    {isLocked
                      ? "Locked"
                      : module.completeCount > 0
                        ? "Play Again"
                        : "Start Module"}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      <Navigation active="home" />
    </div>
  );
}
