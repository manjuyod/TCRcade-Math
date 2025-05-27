
import { DECIMAL_DEFENDER_RULES } from "../../shared/decimalDefenderRules";

interface DecimalQuestion {
  id: number;
  type: "multiple-choice" | "written" | "match" | "multi-select";
  question: string;
  answer: string | string[];
  options?: string[];
  matchPairs?: { left: string; right: string }[];
  skill: string;
  difficulty: number;
  category: string;
  grade: string;
  concepts: string[];
}

export async function generateDecimalDefenderQuestions(skill: string, count: number = 5): Promise<DecimalQuestion[]> {
  const questions: DecimalQuestion[] = [];
  const questionTypes: ("multiple-choice" | "written" | "match" | "multi-select")[] = [
    "multiple-choice", "written", "match", "multi-select"
  ];
  
  for (let i = 0; i < count; i++) {
    // Distribute question types evenly
    const typeIndex = i % questionTypes.length;
    const questionType = questionTypes[typeIndex];
    const question = generateQuestionBySkill(skill, Date.now() + i, questionType);
    questions.push(question);
  }
  
  return questions;
}

function generateQuestionBySkill(skill: string, id: number, type: "multiple-choice" | "written" | "match" | "multi-select"): DecimalQuestion {
  const baseQuestion: Partial<DecimalQuestion> = {
    id,
    type,
    difficulty: 3,
    category: "decimal_defender",
    grade: "4",
    concepts: ["decimals", `decimal_${skill}`],
    skill
  };

  let skillQuestion;
  switch (skill) {
    case 'rounding':
      skillQuestion = generateRoundingQuestion(type);
      break;
    case 'comparing':
      skillQuestion = generateComparingQuestion(type);
      break;
    case 'add_subtract':
      skillQuestion = generateAddSubtractQuestion(type);
      break;
    case 'place_value':
      skillQuestion = generatePlaceValueQuestion(type);
      break;
    default:
      skillQuestion = generateRoundingQuestion(type);
  }

  return {
    ...baseQuestion,
    ...skillQuestion
  } as DecimalQuestion;
}

