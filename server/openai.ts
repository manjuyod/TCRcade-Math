
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function analyzeStudentResponse(question: string, studentAnswer: string, correctAnswer: string) {
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
