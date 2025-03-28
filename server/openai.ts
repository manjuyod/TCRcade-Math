
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

type StudentContextData = {
  grade: string;
  interests?: string[];
  recentConcepts?: string[];
  strengths?: string[];
  weaknesses?: string[];
  learningStyle?: string;
  previousQuestions?: { question: string, correct: boolean }[];
};

type GeneratedQuestion = {
  question: string;
  options: string[];
  answer: string;
  concepts: string[];
  difficulty: number;
};

/**
 * Generates a personalized math question for a student based on their profile and learning context
 */
export async function generateAdaptiveQuestion(
  studentContext: StudentContextData
): Promise<GeneratedQuestion> {
  // If OpenAI API key is not available, return a generic question
  if (!hasOpenAIKey || !openai) {
    console.log('OpenAI question generation skipped - API key missing');
    return {
      question: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      answer: "4",
      concepts: ["Addition"],
      difficulty: 1
    };
  }
  
  try {
    // The system prompt guides the AI to generate an appropriate math question
    const systemPrompt = `You are an expert math curriculum developer for elementary school students (K-6).
    Generate a personalized multiple-choice math question tailored to the student's grade level, interests, and learning needs.
    Ensure the question is aligned with Common Core standards for the specified grade.
    Make the question engaging, age-appropriate, and connected to the student's interests if possible.
    
    Your response must be valid JSON with the following structure:
    {
      "question": "The complete question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The correct option text (must match exactly one of the options)",
      "concepts": ["Primary math concept", "Secondary concept"],
      "difficulty": A number from 1-5 representing the difficulty level
    }
    
    For Kindergarten and Grade 1, use simple language, visual cues (describe them), and focus on counting, basic addition/subtraction.
    For Grades 2-3, focus on multiplication, division, simple fractions, and measurement.
    For Grades 4-6, include more complex fractions, decimals, geometry, and pre-algebra concepts.
    
    Adapt difficulty based on the student's strengths and weaknesses.`;
    
    // Format the student context for the AI request
    const formattedInterests = studentContext.interests?.join(", ") || "general topics";
    const formattedStrengths = studentContext.strengths?.join(", ") || "unknown";
    const formattedWeaknesses = studentContext.weaknesses?.join(", ") || "unknown";
    const recentConcepts = studentContext.recentConcepts?.join(", ") || "various math concepts";
    
    const content = `
      Grade level: ${studentContext.grade}
      Student interests: ${formattedInterests}
      Recent concepts covered: ${recentConcepts}
      Strengths: ${formattedStrengths}
      Areas for improvement: ${formattedWeaknesses}
      Learning style: ${studentContext.learningStyle || "visual"}
      
      Generate a creative, engaging math question that connects to the student's interests if possible,
      and helps reinforce their understanding of recent concepts or address areas that need improvement.
      Ensure the question is appropriately challenging but achievable at their grade level.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      max_tokens: 500,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });
    
    const resultContent = response.choices[0].message.content;
    if (!resultContent) {
      throw new Error("Empty response from OpenAI");
    }
    
    const questionData = JSON.parse(resultContent) as GeneratedQuestion;
    
    // Validate the response to ensure it has the required structure
    if (!questionData.question || !questionData.options || !questionData.answer || !questionData.concepts) {
      throw new Error("Generated question is missing required fields");
    }
    
    // Ensure difficulty is within range
    questionData.difficulty = Math.max(1, Math.min(5, questionData.difficulty));
    
    return questionData;
  } catch (error: any) {
    // Log the specific error
    if (error.response) {
      console.error(`OpenAI API error status: ${error.response.status}`);
      console.error(`OpenAI error message: ${error.response.data.error.message}`);
    } else {
      console.error('Error generating adaptive question:', error.message || error);
    }
    
    // Return a fallback question in case of error
    return {
      question: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      answer: "4",
      concepts: ["Addition"],
      difficulty: 1
    };
  }
}

/**
 * Predicts a student's performance trajectory based on their learning history
 */
export async function predictStudentPerformance(userId: number, conceptData: any[], progressData: any[]) {
  // If OpenAI API key is not available, return an error
  if (!hasOpenAIKey || !openai) {
    console.log('OpenAI prediction skipped - API key missing');
    return {
      error: "Prediction requires OpenAI API key"
    };
  }
  
  try {
    const systemPrompt = `You are an AI educational analytics expert. Analyze the provided student learning data
    and generate predictions about the student's future performance, areas of potential struggle, and
    recommendations for teachers or parents. Format your response as JSON with the following structure:
    {
      "predictedMasteryTrajectory": {
        "nextWeek": number, // 0-100 mastery percentage
        "nextMonth": number,
        "nextQuarter": number
      },
      "conceptsAtRisk": [
        { "concept": string, "reason": string, "recommendedAction": string }
      ],
      "strengths": [
        { "concept": string, "observation": string }
      ],
      "learningVelocity": string, // "accelerating", "steady", "declining"
      "recommendedFocus": string,
      "estimatedTimeToMastery": {
        "concept": string,
        "timeInWeeks": number
      }
    }`;
    
    const content = `
      Student ID: ${userId}
      Concept mastery data: ${JSON.stringify(conceptData)}
      Progress history: ${JSON.stringify(progressData)}
      
      Analyze this data to predict the student's future performance. Look for patterns in their
      learning velocity, identify concepts they're struggling with, and suggest areas to focus on.
      Estimate how long it might take them to master any concepts they're currently struggling with.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      max_tokens: 800,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    if (!response.choices[0]?.message?.content) {
      throw new Error("Empty response from OpenAI");
    }
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error: any) {
    // Log the specific error
    if (error.response) {
      console.error(`OpenAI API error status: ${error.response.status}`);
      console.error(`OpenAI error message: ${error.response.data.error.message}`);
    } else {
      console.error('Error predicting student performance:', error.message || error);
    }
    
    return {
      error: "Could not generate predictions at this time"
    };
  }
}

