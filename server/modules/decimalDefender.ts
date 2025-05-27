
import { storage } from "../storage";
import { DECIMAL_DEFENDER_RULES } from "../../shared/decimalDefenderRules";

interface DecimalQuestion {
  id: number;
  question: string;
  answer: string;
  options: string[];
  skill: string;
  difficulty: number;
}

export async function generateDecimalDefenderQuestions(count: number): Promise<DecimalQuestion[]> {
  const questions: DecimalQuestion[] = [];
  const skills = DECIMAL_DEFENDER_RULES.skills; // Use skills from rules
  
  for (let i = 0; i < count; i++) {
    const skill = skills[i % skills.length];
    const question = generateQuestionBySkill(skill, i + 1);
    questions.push(question);
  }
  
  return questions;
}

function generateQuestionBySkill(skill: string, id: number): DecimalQuestion {
  switch (skill) {
    case 'rounding':
      return generateRoundingQuestion(id);
    case 'comparing':
      return generateComparingQuestion(id);
    case 'addition':
      return generateAdditionQuestion(id);
    case 'subtraction':
      return generateSubtractionQuestion(id);
    case 'place_value':
      return generatePlaceValueQuestion(id);
    default:
      return generateRoundingQuestion(id);
  }
}

function generateRoundingQuestion(id: number): DecimalQuestion {
  const scenarios = [
    { type: 'nearest_whole', places: 0 },
    { type: 'nearest_tenth', places: 1 },
    { type: 'nearest_hundredth', places: 2 }
  ];
  
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  // Generate a decimal with more precision than we're rounding to
  const baseValue = Math.random() * 99 + 1; // 1-100
  const extraDigits = (Math.random() * 0.999).toFixed(3);
  const decimal = (baseValue + parseFloat(extraDigits)).toFixed(3);
  
  let rounded: string;
  let description: string;
  
  switch (scenario.type) {
    case 'nearest_whole':
      rounded = Math.round(parseFloat(decimal)).toString();
      description = "nearest whole number";
      break;
    case 'nearest_tenth':
      rounded = parseFloat(decimal).toFixed(1);
      description = "nearest tenth";
      break;
    case 'nearest_hundredth':
      rounded = parseFloat(decimal).toFixed(2);
      description = "nearest hundredth";
      break;
    default:
      rounded = Math.round(parseFloat(decimal)).toString();
      description = "nearest whole number";
  }
  
  // Generate wrong options
  const baseRounded = parseFloat(rounded);
  const wrongOptions = [
    (baseRounded + 0.1).toFixed(scenario.places),
    (baseRounded - 0.1).toFixed(scenario.places),
    (baseRounded + 1).toFixed(scenario.places)
  ].filter(option => option !== rounded && parseFloat(option) >= 0);
  
  const options = [rounded, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
  
  return {
    id,
    question: `Round ${decimal} to the ${description}`,
    answer: rounded,
    options,
    skill: 'rounding',
    difficulty: 3
  };
}

function generateComparingQuestion(id: number): DecimalQuestion {
  const decimal1 = (Math.random() * 9 + 1).toFixed(2);
  let decimal2 = (Math.random() * 9 + 1).toFixed(2);
  
  // Ensure they're different for clear comparison
  while (Math.abs(parseFloat(decimal1) - parseFloat(decimal2)) < 0.01) {
    decimal2 = (Math.random() * 9 + 1).toFixed(2);
  }
  
  const comparison = parseFloat(decimal1) > parseFloat(decimal2) ? '>' : '<';
  
  const options = ['>', '<', '=', 'Cannot determine'];
  
  return {
    id,
    question: `Compare these decimals: ${decimal1} _____ ${decimal2}`,
    answer: comparison,
    options,
    skill: 'comparing',
    difficulty: 3
  };
}

function generateAdditionQuestion(id: number): DecimalQuestion {
  const decimal1 = (Math.random() * 9 + 1).toFixed(2);
  const decimal2 = (Math.random() * 9 + 1).toFixed(2);
  const sum = (parseFloat(decimal1) + parseFloat(decimal2)).toFixed(2);
  
  // Generate realistic wrong options
  const baseSum = parseFloat(sum);
  const wrongOptions = [
    (baseSum + 0.1).toFixed(2),
    (baseSum - 0.1).toFixed(2),
    (baseSum + 1).toFixed(2),
    (parseInt(decimal1) + parseInt(decimal2)).toString() // Common mistake: adding whole parts only
  ].filter(option => option !== sum && parseFloat(option) >= 0);
  
  const options = [sum, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
  
  return {
    id,
    question: `Add these decimals: ${decimal1} + ${decimal2}`,
    answer: sum,
    options,
    skill: 'addition',
    difficulty: 4
  };
}

function generateSubtractionQuestion(id: number): DecimalQuestion {
  const decimal1 = (Math.random() * 8 + 5).toFixed(2); // Ensure positive result
  const decimal2 = (Math.random() * 3 + 1).toFixed(2);
  const difference = (parseFloat(decimal1) - parseFloat(decimal2)).toFixed(2);
  
  const baseDiff = parseFloat(difference);
  const wrongOptions = [
    (baseDiff + 0.1).toFixed(2),
    (baseDiff - 0.1).toFixed(2),
    (baseDiff + 1).toFixed(2),
    (parseInt(decimal1) - parseInt(decimal2)).toString() // Common mistake
  ].filter(option => option !== difference && parseFloat(option) >= 0);
  
  const options = [difference, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
  
  return {
    id,
    question: `Subtract these decimals: ${decimal1} - ${decimal2}`,
    answer: difference,
    options,
    skill: 'subtraction',
    difficulty: 4
  };
}

function generatePlaceValueQuestion(id: number): DecimalQuestion {
  // Generate a decimal with known structure
  const wholeNumber = Math.floor(Math.random() * 90) + 10; // 10-99
  const tenths = Math.floor(Math.random() * 10);
  const hundredths = Math.floor(Math.random() * 10);
  const thousandths = Math.floor(Math.random() * 10);
  
  const decimal = `${wholeNumber}.${tenths}${hundredths}${thousandths}`;
  
  const positions = [
    { name: 'tens', digit: Math.floor(wholeNumber / 10).toString() },
    { name: 'ones', digit: (wholeNumber % 10).toString() },
    { name: 'tenths', digit: tenths.toString() },
    { name: 'hundredths', digit: hundredths.toString() },
    { name: 'thousandths', digit: thousandths.toString() }
  ];
  
  const randomPos = positions[Math.floor(Math.random() * positions.length)];
  const correctDigit = randomPos.digit;
  
  // Generate wrong options - other digits from the number
  const allDigits = decimal.replace('.', '').split('');
  const wrongOptions = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    .filter(d => d !== correctDigit)
    .slice(0, 3);
  
  const options = [correctDigit, ...wrongOptions].sort(() => Math.random() - 0.5);
  
  return {
    id,
    question: `In the decimal ${decimal}, what digit is in the ${randomPos.name} place?`,
    answer: correctDigit,
    options,
    skill: 'place_value',
    difficulty: 3
  };
}

export async function updateUserStatsAfterModule(
  userId: number,
  correct: number,
  total: number,
  tokensEarned: number,
) {
  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  const updated = await storage.updateUser(userId, {
    tokens: (user.tokens || 0) + tokensEarned,
    questionsAnswered: (user.questionsAnswered || 0) + total,
    correctAnswers: (user.correctAnswers || 0) + correct,
  });

  return updated;
}
