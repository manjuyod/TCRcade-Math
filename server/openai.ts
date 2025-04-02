import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Checks if a question text references an image or visual
 * @param questionText The text of the question to check for image references
 */
function questionReferencesImage(questionText: string): boolean {
  // Common phrases that indicate a visual element is needed
  const visualReferencePatterns = [
    /look at the (image|picture|photo|figure|diagram)/i,
    /refer to the (image|picture|photo|figure|diagram)/i,
    /based on the (image|picture|photo|figure|diagram)/i,
    /in the (image|picture|photo|figure|diagram)/i,
    /shown in the (image|picture|photo|figure|diagram)/i,
    /from the (image|picture|photo|figure|diagram)/i,
    /using the (image|picture|photo|figure|diagram)/i,
    /the (image|picture|photo|figure|diagram) shows/i,
    /count the number of/i,
    /how many.*can you see/i,
    /how many.*are there/i
  ];
  
  // Return true if any pattern matches
  return visualReferencePatterns.some(pattern => pattern.test(questionText));
}

/**
 * Generates a simple SVG image for math questions
 * @param content Content to be visualized (numbers, shapes, etc.)
 * @param type Type of image to generate: "countObjects", "shapes", etc.
 */
function generateSVGImage(content: any, type: string): string {
  const svgWidth = 300;
  const svgHeight = 200;
  let svgContent = '';
  
  // Start with SVG header
  const svgHeader = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>`;
  
  // End with SVG footer
  const svgFooter = `</svg>`;
  
  // Generate appropriate content based on type
  if (type === "countObjects") {
    // Count objects is expecting an array: [object type, count]
    const [objectType, count] = Array.isArray(content) ? content : ["circle", 5];
    const objects = parseInt(count.toString()) || 5;
    const itemsPerRow = Math.min(5, objects);
    const rows = Math.ceil(objects / itemsPerRow);
    const spacing = svgWidth / (itemsPerRow + 1);
    const verticalSpacing = svgHeight / (rows + 1);
    
    // Draw the objects
    for (let i = 0; i < objects; i++) {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const x = spacing * (col + 1);
      const y = verticalSpacing * (row + 1);
      
      // Different objects based on the type
      if (objectType === "apple" || objectType === "apples") {
        // Draw a red apple
        svgContent += `
          <circle cx="${x}" cy="${y}" r="15" fill="red" />
          <rect x="${x-1}" y="${y-20}" width="2" height="10" fill="brown" />
          <path d="M ${x-5} ${y-15} Q ${x} ${y-20} ${x+5} ${y-15}" stroke="green" stroke-width="1.5" fill="none" />
        `;
      } else if (objectType === "star" || objectType === "stars") {
        // Draw a yellow star
        const starPoints = getStarPoints(x, y, 15);
        svgContent += `<polygon points="${starPoints}" fill="gold" stroke="orange" stroke-width="1" />`;
      } else if (objectType === "triangle" || objectType === "triangles") {
        // Draw a green triangle
        svgContent += `<polygon points="${x},${y-15} ${x-15},${y+10} ${x+15},${y+10}" fill="green" />`;
      } else if (objectType === "square" || objectType === "squares") {
        // Draw a blue square
        svgContent += `<rect x="${x-15}" y="${y-15}" width="30" height="30" fill="blue" />`;
      } else if (objectType === "circle" || objectType === "circles") {
        // Draw a purple circle
        svgContent += `<circle cx="${x}" cy="${y}" r="15" fill="purple" />`;
      } else {
        // Default to a simple circle
        svgContent += `<circle cx="${x}" cy="${y}" r="15" fill="#FF9500" />`;
      }
    }
  } else if (type === "shapes") {
    // Draw different shapes for shape recognition
    const shapesData = [
      { type: "circle", x: 75, y: 75, params: 30, fill: "#FF5733" },
      { type: "square", x: 225, y: 75, size: 50, fill: "#33A8FF" },
      { type: "triangle", x: 150, y: 125, size: 50, fill: "#4CAF50" }
    ];
    
    // Draw each shape
    for (const shape of shapesData) {
      if (shape.type === "circle") {
        svgContent += `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.params}" fill="${shape.fill}" />`;
      } else if (shape.type === "square") {
        const halfSize = (shape.size || 40) / 2;
        svgContent += `<rect x="${shape.x - halfSize}" y="${shape.y - halfSize}" width="${shape.size}" height="${shape.size}" fill="${shape.fill}" />`;
      } else if (shape.type === "triangle") {
        const size = shape.size || 40;
        const halfSize = size / 2;
        svgContent += `<polygon points="${shape.x},${shape.y - halfSize} ${shape.x - halfSize},${shape.y + halfSize} ${shape.x + halfSize},${shape.y + halfSize}" fill="${shape.fill}" />`;
      }
    }
    
    // Add labels if requested
    if (content === "labeled") {
      svgContent += `
        <text x="75" y="125" font-family="Arial" font-size="12" text-anchor="middle" fill="black">Circle</text>
        <text x="225" y="125" font-family="Arial" font-size="12" text-anchor="middle" fill="black">Square</text>
        <text x="150" y="185" font-family="Arial" font-size="12" text-anchor="middle" fill="black">Triangle</text>
      `;
    }
  } else if (type === "fractions") {
    // Draw a fraction representation (e.g., 3/4 shows 3 out of 4 parts shaded)
    const [numerator, denominator] = Array.isArray(content) ? content : [1, 4];
    const num = parseInt(numerator.toString()) || 1;
    const denom = parseInt(denominator.toString()) || 4;
    
    // Calculate dimensions for a horizontal bar representation
    const barWidth = 240;
    const barHeight = 40;
    const barX = (svgWidth - barWidth) / 2;
    const barY = (svgHeight - barHeight) / 2;
    
    // Draw the whole bar outline
    svgContent += `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="none" stroke="black" stroke-width="2" />`;
    
    // Draw division lines
    const sectionWidth = barWidth / denom;
    for (let i = 1; i < denom; i++) {
      const lineX = barX + (sectionWidth * i);
      svgContent += `<line x1="${lineX}" y1="${barY}" x2="${lineX}" y2="${barY + barHeight}" stroke="black" stroke-width="2" />`;
    }
    
    // Fill in the numerator parts
    for (let i = 0; i < num; i++) {
      const rectX = barX + (sectionWidth * i);
      svgContent += `<rect x="${rectX}" y="${barY}" width="${sectionWidth}" height="${barHeight}" fill="#FFD700" stroke="none" />`;
    }
    
    // Add fraction text
    svgContent += `<text x="${svgWidth/2}" y="${barY + barHeight + 25}" font-family="Arial" font-size="14" text-anchor="middle" fill="black">${num}/${denom}</text>`;
  }
  
  // Combine all parts into the final SVG
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgHeader + svgContent + svgFooter)}`;
}

/**
 * Helper function to create star points
 */
function getStarPoints(centerX: number, centerY: number, size: number): string {
  const outerRadius = size;
  const innerRadius = size / 2.5;
  const points = [];
  
  for (let i = 0; i < 10; i++) {
    // Use outer or inner radius based on the current point
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = Math.PI * i / 5;
    
    // Calculate the point coordinates
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
          7. IMPORTANT ABOUT IMAGES: DO NOT create questions that reference images or pictures UNLESS you're creating:
             - Counting problems (how many objects)
             - Shape recognition (identifying shapes)
             - Fraction visualization (parts of a whole)
             The system can auto-generate images for these specific types, but other visual references will not display properly.
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
    
    // Check if the question references an image and handle it if needed
    if (questionReferencesImage(parsedResponse.question)) {
      console.log("Question references an image - generating a visual");
      
      // Determine what kind of image to generate
      let imageType = "countObjects";
      let imageContent: any = ["circle", 5];

      // Check for counting questions
      if (/how many/i.test(parsedResponse.question)) {
        const objectMatches = parsedResponse.question.match(/how many (.*?) are there/i);
        const objectType = objectMatches ? objectMatches[1] : "circles";
        const count = Math.floor(Math.random() * 5) + 2; // 2-6 objects
        imageContent = [objectType, count];
        
        // Make sure the answer matches the count
        if (/how many/i.test(parsedResponse.question)) {
          parsedResponse.answer = count.toString();
          
          // Update options to include the correct answer and nearby numbers
          parsedResponse.options = [
            count.toString(),
            (count + 1).toString(),
            (count - 1 > 0 ? count - 1 : count + 2).toString(),
            (count + 2).toString()
          ];
        }
      } 
      // Check for shape-related questions
      else if (/shape|triangle|circle|square/i.test(parsedResponse.question)) {
        imageType = "shapes";
        imageContent = "labeled";
      }
      // Check for fraction-related questions
      else if (/fraction|part/i.test(parsedResponse.question)) {
        imageType = "fractions";
        const num = Math.floor(Math.random() * 3) + 1; // 1-3
        const denom = 4;
        imageContent = [num, denom];
      }
      
      // Generate the image
      const imageUrl = generateSVGImage(imageContent, imageType);
      
      // Add the image URL to the response
      parsedResponse.storyImage = imageUrl;
    }
    
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
    let storyImage = null; // For visual references
    
    // Adjust the fallback question based on grade level
    if (grade === "K") {
      // For kindergarten, use small numbers (1-5) and simple questions
      num1 = Math.floor(Math.random() * 3) + 1; // 1-3
      num2 = Math.floor(Math.random() * 3) + 1; // 1-3
      
      // Randomly select between counting, simple addition, or shape recognition
      const questionType = Math.floor(Math.random() * 3);
      
      if (questionType === 0) {
        // Counting question with SVG image
        questionText = `How many stars are there?`;
        options = [`${num1}`, `${num1+1}`, `${num1-1 > 0 ? num1-1 : num1+2}`, `${num1+2}`];
        explanation = `Count the stars one by one: ${Array.from({length: num1}, (_, i) => i+1).join(', ')}.`;
        category = "Counting";
        // Generate a SVG image for the counting stars
        storyImage = generateSVGImage(["star", num1], "countObjects");
      } else if (questionType === 1) {
        // Simple addition with visual cues
        questionText = `How many apples in total? ${num1} apples and ${num2} more apples.`;
        options = [`${num1 + num2}`, `${num1 + num2 + 1}`, `${num1 + num2 - 1 > 0 ? num1 + num2 - 1 : num1 + num2 + 2}`, `${num1 + num2 + 2}`];
        explanation = `Count ${num1} apples, then count ${num2} more apples. ${num1} + ${num2} = ${num1 + num2}.`;
        category = "Addition";
      } else {
        // Shape recognition with SVG image
        const shapes = ["circle", "square", "triangle"];
        const correctShape = shapes[Math.floor(Math.random() * shapes.length)];
        questionText = `Which shape is a ${correctShape}?`;
        options = shapes.sort(() => Math.random() - 0.5);
        explanation = `A ${correctShape} is a shape that looks like a ${correctShape}.`;
        category = "Geometry";
        // Generate SVG image for shape recognition
        storyImage = generateSVGImage(correctShape, "shapes");
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
      category: category,
      storyImage: storyImage
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