/**
 * Generates a knowledge graph of mathematical concepts and their relationships
 */
export async function generateConceptMap(grade: string, centralConcept?: string) {
  // If OpenAI API key is not available, return an error
  if (!hasOpenAIKey || !openai) {
    console.log('OpenAI concept map generation skipped - API key missing');
    return {
      error: "Concept map generation requires OpenAI API key"
    };
  }
  
  try {
    const systemPrompt = `You are an expert mathematics curriculum designer. Create a knowledge graph of
    math concepts for the specified grade level, showing how concepts relate to each other.
    Format your response as a JSON object representing a graph with nodes (concepts) and edges (relationships):
    {
      "nodes": [
        { "id": string, "name": string, "category": string, "description": string }
      ],
      "links": [
        { "source": string, "target": string, "relationship": string }
      ]
    }
    
    Each node represents a math concept appropriate for the grade level.
    Each link shows how two concepts relate (e.g., "builds on", "prerequisite for", "applies to").
    Ensure the graph is comprehensive but not overwhelming, covering key grade-level concepts.`;
    
    const content = `
      Grade level: ${grade}
      ${centralConcept ? `Central concept: ${centralConcept}` : ''}
      
      Create a knowledge graph showing the key math concepts for grade ${grade}, their relationships,
      and dependencies. ${centralConcept ? `Center the graph around the concept "${centralConcept}".` : ''}
      Only include concepts that are grade-appropriate or prerequisite concepts from earlier grades.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      max_tokens: 1000,
      temperature: 0.5,
      response_format: { type: "json_object" }
    });
    
    if (!response.choices[0]?.message?.content) {
      throw new Error("Empty response from OpenAI");
    }
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error: any) {
    // Log the specific error
    if (error.response) {
      console.error(`OpenAI API error status: ${error.response.status}`);
      console.error(`OpenAI error message: ${error.response.data.error.message}`);
    } else {
      console.error('Error generating concept map:', error.message || error);
    }
    
    return {
      error: "Could not generate concept map at this time"
    };
  }
}

/**
 * Generates historical context and interesting facts about math concepts
 */
export async function generateMathTimeline(concept: string, gradeLevel: string) {
  // If OpenAI API key is not available, return an error
  if (!hasOpenAIKey || !openai) {
    console.log('OpenAI timeline generation skipped - API key missing');
    return {
      error: "Timeline generation requires OpenAI API key"
    };
  }
  
  try {
    const systemPrompt = `You are a mathematics historian making math engaging for elementary students.
    Create a child-friendly timeline about the historical development of the given math concept.
    Format your response as JSON with the following structure:
    {
      "concept": string,
      "timelineEvents": [
        { "year": string, "event": string, "significance": string, "funFact": string }
      ],
      "keyFigures": [
        { "name": string, "contribution": string, "interestingDetail": string }
      ],
      "ageAppropriateDescription": string
    }
    
    Make all content engaging and appropriate for elementary school students in the specified grade.
    Use simple language and focus on stories that would capture a child's imagination.
    Include diverse mathematicians and cultural contributions when relevant.`;
    
    const content = `
      Math concept: ${concept}
      Grade level: ${gradeLevel}
      
      Create an engaging, historically accurate, and age-appropriate timeline about the development of ${concept}
      throughout history. Include interesting facts, key mathematicians, and cultural context that would
      fascinate elementary school students in grade ${gradeLevel}.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    if (!response.choices[0]?.message?.content) {
      throw new Error("Empty response from OpenAI");
    }
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error: any) {
    // Log the specific error
    if (error.response) {
      console.error(`OpenAI API error status: ${error.response.status}`);
      console.error(`OpenAI error message: ${error.response.data.error.message}`);
    } else {
      console.error('Error generating math timeline:', error.message || error);
    }
    
    return {
      error: "Could not generate math timeline at this time"
    };
  }
}

