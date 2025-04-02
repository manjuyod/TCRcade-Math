import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Brain, Clock, CheckCircle2, BookOpen } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import SessionComplete from '@/components/session-complete';
import { playSound } from '@/lib/sounds';

export default function CreateAQuiz() {
  const { user } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState<string>(user?.grade || '4');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correctAnswers: 0,
    tokensEarned: 0,
    questionsAnswered: 0
  });

  // Fetch categories for the selected grade
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['/api/categories', selectedGrade],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/categories?grade=${selectedGrade}`);
      return await res.json();
    },
    enabled: !!selectedGrade
  });

  // Fetch concepts for the selected grade
  const { data: concepts = [], isLoading: isConceptsLoading } = useQuery({
    queryKey: ['/api/concepts', selectedGrade],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/concepts?grade=${selectedGrade}`);
      return await res.json();
    },
    enabled: !!selectedGrade
  });

  // Fetch practice questions
  const fetchQuestions = async () => {
    try {
      let url = `/api/questions/grade/${selectedGrade}`;
      if (selectedCategory && selectedCategory !== 'all') {
        url += `?category=${selectedCategory}`;
      }
      
      const res = await apiRequest('GET', url);
      const data = await res.json();
      
      // Check if we have enough questions
      if (Array.isArray(data) && data.length > 0) {
        // If we don't have enough questions, let's generate new ones or fetch more
        if (data.length < 5) {
          // We need to fetch dynamically generated questions to fill out the quiz
          console.log(`Only ${data.length} questions available, generating additional questions`);
          try {
            const additionalQuestionsNeeded = 5 - data.length;
            const additionalQuestions = [];
            
            // Generate additional questions using OpenAI
            for (let i = 0; i < additionalQuestionsNeeded; i++) {
              // Generate each additional question
              const dynamicRes = await apiRequest('GET', 
                `/api/questions/next?grade=${selectedGrade}${selectedCategory !== 'all' ? `&category=${selectedCategory}` : ''}&forceDynamic=true`);
              const dynamicQuestion = await dynamicRes.json();
              
              if (dynamicQuestion && dynamicQuestion.id) {
                additionalQuestions.push(dynamicQuestion);
              }
            }
            
            // Combine original questions with additional ones
            const allQuestions = [...data, ...additionalQuestions];
            console.log(`Quiz now has ${allQuestions.length} total questions`);
            
            // Shuffle the questions to randomize the order
            const shuffled = allQuestions.sort(() => Math.random() - 0.5);
            
            // Use all questions, ensuring we have at least 5 (or all that we could get)
            setSessionQuestions(shuffled.slice(0, Math.max(5, shuffled.length)));
          } catch (dynamicError) {
            console.error("Error generating additional questions:", dynamicError);
            // If we fail to generate more, use what we have
            setSessionQuestions(data);
          }
        } else {
          // We have enough questions, so shuffle them and take 5
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          setSessionQuestions(shuffled.slice(0, 5));
        }
        
        // Reset quiz state
        setCurrentQuestionIndex(0);
        setUserAnswers([]);
        setShowResults(false);
      } else {
        toast({
          title: "No questions available",
          description: "There are no questions available for the selected criteria. Try another grade or category.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast({
        title: "Error",
        description: "Failed to load practice questions. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Start a new practice session
  const startSession = () => {
    fetchQuestions();
  };

  // Submit answer
  const submitAnswer = (answerIndex: number) => {
    const currentQuestion = sessionQuestions[currentQuestionIndex];
    const selectedAnswer = currentQuestion.options[answerIndex];
    const isCorrect = selectedAnswer === currentQuestion.answer;
    
    // Play sound feedback
    playSound(isCorrect ? 'correct' : 'incorrect');
    
    // Add answer to user answers
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = selectedAnswer;
    setUserAnswers(newUserAnswers);
    
    // Wait a moment to show feedback, then go to next question
    setTimeout(() => {
      if (currentQuestionIndex < sessionQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // Session complete - calculate stats
        const correctCount = newUserAnswers.filter((answer, idx) => 
          answer === sessionQuestions[idx].answer
        ).length;
        
        // Calculate tokens earned - 2 per correct answer
        const tokensEarned = correctCount * 2;
        
        // Update user stats
        updateUserStats(correctCount, tokensEarned, sessionQuestions.length);
        
        // Show session results
        setSessionStats({
          correctAnswers: correctCount,
          tokensEarned: tokensEarned,
          questionsAnswered: sessionQuestions.length
        });
        setShowResults(true);
      }
    }, 1000);
  };

  // Update user stats after session completion
  const updateUserStats = async (correctCount: number, tokensEarned: number, totalQuestions: number) => {
    if (!user) return;
    
    try {
      const res = await apiRequest('POST', '/api/user/stats', {
        correctAnswers: correctCount,
        tokensEarned: tokensEarned,
        questionsAnswered: totalQuestions
      });
      
      // Update cached user data with new token count
      queryClient.setQueryData(['/api/user'], {
        ...user,
        tokens: user.tokens + tokensEarned
      });
    } catch (error) {
      console.error("Error updating user stats:", error);
    }
  };

  if (showResults) {
    return (
      <SessionComplete
        correctAnswers={sessionStats.correctAnswers}
        totalQuestions={sessionStats.questionsAnswered}
        tokensEarned={sessionStats.tokensEarned}
        onStartNewSession={() => {
          setShowResults(false);
          startSession();
        }}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Create-A-Quiz</h1>
        <p className="text-gray-600">
          Create a custom quiz with topics and grade levels you choose
        </p>
      </div>
      
      {sessionQuestions.length === 0 ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Create Your Custom Quiz</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Grade Level</label>
            <select 
              className="w-full p-2 border rounded-md" 
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              <option value="K">Kindergarten</option>
              <option value="1">1st Grade</option>
              <option value="2">2nd Grade</option>
              <option value="3">3rd Grade</option>
              <option value="4">4th Grade</option>
              <option value="5">5th Grade</option>
              <option value="6">6th Grade</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Math Topic</label>
            <select 
              className="w-full p-2 border rounded-md" 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Topics</option>
              {!isCategoriesLoading && categories.map((category: string) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <Button 
            onClick={startSession}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            Create My Quiz
          </Button>
        </Card>
      ) : (
        <div className="question-container">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between mb-4">
                <span className="text-sm font-medium text-gray-600">
                  Question {currentQuestionIndex + 1} of {sessionQuestions.length}
                </span>
                <span className="text-sm font-medium text-gray-600">
                  {selectedCategory !== 'all' ? selectedCategory : 'Mixed'} - Grade {selectedGrade}
                </span>
              </div>
              
              <h3 className="text-xl font-bold mb-6">
                {sessionQuestions[currentQuestionIndex].question}
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {sessionQuestions[currentQuestionIndex].options.map((option: string, idx: number) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className={`justify-start text-left p-4 h-auto ${
                      userAnswers[currentQuestionIndex] === option
                        ? option === sessionQuestions[currentQuestionIndex].answer
                          ? 'bg-green-100 border-green-500'
                          : 'bg-red-100 border-red-500'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      if (!userAnswers[currentQuestionIndex]) {
                        submitAnswer(idx);
                      }
                    }}
                    disabled={!!userAnswers[currentQuestionIndex]}
                  >
                    <span className="mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                    {userAnswers[currentQuestionIndex] === option && (
                      <span className="ml-auto">
                        {option === sessionQuestions[currentQuestionIndex].answer ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <span className="text-red-500">✗</span>
                        )}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}