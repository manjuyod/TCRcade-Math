import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// Check if API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error("⚠️ WARNING: OPENAI_API_KEY is not set in environment variables");
} else {
  console.log("✓ OpenAI API key found in environment");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Used for testing OpenAI connectivity during troubleshooting
 */
export async function testOpenAIConnection() {
  try {
    console.log("🧪 Testing OpenAI API connection...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Keep your response under 5 words."
        },
        {
          role: "user",
          content: "Can you generate a very simple math question for a 3rd grade student?"
        }
      ],
      max_tokens: 50
    });
    
    console.log("✅ OpenAI API connection test successful!");
    console.log("Response:", response.choices[0].message.content);
    return true;
  } catch (error: any) {
    console.error("❌ OpenAI API connection test failed:", error.message || String(error));
    return false;
  }
}

/**
 * Generate a basic question using OpenAI
 */
export async function generateBasicQuestion(grade: string, category: string) {
  try {
    console.log(`🔍 Generating basic ${category} question for grade ${grade}...`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Generate a simple math question for grade ${grade} in the category of ${category}. Return ONLY the JSON object and nothing else.`
        },
        {
          role: "user",
          content: `Create a grade ${grade} math question about ${category}. Use pure calculation format (e.g., "4 + 5 = ?") for Math Facts categories.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500
    });
    
    console.log("✅ Basic question generation successful!");
    
    const content = response.choices[0].message.content || '{}';
    const parsedResponse = JSON.parse(content as string);
    
    console.log(`Generated question: ${parsedResponse.question || 'Unknown'}`);
    
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      question: parsedResponse.question || `What is 2+2?`,
      answer: parsedResponse.answer || "4",
      options: parsedResponse.options || ["2", "3", "4", "5"],
      grade: grade,
      difficulty: parsedResponse.difficulty || 2,
      category: category,
      concepts: parsedResponse.concepts || [category],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    };
  } catch (error: any) {
    console.error(`❌ Basic question generation failed:`, error.message || String(error));
    
    // Create a fallback question
    const question = createFallbackQuestion(grade, category);
    console.log(`Created fallback question instead: ${question.question}`);
    
    return question;
  }
}

/**
 * Creates a hardcoded fallback question when OpenAI fails
 */
function createFallbackQuestion(grade: string, category: string) {
  const gradeLevel = grade === 'K' ? 0 : parseInt(grade) || 3;
  let question, answer, options;
  
  if (category.includes('addition') || category === 'Arithmetic') {
    const num1 = Math.floor(Math.random() * (10 * gradeLevel || 10)) + 1;
    const num2 = Math.floor(Math.random() * (10 * gradeLevel || 10)) + 1;
    question = `${num1} + ${num2} = ?`;
    answer = (num1 + num2).toString();
    options = [
      answer,
      (num1 + num2 + 1).toString(),
      (num1 + num2 - 1).toString(),
      (num1 + num2 + 2).toString()
    ];
  } else if (category.includes('subtraction')) {
    let num1 = Math.floor(Math.random() * (10 * gradeLevel || 10)) + 5;
    let num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
    question = `${num1} - ${num2} = ?`;
    answer = (num1 - num2).toString();
    options = [
      answer,
      (num1 - num2 + 1).toString(),
      (num1 - num2 - 1).toString(),
      (num1 - num2 + 2).toString()
    ];
  } else if (category.includes('multiplication')) {
    const factor = Math.min(gradeLevel + 1, 5);
    const num1 = Math.floor(Math.random() * factor) + 1;
    const num2 = Math.floor(Math.random() * factor) + 1;
    question = `${num1} × ${num2} = ?`;
    answer = (num1 * num2).toString();
    options = [
      answer,
      (num1 * num2 + 1).toString(),
      (num1 * num2 - 1).toString(),
      (num1 * num2 + num1).toString()
    ];
  } else if (category.includes('division')) {
    const num2 = Math.floor(Math.random() * 5) + 1;
    const product = Math.floor(Math.random() * 5) + 1;
    const num1 = num2 * product;
    question = `${num1} ÷ ${num2} = ?`;
    answer = product.toString();
    options = [
      answer,
      (product + 1).toString(),
      (product - 1).toString(),
      (product + 2).toString()
    ];
  } else {
    // Default case - simple addition
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    question = `${num1} + ${num2} = ?`;
    answer = (num1 + num2).toString();
    options = [
      answer,
      (num1 + num2 + 1).toString(),
      (num1 + num2 - 1).toString(),
      (num1 + num2 + 2).toString()
    ];
  }
  
  // Shuffle options
  options.sort(() => Math.random() - 0.5);
  
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    question: question,
    answer: answer,
    options: options,
    grade: grade,
    difficulty: Math.min(gradeLevel + 1, 5),
    category: category,
    concepts: [category.split('-').pop() || category],
    storyId: null,
    storyNode: null,
    storyText: null,
    storyImage: null
  };
}