/**
 * Generates achievement milestones and challenges for the gamification system
 */
export async function generateAchievements(grade: string, concepts: string[]) {
  // If OpenAI API key is not available, return an error
  if (!hasOpenAIKey || !openai) {
    console.log('OpenAI achievements generation skipped - API key missing');
    return {
      error: "Achievements generation requires OpenAI API key"
    };
  }
  
  try {
    const systemPrompt = `You are a gamification specialist designing achievement systems for a math learning platform.
    Create a set of engaging achievements appropriate for elementary students in the specified grade.
    Format your response as JSON with the following structure:
    {
      "publicAchievements": [
        { 
          "id": string,
          "name": string,
          "description": string, 
          "requirements": string,
          "rewardTokens": number,
          "tier": "bronze" | "silver" | "gold",
          "concept": string
        }
      ],
      "secretAchievements": [
        { 
          "id": string,
          "name": string,
          "description": string, 
          "requirements": string,
          "rewardTokens": number,
          "hint": string
        }
      ],
      "challengeSeries": [
        {
          "id": string,
          "name": string,
          "theme": string,
          "description": string,
          "stages": [
            { "stage": number, "challenge": string, "reward": string }
          ]
        }
      ]
    }
    
    Make achievements fun, motivating, and educational, with clever names and descriptions.
    Design public achievements openly visible to students and secret achievements they discover through special actions.
    Create challenge series with progressive difficulty that tell a story or follow a theme.`;
    
    const content = `
      Grade level: ${grade}
      Math concepts: ${concepts.join(", ")}
      
      Generate a comprehensive set of achievements and challenges for grade ${grade} students
      focusing on the listed math concepts. Include a mix of easy, medium, and difficult achievements
      that will motivate students and make learning fun. Ensure that rewards are appropriate for the
      difficulty level.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      max_tokens: 1200,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });
    
    if (!response.choices[0]?.message?.content) {
      throw new Error("Empty response from OpenAI");
    }
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error: any) {
    // Log the specific error
    if (error.response) {
      console.error(`OpenAI API error status: ${error.response.status}`);
      console.error(`OpenAI error message: ${error.response.data.error.message}`);
    } else {
      console.error('Error generating achievements:', error.message || error);
    }
    
    return {
      error: "Could not generate achievements at this time"
    };
  }
}
