import { RATIOS_RULES, type RatiosSkill, type RatiosLevel } from '@shared/ratiosRules';

interface RatiosQuestion {
  skill: RatiosSkill;
  level: number;
  prompt: string;
  correctAnswer: string;
  [key: string]: any;
}

// Get user's current skill level for a specific ratios skill
export async function getUserSkillLevel(userId: number, skill: RatiosSkill): Promise<number> {
  // TODO: Implement actual logic to fetch user's current skill level from the database
  return 1; // Start at level 1
}

// Generate questions for write_form skill
function generateWriteFormQuestion(level: number): RatiosQuestion {
  const maxValue = RATIOS_RULES.levels[level as RatiosLevel].maxValue;
  
  const a = Math.floor(Math.random() * maxValue) + 1;
  const b = Math.floor(Math.random() * maxValue) + 1;
  
  // Choose different formats for given vs requested
  const allFormats = [
    { name: 'to', display: (a: number, b: number) => `${a} to ${b}`, format: 'a to b' },
    { name: 'colon', display: (a: number, b: number) => `${a}:${b}`, format: 'a:b' },
    { name: 'fraction', display: (a: number, b: number) => `${a}/${b}`, format: 'a/b' }
  ];
  
  // Pick a random format for the given ratio (what we show)
  const givenFormat = allFormats[Math.floor(Math.random() * allFormats.length)];
  
  // Pick a different format for the requested answer
  const requestedFormats = allFormats.filter(f => f.name !== givenFormat.name);
  const requestedFormat = requestedFormats[Math.floor(Math.random() * requestedFormats.length)];
  
  const prompt = `The ratio ${givenFormat.display(a, b)} written in "${requestedFormat.format}" format is:`;
  const correctAnswer = requestedFormat.display(a, b);
  
  return {
    skill: 'write_form',
    level,
    prompt,
    correctAnswer,
    a,
    b,
    givenFormat: givenFormat.name,
    requestedFormat: requestedFormat.name
  };
}

// Generate questions for equivalents skill
function generateEquivalentsQuestion(level: number): RatiosQuestion {
  const maxValue = RATIOS_RULES.levels[level as RatiosLevel].maxValue;
  
  if (level === 1) {
    // Level 1: x:4 = 6:12, fill in x (answer should be 2)
    const a = Math.floor(Math.random() * 8) + 2; // 2-9
    const b = Math.floor(Math.random() * 8) + 2; // 2-9
    const multiplier = Math.floor(Math.random() * 4) + 2; // 2-5
    
    const scaledA = a * multiplier;
    const scaledB = b * multiplier;
    
    return {
      skill: 'equivalents',
      level,
      prompt: `Find the missing value to make equivalent ratios`,
      equation: `x:${b} = ${scaledA}:${scaledB}`,
      correctAnswer: `${a}`,
      originalA: a,
      originalB: b,
      scaledA,
      scaledB,
      multiplier
    };
  } else if (level === 2) {
    // Level 2: 6:8 = x:y where user fills in both values for a simpler ratio
    const a = Math.floor(Math.random() * 6) + 2; // 2-7
    const b = Math.floor(Math.random() * 6) + 2; // 2-7
    const multiplier = Math.floor(Math.random() * 3) + 2; // 2-4
    
    const scaledA = a * multiplier;
    const scaledB = b * multiplier;
    
    return {
      skill: 'equivalents',
      level,
      prompt: `Simplify this ratio to its lowest terms`,
      equation: `${scaledA}:${scaledB} = x:y`,
      correctAnswer: `${a}:${b}`,
      originalA: a,
      originalB: b,
      scaledA,
      scaledB,
      multiplier
    };
  } else {
    // Level 3+: Multiple choice with at least 1 correct
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const baseRatio = `${a}:${b}`;
    
    const options = [];
    const correctAnswers = [];
    
    // Add correct equivalent ratios
    const multiplier1 = Math.floor(Math.random() * 4) + 2;
    const multiplier2 = Math.floor(Math.random() * 4) + 2;
    const correct1 = `${a * multiplier1}:${b * multiplier1}`;
    const correct2 = `${a * multiplier2}:${b * multiplier2}`;
    
    options.push(correct1, correct2);
    correctAnswers.push(correct1, correct2);
    
    // Add incorrect options
    for (let i = 0; i < 3; i++) {
      let incorrectA = Math.floor(Math.random() * 20) + 1;
      let incorrectB = Math.floor(Math.random() * 20) + 1;
      
      // Ensure it's not equivalent to the base ratio
      while ((incorrectA / incorrectB) === (a / b)) {
        incorrectA = Math.floor(Math.random() * 20) + 1;
        incorrectB = Math.floor(Math.random() * 20) + 1;
      }
      
      options.push(`${incorrectA}:${incorrectB}`);
    }
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    return {
      skill: 'equivalents',
      level,
      prompt: `Select all ratios equivalent to ${baseRatio}`,
      baseRatio,
      options,
      correctAnswer: correctAnswers.join(','),
      correctAnswers
    };
  }
}

