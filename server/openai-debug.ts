import OpenAI from "openai";

interface FlashcardStyle {
  fontSize: string;
  fontWeight: string;
  textAlign: string;
  display: string;
  justifyContent: string;
  alignItems: string;
  padding: string;
  isFlashcard: boolean;
}

type DebugQuestionContent =
  | string
  | {
      text: string;
      style: FlashcardStyle;
      isFlashcard: true;
    };

type GeneratedDebugQuestion = {
  id: number;
  question: DebugQuestionContent;
  answer: string;
  options: string[];
  grade: string;
  difficulty: number;
  category: string;
  concepts: string[];
  storyId: null;
  storyNode: null;
  storyText: null;
  storyImage: null;
};

type ParsedQuestionPayload = {
  question?: unknown;
  answer?: unknown;
  options?: unknown;
  difficulty?: unknown;
  concepts?: unknown;
};

type SupportedOperator = '+' | '-' | '×' | '÷' | '*' | '/';

const DEFAULT_JSON_RESPONSE = '{"question":"","answer":"","options":[]}';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
if (!process.env.OPENAI_API_KEY) {
  console.error("WARNING: OPENAI_API_KEY is not set in environment variables");
} else {
  console.log("OpenAI API key found in environment");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function parseQuestionPayload(content: string): ParsedQuestionPayload {
  const parsed = JSON.parse(content) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("OpenAI response was not a JSON object");
  }

  return parsed;
}

function normalizeQuestionText(question: unknown): string {
  if (typeof question === "string") {
    return question;
  }

  if (isRecord(question) && typeof question.text === "string") {
    return question.text;
  }

  return JSON.stringify(question ?? "");
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry));
}

function createFlashcardStyle(): FlashcardStyle {
  return {
    fontSize: "60px",
    fontWeight: "bold",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    isFlashcard: true,
  };
}

function calculateExpectedAnswer(num1: number, num2: number, operator: SupportedOperator): string | null {
  switch (operator) {
    case "+":
      return String(num1 + num2);
    case "-":
      return String(num1 - num2);
    case "×":
    case "*":
      return String(num1 * num2);
    case "÷":
    case "/":
      return String(num1 / num2);
    default:
      return null;
  }
}

/**
 * Used for testing OpenAI connectivity during troubleshooting
 */
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    console.log("Testing OpenAI API connection...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Keep your response under 5 words.",
        },
        {
          role: "user",
          content: "Can you generate a very simple math question for a 3rd grade student?",
        },
      ],
      max_tokens: 50,
    });

    console.log("OpenAI API connection test successful");
    console.log("Response:", response.choices[0]?.message?.content ?? "");
    return true;
  } catch (error: unknown) {
    console.error("OpenAI API connection test failed:", getErrorMessage(error));
    return false;
  }
}

/**
 * Generate a basic question using OpenAI
 */
export async function generateBasicQuestion(
  grade: string,
  category: string,
): Promise<GeneratedDebugQuestion> {
  try {
    console.log(`Generating basic ${category} question for grade ${grade}...`);

    const isMathFact =
      category.toLowerCase().includes("math-facts") ||
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
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    console.log("Basic question generation successful");

    const content = response.choices[0]?.message?.content ?? DEFAULT_JSON_RESPONSE;
    console.log("Raw response:", content);

    const parsedResponse = parseQuestionPayload(content);
    const questionText = normalizeQuestionText(parsedResponse.question);
    let normalizedAnswer = String(parsedResponse.answer ?? "");
    console.log(`Generated question: ${questionText}`);
    console.log(`Generated answer: ${normalizedAnswer}`);

    if (isMathFact) {
      const match = questionText.match(/(\d+)\s*([\+\-\×\÷\*\/])\s*(\d+)\s*=\s*\?/);
      if (match) {
        const [, num1Str, operator, num2Str] = match;
        const expectedAnswer = calculateExpectedAnswer(
          parseInt(num1Str, 10),
          parseInt(num2Str, 10),
          operator as SupportedOperator,
        );

        if (expectedAnswer && expectedAnswer !== normalizedAnswer) {
          console.log(
            `Incorrect answer detected. Question: ${questionText}, AI answer: ${normalizedAnswer}, Correct answer: ${expectedAnswer}`,
          );
          normalizedAnswer = expectedAnswer;
        }
      }
    }

    let options = normalizeStringArray(parsedResponse.options);
    if (!options.includes(normalizedAnswer)) {
      options.push(normalizedAnswer);
      if (options.length > 4) {
        const answerIndex = options.indexOf(normalizedAnswer);
        options = options.filter(
          (_option, index) => index !== (answerIndex === options.length - 1 ? 0 : options.length - 1),
        );
      }
    }

    options.sort(() => Math.random() - 0.5);
    const questionStyle = isMathFact ? createFlashcardStyle() : null;

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      question: questionStyle
        ? {
            text: questionText,
            style: questionStyle,
            isFlashcard: true,
          }
        : questionText,
      answer: normalizedAnswer,
      options: options.map((option) => option.toString()),
      grade,
      difficulty: typeof parsedResponse.difficulty === "number" ? parsedResponse.difficulty : 2,
      category,
      concepts: normalizeStringArray(parsedResponse.concepts).length > 0
        ? normalizeStringArray(parsedResponse.concepts)
        : [category],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null,
    };
  } catch (error: unknown) {
    console.error("Basic question generation failed:", getErrorMessage(error));

    const question = createFallbackQuestion(grade, category);
    console.log(
      `Created fallback question instead: ${typeof question.question === "object" ? question.question.text : question.question}`,
    );

    return question;
  }
}

/**
 * Creates a hardcoded fallback question when OpenAI fails
 */
