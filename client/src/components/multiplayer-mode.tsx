import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { playSound } from '@/lib/sounds';
import { MultiplayerRoom, Question } from '@shared/schema';
import { Loader2, Users, Clock, Trophy, Shield, Zap, Crown, Share2, RefreshCw, PlusCircle, Key } from 'lucide-react';

import QuestionCard from './question-card';
import { ProgressBar } from '@/components/progress-bar';
/*
// Random adjectives and nouns for room name generation
const ROOM_ADJECTIVES = [
  "Epic", "Mighty", "Clever", "Brave", "Speedy", 
  "Blazing", "Brilliant", "Cosmic", "Dynamic", "Fearless",
  "Fiery", "Fluffy", "Gigantic", "Glowing", "Jolly",
  "Jumbo", "Magical", "Mega", "Nimble", "Peppy",
  "Rapid", "Silly", "Sparkling", "Super", "Turbo",
  "Whimsical", "Zany", "Amazing", "Electric", "Fantastic"
];

const ROOM_NOUNS = [
  "Tigers", "Eagles", "Dragons", "Wizards", "Knights",
  "Rockets", "Pandas", "Dolphins", "Llamas", "Monkeys",
  "Ninjas", "Pirates", "Dinosaurs", "Robots", "Unicorns",
  "Heroes", "Giants", "Sharks", "Wolves", "Astronauts",
  "Zombies", "Aliens", "Vikings", "Penguins", "Jaguars",
  "Explorers", "Champions", "Guardians", "Legends", "Masters"
];
*/
// Possible room statuses
type RoomStatus = 'waiting' | 'starting' | 'playing' | 'finished';

// Player in the room
type Player = {
  id: number;
  username: string;
  isHost: boolean;
  score: number;
  avatar?: string;
  grade?: string;
  isReady?: boolean;
};

// Game state
type GameState = {
  status: RoomStatus;
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  players: Player[];
  questions?: Question[];
  results: {
    id: number;
    score: number;
    rank: number;
    correct: number;
    incorrect: number;
  }[];
};

