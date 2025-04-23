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
    
    // Determine if this should be a math fact (pure calculation)
    const isMathFact = category.toLowerCase().includes("math-facts") || 
                     category.toLowerCase() === "addition" || 
                     category.toLowerCase() === "subtraction" ||
                     category.toLowerCase() === "multiplication" ||
                     category.toLowerCase() === "division";
    
    const systemPrompt = isMathFact 
      ? `You are a math teacher creating PURE CALCULATION questions. For grade ${grade} in the category of ${category}, create a math facts question.
         The question MUST ONLY be in the format "X [operation] Y = ?" with no word problems.
         Double-check that your arithmetic is correct and the answer is accurate.`
      : `Generate a simple math question for grade ${grade} in the category of ${category}. Return ONLY the JSON object.`;
    
    const userPrompt = isMathFact
      ? `Create a grade ${grade} math facts question about ${category}. 
         IMPORTANT: The question must be a pure calculation in the format "X [operation] Y = ?" and nothing else.
         For example: "6 + 7 = ?" or "8 × 3 = ?".
         Return a JSON object with:
         - question: The calculation (e.g., "5 + 3 = ?")
         - answer: The correct numerical answer as a string
         - options: Array of 4 answer choices as strings including the correct answer`
      : `Create a grade ${grade} math question about ${category}. Include a JSON response with question, answer, and options fields.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500
    });
    
    console.log("✅ Basic question generation successful!");
    
    const content = response.choices[0].message.content || '{}';
    console.log("Raw response:", content);
    
    const parsedResponse = JSON.parse(content as string);
    console.log(`Generated question: ${typeof parsedResponse.question === 'string' ? parsedResponse.question : JSON.stringify(parsedResponse.question)}`);
    console.log(`Generated answer: ${parsedResponse.answer}`);
    
    // Validate the answer is correct for math facts
    if (isMathFact && typeof parsedResponse.question === 'string') {
      // Extract numbers and operator from the question
      const match = parsedResponse.question.match(/(\d+)\s*([\+\-\×\÷\*\/])\s*(\d+)\s*=\s*\?/);
      if (match) {
        const [_, num1Str, operator, num2Str] = match;
        const num1 = parseInt(num1Str);
        const num2 = parseInt(num2Str);
        let expectedAnswer;
        
        // Calculate the correct answer
        switch(operator) {
          case '+': expectedAnswer = (num1 + num2).toString(); break;
          case '-': expectedAnswer = (num1 - num2).toString(); break;
          case '×':
          case '*': expectedAnswer = (num1 * num2).toString(); break;
          case '÷':
          case '/': expectedAnswer = (num1 / num2).toString(); break;
        }
        
        if (expectedAnswer && expectedAnswer !== parsedResponse.answer) {
          console.log(`⚠️ Incorrect answer detected! Question: ${parsedResponse.question}, AI answer: ${parsedResponse.answer}, Correct answer: ${expectedAnswer}`);
          parsedResponse.answer = expectedAnswer;
        }
      }
    }
    
    // Prepare flashcard style for math facts
    const questionStyle = isMathFact ? {
      fontSize: '60px',
      fontWeight: 'bold',
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      isFlashcard: true
    } : null;
    
    // Make sure the options always include the correct answer
    let options = parsedResponse.options || [];
    if (!options.includes(parsedResponse.answer)) {
      options.push(parsedResponse.answer);
      // Remove one of the other options if needed to maintain 4 options
      if (options.length > 4) {
        const answerIndex = options.indexOf(parsedResponse.answer);
        options = options.filter((_, index) => index !== (answerIndex === options.length - 1 ? 0 : options.length - 1));
      }
    }
    
    // Shuffle options
    options.sort(() => Math.random() - 0.5);
    
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      question: isMathFact ? {
        text: parsedResponse.question,
        style: questionStyle,
        isFlashcard: true
      } : parsedResponse.question,
      answer: parsedResponse.answer.toString(), // Ensure answer is a string
      options: options.map(opt => opt.toString()), // Ensure options are strings
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
    console.log(`Created fallback question instead: ${typeof question.question === 'object' ? question.question.text : question.question}`);
    
    return question;
  }
}

/**
 * Creates a hardcoded fallback question when OpenAI fails
 */
function createFallbackQuestion(grade: string, category: string) {
  const gradeLevel = grade === 'K' ? 0 : parseInt(grade) || 3;
  let question, answer, options;
  
  // Determine if this is a math fact (flashcard style) question
  const isMathFact = category.toLowerCase().includes("math-facts") || 
                    category.toLowerCase() === "addition" || 
                    category.toLowerCase() === "subtraction" ||
                    category.toLowerCase() === "multiplication" ||
                    category.toLowerCase() === "division";
  
  // Determine the operation based on category
  let operation = "addition";
  if (category.toLowerCase().includes("subtraction")) {
    operation = "subtraction";
  } else if (category.toLowerCase().includes("multiplication")) {
    operation = "multiplication";
  } else if (category.toLowerCase().includes("division")) {
    operation = "division";
  }
  
  // Generate appropriate numbers based on grade and operation
  if (operation === 'addition' || category === 'Arithmetic') {
    if (gradeLevel <= 1) {
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
    } else if (gradeLevel <= 3) {
      const num1 = Math.floor(Math.random() * 20) + 1;
      const num2 = Math.floor(Math.random() * 20) + 1;
      question = `${num1} + ${num2} = ?`;
      answer = (num1 + num2).toString();
      options = [
        answer,
        (num1 + num2 + 1).toString(),
        (num1 + num2 - 1).toString(),
        (num1 + num2 + 2).toString()
      ];
    } else {
      const num1 = Math.floor(Math.random() * 50) + 1;
      const num2 = Math.floor(Math.random() * 50) + 1;
      question = `${num1} + ${num2} = ?`;
      answer = (num1 + num2).toString();
      options = [
        answer,
        (num1 + num2 + 1).toString(),
        (num1 + num2 - 1).toString(),
        (num1 + num2 + 2).toString()
      ];
    }
  } else if (operation === 'subtraction') {
    if (gradeLevel <= 1) {
      const num2 = Math.floor(Math.random() * 5) + 1;
      const num1 = num2 + Math.floor(Math.random() * 5) + 1;
      question = `${num1} - ${num2} = ?`;
      answer = (num1 - num2).toString();
      options = [
        answer,
        (num1 - num2 + 1).toString(),
        (num1 - num2 - 1).toString(),
        (num1 - num2 + 2).toString()
      ];
    } else if (gradeLevel <= 3) {
      const num2 = Math.floor(Math.random() * 10) + 1;
      const num1 = num2 + Math.floor(Math.random() * 10) + 1;
      question = `${num1} - ${num2} = ?`;
      answer = (num1 - num2).toString();
      options = [
        answer,
        (num1 - num2 + 1).toString(),
        (num1 - num2 - 1).toString(),
        (num1 - num2 + 2).toString()
      ];
    } else {
      const num2 = Math.floor(Math.random() * 25) + 1;
      const num1 = num2 + Math.floor(Math.random() * 25) + 1;
      question = `${num1} - ${num2} = ?`;
      answer = (num1 - num2).toString();
      options = [
        answer,
        (num1 - num2 + 1).toString(),
        (num1 - num2 - 1).toString(),
        (num1 - num2 + 2).toString()
      ];
    }
  } else if (operation === 'multiplication') {
    if (gradeLevel <= 2) {
      const num1 = Math.floor(Math.random() * 5) + 1;
      const num2 = Math.floor(Math.random() * 5) + 1;
      question = `${num1} × ${num2} = ?`;
      answer = (num1 * num2).toString();
      options = [
        answer,
        (num1 * num2 + 1).toString(),
        (num1 * num2 - 1).toString(),
        (num1 * num2 + num1).toString()
      ];
    } else if (gradeLevel <= 4) {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      question = `${num1} × ${num2} = ?`;
      answer = (num1 * num2).toString();
      options = [
        answer,
        (num1 * num2 + 1).toString(),
        (num1 * num2 - 1).toString(),
        (num1 * num2 + num1).toString()
      ];
    } else {
      const num1 = Math.floor(Math.random() * 12) + 1;
      const num2 = Math.floor(Math.random() * 12) + 1;
      question = `${num1} × ${num2} = ?`;
      answer = (num1 * num2).toString();
      options = [
        answer,
        (num1 * num2 + 1).toString(),
        (num1 * num2 - 1).toString(),
        (num1 * num2 + num1).toString()
      ];
    }
  } else if (operation === 'division') {
    if (gradeLevel <= 2) {
      const num2 = Math.floor(Math.random() * 4) + 2; // 2-5 (divisor)
      const product = Math.floor(Math.random() * 4) + 1; // 1-4 (quotient)
      const num1 = num2 * product; // Ensures clean division
      question = `${num1} ÷ ${num2} = ?`;
      answer = product.toString();
      options = [
        answer,
        (product + 1).toString(),
        (product - 1).toString(),
        (product + 2).toString()
      ];
    } else if (gradeLevel <= 4) {
      const num2 = Math.floor(Math.random() * 9) + 2; // 2-10 (divisor)
      const product = Math.floor(Math.random() * 9) + 1; // 1-9 (quotient)
      const num1 = num2 * product; // Ensures clean division
      question = `${num1} ÷ ${num2} = ?`;
      answer = product.toString();
      options = [
        answer,
        (product + 1).toString(),
        (product - 1).toString(),
        (product + 2).toString()
      ];
    } else {
      const num2 = Math.floor(Math.random() * 11) + 2; // 2-12 (divisor)
      const product = Math.floor(Math.random() * 9) + 1; // 1-9 (quotient)
      const num1 = num2 * product; // Ensures clean division
      question = `${num1} ÷ ${num2} = ?`;
      answer = product.toString();
      options = [
        answer,
        (product + 1).toString(),
        (product - 1).toString(),
        (product + 2).toString()
      ];
    }
  } else {
    // Default to addition for unknown categories
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
  
  // Create flashcard style for math facts
  const flashcardStyle = {
    fontSize: '60px',
    fontWeight: 'bold',
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    isFlashcard: true
  };
  
  // Return the question with appropriate formatting
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    question: isMathFact ? {
      text: question,
      style: flashcardStyle,
      isFlashcard: true
    } : question,
    answer: answer,
    options: options,
    grade: grade,
    difficulty: Math.min(3, gradeLevel + 1),
    category: category,
    concepts: [operation],
    storyId: null,
    storyNode: null,
    storyText: null,
    storyImage: null
  };
}