// Generate questions for visual_identification skill
function generateVisualQuestion(level: number): RatiosQuestion {
  const maxValue = RATIOS_RULES.levels[level as RatiosLevel].maxValue;
  
  // Generate shapes with colors
  const shapes = [];
  const shapeTypes = ['circle', 'square', 'triangle'];
  const colors = ['blue', 'orange'];
  
  // Ensure manageable total count
  const totalShapes = Math.min(Math.floor(Math.random() * 15) + 5, maxValue);
  
  for (let i = 0; i < totalShapes; i++) {
    shapes.push({
      type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  
  // Count for different prompts
  const blueCount = shapes.filter(s => s.color === 'blue').length;
  const orangeCount = shapes.filter(s => s.color === 'orange').length;
  const triangleCount = shapes.filter(s => s.type === 'triangle').length;
  const nonTriangleCount = totalShapes - triangleCount;
  
  // Randomly choose prompt type
  const promptTypes = ['color', 'shape'];
  const promptType = promptTypes[Math.floor(Math.random() * promptTypes.length)];
  
  let prompt = '';
  let correctAnswer = '';
  
  if (promptType === 'color' && blueCount > 0 && orangeCount > 0) {
    prompt = 'What is the ratio of blue to orange shapes?';
    correctAnswer = `${blueCount}:${orangeCount}`;
  } else if (promptType === 'shape' && triangleCount > 0 && nonTriangleCount > 0) {
    prompt = 'What is the ratio of triangles to all other shapes?';
    correctAnswer = `${triangleCount}:${nonTriangleCount}`;
  } else {
    // Fallback to color ratio
    prompt = 'What is the ratio of blue to orange shapes?';
    correctAnswer = `${blueCount}:${orangeCount}`;
  }
  console.log(`Generated visual question: ${prompt} - ${correctAnswer}`);
  return {
    skill: 'visual_identification',
    level,
    prompt,
    correctAnswer,
    shapes,
    totalShapes,
    blueCount,
    orangeCount,
    triangleCount
  };
}

// Main function to generate ratios questions
export function generateRatiosQuestions(skill: RatiosSkill, level: number): RatiosQuestion[] {
  const questions: RatiosQuestion[] = [];
  
  for (let i = 0; i < RATIOS_RULES.questionCount; i++) {
    let question: RatiosQuestion;
    
    switch (skill) {
      case 'write_form':
        question = generateWriteFormQuestion(level);
        break;
      case 'equivalents':
        question = generateEquivalentsQuestion(level);
        break;
      case 'visual_identification':
        question = generateVisualQuestion(level);
        break;
      default:
        question = generateWriteFormQuestion(level);
    }
    
    questions.push(question);
  }
  
  return questions;
}

// Normalize ratio format for comparison
function normalizeRatioAnswer(answer: string): string {
  return answer
    .trim()
    .toLowerCase()
    .replace(/\s+to\s+/g, ':')
    .replace(/\s*\/\s*/g, ':')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s+/g, '');
}

// Validate answer for a ratios question
export function validateRatiosAnswer(question: RatiosQuestion, userAnswer: string): boolean {
  const cleanAnswer = userAnswer.trim().toLowerCase();
  const correctAnswer = question.correctAnswer.toLowerCase();
  
  if (question.skill === 'equivalents' && question.level >= 3) {
    // For multi-select, check if user selected all correct options
    const userSelected = cleanAnswer.split(',').map(s => s.trim());
    const correctOptions = question.correctAnswers || [];
    
    // User must select at least one correct answer and no incorrect ones
    const hasCorrect = userSelected.some((selected: string) => 
      correctOptions.some((correct: string) => selected === correct.toLowerCase())
    );
    
    const hasIncorrect = userSelected.some((selected: string) => 
      !correctOptions.some((correct: string) => selected === correct.toLowerCase())
    );
    
    return hasCorrect && !hasIncorrect;
  }
  
  // For write_form questions, handle different acceptable formats
  if (question.skill === 'write_form') {
    // Normalize both answers for comparison
    const normalizedUser = normalizeRatioAnswer(cleanAnswer);
    const normalizedCorrect = normalizeRatioAnswer(correctAnswer);
    console.log(`Comparing normalized answers: ${normalizedUser} vs ${normalizedCorrect}`);
    return normalizedUser === normalizedCorrect;
  }
  
  // For equivalents questions, handle both single value and ratio formats
  if (question.skill === 'equivalents') {
    // Level 1: Single number answer
    if (question.level === 1) {
      return cleanAnswer === correctAnswer;
    }
    // Level 2: Ratio format answer - normalize for comparison
    if (question.level === 2) {
      const normalizedUser = normalizeRatioAnswer(cleanAnswer);
      const normalizedCorrect = normalizeRatioAnswer(correctAnswer);
      return normalizedUser === normalizedCorrect;
    }
  }
  
  // For visual_identification, expect ratio format - normalize for comparison
  if (question.skill === 'visual_identification') {
    const normalizedUser = normalizeRatioAnswer(cleanAnswer);
    const normalizedCorrect = normalizeRatioAnswer(correctAnswer);
    return normalizedUser === normalizedCorrect;
  }
  
  // Default comparison
  return cleanAnswer === correctAnswer;
}