import { Question, User, Recommendation } from "@shared/schema";
import { apiRequest } from "./queryClient";

// Fetch a question for the user - now using the faster /api/questions/next endpoint
export async function fetchQuestion(answeredIds: number[] = [], forceDynamic: boolean = false, category?: string, useRecommendations: boolean = false): Promise<Question> {
  // Build query parameters
  const params = new URLSearchParams();
  
  // Add exclude ID if we have answeredIds (just the most recent one to avoid the same question)
  if (answeredIds.length > 0) {
    params.append('exclude', answeredIds[answeredIds.length - 1].toString());
  }
  
  // Always force dynamic generation for variety and speed
  params.append('forceDynamic', 'true');
  
  // Add timestamp to prevent caching
  params.append('t', Date.now().toString());
  
  // Add category parameter if specified to filter questions by category
  if (category && category !== 'all') {
    params.append('category', category);
  }
  
  console.log(`Fetching question with params: ${params.toString()}`);
    
  // Use the fast /api/questions/next endpoint which doesn't require authentication
  const response = await fetch(`/api/questions/next?${params.toString()}`, {
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch question');
  }
  
  const data = await response.json();
  
  // The /api/questions/next endpoint returns data in a different format
  if (data.question) {
    return data.question;
  }
  
  return data;
}

// Fetch personalized recommendations for the user
export async function fetchRecommendations(regenerate: boolean = false): Promise<Recommendation> {
  const queryParams = regenerate ? '?regenerate=true' : '';
  
  const response = await fetch(`/api/recommendations${queryParams}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch recommendations');
  }
  
  return await response.json();
}

// Submit an answer to a question
export async function submitAnswer(questionId: number, answer: string): Promise<{
  correct: boolean;
  tokensEarned: number;
  totalTokens: number;
  correctAnswer: string;
}> {
  const response = await apiRequest('POST', '/api/answer', {
    questionId,
    answer
  });
  
  return await response.json();
}

// Get difficulty label based on question difficulty (1-5)
export function getDifficultyLabel(difficulty: number): string {
  switch(difficulty) {
    case 1:
      return "Easy";
    case 2:
      return "Basic";
    case 3:
      return "Medium";
    case 4:
      return "Advanced";
    case 5:
      return "Expert";
    default:
      return "Unknown";
  }
}

// Get category display name
export function getCategoryLabel(category: string): string {
  const categories: Record<string, string> = {
    "addition": "Addition",
    "subtraction": "Subtraction",
    "multiplication": "Multiplication",
    "division": "Division",
    "fractions": "Fractions",
    "geometry": "Geometry",
    "time": "Time",
    "money": "Money"
  };
  
  return categories[category] || category;
}

// Calculate appropriate token reward based on difficulty and user grade
export function calculateTokenReward(difficulty: number, userGrade: string): number {
  // Base reward is difficulty level * 2
  let reward = difficulty * 2;
  
  // Adjust based on grade level
  const gradeMap: Record<string, number> = {
    "K": 1,
    "1": 2,
    "2": 3,
    "3": 4,
    "4": 5,
    "5": 6,
    "6": 7
  };
  
  // Higher grades get slightly decreased rewards for same difficulty
  const gradeModifier = gradeMap[userGrade] || 1;
  reward = Math.max(1, Math.min(10, reward - Math.floor(gradeModifier / 3)));
  
  return reward;
}
