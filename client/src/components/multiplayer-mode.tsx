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
  const [roomName, setRoomName] = useState<string>('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [gameMode, setGameMode] = useState<'cooperative' | 'competitive'>('competitive');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timeLimit, setTimeLimit] = useState<number>(30);
  
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
  
  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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
      if (!res.ok) throw new Error('Failed to fetch room');
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
      const res = await apiRequest('POST', '/api/multiplayer/rooms', data);
      if (!res.ok) throw new Error('Failed to create room');
      return res.json() as Promise<MultiplayerRoom>;
    },
    onSuccess: (data) => {
      setActiveRoomId(data.id);
      setView('room');
      toast({
        title: 'Room created',
        description: `Room "${data.name}" has been created. Share code: ${data.roomCode}`,
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating room',
        description: error.message,
        variant: 'destructive',
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
      });
      playSound('levelUp');
    },
    onError: (error) => {
      toast({
        title: 'Error joining room',
        description: error.message,
        variant: 'destructive',
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
      });
    },
    onError: (error) => {
      toast({
        title: 'Error leaving room',
        description: error.message,
        variant: 'destructive',
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
    onSuccess: () => {
      refetchActiveRoom();
      toast({
        title: 'Game started',
        description: 'The multiplayer game has started!',
        variant: 'default',
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
  
  // Submit answer
  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { roomId: number; answer: string }) => {
      const res = await apiRequest('POST', '/api/multiplayer/answer', data);
      if (!res.ok) throw new Error('Failed to submit answer');
      return res.json() as Promise<{ correct: boolean }>;
    },
    onSuccess: (data) => {
      // Play sound based on correctness
      data.correct ? playSound('correct') : playSound('incorrect');
      
      refetchActiveRoom();
    },
    onError: (error) => {
      toast({
        title: 'Error submitting answer',
        description: error.message,
        variant: 'destructive',
      });
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
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating settings',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Update game state from active room data
  useEffect(() => {
    if (activeRoom?.gameState) {
      setGameState(prev => ({
        ...prev,
        status: activeRoom.gameState.status || 'waiting',
        currentQuestion: activeRoom.gameState.currentQuestion,
        currentQuestionIndex: activeRoom.gameState.currentQuestionIndex || 0,
        totalQuestions: activeRoom.settings?.questionCount || 10,
        players: activeRoom.players || [],
        results: activeRoom.gameState.results || []
      }));
    } else if (activeRoom) {
      setGameState(prev => ({
        ...prev,
        status: 'waiting',
        players: activeRoom.players || []
      }));
    }
  }, [activeRoom]);
  
  // Start the game countdown timer
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.currentQuestion) {
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
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
            submitAnswerMutation.mutate({
              roomId: activeRoom.id,
              answer: ''
            });
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
  
  // Handle answering a question
  const handleAnswerSubmit = (answer: string) => {
    if (activeRoomId && gameState.status === 'playing') {
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
                <CardTitle>Create a Multiplayer Game</CardTitle>
                <CardDescription>
                  Customize your game settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="roomName">Room Name</Label>
                    <Input
                      id="roomName"
                      placeholder="Enter a name for your room"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                    />
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
                  Create Game
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  // Room view (waiting, playing, or results)
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
              <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
              Game Results
            </CardTitle>
            <CardDescription>
              {activeRoom.name} • {gameState.totalQuestions} Questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Winner banner */}
              {sortedResults.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-100 to-amber-100 p-4 rounded-lg text-center">
                  <Crown className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p className="font-bold text-lg">
                    {sortedResults[0].id === user?.id ? 'You won!' : `${activeRoom.players.find(p => p.id === sortedResults[0].id)?.username || 'Player'} won!`}
                  </p>
                  <p className="text-sm text-yellow-800">with {sortedResults[0].score} points</p>
                </div>
              )}
              
              {/* Leaderboard */}
              <div>
                <h3 className="font-semibold mb-3 text-center">Leaderboard</h3>
                <div className="space-y-2">
                  {sortedResults.map((result, index) => {
                    const player = activeRoom.players.find(p => p.id === result.id);
                    const isCurrentUser = result.id === user?.id;
                    
                    return (
                      <div 
                        key={result.id}
                        className={`
                          flex items-center p-3 rounded-lg
                          ${isCurrentUser ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}
                        `}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold mr-3">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {player?.username || 'Player'} 
                            {isCurrentUser && <span className="ml-2 text-primary">(You)</span>}
                            {player?.isHost && (
                              <Badge variant="outline" className="ml-2 text-xs">Host</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {result.correct} correct • {result.incorrect} incorrect
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{result.score}</div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Player stats */}
              {currentPlayer && (
                <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{currentPlayer.correct}</div>
                    <div className="text-xs text-muted-foreground">Correct</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{currentPlayer.score}</div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{currentPlayer.rank}</div>
                    <div className="text-xs text-muted-foreground">Rank</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Results
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Your Results</DialogTitle>
                  <DialogDescription>
                    Copy this message to share your multiplayer results!
                  </DialogDescription>
                </DialogHeader>
                <div className="bg-muted p-3 rounded-md">
                  <p>
                    I just played a math game and scored {currentPlayer?.score || 0} points!
                    Join me for another round with code: {activeRoom.roomCode}
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    navigator.clipboard.writeText(
                      `I just played a math game and scored ${currentPlayer?.score || 0} points! Join me for another round with code: ${activeRoom.roomCode}`
                    );
                    toast({
                      title: 'Copied to clipboard',
                      description: 'You can now paste and share your results!',
                      variant: 'default',
                    });
                  }}>
                    Copy to Clipboard
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleLeaveRoom}>Leave Game</Button>
          </CardFooter>
        </Card>
      );
    }
    
    // Playing view
    if (gameState.status === 'playing' && gameState.currentQuestion) {
      return (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-primary" />
                {activeRoom.name}
              </CardTitle>
              <Badge variant="outline" className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {gameState.timeRemaining}s
              </Badge>
            </div>
            <CardDescription>
              Question {gameState.currentQuestionIndex + 1} of {gameState.totalQuestions}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressBar 
              progress={(gameState.currentQuestionIndex / gameState.totalQuestions) * 100}
              height={8}
              color="bg-primary"
              className="mb-6"
            />
            
            <QuestionCard
              question={gameState.currentQuestion}
              onAnswerSubmit={handleAnswerSubmit}
            />
            
            <div className="mt-6 flex justify-between text-sm text-muted-foreground">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {gameState.players.length} players
              </div>
              {activeRoom.gameType === 'competitive' ? (
                <div className="flex items-center">
                  <Trophy className="h-4 w-4 mr-1 text-yellow-500" />
                  Competitive Mode
                </div>
              ) : (
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-blue-500" />
                  Cooperative Mode
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    
    // Waiting room view
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{activeRoom.name}</CardTitle>
            <Badge variant="outline">
              {activeRoom.players.length}/{activeRoom.maxPlayers || 4} Players
            </Badge>
          </div>
          <CardDescription>
            {activeRoom.grade} Grade • {activeRoom.category || 'All Categories'} •
            {activeRoom.gameType === 'competitive' ? ' Competitive' : ' Cooperative'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Room Code</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(activeRoom.roomCode);
                  toast({
                    title: 'Copied to clipboard',
                    description: 'Room code copied!',
                    variant: 'default',
                  });
                }}
              >
                Copy
              </Button>
            </div>
            <div className="bg-muted rounded-md p-4 text-center mb-4">
              <span className="text-2xl font-mono tracking-widest">{activeRoom.roomCode}</span>
              <p className="text-xs text-muted-foreground mt-1">
                Share this code with friends to invite them
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Players</h3>
            <div className="space-y-2">
              {activeRoom.players.map(player => (
                <div 
                  key={player.id}
                  className={`
                    flex items-center p-3 rounded-lg
                    ${player.id === user?.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}
                  `}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div>
                      {player.username} 
                      {player.id === user?.id && <span className="ml-2 text-primary">(You)</span>}
                    </div>
                    {player.grade && (
                      <div className="text-xs text-muted-foreground">
                        Grade {player.grade}
                      </div>
                    )}
                  </div>
                  {player.isHost && (
                    <Badge>Host</Badge>
                  )}
                </div>
              ))}
              
              {/* Empty slots */}
              {Array.from({ length: (activeRoom.maxPlayers || 4) - activeRoom.players.length }).map((_, i) => (
                <div key={`empty-${i}`} className="border border-dashed border-muted-foreground/20 rounded-lg p-3 flex items-center">
                  <div className="w-8 h-8 rounded-full border border-dashed border-muted-foreground/30 mr-3"></div>
                  <div className="text-muted-foreground">Waiting for player...</div>
                </div>
              ))}
            </div>
          </div>
          
          {activeRoom.isHost && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Game Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-questions">Questions</Label>
                  <Select 
                    value={questionCount.toString()} 
                    onValueChange={(value) => setQuestionCount(parseInt(value))}
                  >
                    <SelectTrigger id="edit-questions">
                      <SelectValue placeholder="# of questions" />
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
                
                <div>
                  <Label htmlFor="edit-time">Time per Question</Label>
                  <Select 
                    value={timeLimit.toString()} 
                    onValueChange={(value) => setTimeLimit(parseInt(value))}
                  >
                    <SelectTrigger id="edit-time">
                      <SelectValue placeholder="Time limit" />
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
                
                <div>
                  <Label htmlFor="edit-players">Max Players</Label>
                  <Select 
                    value={maxPlayers.toString()} 
                    onValueChange={(value) => setMaxPlayers(parseInt(value))}
                  >
                    <SelectTrigger id="edit-players">
                      <SelectValue placeholder="Max players" />
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
                
                <div>
                  <Label htmlFor="edit-mode">Game Mode</Label>
                  <Select 
                    value={gameMode} 
                    onValueChange={(value: 'competitive' | 'cooperative') => setGameMode(value)}
                  >
                    <SelectTrigger id="edit-mode">
                      <SelectValue placeholder="Game mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competitive">Competitive</SelectItem>
                      <SelectItem value="cooperative">Cooperative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  className="col-span-2 mt-2"
                  onClick={handleUpdateSettings}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Settings
                </Button>
              </div>
            </div>
          )}
          
          <div className="bg-muted p-4 rounded-lg text-sm">
            <h4 className="font-semibold mb-2">Game Details</h4>
            <ul className="space-y-1">
              <li className="flex items-center">
                <span className="w-24 text-muted-foreground">Questions:</span>
                <span>{activeRoom.settings?.questionCount || 10}</span>
              </li>
              <li className="flex items-center">
                <span className="w-24 text-muted-foreground">Time Limit:</span>
                <span>{activeRoom.settings?.timeLimit || 30} seconds per question</span>
              </li>
              <li className="flex items-center">
                <span className="w-24 text-muted-foreground">Mode:</span>
                <span>{activeRoom.gameType === 'competitive' ? 'Competitive' : 'Cooperative'}</span>
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleLeaveRoom}>
            Leave Room
          </Button>
          
          {activeRoom.isHost && (
            <Button 
              onClick={handleStartGame}
              disabled={
                activeRoom.players.length < 2 || 
                startGameMutation.isPending
              }
            >
              {startGameMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {activeRoom.players.length < 2 
                ? 'Need at least 2 players'
                : 'Start Game'}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }
  
  // Fallback to browse view
  return (
    <Button onClick={() => setView('browse')}>
      Browse Games
    </Button>
  );
}