
import OpenAI from 'openai';

// Check if OpenAI API key is available but don't crash if it's missing
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

// Initialize OpenAI only if API key is available
const openai = hasOpenAIKey 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

export async function analyzeStudentResponse(question: string, studentAnswer: string, correctAnswer: string) {
  // If OpenAI API key is not available, return a generic response
  if (!hasOpenAIKey || !openai) {
    console.log('OpenAI analysis skipped - API key missing');
    // Return encouraging feedback based on whether the answer was correct
    const isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    return isCorrect 
      ? "Great job! That's correct!"
      : "Keep trying! Practice makes perfect.";
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful math tutor analyzing student responses. Keep feedback brief, encouraging, and grade-appropriate."
        },
        {
          role: "user",
          content: `Question: ${question}\nStudent's answer: ${studentAnswer}\nCorrect answer: ${correctAnswer}\n\nProvide brief feedback on this response.`
        }
      ],
      max_tokens: 100
    });

    return response.choices[0]?.message?.content || "Nice try!";
  } catch (error) {
    console.error('OpenAI API error:', error);
    return "Keep practicing!";
  }
}