function generateRoundingQuestion(type: "multiple-choice" | "written" | "match" | "multi-select") {
  const scenarios = [
    { type: 'nearest_whole', places: 0, description: "nearest whole number" },
    { type: 'nearest_tenth', places: 1, description: "nearest tenth" },
    { type: 'nearest_hundredth', places: 2, description: "nearest hundredth" }
  ];
  
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  // Generate a decimal with more precision than we're rounding to
  const baseValue = Math.random() * 99 + 1; // 1-100
  const extraDigits = Math.random() * 0.999;
  const decimal = (baseValue + extraDigits).toFixed(3);
  
  let rounded: string;
  
  switch (scenario.type) {
    case 'nearest_whole':
      rounded = Math.round(parseFloat(decimal)).toString();
      break;
    case 'nearest_tenth':
      rounded = parseFloat(decimal).toFixed(1);
      break;
    case 'nearest_hundredth':
      rounded = parseFloat(decimal).toFixed(2);
      break;
    default:
      rounded = Math.round(parseFloat(decimal)).toString();
  }

  switch (type) {
    case 'multiple-choice':
      const baseRounded = parseFloat(rounded);
      const wrongOptions = [
        (baseRounded + 0.1).toFixed(scenario.places),
        (baseRounded - 0.1).toFixed(scenario.places),
        (baseRounded + 1).toFixed(scenario.places)
      ].filter(option => option !== rounded && parseFloat(option) >= 0);
      
      const options = [rounded, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
      
      return {
        question: `Round ${decimal} to the ${scenario.description}`,
        answer: rounded,
        options
      };

    case 'written':
      return {
        question: `Round ${decimal} to the ${scenario.description}. Type your answer.`,
        answer: rounded
      };

    case 'match':
      const decimals = [decimal];
      const roundedValues = [rounded];
      
      // Generate additional pairs
      for (let i = 0; i < 2; i++) {
        const newDecimal = ((Math.random() * 99 + 1) + Math.random() * 0.999).toFixed(3);
        const newRounded = parseFloat(newDecimal).toFixed(scenario.places);
        decimals.push(newDecimal);
        roundedValues.push(newRounded);
      }
      
      return {
        question: `Match each decimal to its value rounded to the ${scenario.description}`,
        answer: rounded,
        matchPairs: decimals.map((dec, i) => ({ left: dec, right: roundedValues[i] }))
      };

    case 'multi-select':
      const statements = [
        `${decimal} rounds to ${rounded}`,
        `${decimal} rounds to ${(parseFloat(rounded) + 0.1).toFixed(scenario.places)}`,
        `${decimal} rounds to ${(parseFloat(rounded) - 0.1).toFixed(scenario.places)}`,
        `${decimal} is closer to ${rounded} than to ${(parseFloat(rounded) + 1).toFixed(scenario.places)}`
      ];
      
      return {
        question: `Select all true statements about rounding ${decimal} to the ${scenario.description}`,
        answer: [statements[0], statements[3]],
        options: statements
      };

    default:
      return generateRoundingQuestion('multiple-choice');
  }
}

function generateComparingQuestion(type: "multiple-choice" | "written" | "match" | "multi-select") {
  const decimal1 = (Math.random() * 9 + 1).toFixed(2);
  let decimal2 = (Math.random() * 9 + 1).toFixed(2);
  
  // Ensure they're different for clear comparison
  while (Math.abs(parseFloat(decimal1) - parseFloat(decimal2)) < 0.01) {
    decimal2 = (Math.random() * 9 + 1).toFixed(2);
  }
  
  const comparison = parseFloat(decimal1) > parseFloat(decimal2) ? '>' : '<';

  switch (type) {
    case 'multiple-choice':
      const options = ['>', '<', '=', 'Cannot determine'];
      return {
        question: `Compare these decimals: ${decimal1} _____ ${decimal2}`,
        answer: comparison,
        options
      };

    case 'written':
      return {
        question: `Compare ${decimal1} and ${decimal2}. Type >, <, or =`,
        answer: comparison
      };

    case 'match':
      const pairs = [
        { left: `${decimal1} vs ${decimal2}`, right: comparison },
        { left: `${decimal2} vs ${decimal1}`, right: comparison === '>' ? '<' : '>' },
        { left: `${decimal1} vs ${decimal1}`, right: '=' }
      ];
      
      return {
        question: `Match each comparison to its correct symbol`,
        answer: comparison,
        matchPairs: pairs
      };

    case 'multi-select':
      const statements = [
        `${decimal1} ${comparison} ${decimal2}`,
        `${decimal2} ${comparison === '>' ? '<' : '>'} ${decimal1}`,
        `${decimal1} = ${decimal2}`,
        `Both decimals are positive`
      ];
      
      return {
        question: `Select all true statements about these decimals`,
        answer: [statements[0], statements[1], statements[3]],
        options: statements
      };

    default:
      return generateComparingQuestion('multiple-choice');
  }
}

function generateAddSubtractQuestion(type: "multiple-choice" | "written" | "match" | "multi-select") {
  const decimal1 = (Math.random() * 9 + 1).toFixed(2);
  const decimal2 = (Math.random() * 5 + 1).toFixed(2);
  
  // Randomly choose addition or subtraction
  const isAddition = Math.random() > 0.5;
  
  let result: number;
  let operation: string;
  let questionText: string;
  
  if (isAddition) {
    result = parseFloat(decimal1) + parseFloat(decimal2);
    operation = '+';
    questionText = `${decimal1} + ${decimal2}`;
  } else {
    // Ensure positive result for subtraction
    const larger = Math.max(parseFloat(decimal1), parseFloat(decimal2));
    const smaller = Math.min(parseFloat(decimal1), parseFloat(decimal2));
    result = larger - smaller;
    operation = '-';
    questionText = `${larger.toFixed(2)} - ${smaller.toFixed(2)}`;
  }
  
  const answer = result.toFixed(2);

  switch (type) {
    case 'multiple-choice':
      const wrongOptions = [
        (result + 0.1).toFixed(2),
        (result - 0.1).toFixed(2),
        (result + 1).toFixed(2)
      ].filter(option => option !== answer && parseFloat(option) >= 0);
      
      const options = [answer, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
      
      return {
        question: `Calculate: ${questionText}`,
        answer,
        options
      };

    case 'written':
      return {
        question: `Calculate ${questionText}. Type your answer.`,
        answer
      };

    case 'match':
      const expressions = [questionText];
      const results = [answer];
      
      // Generate additional pairs
      for (let i = 0; i < 2; i++) {
        const newDec1 = (Math.random() * 9 + 1).toFixed(2);
        const newDec2 = (Math.random() * 5 + 1).toFixed(2);
        const newExpr = isAddition ? `${newDec1} + ${newDec2}` : `${Math.max(parseFloat(newDec1), parseFloat(newDec2)).toFixed(2)} - ${Math.min(parseFloat(newDec1), parseFloat(newDec2)).toFixed(2)}`;
        const newResult = isAddition ? (parseFloat(newDec1) + parseFloat(newDec2)).toFixed(2) : (Math.max(parseFloat(newDec1), parseFloat(newDec2)) - Math.min(parseFloat(newDec1), parseFloat(newDec2))).toFixed(2);
        expressions.push(newExpr);
        results.push(newResult);
      }
      
      return {
        question: `Match each expression to its result`,
        answer,
        matchPairs: expressions.map((expr, i) => ({ left: expr, right: results[i] }))
      };

    case 'multi-select':
      const statements = [
        `${questionText} = ${answer}`,
        `${questionText} = ${(result + 0.1).toFixed(2)}`,
        `The result has 2 decimal places`,
        `This is ${isAddition ? 'an addition' : 'a subtraction'} problem`
      ];
      
      return {
        question: `Select all true statements about ${questionText}`,
        answer: [statements[0], statements[2], statements[3]],
        options: statements
      };

    default:
      return generateAddSubtractQuestion('multiple-choice');
  }
}

function generatePlaceValueQuestion(type: "multiple-choice" | "written" | "match" | "multi-select") {
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

  switch (type) {
    case 'multiple-choice':
      const allDigits = decimal.replace('.', '').split('');
      const wrongOptions = Array.from(new Set(allDigits))
        .filter(d => d !== correctDigit)
        .slice(0, 3);
      
      // Fill with random digits if not enough wrong options
      while (wrongOptions.length < 3) {
        const randomDigit = Math.floor(Math.random() * 10).toString();
        if (!wrongOptions.includes(randomDigit) && randomDigit !== correctDigit) {
          wrongOptions.push(randomDigit);
        }
      }
      
      const options = [correctDigit, ...wrongOptions].sort(() => Math.random() - 0.5);
      
      return {
        question: `In the decimal ${decimal}, what digit is in the ${randomPos.name} place?`,
        answer: correctDigit,
        options
      };

    case 'written':
      return {
        question: `In the decimal ${decimal}, what digit is in the ${randomPos.name} place? Type the digit.`,
        answer: correctDigit
      };

    case 'match':
      const placeNames = ['tens', 'ones', 'tenths', 'hundredths', 'thousandths'];
      const digits = [
        Math.floor(wholeNumber / 10).toString(),
        (wholeNumber % 10).toString(),
        tenths.toString(),
        hundredths.toString(),
        thousandths.toString()
      ];
      
      return {
        question: `Match each place value to its digit in ${decimal}`,
        answer: correctDigit,
        matchPairs: placeNames.map((place, i) => ({ left: place, right: digits[i] }))
      };

    case 'multi-select':
      const statements = [
        `The ${randomPos.name} place contains ${correctDigit}`,
        `The ${randomPos.name} place contains ${(parseInt(correctDigit) + 1) % 10}`,
        `${decimal} has digits in both whole and decimal places`,
        `The decimal point separates whole and fractional parts`
      ];
      
      return {
        question: `Select all true statements about the decimal ${decimal}`,
        answer: [statements[0], statements[2], statements[3]],
        options: statements
      };

    default:
      return generatePlaceValueQuestion('multiple-choice');
  }
}

export async function updateUserStatsAfterModule(
  userId: number,
  correct: number,
  total: number,
  tokensEarned: number,
) {
  const { storage } = await import("../storage");
  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  const updated = await storage.updateUser(userId, {
    tokens: (user.tokens || 0) + tokensEarned,
    questionsAnswered: (user.questionsAnswered || 0) + total,
    correctAnswers: (user.correctAnswers || 0) + correct,
  });

  return updated;
}
