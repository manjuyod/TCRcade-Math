
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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a helpful math tutor analyzing student responses. Keep feedback brief, encouraging, and grade-appropriate for elementary school children (K-6). Use simple language and be motivational."
        },
        {
          role: "user",
          content: `Question: ${question}\nStudent's answer: ${studentAnswer}\nCorrect answer: ${correctAnswer}\n\nProvide brief feedback on this response.`
        }
      ],
      max_tokens: 120
    });

    return response.choices[0]?.message?.content || "Nice try!";
  } catch (error: any) {
    // Log the specific error
    if (error.response) {
      console.error(`OpenAI API error status: ${error.response.status}`);
      console.error(`OpenAI error message: ${error.response.data.error.message}`);
    } else {
      console.error('OpenAI API error:', error.message || error);
    }
    
    // Return different feedback messages based on whether answer was correct
    const isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    return isCorrect 
      ? "Great job! You got it right!" 
      : "Keep trying! You'll get it next time.";
  }
}
