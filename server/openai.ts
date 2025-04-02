import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type AdaptiveQuestionParams = {
  grade: string;
  concept?: string;
  studentLevel?: number;
  previousQuestions?: number[];
  difficulty?: number;
  category?: string;
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
          content: `You are an expert and encouraging math tutor for K-6 students. 
          Your goal is to help students understand math concepts by giving clear, encouraging feedback.
          Keep your responses simple, positive, and appropriate for elementary school students.
          If the student's answer is correct, offer brief praise.
          If the answer is incorrect, explain the concept in simple terms and guide them toward the right approach without directly giving the answer.
          Always use visuals or relatable examples when appropriate.
          For incorrect answers, provide 1-2 hints that will help them solve it on their own.`
        },
        {
          role: "user",
          content: `Question: ${question}\nStudent's answer: ${studentAnswer}\nCorrect answer: ${correctAnswer}`
        }
      ],
      max_tokens: 300,
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful math tutor for ${grade} grade students. 
          Provide an age-appropriate hint for the question without giving away the answer.
          For the first hint (previousAttempts=0), give a general conceptual reminder.
          For the second hint (previousAttempts=1), provide a more specific strategy.
          For the third hint (previousAttempts=2+), provide a more direct clue that gets them closer to the answer.
          Keep hints concise, encouraging, and tailored for young students.`
        },
        {
          role: "user",
          content: `Question: ${question}\nPrevious attempts: ${previousAttempts}`
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
          content: `You are a talented math teacher who excels at explaining concepts to ${grade} grade students.
          Use simple language, fun examples, and visual descriptions when explaining concepts.
          Relate the concept to real-world situations that children can understand.
          Keep the explanation concise - no more than 3-4 sentences.
          End with an encouraging message that makes the student feel capable.`
        },
        {
          role: "user",
          content: `Please explain the math concept of "${concept}" to a ${grade} grade student.`
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
  try {
    const { 
      grade, 
      concept, 
      studentLevel = 3, 
      difficulty = 3, 
      category = "General",
      previousQuestions = []
    } = params;
    
    // Create a context message that helps GPT understand what was previously asked
    const contextMessage = previousQuestions && previousQuestions.length > 0 
      ? `Recently asked questions that you SHOULD NOT DUPLICATE (avoid similar problems):
        ${previousQuestions.slice(0, 5).map(id => `Question ID ${id}`).join('\n')}`
      : 'Please generate a completely new question that hasn\'t been asked before.';
    
    // Determine question format based on grade level - with STRICT K grading enforcement
    const questionFormat = grade === 'K'
      ? 'KINDERGARTEN LEVEL ONLY: Keep language EXTREMELY simple with 1-2 sentences max. Use ONLY numbers 1-5. NO complex patterns, NO advanced vocabulary, NO word problems with abstract concepts. Focus on counting, shape recognition, and very basic comparisons (more/less). Questions should be solvable by 5-year-olds with minimal reading ability. Include simple visual descriptions (like "count the apples" or "which shape is a circle?"). NEVER use complex problems or abstract concepts for this grade level.'
      : grade === '1' 
      ? 'FIRST GRADE LEVEL ONLY: Keep language simple and use small numbers (1-10). Include visuals in the question description if helpful. Focus on basic addition/subtraction, simple patterns, and shape recognition. Questions should be solvable by 6-7 year olds.'
      : grade === '2' || grade === '3'
        ? 'Use appropriate vocabulary and numbers up to 100. Can include basic fractions and simple word problems.'
        : grade === '4' || grade === '5'
        ? 'Can include decimals, fractions, multi-step problems, and more complex word problems.'
        : 'Can include pre-algebra concepts, ratio and proportion, and complex word problems.';
    
    // Add variability to ensure diverse questions - adjust based on grade level
    let uniqueFactors = [];
    
    if (grade === 'K') {
      // For kindergarten, use extremely simple factors only
      uniqueFactors = [
        'Use simple counting of objects (1-5 only)',
        'Include a very basic shape recognition element',
        'Use simple comparisons (more/less/same)',
        'Show familiar objects like animals or toys',
        'Ask about colors or basic patterns',
        'Use simple size comparison (big/small)',
        'Focus on matching similar items',
        'Ask about simple sorting (by color or shape)'
      ];
    } else if (grade === '1') {
      // For 1st grade, use basic factors
      uniqueFactors = [
        'Use simple counting up to 10',
        'Include very basic addition or subtraction',
        'Use familiar objects for counting',
        'Include simple shape recognition',
        'Use basic patterns',
        'Focus on simple comparisons',
        'Include visual elements',
        'Use simple sorting activities'
      ];
    } else {
      // For higher grades, use more advanced factors
      uniqueFactors = [
        'Use a real-world scenario relevant to children',
        'Include a visual or spatial component',
        'Frame the question as a puzzle or challenge',
        'Incorporate a pattern recognition element',
        'Use measurement or data interpretation',
        'Include a comparison or estimation task',
        'Frame as a multi-step problem',
        'Incorporate logical reasoning'
      ];
    }
    
    // Select random factors to make this question unique
    const selectedFactors = uniqueFactors
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .join(' and ');
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert math educator specializing in creating unique, age-appropriate math questions for K-6 students.

          CRITICAL INSTRUCTIONS:
          1. Generate a COMPLETELY UNIQUE math question for ${grade} grade students with difficulty level ${difficulty}/5.
          2. ${concept ? `Focus specifically on the concept of ${concept}.` : `Focus on ${category} math.`}
          3. The student skill level is ${studentLevel}/5, adjust accordingly.
          4. ${questionFormat}
          5. ${selectedFactors} to make this question unique and engaging.
          6. NEVER repeat the same question patterns - create truly diverse content.
          7. ${contextMessage}
          
          Format your response as a JSON object with these fields:
          - question: The actual question text (detailed, clear, and engaging)
          - answer: The correct answer (as simple text, e.g. "42" or "3.14")
          - options: An array of 4 possible answers including the correct one (realistic distractors)
          - explanation: A brief explanation of how to solve the problem
          - difficulty: A number 1-5
          - concepts: Array of specific math concepts covered (be granular)
          - grade: The grade level ("K", "1", "2", etc.)
          - category: A specific category like "Arithmetic", "Algebra", "Geometry", "Fractions", etc.
          - uniqueId: A random 6-digit number to serve as a unique identifier`
        },
        {
          role: "user",
          content: `Create a unique, engaging ${grade} grade math question ${concept ? `about ${concept}` : `in the category of ${category}`} that hasn't been asked before. Make sure it's appropriate for the student's level and provides a learning opportunity.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.8, // Slightly higher temperature for more variability
    });

    const content = response.choices[0].message.content || '{}';
    const parsedResponse = JSON.parse(content as string);
    
    // Add a truly unique ID that won't collide with existing questions
    // Use timestamp + random number to ensure uniqueness
    const uniqueId = parsedResponse.uniqueId 
      ? parseInt(parsedResponse.uniqueId) 
      : Date.now() + Math.floor(Math.random() * 10000);
    
    return {
      ...parsedResponse,
      id: uniqueId
    };
  } catch (error) {
    console.error("Error generating adaptive question:", error);
    
    // Return a basic dynamic question as last resort - with grade-specific adjustments
    const grade = params.grade || "K";
    let num1, num2, questionText, options, explanation, category;
    
    // Adjust the fallback question based on grade level
    if (grade === "K") {
      // For kindergarten, use small numbers (1-5) and simple questions
      num1 = Math.floor(Math.random() * 3) + 1; // 1-3
      num2 = Math.floor(Math.random() * 3) + 1; // 1-3
      
      // Randomly select between counting, simple addition, or shape recognition
      const questionType = Math.floor(Math.random() * 3);
      
      if (questionType === 0) {
        // Counting question
        questionText = `How many stars are there? ${"★ ".repeat(num1)}`;
        options = [`${num1}`, `${num1+1}`, `${num1-1 > 0 ? num1-1 : num1+2}`, `${num1+2}`];
        explanation = `Count the stars one by one: ${Array.from({length: num1}, (_, i) => i+1).join(', ')}.`;
        category = "Counting";
      } else if (questionType === 1) {
        // Simple addition with visual cues
        questionText = `How many apples in total? ${num1} apples and ${num2} more apples.`;
        options = [`${num1 + num2}`, `${num1 + num2 + 1}`, `${num1 + num2 - 1 > 0 ? num1 + num2 - 1 : num1 + num2 + 2}`, `${num1 + num2 + 2}`];
        explanation = `Count ${num1} apples, then count ${num2} more apples. ${num1} + ${num2} = ${num1 + num2}.`;
        category = "Addition";
      } else {
        // Shape recognition
        const shapes = ["circle", "square", "triangle"];
        const correctShape = shapes[Math.floor(Math.random() * shapes.length)];
        questionText = `Which shape is a ${correctShape}?`;
        options = shapes.sort(() => Math.random() - 0.5);
        explanation = `A ${correctShape} is a shape that looks like a ${correctShape}.`;
        category = "Geometry";
      }
    } else {
      // For higher grades, use default addition questions with appropriate numbers
      const maxNum = grade === "1" ? 10 : grade === "2" ? 20 : grade === "3" ? 100 : 1000;
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
      category = "Addition";
    }
    
    return {
      id: Date.now(),
      question: questionText,
      answer: options[0], // First option is always the correct one
      options: options,
      explanation: explanation,
      difficulty: params.difficulty || 1,
      concepts: [category],
      grade: grade,
      category: category
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
          Show how ${centralConcept} relates to other math concepts at this grade level.
          Format your response as a JSON object with these fields:
          - centralConcept: The main concept
          - relatedConcepts: Array of objects with name and relationship properties
          - prerequisites: Array of concepts that should be understood first
          - applications: Array of real-world applications of this concept
          - nextSteps: Array of concepts to learn after mastering this one`
        },
        {
          role: "user",
          content: `Create a concept map for ${centralConcept} at ${grade} grade level.`
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
      applications: [],
      nextSteps: []
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
          content: `You are a math curriculum specialist.
          Create a developmental timeline for how the concept of ${concept} evolves from kindergarten through 6th grade.
          Format your response as a JSON object with these fields:
          - concept: The math concept name
          - timeline: Array of objects with grade and description properties showing how the concept develops
          - currentGradeDetails: Detailed information about what students at ${grade} grade should know
          - connections: How this concept connects to other areas of mathematics`
        },
        {
          role: "user",
          content: `Create a developmental timeline for the math concept "${concept}" with details for ${grade} grade.`
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
      connections: []
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
          content: `You are a gamification expert for educational applications.
          Create achievement badges and milestones for ${grade} grade students learning these math concepts: ${concepts.join(', ')}.
          Make the achievements fun, motivating, and appropriate for elementary students.
          Format your response as a JSON object with these fields:
          - achievements: Array of achievement objects with name, description, and criteria properties
          - milestones: Array of milestone objects with level, name, and description properties
          - conceptBadges: Object mapping each concept to a badge name and description`
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