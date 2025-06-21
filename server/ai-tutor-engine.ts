import OpenAI from "openai";
import { TutorSession, TutorChatMessage, Question } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  questionContext?: Question;
}

interface SessionOptions {
  sessionType: 'guided' | 'independent' | 'review' | 'mixed';
  duration: 'questions_5' | 'questions_10' | 'questions_15' | 'time_15min' | 'time_30min' | 'unlimited';
  conceptFocus?: string[];
  difficultyPreference: 'adaptive' | 'easy' | 'medium' | 'hard';
}

interface SessionRating {
  helpfulness: number;
  clarity: number;
  difficulty: number;
  engagement: number;
  overallSatisfaction: number;
  feedback?: string;
}

export class AITutorEngine {

  /**
   * Generate contextual response based on student answer
   */
  async generateTutorResponse(
    question: Question, 
    userAnswer: string, 
    isCorrect: boolean, 
    chatHistory: ChatMessage[],
    sessionType: string = 'guided'
  ): Promise<string> {
    try {
      const conversationContext = chatHistory
        .slice(-4) // Last 4 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const questionText = typeof question.question === 'string' 
        ? question.question 
        : JSON.parse(question.question).text;

      const systemPrompt = this.getSystemPrompt(sessionType, question.grade);

      const prompt = `
Previous conversation:
${conversationContext}

Current question: ${questionText}
Correct answer: ${question.answer}
Student's answer: ${userAnswer}
Answer is ${isCorrect ? 'CORRECT' : 'INCORRECT'}

${isCorrect 
  ? 'Provide encouraging feedback and explain the concept briefly. Then smoothly transition to readiness for the next question.'
  : 'Provide supportive feedback, explain where the mistake occurred, and guide them toward understanding without giving away the answer directly.'
}

Keep your response conversational, encouraging, and grade-appropriate for grade ${question.grade}.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || "Great effort! Let's continue learning together.";
    } catch (error) {
      console.error("Error generating tutor response:", error);
      return isCorrect 
        ? "Excellent work! You got it right. Ready for the next challenge?"
        : "Not quite right, but that's okay! Learning from mistakes helps us grow. Let's try a different approach.";
    }
  }

  /**
   * Provide step-by-step hints without giving away answer
   */
  async generateHint(
    question: Question, 
    previousHints: string[], 
    sessionType: string = 'guided'
  ): Promise<string> {
    try {
      const questionText = typeof question.question === 'string' 
        ? question.question 
        : JSON.parse(question.question).text;

      const hintLevel = previousHints.length + 1;
      const systemPrompt = this.getSystemPrompt(sessionType, question.grade);

      const prompt = `
Question: ${questionText}
Correct answer: ${question.answer}
Previous hints given: ${previousHints.join('; ')}

Provide hint #${hintLevel} for a grade ${question.grade} student. 
${hintLevel === 1 ? 'Start with a gentle nudge in the right direction.' : 
  hintLevel === 2 ? 'Give a more specific hint about the method or approach.' :
  'Provide a very specific hint that guides them step-by-step, but still requires them to do the final calculation.'}

IMPORTANT: This hint is specifically for question ID ${question.id}. Make sure your hint relates to this exact question.

Keep your response conversational, encouraging, and grade-appropriate for grade ${question.grade}.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.6,
      });

      return response.choices[0]?.message?.content || "Think about breaking this problem into smaller steps. What's the first thing you need to do?";
    } catch (error) {
      console.error("Error generating hint:", error);
      return "Think about breaking this problem into smaller steps. What's the first thing you need to do?";
    }
  }

  /**
   * Explain concept after correct/incorrect answer
   */
  async explainConcept(
    question: Question, 
    concept: string, 
    wasCorrect: boolean,
    sessionType: string = 'guided'
  ): Promise<string> {
    try {
      const questionText = typeof question.question === 'string' 
        ? question.question 
        : JSON.parse(question.question).text;

      const systemPrompt = this.getSystemPrompt(sessionType, question.grade);

      const prompt = `
Question: ${questionText}
Question ID: ${question.id}
Concept to explain: ${concept}
Student got this ${wasCorrect ? 'correct' : 'incorrect'}

Explain the mathematical concept behind THIS SPECIFIC question (ID: ${question.id}) in a way that helps the student understand the underlying principles.

IMPORTANT: Focus your explanation on this exact question, not on general concepts or previous questions.

Keep your explanation clear, encouraging, and grade-appropriate for grade ${question.grade}.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || "This concept is all about understanding the relationship between numbers and operations. Practice helps build this understanding!";
    } catch (error) {
      console.error("Error explaining concept:", error);
      return "This concept is all about understanding the relationship between numbers and operations. Practice helps build this understanding!";
    }
  }

  /**
   * Calculate session weight based on ratings
   */
  calculateSessionWeight(ratings: SessionRating): number {
    const averageRating = (
      ratings.helpfulness + 
      ratings.clarity + 
      ratings.difficulty + 
      ratings.engagement + 
      ratings.overallSatisfaction
    ) / 5;

    // Convert 1-10 scale to weight (10-100)
    // Poor sessions (1-4): 10-40
    // Average sessions (5-6): 50-60  
    // Good sessions (7-8): 70-80
    // Excellent sessions (9-10): 90-100
    return Math.max(10, Math.round(averageRating * 10));
  }

  /**
   * Get system prompt based on session type and grade
   */
  private getSystemPrompt(sessionType: string, grade: string): string {
    const basePrompt = `You are an encouraging AI math tutor for grade ${grade} students. Your goal is to help students learn through guidance, not by giving direct answers.`;

    switch (sessionType) {
      case 'guided':
        return `${basePrompt} Provide detailed explanations and step-by-step guidance. Be very supportive and offer multiple hints when needed.`;

      case 'independent':
        return `${basePrompt} Encourage independent thinking. Give minimal hints and focus on helping students develop problem-solving strategies.`;

      case 'review':
        return `${basePrompt} Focus on reinforcing previously learned concepts. Connect new problems to familiar patterns and help build confidence.`;

      case 'mixed':
        return `${basePrompt} Adapt your approach based on the student's responses. Use a mix of guidance and independent thinking encouragement.`;

      default:
        return basePrompt;
    }
  }

  /**
   * Generate session summary
   */
  generateSessionSummary(session: TutorSession): string {
    const accuracy = session.questionsAnswered > 0 
      ? Math.round((session.correctAnswers / session.questionsAnswered) * 100)
      : 0;

    const timeMinutes = Math.round(session.totalTimeSeconds / 60);

    const concepts = session.conceptsPracticed?.length ? session.conceptsPracticed.join(', ') : 'various math concepts';
    return `Great session! You answered ${session.questionsAnswered} questions with ${accuracy}% accuracy in ${timeMinutes} minutes. You practiced ${concepts}. Keep up the excellent work!`;
  }
}

export const aiTutorEngine = new AITutorEngine();