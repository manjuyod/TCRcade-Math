import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Brain,
  MessageSquare,
  HelpCircle,
  LightbulbIcon,
  BookOpen,
  Star,
  Clock,
  Target,
  Play,
  Pause,
  CheckCircle,
  Settings,
  Send,
  ArrowRight,
} from "lucide-react";

// Types based on backend schema
interface TutorSession {
  id: number;
  sessionType: string;
  sessionTarget: number;
  targetType: string;
  questionsAnswered: number;
  correctAnswers: number;
  hintsUsed: number;
  conceptsPracticed: string[];
  totalTimeSeconds: number;
  completionStatus: string;
  difficultyLevel: number;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  messageType: string;
  isCorrectAnswer?: boolean;
}

interface SessionOptions {
  sessionType: "guided" | "independent" | "review" | "mixed";
  sessionTarget: number;
  targetType: "questions" | "time";
  conceptFocus?: string[];
  difficultyLevel: number;
}

interface Question {
  id: number;
  question: string;
  answer: string;
  options: string[];
  concepts: string[];
  grade: string;
  category: string;
  difficulty: number;
}

export default function RecTutorPage() {
  const [currentSession, setCurrentSession] = useState<TutorSession | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [sessionOptions, setSessionOptions] = useState<SessionOptions>({
    sessionType: "guided",
    sessionTarget: 10,
    targetType: "questions",
    difficultyLevel: 1,
  });
  const [ratings, setRatings] = useState({
    helpfulness: 8,
    clarity: 8,
    difficulty: 5,
    engagement: 8,
    overallSatisfaction: 8,
    feedback: "",
  });
  const [sessionTime, setSessionTime] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [chatMode, setChatMode] = useState<"chat" | "hint" | "explanation">(
    "chat",
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for current session
  const { data: sessionData, refetch: refetchSession } = useQuery({
    queryKey: ["/api/tutor/session/current"],
    enabled: sessionStarted,
    queryFn: async () => {
      const response = await fetch("/api/tutor/session/current");
      return response.json();
    },
  });

  // Query for recommended question
  const { data: questionData, refetch: refetchQuestion } = useQuery({
    queryKey: ["/api/recommendations"],
    enabled: sessionStarted && !currentQuestion,
    queryFn: async () => {
      const response = await fetch("/api/recommendations");
      return response.json();
    },
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (options: SessionOptions) => {
      const response = await apiRequest(
        "POST",
        `/api/tutor/session/start`,
        options,
      );
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data.session);
      setSessionStarted(true);
      setMessages(data.messages || []);
      if (!data.isExisting) {
        toast({
          title: "Session Started",
          description: "Your AI tutoring session has begun!",
        });
      }
      refetchQuestion();
    },
  });

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async ({
      answer,
      isCorrect,
      timeSpent,
    }: {
      answer: string;
      isCorrect: boolean;
      timeSpent: number;
    }) => {
      const response = await apiRequest("POST", `/api/tutor/session/answer`, {
        sessionId: currentSession?.id,
        question: currentQuestion,
        userAnswer: answer,
        isCorrect,
        timeSpent,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "user",
          content: userAnswer,
          timestamp: new Date().toISOString(),
          messageType: "answer",
          isCorrectAnswer: data.isCorrect,
        },
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.aiResponse,
          timestamp: new Date().toISOString(),
          messageType: "feedback",
        },
      ]);
      setCurrentSession(data.session);
      setUserAnswer("");

      // Get next question after a brief delay
      setTimeout(() => {
        refetchQuestion();
      }, 2000);
    },
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async ({
      message,
      requestType,
    }: {
      message: string;
      requestType: string;
    }) => {
      const response = await apiRequest("POST", `/api/tutor/session/chat`, {
        sessionId: currentSession?.id,
        message,
        requestType,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "user",
          content: chatInput,
          timestamp: new Date().toISOString(),
          messageType: chatMode,
        },
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
          messageType: chatMode,
        },
      ]);
      setChatInput("");
    },
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tutor/session/complete`, {
        sessionId: currentSession?.id,
        ratings,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Session Complete!",
        description: data.summary,
      });
      setSessionStarted(false);
      setCurrentSession(null);
      setMessages([]);
      setCurrentQuestion(null);
      setShowRatingDialog(false);
    },
  });

  // Timer effect - only runs when session is active AND a question is loaded
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStarted && currentSession && currentQuestion && !submitAnswerMutation.isPending) {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStarted, currentSession, currentQuestion, submitAnswerMutation.isPending]);

  // Update current question when question data changes
  useEffect(() => {
    if (questionData?.questions && questionData.questions.length > 0) {
      // Take the first available question from the recommendations
      setCurrentQuestion(questionData.questions[0]);
    } else if (questionData?.question) {
      // Fallback for single question response
      setCurrentQuestion(questionData.question);
    }
  }, [questionData]);

  // Update session and messages when session data changes
  useEffect(() => {
    if (sessionData?.session) {
      setCurrentSession(sessionData.session);
      if (sessionData.messages) {
        setMessages(sessionData.messages);
      }
    }
  }, [sessionData]);

  const handleStartSession = () => {
    startSessionMutation.mutate(sessionOptions);
    setShowSessionDialog(false);
  };

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim() || !currentQuestion) return;

    const isCorrect =
      userAnswer.trim().toLowerCase() ===
      currentQuestion.answer.trim().toLowerCase();

    submitAnswerMutation.mutate({
      answer: userAnswer,
      isCorrect,
      timeSpent: 30, // Simple time tracking - could be more sophisticated
    });
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    chatMutation.mutate({
      message: chatInput,
      requestType: chatMode,
    });
  };

  const handleCompleteSession = () => {
    if (currentSession) {
      setShowRatingDialog(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    if (!currentSession) return 0;
    if (currentSession.targetType === "questions") {
      return (
        (currentSession.questionsAnswered / currentSession.sessionTarget) * 100
      );
    }
    return (sessionTime / (currentSession.sessionTarget * 60)) * 100;
  };

  const getAccuracyPercentage = () => {
    if (!currentSession || currentSession.questionsAnswered === 0) return 0;
    return (
      (currentSession.correctAnswers / currentSession.questionsAnswered) * 100
    );
  };

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI Math Tutor
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get personalized, one-on-one math tutoring powered by advanced AI.
              Practice problems with instant feedback and adaptive guidance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Personalized Learning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  AI adapts to your learning style and pace, providing
                  customized explanations and hints.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Interactive Conversations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Chat with your AI tutor, ask questions, and get step-by-step
                  guidance through problems.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              onClick={() => setShowSessionDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Tutoring Session
            </Button>
          </div>
        </div>

        {/* Session Setup Dialog */}
        <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
          <DialogContent className="max-w-md !rounded-none overflow-hidden">
            <DialogHeader>
              <DialogTitle>Setup Your Session</DialogTitle>
              <DialogDescription>
                Customize your tutoring experience
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Session Type</Label>
                <Select
                  value={sessionOptions.sessionType}
                  onValueChange={(value: any) =>
                    setSessionOptions((prev) => ({
                      ...prev,
                      sessionType: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guided">Guided Practice</SelectItem>
                    <SelectItem value="independent">
                      Independent Practice
                    </SelectItem>
                    <SelectItem value="review">Concept Review</SelectItem>
                    <SelectItem value="mixed">Mixed Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Session Goal</Label>
                <Select
                  value={sessionOptions.targetType}
                  onValueChange={(value: any) =>
                    setSessionOptions((prev) => ({
                      ...prev,
                      targetType: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="questions">
                      Number of Questions
                    </SelectItem>
                    <SelectItem value="time">Time-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  {sessionOptions.targetType === "questions"
                    ? "Questions"
                    : "Minutes"}
                  : {sessionOptions.sessionTarget}
                </Label>
                <Slider
                  value={[sessionOptions.sessionTarget]}
                  onValueChange={(value) =>
                    setSessionOptions((prev) => ({
                      ...prev,
                      sessionTarget: value[0],
                    }))
                  }
                  max={sessionOptions.targetType === "questions" ? 20 : 60}
                  min={sessionOptions.targetType === "questions" ? 5 : 10}
                  step={sessionOptions.targetType === "questions" ? 1 : 5}
                />
              </div>

              <div>
                <Label>
                  Difficulty Level: {sessionOptions.difficultyLevel}
                </Label>
                <Slider
                  value={[sessionOptions.difficultyLevel]}
                  onValueChange={(value) =>
                    setSessionOptions((prev) => ({
                      ...prev,
                      difficultyLevel: value[0],
                    }))
                  }
                  max={5}
                  min={1}
                  step={1}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSessionDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleStartSession}>Start Session</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Session Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Brain className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">AI Tutoring Session</h1>
                <p className="text-gray-600 capitalize">
                  {currentSession?.sessionType} Practice
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatTime(sessionTime)}
                </div>
                <div className="text-sm text-gray-600">Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {currentSession?.questionsAnswered || 0}/
                  {currentSession?.sessionTarget || 0}
                </div>
                <div className="text-sm text-gray-600">Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(getAccuracyPercentage())}%
                </div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
              <Button variant="outline" onClick={handleCompleteSession}>
                <CheckCircle className="h-4 w-4 mr-2" />
                End Session
              </Button>
            </div>
          </div>

          <Progress value={getProgressPercentage()} className="mt-4" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Current Problem</CardTitle>
                {currentQuestion && (
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {currentQuestion.category}
                    </Badge>
                    <Badge variant="outline">
                      Grade {currentQuestion.grade}
                    </Badge>
                    <Badge variant="outline">
                      Difficulty {currentQuestion.difficulty}
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {currentQuestion ? (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-lg font-medium mb-4">
                        {typeof currentQuestion.question === "string"
                          ? currentQuestion.question
                          : JSON.parse(currentQuestion.question).text}
                      </div>

                      {currentQuestion.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {currentQuestion.options.map((option, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              className="justify-start"
                              onClick={() => setUserAnswer(option)}
                            >
                              {String.fromCharCode(65 + index)}. {option}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="answer">Your Answer</Label>
                      <div className="flex gap-2">
                        <Input
                          id="answer"
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="Enter your answer..."
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleSubmitAnswer()
                          }
                        />
                        <Button
                          onClick={handleSubmitAnswer}
                          disabled={
                            !userAnswer.trim() || submitAnswerMutation.isPending
                          }
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Loading next question...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Tutor Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-96">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-100 ml-4"
                          : "bg-gray-100 mr-4"
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {message.role === "user" ? "You" : "AI Tutor"}
                      </div>
                      <div className="text-sm">{message.content}</div>
                    </div>
                  ))}
                </div>

                <Tabs
                  value={chatMode}
                  onValueChange={(value: any) => setChatMode(value)}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="hint">Hint</TabsTrigger>
                    <TabsTrigger value="explanation">Explain</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex gap-2 mt-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      chatMode === "hint"
                        ? "Ask for a hint..."
                        : chatMode === "explanation"
                          ? "Ask about a concept..."
                          : "Chat with your tutor..."
                    }
                    onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                  />
                  <Button
                    size="sm"
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || chatMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Session Rating Dialog */}
        <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
          <DialogContent className="max-w-md !rounded-none overflow-hidden">
            <DialogHeader>
              <DialogTitle>Rate Your Session</DialogTitle>
              <DialogDescription>
                Help us improve your tutoring experience
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {Object.entries({
                helpfulness: "How helpful was the AI tutor?",
                clarity: "How clear were the explanations?",
                difficulty: "Was the difficulty level appropriate?",
                engagement: "How engaging was the session?",
                overallSatisfaction: "Overall satisfaction",
              }).map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span>1</span>
                    <Slider
                      value={[ratings[key as keyof typeof ratings] as number]}
                      onValueChange={(value) =>
                        setRatings((prev) => ({ ...prev, [key]: value[0] }))
                      }
                      max={10}
                      min={1}
                      step={1}
                      className="flex-1"
                    />
                    <span>10</span>
                    <span className="w-8 text-center font-medium">
                      {ratings[key as keyof typeof ratings]}
                    </span>
                  </div>
                </div>
              ))}

              <div>
                <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
                <Textarea
                  id="feedback"
                  value={ratings.feedback}
                  onChange={(e) =>
                    setRatings((prev) => ({
                      ...prev,
                      feedback: e.target.value,
                    }))
                  }
                  placeholder="Share your thoughts about the session..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  // Complete session with default ratings when skipping
                  const defaultRatings = {
                    helpfulness: 5,
                    clarity: 5,
                    difficulty: 5,
                    engagement: 5,
                    overallSatisfaction: 5,
                    feedback: "",
                  };
                  setRatings(defaultRatings);
                  completeSessionMutation.mutate();
                }}
              >
                Skip
              </Button>
              <Button
                onClick={() => completeSessionMutation.mutate()}
                disabled={completeSessionMutation.isPending}
              >
                Complete Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
