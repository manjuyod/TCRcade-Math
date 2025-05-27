
export const DECIMAL_DEFENDER_RULES = {
  totalQuestions: 10,
  questionsPerSession: 5,
  difficultyRange: [3, 5] as [number, number],
  concepts: [
    "decimal_place_value", 
    "decimal_rounding", 
    "decimal_addition", 
    "decimal_subtraction", 
    "decimal_comparison", 
    "decimal_notation"
  ],
  skills: [
    "rounding", 
    "comparing", 
    "add_subtract", 
    "place_value"
  ],
  skillDescriptions: {
    rounding: "Round decimals to specified places (whole, tenth, hundredth)",
    comparing: "Compare decimal values using <, >, or =",
    add_subtract: "Add and subtract decimal numbers with proper alignment",
    place_value: "Identify digits in specific decimal places"
  },
  tokensPerCorrectAnswer: 4,
  bonusTokensOnPerfect: 15
};
