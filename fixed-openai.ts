import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Some features will not work properly.");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

function questionReferencesImage(questionText: string): boolean {
  // Detect if question likely refers to a visual element
  return /clock|time|watch|hour|minute|angle|diagram|graph|shape|figure|image|picture|shown|display|illustrat|visual|geometr/i.test(questionText);
}

function generateSVGImage(content: any, type: string): string {
  // Simple SVG generation based on content type
  const width = 300;
  const height = 300;
  
  if (type === 'clock') {
    const hour = content.hour || 3;
    const minute = content.minute || 0;
    
    // Calculate angles for clock hands
    const hourAngle = (hour % 12) * 30 + (minute / 60) * 30; // 30 degrees per hour plus adjustment for minutes
    const minuteAngle = minute * 6; // 6 degrees per minute
    
    // Generate SVG for a clock
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Clock face -->
      <circle cx="${width/2}" cy="${height/2}" r="${width/2 - 10}" fill="white" stroke="black" stroke-width="2"/>
      
      <!-- Hour markers -->
      ${Array.from({length: 12}, (_, i) => {
        const angle = i * 30 * (Math.PI / 180); // convert to radians
        const x1 = width/2 + (width/2 - 20) * Math.sin(angle);
        const y1 = height/2 - (height/2 - 20) * Math.cos(angle);
        const x2 = width/2 + (width/2 - 10) * Math.sin(angle);
        const y2 = height/2 - (height/2 - 10) * Math.cos(angle);
        
        // For main hours (12, 3, 6, 9), make markers more prominent
        const isMainHour = i % 3 === 0;
        const strokeWidth = isMainHour ? 3 : 2;
        
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="${strokeWidth}"/>`;
      }).join('')}
      
      <!-- Hour numbers -->
      ${Array.from({length: 12}, (_, i) => {
        const hour = i === 0 ? 12 : i;
        const angle = i * 30 * (Math.PI / 180); // convert to radians
        const x = width/2 + (width/2 - 30) * Math.sin(angle);
        const y = height/2 - (height/2 - 30) * Math.cos(angle) + 5; // +5 for vertical centering
        
        return `<text x="${x}" y="${y}" text-anchor="middle" font-size="16" font-weight="bold">${hour}</text>`;
      }).join('')}
      
      <!-- Hour hand -->
      <line 
        x1="${width/2}" 
        y1="${height/2}" 
        x2="${width/2 + (width/4 - 20) * Math.sin(hourAngle * (Math.PI / 180))}" 
        y2="${height/2 - (height/4 - 20) * Math.cos(hourAngle * (Math.PI / 180))}" 
        stroke="black" 
        stroke-width="4" 
        stroke-linecap="round"/>
      
      <!-- Minute hand -->
      <line 
        x1="${width/2}" 
        y1="${height/2}" 
        x2="${width/2 + (width/3 - 10) * Math.sin(minuteAngle * (Math.PI / 180))}" 
        y2="${height/2 - (height/3 - 10) * Math.cos(minuteAngle * (Math.PI / 180))}" 
        stroke="black" 
        stroke-width="2" 
        stroke-linecap="round"/>
      
      <!-- Center circle -->
      <circle cx="${width/2}" cy="${height/2}" r="5" fill="black"/>
      
      <!-- Time display -->
      <text x="${width/2}" y="${height/2 + 50}" text-anchor="middle" font-size="16">
        ${hour}:${minute.toString().padStart(2, '0')}
      </text>
    </svg>`;
  }
  
  return '';
}

function getStarPoints(centerX: number, centerY: number, size: number): string {
  const points = [];
  const outerRadius = size;
  const innerRadius = size / 2;
  
  for (let i = 0; i < 10; i++) {
    // Use outer or inner radius depending on whether it's an odd or even vertex
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = Math.PI * i / 5;
    
    const x = centerX + radius * Math.sin(angle);
    const y = centerY - radius * Math.cos(angle);
    
    points.push(`${x},${y}`);
  }
  
  return points.join(' ');
}

type AdaptiveQuestionParams = {
  grade: string;
  concept?: string;
  studentLevel?: number;
  previousQuestions?: Array<number | { 
    id?: number;
    question?: string;
    mathOperations?: string[];
    questionSignature?: string;
    [key: string]: any;
  }>;
  difficulty?: number;
  category?: string;
  forceDynamic?: boolean;  // Indicates if this is the first question in a series
  isMathFactsModule?: boolean; // Indicates this is a pure computation Math Facts module
};

/**
 * Analyzes a student's response to a math question and provides helpful feedback
 */
export async function analyzeStudentResponse(question: string, studentAnswer: string, correctAnswer: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a supportive math tutor. Analyze the student's answer and provide encouraging feedback. Keep responses concise but helpful."
        },
        {
          role: "user",
          content: `Question: ${question}\nStudent's answer: ${studentAnswer}\nCorrect answer: ${correctAnswer}\n\nProvide brief, encouraging feedback that explains whether the answer is correct and why.`
        }
      ],
      max_tokens: 150,
    });

    return {
      feedback: response.choices[0].message.content,
      isCorrect: studentAnswer === correctAnswer
    };
  } catch (error) {
    console.error("Error analyzing student response:", error);
    return {
      feedback: "I couldn't analyze your answer right now. Let's try again later!",
      isCorrect: studentAnswer === correctAnswer
    };
  }
}

