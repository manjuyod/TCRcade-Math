import { toast } from '@/hooks/use-toast';
import { playSound } from '@/lib/sounds';

/**
 * Generates a custom study plan based on user analytics
 * This can be called when the user's data changes
 */
export function generateCustomStudyPlanFromAnalytics(
  analytics: any, 
  setCustomStudyPlan: (plan: string[]) => void, 
  setIsGeneratingPlan: (loading: boolean) => void, 
  setActiveTab: (tab: string) => void, 
  toastFn: any
) {
  // Update loading state
  setIsGeneratingPlan(true);
  
  // Notify user that generation is in progress
  toastFn({
    title: "Generating Study Plan",
    description: "Creating your personalized study plan based on your progress...",
    dismissTimeout: 3000,
  });
  
  // Get strengths to build on and ensure none are "General"
  const strengthConcepts = [...new Set((analytics.conceptMasteries || [])
    .filter((concept: any) => concept.masteryLevel >= 90 && concept.concept.toLowerCase() !== 'general')
    .slice(0, 5)
    .map((concept: any) => concept.concept))]
    .slice(0, 3);
  
  // Get concepts that need work and ensure none are "General" or already in strengths
  const needsWorkConcepts = (analytics.conceptMasteries || [])
    .filter((concept: any) => 
      concept.masteryLevel < 75 && 
      concept.concept.toLowerCase() !== 'general' &&
      !strengthConcepts.includes(concept.concept)
    )
    .slice(0, 5)
    .map((concept: any) => concept.concept);
  
  // Use strengthConcepts instead of strengths for consistency
  const strengths = strengthConcepts;
  
  // Get user's actual grade from analytics or default to K
  const userGrade = analytics?.analytics?.userId ? 
    (analytics.analytics.learningStyle === 'Visual' ? 'K' : 'K') : 'K'; // Default fallback
  
  // Try to extract grade from user data if available
  const grade = userGrade;
  
  // Grade-specific topics mapping - more detailed and age-appropriate
  const gradeTopics: Record<string, string[]> = {
    'K': ['counting to 20', 'number recognition', 'basic shapes', 'simple addition', 'simple subtraction', 'patterns'],
    '1': ['place value to 100', 'addition facts to 20', 'subtraction facts to 20', 'time to hour', 'length measurement'],
    '2': ['place value to 1000', 'two-digit addition', 'two-digit subtraction', 'telling time', 'money counting'],
    '3': ['multiplication facts', 'division facts', 'basic fractions', 'area concepts', 'data collection'],
    '4': ['multi-digit multiplication', 'long division', 'decimal place value', 'angle measurement', 'factor identification'],
    '5': ['fraction operations', 'decimal operations', 'volume calculation', 'coordinate graphing', 'algebraic patterns'],
    '6': ['ratio and proportion', 'solving equations', 'statistical analysis', 'probability concepts', 'integer operations']
  };
  
  // Get relevant topics based on grade
  let relevantTopics = gradeTopics[grade] || gradeTopics['K'];
  
  // Helper function to get a specific topic with fallback
  const getSpecificTopic = (primaryIndex: number, fallbackIndex: number) => {
    return needsWorkConcepts[primaryIndex] || relevantTopics[fallbackIndex] || 'math facts';
  };
  
  // Helper function to get a strength with fallback
  const getSpecificStrength = (primaryIndex: number, fallbackIndex: number) => {
    return strengths[primaryIndex] || relevantTopics[fallbackIndex] || 'problem solving';
  };
  
  // Generate the personalized study plan with multiple formats and approaches
  const studyPlanBullets = [
    `• Focus daily: ${getSpecificTopic(0, 0)} - 15 minutes of practice with ${relevantTopics[1]} problems`,
    `• Twice weekly: ${getSpecificTopic(1, 2)} - Use step-by-step problem solving approach`,
    `• Monday/Wednesday: Practice ${relevantTopics[0]} and ${relevantTopics[1]} computational problems`,
    `• Tuesday/Thursday: Work on ${getSpecificTopic(2, 3)} problems at current grade level`,
    `• Friday review: All topics covered during the week, especially ${getSpecificTopic(0, 0)}`,
    `• Connect strong concept ${getSpecificStrength(0, 0)} with ${getSpecificTopic(0, 0)}`,
    `• Create 10 flash cards focusing on ${getSpecificTopic(1, 2)} facts`,
    `• Daily practice: ${relevantTopics[4] || "number facts"} for 5-10 minutes`,
    `• Weekly assessment: Take a 10-question quiz on ${getSpecificTopic(0, 0)}`,
    `• Build on your strength in ${getSpecificStrength(0, 0)} when learning ${getSpecificTopic(1, 1)}`
  ];
  
  // Update state with the new study plan after a short delay to simulate processing
  setTimeout(() => {
    setCustomStudyPlan(studyPlanBullets);
    setIsGeneratingPlan(false);
    playSound('levelUp');
    
    // Small toast to confirm completion
    toastFn({
      title: "Study Plan Ready",
      description: "Your personalized study plan has been generated",
      dismissTimeout: 3000, // Auto-dismiss after 3 seconds
    });
    
    // Make sure the recommendations tab is active to show the plan
    setActiveTab('recommendations');
  }, 1000);
  
  return studyPlanBullets;
}