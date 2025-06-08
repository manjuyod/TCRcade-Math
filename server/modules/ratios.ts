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
  // For now, return a default level based on user progress
  // In a real implementation, this would query the database
  return 1; // Start at level 1
}

// Generate questions for write_form skill
function generateWriteFormQuestion(level: number): RatiosQuestion {
  const maxValue = RATIOS_RULES.levels[level as RatiosLevel].maxValue;
  
  const a = Math.floor(Math.random() * maxValue) + 1;
  const b = Math.floor(Math.random() * maxValue) + 1;
  
  // Randomly choose which format to request
  const formats = ['to', 'colon', 'fraction'];
  const requestedFormat = formats[Math.floor(Math.random() * formats.length)];
  
  let prompt = '';
  let correctAnswer = '';
  
  switch (requestedFormat) {
    case 'to':
      prompt = `Write the ratio ${a} to ${b} in "a to b" format`;
      correctAnswer = `${a} to ${b}`;
      break;
    case 'colon':
      prompt = `Write the ratio ${a} to ${b} in "a:b" format`;
      correctAnswer = `${a}:${b}`;
      break;
    case 'fraction':
      prompt = `Write the ratio ${a} to ${b} in "a/b" format`;
      correctAnswer = `${a}/${b}`;
      break;
  }
  
  return {
    skill: 'write_form',
    level,
    prompt,
    correctAnswer,
    a,
    b,
    requestedFormat
  };
}

// Generate questions for equivalents skill
function generateEquivalentsQuestion(level: number): RatiosQuestion {
  const maxValue = RATIOS_RULES.levels[level as RatiosLevel].maxValue;
  
  if (level === 1) {
    // Level 1: x:4 = 3:4, fill in x
    const b = Math.floor(Math.random() * maxValue) + 1;
    const ratio = Math.floor(Math.random() * maxValue) + 1;
    const x = Math.floor(Math.random() * maxValue) + 1;
    
    return {
      skill: 'equivalents',
      level,
      prompt: `Find the missing value to make equivalent ratios`,
      equation: `x:${b} = ${x}:${ratio * b}`,
      correctAnswer: `${x * ratio}`,
      x: x * ratio,
      b,
      ratio
    };
  } else if (level === 2) {
    // Level 2: x:y = 3:4, fill both
    const a = Math.floor(Math.random() * maxValue) + 1;
    const b = Math.floor(Math.random() * maxValue) + 1;
    const multiplier = Math.floor(Math.random() * 5) + 2;
    
    return {
      skill: 'equivalents',
      level,
      prompt: `Find the missing values to complete the equivalent ratio`,
      equation: `${a * multiplier}:${b * multiplier} = ${a}:${b}`,
      correctAnswer: `${a * multiplier}, ${b * multiplier}`,
      baseA: a,
      baseB: b,
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
  
  // For other question types, direct comparison
  return cleanAnswer === correctAnswer;
}