/**
 * Generates a personalized hint based on a math question and student context
 */
export async function generateMathHint(question: string, grade: string, previousAttempts: number = 0) {
  try {
    const hintLevel = previousAttempts === 0 ? "subtle" : previousAttempts === 1 ? "moderate" : "direct";
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a supportive math tutor for grade ${grade} students. Provide a ${hintLevel} hint that guides the student without giving away the answer.`
        },
        {
          role: "user",
          content: `Question: ${question}\nThis is attempt #${previousAttempts + 1}. Give a ${hintLevel} hint.`
        }
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating math hint:", error);
    return "Think about the key steps needed to solve this problem. You can do it!";
  }
}

/**
 * Explains a math concept in an age-appropriate and engaging way
 */
export async function explainMathConcept(concept: string, grade: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a fun, enthusiastic math teacher for grade ${grade} students. Explain concepts in age-appropriate language with simple examples.`
        },
        {
          role: "user",
          content: `Explain the math concept "${concept}" to a ${grade} grade student. Keep it simple, engaging, and provide a basic example.`
        }
      ],
      max_tokens: 200,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error explaining math concept:", error);
    return `${concept} is an important math skill that you'll use often. Let's keep practicing to get better at it!`;
  }
}

/**
 * Generates adaptive questions based on student parameters
 */
export async function generateAdaptiveQuestion(params: AdaptiveQuestionParams) {
  const { 
    grade, 
    concept, 
    studentLevel = 3, 
    difficulty = 3, 
    category = "General",
    previousQuestions = [],
    forceDynamic = false,
    isMathFactsModule = false
  } = params;
  
  console.log(`Generating adaptive question for grade ${grade}, category ${category}`);
  
  try {
    // Extract full question data if available to avoid duplication
    let previousQuestionData: string[] = [];
    let previousMathFacts: string[] = [];
    
    if (Array.isArray(previousQuestions) && previousQuestions.length > 0) {
      // Check if we have full question objects or just IDs
      const hasFullQuestionData = previousQuestions.some(q => 
        typeof q === 'object' && q !== null && q.hasOwnProperty('question'));
        
      if (hasFullQuestionData) {
        // Extract the text and math facts to avoid repetition
        previousQuestionData = previousQuestions
          .filter(q => typeof q === 'object' && q !== null && q.hasOwnProperty('question'))
          .map(q => (q as any).question as string)
          .slice(-15); // Keep last 15 questions for context
      }
    }
    
    // Create detailed context to prevent repetition
    const contextMessage = previousQuestionData.length > 0
      ? `Recently asked questions that you SHOULD NOT DUPLICATE (avoid similar problems):
         ${previousQuestionData.slice(-7).map((q, i) => `Question ${i+1}: "${q}"`).join('\n')}`
      : 'Please generate a completely new question that hasn\'t been asked before with diverse number operations.';
    
    // Determine question format based on grade level - with STRICT K grading enforcement
    const questionFormat = grade === 'K'
      ? 'KINDERGARTEN LEVEL ONLY: Keep language EXTREMELY simple with 1-2 sentences max. Use ONLY numbers 1-10.'
      : grade === '1' 
      ? 'FIRST GRADE LEVEL ONLY: Keep language simple and use small numbers (1-20).'
      : grade === '2' || grade === '3'
        ? 'Use appropriate vocabulary and numbers up to 100.'
        : 'Can include more complex concepts appropriate for the grade level.';
    
    let operationsInstruction = '';
    if (category === 'Addition') {
      operationsInstruction = 'Create an addition problem appropriate for the grade level.';
    } else if (category === 'Subtraction') {
      operationsInstruction = 'Create a subtraction problem appropriate for the grade level.';
    } else if (category === 'Multiplication') {
      operationsInstruction = 'Create a multiplication problem appropriate for the grade level.';
    } else if (category === 'Division') {
      operationsInstruction = 'Create a division problem appropriate for the grade level.';
    } else if (category === 'Fractions') {
      operationsInstruction = 'Create a fraction problem appropriate for the grade level.';
    } else if (category === 'Time') {
      operationsInstruction = 'Create a time-related problem appropriate for the grade level.';
    }
    
    // Generate the question using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        {
          role: "system",
          content: `You are a math education expert creating grade-appropriate questions.
          ${questionFormat}
          ${operationsInstruction}`
        },
        {
          role: "user",
          content: `Create a ${grade} grade math question for category: ${category || 'General'}.
          ${contextMessage}
          Return ONLY a valid JSON object with these properties:
          - question: the full text of the question
          - answer: the correct answer
          - options: array of 4 answer choices (the first one should be the correct answer)
          - explanation: brief explanation of how to solve it
          - concepts: array of math concepts covered
          - difficulty: number 1-5 representing difficulty
          - uniqueId: a random integer ID`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800
    });

    const content = response.choices[0].message.content || '{}';
    const parsedResponse = JSON.parse(content as string);
    
    // For Math Facts modules, enforce pure computation format
    if (isMathFactsModule) {
      // Simplify to pure computation format
      const mathOperations = ['addition', 'subtraction', 'multiplication', 'division'];
      const simplifiedOps = {
        'addition': '+',
        'subtraction': '-',
        'multiplication': '×',
        'division': '÷'
      };
      
      // Find basic math operations in the question
      const detectedOperation = mathOperations.find(op => 
        category?.toLowerCase().includes(op) || 
        parsedResponse.concepts?.some((c: string) => c.toLowerCase().includes(op))
      );
      
      if (detectedOperation) {
        // Extract numbers using regex
        const numbers = parsedResponse.question.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          const num1 = numbers[0];
          const num2 = numbers[1];
          const opSymbol = simplifiedOps[detectedOperation as keyof typeof simplifiedOps];
          
          // Override with pure computation format
          parsedResponse.question = `${num1} ${opSymbol} ${num2} = ?`;
        }
      }
    }
    
    // Generate a unique ID if none was provided
    const uniqueId = parsedResponse.uniqueId || Date.now();
    
    // Extract the question signature to avoid similar questions
    const questionSignature = parsedResponse.question
      ? parsedResponse.question
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim()
      : '';
    
    console.log("Successfully generated new question via OpenAI");
    
    return {
      ...parsedResponse,
      id: uniqueId,
      questionSignature: questionSignature || undefined
    };
  } catch (error) {
    console.error("Error generating adaptive question:", error);
    
    // Return a basic dynamic question as last resort - with grade-specific adjustments
    const fallbackGrade = params.grade || "K";
    let num1, num2, questionText, options, explanation;
    const fallbackCategory = category || "Addition";
    
    // Adjust the fallback question based on grade level
    if (fallbackGrade === "K") {
      // For kindergarten, use small numbers (1-5) and simple questions
      num1 = Math.floor(Math.random() * 3) + 1; // 1-3
      num2 = Math.floor(Math.random() * 3) + 1; // 1-3
      
      questionText = `What is ${num1} + ${num2}?`;
      options = [`${num1 + num2}`, `${num1 + num2 + 1}`, `${num1 + num2 - 1 > 0 ? num1 + num2 - 1 : num1 + num2 + 2}`, `${num1 + num2 + 2}`];
      explanation = `To add ${num1} + ${num2}, combine the two numbers to get ${num1 + num2}.`;
    } else {
      // For higher grades, use default addition questions with appropriate numbers
      const maxNum = fallbackGrade === "1" ? 10 : fallbackGrade === "2" ? 20 : fallbackGrade === "3" ? 100 : 1000;
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * maxNum) + 1;
      
      questionText = `What is ${num1} + ${num2}?`;
      options = [
        `${num1 + num2}`,
        `${num1 + num2 + 1}`,
        `${num1 + num2 - 1}`,
        `${num1 + num2 + 2}`
      ];
      explanation = `To add ${num1} and ${num2}, count forward ${num2} places from ${num1}.`;
    }
    
    // Create result object
    return {
      id: Date.now(),
      question: questionText,
      answer: options[0], // First option is always the correct one
      options: options,
      explanation: explanation,
      difficulty: params.difficulty || 1,
      concepts: [fallbackCategory],
      grade: fallbackGrade,
      category: fallbackCategory
    };
  }
}

/**
 * Predicts student performance based on learning history
 */
export async function predictStudentPerformance(
  userId: number, 
  conceptMasteries: any[], 
  progressHistory: any[]
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI educational analyst that predicts student performance.
          Analyze the student's concept masteries and progress history to predict:
          1. Which concepts they are ready to advance in
          2. Which concepts need review
          3. A recommended learning path
          Format your response as a JSON object with these fields:
          - readyForAdvancement: Array of concept names
          - needsReview: Array of concept names
          - recommendedPath: Brief description of suggested learning activities
          - strengthAreas: Array of the student's strongest areas
          - challengeAreas: Array of areas where the student needs more support`
        },
        {
          role: "user",
          content: `Analyze student performance:\nConcept Masteries: ${JSON.stringify(conceptMasteries)}\nProgress History: ${JSON.stringify(progressHistory)}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content as string);
  } catch (error) {
    console.error("Error predicting student performance:", error);
    return {
      readyForAdvancement: [],
      needsReview: [],
      recommendedPath: "Continue practicing fundamental skills across all areas.",
      strengthAreas: [],
      challengeAreas: []
    };
  }
}

/**
 * Generates a conceptual map showing relationships between math concepts
 */
export async function generateConceptMap(grade: string, centralConcept: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert math curriculum designer.
          Create a concept map for ${grade} grade students centered on ${centralConcept}.
          Focus on showing how this concept connects to other math ideas they're learning.
          Format your response as a JSON object with these fields:
          - centralConcept: The main concept
          - relatedConcepts: Array of directly related concepts
          - connections: Array of objects showing how concepts connect, each with 'from', 'to', and 'relationship' fields
          - prerequisites: Array of concepts students should understand first
          - applications: Array of real-world applications of this concept`
        },
        {
          role: "user",
          content: `Create a concept map for ${grade} grade students centered on ${centralConcept}.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content as string);
  } catch (error) {
    console.error("Error generating concept map:", error);
    return {
      centralConcept,
      relatedConcepts: [],
      prerequisites: [],
      connections: [],
      applications: []
    };
  }
}

/**
 * Generates a timeline of how a math concept develops across grade levels
 */
export async function generateMathTimeline(concept: string, grade: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert K-12 math curriculum designer.
          Create a developmental timeline showing how the concept "${concept}" 
          evolves across grade levels, with special focus on grade ${grade}.
          Format your response as a JSON object with these fields:
          - concept: The main concept
          - timeline: Array of objects, each with 'grade' and 'development' fields
          - currentGradeDetails: Detailed explanation of how this concept appears in the student's current grade
          - futureApplications: How this concept will be used in future math learning`
        },
        {
          role: "user",
          content: `Generate a math concept timeline for "${concept}" with focus on grade ${grade}.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content as string);
  } catch (error) {
    console.error("Error generating math timeline:", error);
    return {
      concept,
      timeline: [],
      currentGradeDetails: `In ${grade} grade, students work with ${concept} in age-appropriate ways.`,
    };
  }
}

/**
 * Generates achievement badges and milestones for math concepts
 */
export async function generateAchievements(grade: string, concepts: string[]) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an educational gamification expert.
          Create engaging achievements and badges for ${grade} grade students
          learning these math concepts: ${concepts.join(', ')}.
          Format your response as a JSON object with these fields:
          - achievements: Array of achievement objects, each with 'name', 'description', and 'requirements'
          - milestones: Array of milestone objects marking significant progress points
          - conceptBadges: Object mapping each concept to a badge description`
        },
        {
          role: "user",
          content: `Generate achievements and badges for ${grade} grade students learning: ${concepts.join(', ')}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content as string);
  } catch (error) {
    console.error("Error generating achievements:", error);
    return {
      achievements: [],
      milestones: [],
      conceptBadges: {}
    };
  }
}