function createFallbackQuestion(grade: string, category: string): GeneratedDebugQuestion {
  const gradeLevel = grade === "K" ? 0 : parseInt(grade, 10) || 3;
  let question: string;
  let answer: string;
  let options: string[];

  const isMathFact =
    category.toLowerCase().includes("math-facts") ||
    category.toLowerCase() === "addition" ||
    category.toLowerCase() === "subtraction" ||
    category.toLowerCase() === "multiplication" ||
    category.toLowerCase() === "division";

  let operation = "addition";
  if (category.toLowerCase().includes("subtraction")) {
    operation = "subtraction";
  } else if (category.toLowerCase().includes("multiplication")) {
    operation = "multiplication";
  } else if (category.toLowerCase().includes("division")) {
    operation = "division";
  }

  if (operation === "addition" || category === "Arithmetic") {
    if (gradeLevel <= 1) {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      question = `${num1} + ${num2} = ?`;
      answer = String(num1 + num2);
      options = [answer, String(num1 + num2 + 1), String(num1 + num2 - 1), String(num1 + num2 + 2)];
    } else if (gradeLevel <= 3) {
      const num1 = Math.floor(Math.random() * 20) + 1;
      const num2 = Math.floor(Math.random() * 20) + 1;
      question = `${num1} + ${num2} = ?`;
      answer = String(num1 + num2);
      options = [answer, String(num1 + num2 + 1), String(num1 + num2 - 1), String(num1 + num2 + 2)];
    } else {
      const num1 = Math.floor(Math.random() * 50) + 1;
      const num2 = Math.floor(Math.random() * 50) + 1;
      question = `${num1} + ${num2} = ?`;
      answer = String(num1 + num2);
      options = [answer, String(num1 + num2 + 1), String(num1 + num2 - 1), String(num1 + num2 + 2)];
    }
  } else if (operation === "subtraction") {
    if (gradeLevel <= 1) {
      const num2 = Math.floor(Math.random() * 5) + 1;
      const num1 = num2 + Math.floor(Math.random() * 5) + 1;
      question = `${num1} - ${num2} = ?`;
      answer = String(num1 - num2);
      options = [answer, String(num1 - num2 + 1), String(num1 - num2 - 1), String(num1 - num2 + 2)];
    } else if (gradeLevel <= 3) {
      const num2 = Math.floor(Math.random() * 10) + 1;
      const num1 = num2 + Math.floor(Math.random() * 10) + 1;
      question = `${num1} - ${num2} = ?`;
      answer = String(num1 - num2);
      options = [answer, String(num1 - num2 + 1), String(num1 - num2 - 1), String(num1 - num2 + 2)];
    } else {
      const num2 = Math.floor(Math.random() * 25) + 1;
      const num1 = num2 + Math.floor(Math.random() * 25) + 1;
      question = `${num1} - ${num2} = ?`;
      answer = String(num1 - num2);
      options = [answer, String(num1 - num2 + 1), String(num1 - num2 - 1), String(num1 - num2 + 2)];
    }
  } else if (operation === "multiplication") {
    if (gradeLevel <= 2) {
      const num1 = Math.floor(Math.random() * 5) + 1;
      const num2 = Math.floor(Math.random() * 5) + 1;
      question = `${num1} × ${num2} = ?`;
      answer = String(num1 * num2);
      options = [answer, String(num1 * num2 + 1), String(num1 * num2 - 1), String(num1 * num2 + num1)];
    } else if (gradeLevel <= 4) {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      question = `${num1} × ${num2} = ?`;
      answer = String(num1 * num2);
      options = [answer, String(num1 * num2 + 1), String(num1 * num2 - 1), String(num1 * num2 + num1)];
    } else {
      const num1 = Math.floor(Math.random() * 12) + 1;
      const num2 = Math.floor(Math.random() * 12) + 1;
      question = `${num1} × ${num2} = ?`;
      answer = String(num1 * num2);
      options = [answer, String(num1 * num2 + 1), String(num1 * num2 - 1), String(num1 * num2 + num1)];
    }
  } else if (operation === "division") {
    if (gradeLevel <= 2) {
      const num2 = Math.floor(Math.random() * 4) + 2;
      const product = Math.floor(Math.random() * 4) + 1;
      const num1 = num2 * product;
      question = `${num1} ÷ ${num2} = ?`;
      answer = String(product);
      options = [answer, String(product + 1), String(product - 1), String(product + 2)];
    } else if (gradeLevel <= 4) {
      const num2 = Math.floor(Math.random() * 9) + 2;
      const product = Math.floor(Math.random() * 9) + 1;
      const num1 = num2 * product;
      question = `${num1} ÷ ${num2} = ?`;
      answer = String(product);
      options = [answer, String(product + 1), String(product - 1), String(product + 2)];
    } else {
      const num2 = Math.floor(Math.random() * 11) + 2;
      const product = Math.floor(Math.random() * 9) + 1;
      const num1 = num2 * product;
      question = `${num1} ÷ ${num2} = ?`;
      answer = String(product);
      options = [answer, String(product + 1), String(product - 1), String(product + 2)];
    }
  } else {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    question = `${num1} + ${num2} = ?`;
    answer = String(num1 + num2);
    options = [answer, String(num1 + num2 + 1), String(num1 + num2 - 1), String(num1 + num2 + 2)];
  }

  options.sort(() => Math.random() - 0.5);
  const flashcardStyle = createFlashcardStyle();

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    question: isMathFact
      ? {
          text: question,
          style: flashcardStyle,
          isFlashcard: true,
        }
      : question,
    answer,
    options,
    grade,
    difficulty: Math.min(3, gradeLevel + 1),
    category,
    concepts: [operation],
    storyId: null,
    storyNode: null,
    storyText: null,
    storyImage: null,
  };
}
