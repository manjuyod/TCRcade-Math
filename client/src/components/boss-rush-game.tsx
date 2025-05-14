/**
 * Boss Rush Game Component
 * 
 * A timed "math-facts vs. boss" mini-game where players answer math questions
 * to defeat increasingly difficult bosses.
 * 
 * Game Flow:
 * 1. Level setup - Level 1 boss: 100 HP. Each level doubles HP (200 HP, 400 HP, etc.)
 * 2. Ask questions - Each turn randomly picks an operation and problem
 *    - 10-second countdown for each question
 *    - Correct answers deal damage equal to seconds remaining
 * 3. Boss advance - Every two questions, the boss steps closer
 *    - After 10 steps, the boss reaches the player and game over
 * 4. Victory - If boss HP <= 0, player advances to next level
 * 5. Exit - Returns to main application when player loses or quits
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'wouter';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Shield, Skull, Heart, Timer, Trophy, X } from 'lucide-react';

// Types
type MathOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';
type MathProblem = {
  operation: MathOperation;
  operand1: number;
  operand2: number;
  answer: number;
};

interface BossRushProps {
  onExit: () => void;
  userName?: string;
}

// MATH_FACTS_TABLE (mapped from mathFacts.ts structure)
const OPERATION_SYMBOLS = {
  addition: '+',
  subtraction: '-',
  multiplication: '×',
  division: '÷'
};

// Create some math facts tables for the game
const createMathFactsTable = () => {
  // For this demo, we'll create a smaller set of problems
  return {
    addition: generateProblemSet('addition'),
    subtraction: generateProblemSet('subtraction'),
    multiplication: generateProblemSet('multiplication'),
    division: generateProblemSet('division')
  };
};

// Generate a set of problems for each operation
function generateProblemSet(operation: MathOperation): MathProblem[] {
  const problems: MathProblem[] = [];
  
  // Different ranges for different operations
  let range1: [number, number] = [1, 10];
  let range2: [number, number] = [1, 10];
  
  switch (operation) {
    case 'addition':
      range1 = [1, 20];
      range2 = [1, 20];
      break;
    case 'subtraction':
      range1 = [5, 20];
      range2 = [1, 10];
      break;
    case 'multiplication':
      range1 = [1, 12];
      range2 = [1, 12];
      break;
    case 'division':
      // For division, we'll generate multiplication problems and reverse them
      range1 = [1, 10];
      range2 = [1, 10];
      break;
  }
  
  // Generate the problems
  for (let i = 0; i < 30; i++) {
    let operand1, operand2, answer;
    
    if (operation === 'division') {
      // For division, ensure clean division by generating multiplications first
      operand2 = Math.floor(Math.random() * (range2[1] - range2[0])) + range2[0];
      answer = Math.floor(Math.random() * (range1[1] - range1[0])) + range1[0];
      operand1 = operand2 * answer;
    } else if (operation === 'subtraction') {
      // For subtraction, ensure result is positive
      operand1 = Math.floor(Math.random() * (range1[1] - range1[0])) + range1[0];
      operand2 = Math.floor(Math.random() * Math.min(operand1, range2[1])) + range2[0];
      answer = operand1 - operand2;
    } else {
      operand1 = Math.floor(Math.random() * (range1[1] - range1[0])) + range1[0];
      operand2 = Math.floor(Math.random() * (range2[1] - range2[0])) + range2[0];
      
      if (operation === 'addition') {
        answer = operand1 + operand2;
      } else { // multiplication
        answer = operand1 * operand2;
      }
    }
    
    problems.push({
      operation,
      operand1,
      operand2,
      answer
    });
  }
  
  return problems;
}

// Main Boss Rush Game Component
export default function BossRushGame({ onExit, userName = 'Player' }: BossRushProps) {
  // Game state
  const [level, setLevel] = useState<number>(1);
  const [bossHp, setBossHp] = useState<number>(100);
  const [maxBossHp, setMaxBossHp] = useState<number>(100);
  const [steps, setSteps] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState<boolean>(false);
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);
  
  // Current question state
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [timeRemaining, setTimeRemaining] = useState<number>(10);
  const [damage, setDamage] = useState<number>(0);
  
  // Refs for intervals and input
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mathFactsRef = useRef(createMathFactsTable());
  
  // Hooks
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Initialize the game
  useEffect(() => {
    startLevel(level);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Start a new level
  const startLevel = (levelNumber: number) => {
    // Reset game state for the new level
    const newMaxHp = 100 * Math.pow(2, levelNumber - 1);
    setMaxBossHp(newMaxHp);
    setBossHp(newMaxHp);
    setSteps(0);
    setGameOver(false);
    setVictory(false);
    setQuestionsAnswered(0);
    
    // Show level start toast
    toast({
      title: `Level ${levelNumber}`,
      description: `Defeat the boss with ${newMaxHp} HP!`,
      dismisstimeout: 3000
    });
    
    // Generate the first question
    generateQuestion();
  };
  
  // Generate a new math question
  const generateQuestion = () => {
    // Reset timer and answer state
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeRemaining(10);
    setUserAnswer('');
    setAnswerStatus('idle');
    
    // Randomly select an operation
    const operations: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    // Get problem set for the operation
    const problems = mathFactsRef.current[operation];
    
    // Randomly select a problem
    const randomProblem = problems[Math.floor(Math.random() * problems.length)];
    setCurrentProblem(randomProblem);
    
    // Focus the input field
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    
    // Start the timer
    startTimer();
  };
  
  // Start the countdown timer
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setTimeRemaining(10);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          handleAnswerSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Handle answer submission
  const handleAnswerSubmit = (timeUp: boolean = false) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (!currentProblem) return;
    
    const isCorrect = parseInt(userAnswer) === currentProblem.answer;
    setAnswerStatus(isCorrect ? 'correct' : 'wrong');
    
    if (isCorrect) {
      // Deal damage based on time remaining
      const damageDealt = timeRemaining;
      setDamage(damageDealt);
      
      // Update boss HP
      setBossHp(prev => {
        const newHP = Math.max(0, prev - damageDealt);
        
        // Check for victory
        if (newHP <= 0) {
          handleVictory();
        }
        
        return newHP;
      });
      
      // Show success toast
      toast({
        title: 'Correct!',
        description: `Dealt ${damageDealt} damage to the boss!`,
        dismisstimeout: 1500
      });
    } else {
      // Wrong answer feedback
      if (timeUp) {
        toast({
          title: 'Time\'s up!',
          description: `The answer was ${currentProblem.answer}`,
          variant: 'destructive',
          dismisstimeout: 1500
        });
      } else {
        toast({
          title: 'Wrong!',
          description: `The answer was ${currentProblem.answer}`,
          variant: 'destructive',
          dismisstimeout: 1500
        });
      }
    }
    
    // Update questions answered and check boss advance
    setQuestionsAnswered(prev => {
      const newCount = prev + 1;
      
      // Every two questions, boss advances one step
      if (newCount % 2 === 0) {
        advanceBoss();
      }
      
      return newCount;
    });
    
    // Generate a new question after a delay
    setTimeout(() => {
      if (!gameOver && !victory) {
        generateQuestion();
      }
    }, 1500);
  };
  
  // Handle boss advancement
  const advanceBoss = () => {
    setSteps(prev => {
      const newSteps = prev + 1;
      
      // Check for game over
      if (newSteps >= 10) {
        handleGameOver();
      }
      
      return newSteps;
    });
  };
  
  // Handle victory
  const handleVictory = () => {
    setVictory(true);
    
    toast({
      title: 'Victory!',
      description: `You defeated the level ${level} boss!`,
      dismisstimeout: 3000
    });
    
    // Show victory screen and prepare for next level
    setTimeout(() => {
      setLevel(prev => prev + 1);
      startLevel(level + 1);
    }, 3000);
  };
  
  // Handle game over
  const handleGameOver = () => {
    setGameOver(true);
    
    toast({
      title: 'Game Over!',
      description: `The boss reached you! You made it to level ${level}`,
      variant: 'destructive',
      dismisstimeout: 3000
    });
    
    // Return to menu after a delay
    setTimeout(() => {
      onExit();
    }, 3000);
  };
  
  // Handle user input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input
    const value = e.target.value.replace(/[^0-9]/g, '');
    setUserAnswer(value);
  };
  
  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userAnswer) {
      handleAnswerSubmit();
    }
  };
  
  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'q' || e.key === 'Q') {
      setShowQuitConfirm(true);
    }
  };
  
  // Render the current problem
  const renderProblem = () => {
    if (!currentProblem) return null;
    
    const { operation, operand1, operand2 } = currentProblem;
    const symbol = OPERATION_SYMBOLS[operation];
    
    return (
      <div className="text-5xl font-bold text-center my-8">
        {operand1} {symbol} {operand2} = ?
      </div>
    );
  };
  
  return (
    <div 
      className="flex flex-col items-center justify-center p-4 h-full"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center">
            <CardTitle>Boss Rush - Level {level}</CardTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowQuitConfirm(true)}
              aria-label="Quit game"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Boss HP Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="flex items-center">
                <Skull className="mr-1 h-4 w-4 text-destructive" /> 
                Boss HP: {bossHp}/{maxBossHp}
              </span>
              <span className="flex items-center">
                <Shield className="mr-1 h-4 w-4 text-primary" />
                Steps: {steps}/10
              </span>
            </div>
            <Progress 
              value={(bossHp / maxBossHp) * 100} 
              className="h-2 bg-muted" 
              indicatorClassName="bg-destructive"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Timer */}
          <div className="flex justify-center space-x-2 text-sm mb-2">
            <Timer className="h-4 w-4 animate-pulse" />
            <span>{timeRemaining} seconds</span>
          </div>
          
          {/* Current Problem */}
          {renderProblem()}
          
          {/* Answer Form */}
          <form onSubmit={handleFormSubmit} className="mt-6">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={userAnswer}
                onChange={handleInputChange}
                className={`flex-1 px-4 py-2 text-2xl text-center border rounded-md ${
                  answerStatus === 'correct' ? 'border-green-500 bg-green-50' :
                  answerStatus === 'wrong' ? 'border-red-500 bg-red-50' :
                  'border-input'
                }`}
                placeholder="Enter answer"
                autoFocus
                disabled={answerStatus !== 'idle'}
              />
              <Button type="submit" disabled={answerStatus !== 'idle' || !userAnswer}>
                Submit
              </Button>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <div>Questions: {questionsAnswered}</div>
          <div>Press 'Q' to quit</div>
        </CardFooter>
      </Card>
      
      {/* Quit Confirmation Dialog */}
      <AlertDialog open={showQuitConfirm} onOpenChange={setShowQuitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quit Game?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to quit? Your progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onExit}>Quit Game</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}