export default function MultiplayerMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'browse' | 'create' | 'join' | 'room'>('browse');
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>(user?.grade || 'K');
  // Room name generation constants
  const ROOM_ADJECTIVES = [
    "Epic", "Mighty", "Clever", "Brave", "Speedy", 
    "Blazing", "Brilliant", "Cosmic", "Dynamic", "Fearless",
    "Fiery", "Fluffy", "Gigantic", "Glowing", "Jolly",
    "Jumbo", "Magical", "Mega", "Nimble", "Peppy",
    "Rapid", "Silly", "Sparkling", "Super", "Turbo",
    "Whimsical", "Zany", "Amazing", "Electric", "Fantastic"
  ];
  
  const ROOM_NOUNS = [
    "Tigers", "Eagles", "Dragons", "Wizards", "Knights",
    "Rockets", "Pandas", "Dolphins", "Llamas", "Monkeys",
    "Ninjas", "Pirates", "Dinosaurs", "Robots", "Unicorns",
    "Heroes", "Giants", "Sharks", "Wolves", "Astronauts",
    "Zombies", "Aliens", "Vikings", "Penguins", "Jaguars",
    "Explorers", "Champions", "Guardians", "Legends", "Masters"
  ];

  // Initialize with random adjective and noun for convenience
  const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  const [selectedAdjective, setSelectedAdjective] = useState<string>(getRandomItem(ROOM_ADJECTIVES));
  const [selectedNoun, setSelectedNoun] = useState<string>(getRandomItem(ROOM_NOUNS));
  const roomName = selectedAdjective && selectedNoun ? `${selectedAdjective} ${selectedNoun}` : "";
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [gameMode, setGameMode] = useState<'cooperative' | 'competitive'>('competitive');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  
  // Use refs to track game state between renders
  const submittedRef = useRef<number | null>(null); // Track which question ID has been answered
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Game state (would normally come from WebSocket)
  const [gameState, setGameState] = useState<GameState>({
    status: 'waiting',
    currentQuestion: null,
    currentQuestionIndex: 0,
    totalQuestions: 10,
    timeRemaining: 30,
    players: [],
    results: []
  });
  
  // Fetch available rooms
  const { 
    data: rooms, 
    isLoading: isLoadingRooms,
    refetch: refetchRooms
  } = useQuery({
    queryKey: ['/api/multiplayer/rooms'],
    queryFn: async () => {
      const res = await fetch('/api/multiplayer/rooms');
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json() as Promise<MultiplayerRoom[]>;
    },
    enabled: view === 'browse'
  });
  
  // Fetch active room
  const { 
    data: activeRoom, 
    isLoading: isLoadingRoom,
    refetch: refetchActiveRoom
  } = useQuery({
    queryKey: ['/api/multiplayer/rooms', activeRoomId],
    queryFn: async () => {
      if (!activeRoomId) return null;
      const res = await fetch(`/api/multiplayer/rooms/${activeRoomId}`);
      if (!res.ok) {
        console.error('Failed to fetch room:', res.status, res.statusText)
        throw new Error('Failed to fetch room');
      }
      console.log('Fetched room:', res);
      console.log('return data:', res);
      console.log('game state: ', gameState)
      return res.json() as Promise<MultiplayerRoom & { 
        isHost: boolean;
        players: Player[];
        gameState?: {
          currentQuestion: Question | null;
          status: RoomStatus;
          playerAnswers: Record<number, { answer: string; time: number }>;
          results?: {
            id: number;
            score: number;
            rank: number;
            correct: number;
            incorrect: number;
          }[];
        };
      }>;
    },
    enabled: !!activeRoomId,
    refetchInterval: activeRoomId ? 3000 : false // Poll for updates
  });
  
  // Create a new room
  const createRoomMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      grade: string;
      category: string;
      maxPlayers: number;
      gameType: 'cooperative' | 'competitive';
      settings: { questionCount: number; timeLimit: number };
    }) => {
      // console.log('Creating room with data:', data);
      const res = await apiRequest('POST', '/api/multiplayer/rooms', data);
      if (!res.ok) throw new Error('Failed to create room');
      return res.json() as Promise<MultiplayerRoom>;
    },
    onSuccess: (data) => {
      console.log("Received room:", data)
      setActiveRoomId(data.id);
      setView('room');
      toast({
        title: 'Room created',
        description: `Room "${data.name}" has been created. Share code: ${data.roomCode}`,
        variant: 'default',
        dismisstimeout: 3000 // Auto-dismiss after 3 seconds
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating room',
        description: error.message,
        variant: 'destructive',
        dismissTimeout: 3000, // Auto-dismiss after 3 seconds
      });
    }
  });
  
  // Join a room
  const joinRoomMutation = useMutation({
    mutationFn: async (data: { roomId: number } | { roomCode: string }) => {
      const res = await apiRequest('POST', '/api/multiplayer/join', data);
      if (!res.ok) throw new Error('Failed to join room');
      return res.json() as Promise<{ roomId: number }>;
    },
    onSuccess: (data) => {
      setActiveRoomId(data.roomId);
      setView('room');
      toast({
        title: 'Joined room',
        description: 'You have joined the multiplayer room',
        variant: 'default',
        dismissTimeout: 3000, // Auto-dismiss after 3 seconds
      });
      playSound('levelUp');
    },
    onError: (error) => {
      toast({
        title: 'Error joining room',
        description: error.message,
        variant: 'destructive',
        dismissTimeout: 3000, // Auto-dismiss after 3 seconds
      });
    }
  });
  
  // Leave a room
  const leaveRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const res = await apiRequest('POST', '/api/multiplayer/leave', { roomId });
      if (!res.ok) throw new Error('Failed to leave room');
      return res.json();
    },
    onSuccess: () => {
      setActiveRoomId(null);
      setView('browse');
      refetchRooms();
      toast({
        title: 'Left room',
        description: 'You have left the multiplayer room',
        variant: 'default',
        dismissTimeout: 3000, // Auto-dismiss after 3 seconds
      });
    },
    onError: (error) => {
      toast({
        title: 'Error leaving room',
        description: error.message,
        variant: 'destructive',
        dismissTimeout: 3000, // Auto-dismiss after 3 seconds
      });
    }
  });
  
  // Start game
  const startGameMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const res = await apiRequest('POST', '/api/multiplayer/start', { roomId });
      if (!res.ok) throw new Error('Failed to start game');
      return res.json();
    },
    onSuccess: (data) => {
      refetchActiveRoom();
      
      // Set the game state to playing immediately without waiting for the next poll
      if (data?.room?.gameState?.questions?.length > 0) {
        setGameState(prev => ({
          ...prev,
          status: 'playing',
          currentQuestionIndex: 0,
          currentQuestion: data.room.gameState.questions[0],
          totalQuestions: data.room.gameState.questions.length,
          timeRemaining: data.room.settings?.timeLimit || 30,
          questions: data.room.gameState.questions
        }));
      }
      
      toast({
        title: 'Game started',
        description: 'The multiplayer game has started!',
        variant: 'default',
        dismissTimeout: 3000, // Auto-dismiss after 3 seconds
      });
      
      playSound('levelUp');
    },
    onError: (error) => {
      toast({
        title: 'Error starting game',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Submit answer - ULTRA AGGRESSIVE PROGRESSION
  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { roomId: number; answer: string }) => {
      const res = await apiRequest('POST', '/api/multiplayer/answer', data);
      if (!res.ok) throw new Error('Failed to submit answer');
      return res.json() as Promise<{ 
        correct: boolean, 
        nextQuestion?: Question, 
        gameOver?: boolean,
        tokensEarned?: number
      }>;
    },
    onSuccess: (data) => {
      // NO SOUND HERE - sound is already played in the handleAnswerClick function
      
      console.log('ANSWER PROCESSED! Handling answer result:', { 
        correct: data.correct, 
        gameOver: data.gameOver,
        hasNextQuestion: !!data.nextQuestion,
        nextQuestionId: data.nextQuestion?.id
      });
      
      // Critical fix to prevent multiple toasts and sounds
      // Check if there is already a toast with this ID - if so, don't create another one
      const existingToastId = `answer-${gameState.currentQuestion?.id}`;
      const existingToasts = document.querySelectorAll(`[data-toast-id="${existingToastId}"]`);
      
      if (existingToasts.length > 0) {
        console.log(`Updating existing toast (#${existingToastId}) rather than creating duplicate`);
      } else {
        // Only create toast if one doesn't already exist for this question
        toast({
          id: existingToastId,
          title: data.correct ? 'Correct!' : 'Incorrect',
          description: data.correct ? `+${data.tokensEarned || 1} tokens` : 'Keep going!',
          variant: data.correct ? 'default' : 'destructive',
          dismissTimeout: 550, // ULTRA short auto-dismiss - about half a second
        });
      }
      
      // ULTRA AGGRESSIVE IMMEDIATE HANDLING: 
      if (data.gameOver) {
        console.log('Game is over, setting finished state IMMEDIATELY');
        
        // FORCE all game state to finished status
        setGameState(prev => ({
          ...prev,
          status: 'finished'
        }));
        
        // Immediately trigger a refetch to get final results
        refetchActiveRoom();
      } else if (data.nextQuestion) {
        // ULTRA AGGRESSIVE immediate question transition
        console.log('ULTRA AGGRESSIVELY moving to next question:', data.nextQuestion.id);
        
        // 1. FORCE STOP any timers
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // 2. RESET ALL answer submission state
        submittedRef.current = null; // Clear submission tracking
        setIsAnswerSubmitted(false); // Re-enable answer buttons
        
        // 3. IMMEDIATELY apply the next question in local state
        // This happens BEFORE any server sync or refresh
        setGameState(prev => ({
          ...prev,
          currentQuestion: data.nextQuestion,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          timeRemaining: activeRoom?.settings?.timeLimit || 30
        }));
        
        // 4. Forced refetch with minimal delay to synchronize other state (scores, etc.)
        // But we don't wait for this to show the next question!
        setTimeout(() => {
          refetchActiveRoom();
        }, 200);
      } else {
        console.error('CRITICAL ERROR: No next question received from server!');
        
        // Even though we have an error, try to refetch anyway to recover
        refetchActiveRoom();
      }
    },
    onError: (error) => {
      // Clear submission state on error to allow retrying
      submittedRef.current = null;
      
      toast({
        title: 'Error submitting answer',
        description: error.message,
        variant: 'destructive',
        dismissTimeout: 3000,
      });
      
      // Try to refetch to recover from error state
      refetchActiveRoom();
    }
  });
  
  // Update room settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { 
      roomId: number; 
      settings: { 
        questionCount?: number; 
        timeLimit?: number; 
        maxPlayers?: number;
        gameType?: 'cooperative' | 'competitive';
      } 
    }) => {
      const res = await apiRequest('POST', '/api/multiplayer/settings', data);
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      refetchActiveRoom();
      toast({
        title: 'Settings updated',
        description: 'Room settings have been updated',
        variant: 'default',
        dismissTimeout: 3000, // Auto-dismiss after 3 seconds
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating settings',
        description: error.message,
        variant: 'destructive',
        dismissTimeout: 3000, // Auto-dismiss after 3 seconds
      });
    }
  });
  
  // Update game state from active room data - MORE AGGRESSIVE ABOUT LOCAL STATE
  useEffect(() => {
    if (activeRoom?.gameState) {
      // Determine if we should update the current question 
      // We're now MORE aggressive about keeping local state in control when an answer is submitted
      const isSubmitting = submittedRef.current !== null;
      const isNewQuestion = activeRoom.gameState.currentQuestion?.id !== gameState.currentQuestion?.id;
        
      // If we're in the submission process, don't update ANY state except final results
      if (isSubmitting && !isNewQuestion && activeRoom.gameState.status !== 'finished') {
        console.log('PREVENTING state update during answer submission - maintaining local state control');
        
        // Only update the results if the game is finished - this is critical
        if (activeRoom.gameState.status === 'finished') {
          setGameState(prev => ({
            ...prev,
            status: 'finished',
            results: activeRoom.gameState?.results || []
          }));
        }
        
        // Skip the rest of the state update
        return;
      }
      
      // Full state update for non-submission cases
      setGameState(prev => ({
        ...prev,
        status: activeRoom.gameState.status || 'waiting',
        currentQuestion: isNewQuestion ? activeRoom.gameState.currentQuestion : prev.currentQuestion,
        currentQuestionIndex: activeRoom.gameState?.currentQuestionIndex || 0,
        totalQuestions: activeRoom.settings?.questionCount || 10,
        players: activeRoom.players || [],
        questions: activeRoom.gameState?.questions || [],
        results: activeRoom.gameState?.results || []
      }));
      
      // Only log when actually updating
      console.log('Game state updated:', {
        currentQuestionId: activeRoom.gameState.currentQuestion?.id,
        status: activeRoom.gameState.status,
        isSubmitting,
        isNewQuestion
      });
    } else if (activeRoom) {
      setGameState(prev => ({
        ...prev,
        status: 'waiting',
        players: activeRoom.players || []
      }));
    }
  }, [activeRoom, gameState.currentQuestion?.id]);
  
  // Start the game countdown timer
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.currentQuestion) {
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Reset the "submitted" state for each new question
      setIsAnswerSubmitted(false);
      
      // Set time remaining based on room settings
      setGameState(prev => ({
        ...prev,
        timeRemaining: activeRoom?.settings?.timeLimit || 30
      }));
      
      // Start a new countdown timer
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;
          
          // If time runs out, submit a blank answer
          if (newTimeRemaining <= 0 && activeRoom) {
            clearInterval(timerRef.current!);
            
            // Only submit if we haven't already
            if (submittedRef.current !== gameState.currentQuestion?.id) {
              submittedRef.current = gameState.currentQuestion?.id;
              setIsAnswerSubmitted(true);
              
              submitAnswerMutation.mutate({
                roomId: activeRoom.id,
                answer: ''
              });
            }
            
            return {
              ...prev,
              timeRemaining: 0
            };
          }
          
          return {
            ...prev,
            timeRemaining: newTimeRemaining
          };
        });
      }, 1000);
      
      // Cleanup timer on unmount
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [gameState.status, gameState.currentQuestion, activeRoom]);
  
  // Handle creating a room
  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a room name',
        variant: 'destructive',
        dismisstimeout: 3000, // Auto-dismiss after 3 seconds
      });
      return;
    }
    
    createRoomMutation.mutate({
      name: roomName,
      grade: selectedGrade,
      category: selectedCategory,
      maxPlayers: maxPlayers,
      gameType: gameMode,
      settings: {
        questionCount: questionCount,
        timeLimit: timeLimit
      }
    });
  };
  
  // Handle joining a room by code
  const handleJoinByCode = () => {
    if (!roomCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a room code',
        variant: 'destructive',
        dismissTimeout: 3000, // Auto-dismiss after 3 seconds
      });
      return;
    }
    
    joinRoomMutation.mutate({ roomCode });
  };
  
  // Handle joining a room
  const handleJoinRoom = (roomId: number) => {
    joinRoomMutation.mutate({ roomId });
  };
  
  // Handle leaving a room
  const handleLeaveRoom = () => {
    if (activeRoomId) {
      leaveRoomMutation.mutate(activeRoomId);
    } else {
      setView('browse');
    }
  };
  
  // Handle starting the game
  const handleStartGame = () => {
    if (activeRoomId) {
      startGameMutation.mutate(activeRoomId);
    }
  };
  
  // Handle answering a question - ULTRA AGGRESSIVE IMMEDIATE PROGRESSION
  const handleAnswerSubmit = (answer: string) => {
    if (activeRoomId && gameState.status === 'playing') {
      // Prevent multiple submissions for the same question
      if (submittedRef.current === gameState.currentQuestion?.id) {
        console.log('Preventing duplicate answer submission for question:', gameState.currentQuestion?.id);
        return;
      }
      
      console.log('ULTRA AGGRESSIVE SUBMITTING ANSWER for question:', gameState.currentQuestion?.id);
      
      // Track that we've submitted an answer for this question IMMEDIATELY
      submittedRef.current = gameState.currentQuestion?.id;
      
      // IMMEDIATELY kill timer - extremely important for UX
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null; // Full reset to null
      }
      
      // INSTANTLY disable answer options
      setIsAnswerSubmitted(true);
      
      // Local check for instant feedback even before server responds
      const isCorrect = answer.trim().toLowerCase() === gameState.currentQuestion?.answer.trim().toLowerCase();
      
      // IMMEDIATELY play sound - don't wait for server
      isCorrect ? playSound('correct') : playSound('incorrect');
      
      // CRITICAL FIX: Check if toast already exists before creating a new one
      // This prevents duplicate toasts from appearing
      const existingToastId = `answer-${gameState.currentQuestion?.id}`;
      const existingToasts = document.querySelectorAll(`[data-toast-id="${existingToastId}"]`);
      
      if (existingToasts.length > 0) {
        console.log(`Skipping duplicate toast for answer to question #${gameState.currentQuestion?.id}`);
      } else {
        // Only create toast if one doesn't already exist for this question
        toast({
          id: existingToastId, // Use ID to prevent duplicates
          title: isCorrect ? 'Correct!' : 'Incorrect',
          description: isCorrect ? '+1 token' : 'Keep going!',
          variant: isCorrect ? 'default' : 'destructive',
          dismissTimeout: 750, // Ultra short auto-dismiss
        });
      }
      
      // FORCE timer to 0 to give visual indication we're done with this question
      setGameState(prev => ({
        ...prev,
        timeRemaining: 0
      }));
      
      // Submit to server with minimal delay - this is the only network call
      submitAnswerMutation.mutate({
        roomId: activeRoomId,
        answer
      });
    }
  };
  
  // Handle updating room settings
  const handleUpdateSettings = () => {
    if (activeRoomId) {
      updateSettingsMutation.mutate({
        roomId: activeRoomId,
        settings: {
          questionCount,
          timeLimit,
          maxPlayers,
          gameType: gameMode
        }
      });
    }
  };

  // Render the question card with ULTRA AGGRESSIVE immediate feedback
  const renderCurrentQuestion = () => {
    if (!gameState.currentQuestion) return null;
    
    // ALWAYS show answer immediately after submission - CRITICAL for UX
    // This is what the user specifically requested - instant answer display
    const showAnswer = isAnswerSubmitted;
    
    // Create a unique key for EACH question to force complete re-render
    // This ensures the component fully refreshes between questions
    const questionKey = `question-${gameState.currentQuestion.id}-${isAnswerSubmitted ? 'answered' : 'unanswered'}`;
    
    console.log('RENDERING QUESTION WITH INSTANT FEEDBACK:', {
      questionId: gameState.currentQuestion.id,
      isAnswerSubmitted,
      showAnswer,
      uniqueKey: questionKey
    });
    
    return (
      <div className="flex flex-col">
        <QuestionCard
          key={questionKey} // Ultra aggressive unique key for proper re-rendering
          question={gameState.currentQuestion}
          onAnswer={handleAnswerSubmit}
          disableOptions={isAnswerSubmitted} // Immediate disable after selection
          showCorrectAnswer={showAnswer} // Immediately show correct answer
          showTimer={false} // No timer display - user requested removal of waiting periods
        />
      </div>
    );
  };

  // Rest of the component (render methods, etc.)
  // ...

  // Browse rooms view
  if (view === 'browse') {
    return (
      <div className="multiplayer-mode">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Multiplayer Mode</h2>
          <p className="text-muted-foreground">
            Play with friends in real-time math challenges
          </p>
        </div>
        
        <Tabs defaultValue="join" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="join">Join a Room</TabsTrigger>
            <TabsTrigger value="create">Create a Room</TabsTrigger>
          </TabsList>
          
          <TabsContent value="join" className="space-y-4 pt-4">
            <div className="flex flex-col space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Join by Code</CardTitle>
                  <CardDescription>
                    Enter a room code to join a private game
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                      <Label htmlFor="roomCode">Room Code</Label>
                      <Input
                        id="roomCode"
                        placeholder="Enter 6-character code"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        maxLength={6}
                      />
                    </div>
                    <Button 
                      className="mt-8" 
                      onClick={handleJoinByCode}
                      disabled={!roomCode || joinRoomMutation.isPending}
                    >
                      {joinRoomMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Key className="h-4 w-4 mr-2" />
                      )}
                      Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Active Games</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => refetchRooms()}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    Join an existing multiplayer game
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingRooms ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !rooms || rooms.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p>No active games found</p>
                      <p className="text-sm mt-1">Create a new game or try again later</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rooms.map(room => (
                        <Card key={room.id} className="overflow-hidden">
                          <div className="flex items-center p-4">
                            <div className="flex-1">
                              <div className="font-medium">{room.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {room.gameType === 'competitive' ? 'Competitive' : 'Cooperative'} • {room.grade} Grade
                              </div>
                              <div className="flex mt-2 space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {room.participants?.length || 0}/{room.maxParticipants || 4}
                                </Badge>
                                {room.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {room.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleJoinRoom(room.id)}
                              disabled={joinRoomMutation.isPending}
                            >
                              Join Game
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setView('create')}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create New Game
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="create" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Create a Multiplayer Room</CardTitle>
                <CardDescription>
                  Customize your game settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Room Name Generator</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={selectedAdjective} onValueChange={setSelectedAdjective}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select adjective" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROOM_ADJECTIVES.map(adj => (
                              <SelectItem key={adj} value={adj}>
                                {adj}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select value={selectedNoun} onValueChange={setSelectedNoun}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select noun" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROOM_NOUNS.map(noun => (
                              <SelectItem key={noun} value={noun}>
                                {noun}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-md text-center">
                      <div className="text-xs text-muted-foreground">Room Name</div>
                      <div className="font-bold text-lg">{roomName || "Choose name components above"}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="grade">Grade Level</Label>
                      <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger id="grade">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {['K', '1', '2', '3', '4', '5', '6'].map(grade => (
                            <SelectItem key={grade} value={grade}>
                              Grade {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="addition">Addition</SelectItem>
                          <SelectItem value="subtraction">Subtraction</SelectItem>
                          <SelectItem value="multiplication">Multiplication</SelectItem>
                          <SelectItem value="division">Division</SelectItem>
                          <SelectItem value="fractions">Fractions</SelectItem>
                          <SelectItem value="geometry">Geometry</SelectItem>
                          <SelectItem value="time">Time</SelectItem>
                          <SelectItem value="money">Money</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="gameMode">Game Mode</Label>
                      <Select value={gameMode} onValueChange={(value: 'competitive' | 'cooperative') => setGameMode(value)}>
                        <SelectTrigger id="gameMode">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="competitive">
                            <div className="flex items-center">
                              <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                              Competitive
                            </div>
                          </SelectItem>
                          <SelectItem value="cooperative">
                            <div className="flex items-center">
                              <Shield className="h-4 w-4 mr-2 text-blue-500" />
                              Cooperative
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="maxPlayers">Max Players</Label>
                      <Select 
                        value={maxPlayers.toString()} 
                        onValueChange={(value) => setMaxPlayers(parseInt(value))}
                      >
                        <SelectTrigger id="maxPlayers">
                          <SelectValue placeholder="Select max players" />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} players
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="questionCount">Number of Questions</Label>
                      <Select 
                        value={questionCount.toString()} 
                        onValueChange={(value) => setQuestionCount(parseInt(value))}
                      >
                        <SelectTrigger id="questionCount">
                          <SelectValue placeholder="Select question count" />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} questions
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="timeLimit">Time per Question (seconds)</Label>
                      <Select 
                        value={timeLimit.toString()} 
                        onValueChange={(value) => setTimeLimit(parseInt(value))}
                      >
                        <SelectTrigger id="timeLimit">
                          <SelectValue placeholder="Select time limit" />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 15, 20, 30, 45, 60].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} seconds
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setView('browse')}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateRoom}
                  disabled={!roomName || createRoomMutation.isPending}
                >
                  {createRoomMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create a Room
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  // Room view (waiting, playing, or results)
  console.log('Rendering room view with activeRoomId:', activeRoomId)
  console.log('isActive?:', activeRoom);
  if (activeRoomId) {
    // Loading room
    if (isLoadingRoom && !activeRoom) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Joining game...</p>
        </div>
      );
    }
    
    // Room error
    if (!activeRoom) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load multiplayer room</CardDescription>
          </CardHeader>
          <CardContent>
            <p>There was a problem loading the room. It may no longer exist.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setView('browse')}>
              Back to Browse
            </Button>
          </CardFooter>
        </Card>
      );
    }
    
    // Game results view
    if (gameState.status === 'finished') {
      const sortedResults = [...gameState.results].sort((a, b) => b.score - a.score);
      const currentPlayer = sortedResults.find(r => r.id === user?.id);
      
      return (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center">
              <Trophy className="text-yellow-500 h-6 w-6 mr-2" />
              Game Results
            </CardTitle>
            <CardDescription>
              {activeRoom.gameType === 'competitive' ? 'Competitive' : 'Cooperative'} Mode • {activeRoom.grade} Grade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Leaderboard</h3>
              <div className="space-y-2">
                {sortedResults.map((result, index) => {
                  const player = activeRoom.players.find(p => p.id === result.id);
                  const isCurrentUser = result.id === user?.id;
                  
                  return (
                    <div 
                      key={result.id}
                      className={`flex items-center p-3 rounded-md ${isCurrentUser ? 'bg-primary/10' : 'bg-muted'}`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground font-bold mr-3">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium flex items-center">
                          {player?.username || 'Unknown Player'}
                          {index === 0 && <Crown className="h-4 w-4 ml-1 text-yellow-500" />}
                          {isCurrentUser && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">You</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Score: {result.score} • Correct: {result.correct} • Incorrect: {result.incorrect}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {currentPlayer && (
              <div className="mb-6 p-4 border rounded-lg bg-card">
                <h3 className="text-lg font-semibold mb-2">Your Results</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted p-3 rounded-md">
                    <div className="text-2xl font-bold">{currentPlayer.score}</div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <div className="text-2xl font-bold text-green-500">{currentPlayer.correct}</div>
                    <div className="text-xs text-muted-foreground">Correct</div>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <div className="text-2xl font-bold text-red-500">{currentPlayer.incorrect}</div>
                    <div className="text-xs text-muted-foreground">Incorrect</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 items-center">
            <Button 
              className="w-full" 
              variant="default" 
              onClick={() => {
                if (activeRoom.isHost) {
                  handleStartGame();
                } else {
                  // Just reset the game state for the client to waiting
                  setGameState(prev => ({
                    ...prev,
                    status: 'waiting'
                  }));
                }
              }}
            >
              <Zap className="h-4 w-4 mr-2" />
              {activeRoom.isHost ? 'Play Again' : 'Wait for Host'}
            </Button>
            <Button 
              variant="outline"
              onClick={handleLeaveRoom}
              className="w-full"
            >
              Exit Game
            </Button>
          </CardFooter>
        </Card>
      );
    }
    
    // Waiting room
    if (gameState.status === 'waiting' || gameState.status === 'starting') {
      return (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{activeRoom.name}</CardTitle>
              <Badge variant="outline">
                {activeRoom.gameType === 'competitive' ? (
                  <Trophy className="h-3 w-3 mr-1 text-yellow-500" />
                ) : (
                  <Shield className="h-3 w-3 mr-1 text-blue-500" />
                )}
                {activeRoom.gameType === 'competitive' ? 'Competitive' : 'Cooperative'}
              </Badge>
            </div>
            <CardDescription className="flex items-center">
              <span className="mr-3">Room Code: <span className="font-mono font-bold">{activeRoom.roomCode}</span></span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2" 
                onClick={() => {
                  navigator.clipboard.writeText(activeRoom.roomCode);
                  toast({
                    title: 'Copied!',
                    description: 'Room code copied to clipboard',
                    variant: 'default',
                    dismissTimeout: 3000, // Auto-dismiss after 3 seconds
                  });
                }}
              >
                <Share2 className="h-3 w-3" />
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Players ({activeRoom.participants?.length}/{activeRoom.maxParticipants})</h3>
              <div className="grid grid-cols-2 gap-2">
                {activeRoom.players.map((player) => (
                  <div 
                    key={player.id} 
                    className={`flex items-center p-2 rounded-md ${player.isHost ? 'bg-primary/10' : 'bg-muted'}`}
                  >
                    <div className="mr-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center uppercase font-bold">
                      {player.username.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center">
                        {player.username}
                        {player.isHost && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player.grade ? `Grade ${player.grade}` : ''} {player.isReady && '• Ready'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {activeRoom.isHost && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Game Settings</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-xs text-muted-foreground">Questions</div>
                    <div className="font-semibold">{activeRoom.settings?.questionCount || 10}</div>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-xs text-muted-foreground">Time Limit</div>
                    <div className="font-semibold">{activeRoom.settings?.timeLimit || 30}s</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="grid gap-2">
                    <Label htmlFor="questionCount">Questions</Label>
                    <Select 
                      value={questionCount.toString()} 
                      onValueChange={(value) => setQuestionCount(parseInt(value))}
                    >
                      <SelectTrigger id="questionCount">
                        <SelectValue placeholder="Number of Questions" />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 15, 20].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} questions
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="timeLimit">Time Limit</Label>
                    <Select 
                      value={timeLimit.toString()} 
                      onValueChange={(value) => setTimeLimit(parseInt(value))}
                    >
                      <SelectTrigger id="timeLimit">
                        <SelectValue placeholder="Seconds per Question" />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 15, 20, 30, 45, 60].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} seconds
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleUpdateSettings}
                  className="w-full mb-4"
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Settings
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            {activeRoom.isHost ? (
              <Button 
                className="w-full" 
                onClick={handleStartGame}
                disabled={
                  gameState.status === 'starting' || 
                  startGameMutation.isPending ||
                  activeRoom.players.length < 1
                }
              >
                {(gameState.status === 'starting' || startGameMutation.isPending) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {activeRoom.players.length < 1 
                  ? 'Waiting for Players...' 
                  : (gameState.status === 'starting' || startGameMutation.isPending) 
                    ? 'Starting Game...' 
                    : 'Start Game'
                }
              </Button>
            ) : (
              <Button 
                className="w-full" 
                disabled
              >
                <Clock className="h-4 w-4 mr-2" />
                Waiting for Host to Start
              </Button>
            )}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleLeaveRoom}
            >
              Leave Room
            </Button>
          </CardFooter>
        </Card>
      );
    }
    
    // Playing view
    return (
      <div className="game-view">
        <div className="relative">
          <div className="flex justify-between items-center mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLeaveRoom}
              disabled={submitAnswerMutation.isPending}
            >
              Leave Game
            </Button>
            
            <div className="text-center">
              <div className="text-sm font-medium mb-1">
                Question {gameState.currentQuestionIndex + 1} of {gameState.totalQuestions}
              </div>
              <div className="w-32 mx-auto">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${((gameState.currentQuestionIndex + 1) / gameState.totalQuestions) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span className={`font-mono ${gameState.timeRemaining < 5 ? 'text-red-500 animate-pulse' : ''}`}>
                {gameState.timeRemaining}s
              </span>
            </div>
          </div>
          
          <div className="mb-4">
            <ProgressBar
              progress={gameState.timeRemaining / (activeRoom.settings?.timeLimit || 30) * 100}
              height={8}
              color={gameState.timeRemaining < 5 ? 'red' : 'green'}
              className="w-full"
            />
          </div>
        </div>
        
        {/* Render the question card with the current question */}
        {renderCurrentQuestion()}
        
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Players</h3>
          <div className="grid grid-cols-2 gap-2">
            {activeRoom.players.map((player) => {
              // Find player answer status for current question
              const hasAnswered = activeRoom.gameState?.playerAnswers?.[player.id]?.answer !== undefined;
              
              return (
                <div 
                  key={player.id}
                  className={`flex items-center p-2 rounded-md ${hasAnswered ? 'bg-primary/10' : 'bg-muted'}`}
                >
                  <div className="mr-2 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold uppercase">
                    {player.username.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center">
                      {player.username}
                      {player.isHost && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Score: {player.score}</span>
                      {hasAnswered && (
                        <Badge variant="outline" className="text-xs">
                          Answered
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  
  // Fallback
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <p className="text-muted-foreground mb-4">Something went wrong with the multiplayer mode.</p>
      <Button onClick={() => setView('browse')}>
        Back to Browse
      </Button>
    </div>
  );
}