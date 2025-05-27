
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
  const skills = ['rounding', 'comparing', 'addition', 'subtraction', 'place_value'];
  
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
  const decimal = (Math.random() * 9 + 1).toFixed(2);
  const rounded = Math.round(parseFloat(decimal)).toString();
  
  const wrongOptions = [
    (Math.round(parseFloat(decimal)) + 1).toString(),
    (Math.round(parseFloat(decimal)) - 1).toString(),
    parseFloat(decimal).toFixed(1)
  ].filter(option => option !== rounded);
  
  const options = [rounded, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
  
  return {
    id,
    question: `Round ${decimal} to the nearest whole number`,
    answer: rounded,
    options,
    skill: 'rounding',
    difficulty: 3
  };
}

function generateComparingQuestion(id: number): DecimalQuestion {
  let decimal1 = (Math.random() * 9 + 1).toFixed(2);
  let decimal2 = (Math.random() * 9 + 1).toFixed(2);
  
  // Ensure they're not equal for clearer comparison
  while (decimal1 === decimal2) {
    decimal2 = (Math.random() * 9 + 1).toFixed(2);
  }
  
  const comparison = parseFloat(decimal1) > parseFloat(decimal2) ? '>' : '<';
  
  const options = ['>', '<', '='];
  
  return {
    id,
    question: `Which symbol correctly compares these decimals: ${decimal1} ___ ${decimal2}?`,
    answer: comparison,
    options,
    skill: 'comparing',
    difficulty: 3
  };
}

function generateAdditionQuestion(id: number): DecimalQuestion {
  const decimal1 = (Math.random() * 5 + 1).toFixed(2);
  const decimal2 = (Math.random() * 5 + 1).toFixed(2);
  const sum = (parseFloat(decimal1) + parseFloat(decimal2)).toFixed(2);
  
  const wrongOptions = [
    (parseFloat(sum) + 0.01).toFixed(2),
    (parseFloat(sum) - 0.01).toFixed(2),
    (parseFloat(sum) + 0.1).toFixed(2)
  ].filter(option => option !== sum);
  
  const options = [sum, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
  
  return {
    id,
    question: `Add these decimals: ${decimal1} + ${decimal2} = ?`,
    answer: sum,
    options,
    skill: 'addition',
    difficulty: 4
  };
}

function generateSubtractionQuestion(id: number): DecimalQuestion {
  const decimal1 = (Math.random() * 5 + 5).toFixed(2);
  const decimal2 = (Math.random() * 3 + 1).toFixed(2);
  const difference = (parseFloat(decimal1) - parseFloat(decimal2)).toFixed(2);
  
  const wrongOptions = [
    (parseFloat(difference) + 0.01).toFixed(2),
    (parseFloat(difference) - 0.01).toFixed(2),
    (parseFloat(difference) + 0.1).toFixed(2)
  ].filter(option => option !== difference && parseFloat(option) >= 0);
  
  const options = [difference, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
  
  return {
    id,
    question: `Subtract these decimals: ${decimal1} - ${decimal2} = ?`,
    answer: difference,
    options,
    skill: 'subtraction',
    difficulty: 4
  };
}

function generatePlaceValueQuestion(id: number): DecimalQuestion {
  const decimal = (Math.random() * 90 + 10).toFixed(3);
  const digits = decimal.split('');
  const decimalIndex = digits.indexOf('.');
  
  const positions = ['tens', 'ones', 'tenths', 'hundredths', 'thousandths'];
  const randomPos = positions[Math.floor(Math.random() * positions.length)];
  
  let correctDigit: string;
  switch (randomPos) {
    case 'tens':
      correctDigit = decimalIndex >= 2 ? digits[decimalIndex - 2] : '0';
      break;
    case 'ones':
      correctDigit = digits[decimalIndex - 1];
      break;
    case 'tenths':
      correctDigit = digits[decimalIndex + 1];
      break;
    case 'hundredths':
      correctDigit = digits[decimalIndex + 2] || '0';
      break;
    case 'thousandths':
      correctDigit = digits[decimalIndex + 3] || '0';
      break;
    default:
      correctDigit = digits[0];
  }
  
  const wrongOptions = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    .filter(d => d !== correctDigit)
    .slice(0, 3);
  
  const options = [correctDigit, ...wrongOptions].sort(() => Math.random() - 0.5);
  
  return {
    id,
    question: `In the decimal ${decimal}, which digit is in the ${randomPos} place?`,
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
