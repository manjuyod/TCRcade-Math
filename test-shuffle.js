// Simple test to verify answer shuffling is working
const testQuestion = {
  id: 1,
  question: "What is 8 ÷ 2?",
  answer: "4",
  options: ["2", "4", "6", "8"],
  category: "division",
  grade: "3"
};

// Helper function to shuffle answer options (copied from server)
function shuffleAnswerOptions(question) {
  if (!question.options || question.options.length <= 1) {
    return question;
  }
  
  // Create a copy of the question to avoid mutating the original
  const shuffledQuestion = { ...question };
  
  // Use a more robust shuffling algorithm with multiple passes
  let shuffledOptions = [...question.options];
  
  // Perform multiple shuffle passes for better randomization
  for (let pass = 0; pass < 3; pass++) {
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }
  }
  
  // Additional randomization: ensure the correct answer isn't always in the same position
  const correctAnswer = question.answer;
  const correctIndex = shuffledOptions.indexOf(correctAnswer);
  
  // If correct answer is in first position, randomly swap it with another position
  if (correctIndex === 0 && Math.random() < 0.7) {
    const swapIndex = Math.floor(Math.random() * (shuffledOptions.length - 1)) + 1;
    [shuffledOptions[0], shuffledOptions[swapIndex]] = [shuffledOptions[swapIndex], shuffledOptions[0]];
  }
  
  shuffledQuestion.options = shuffledOptions;
  return shuffledQuestion;
}

console.log("Original question options:", testQuestion.options);
console.log("Answer:", testQuestion.answer);

// Test shuffling multiple times
for (let i = 1; i <= 10; i++) {
  const shuffled = shuffleAnswerOptions(testQuestion);
  const correctPosition = shuffled.options.indexOf(shuffled.answer) + 1;
  console.log(`Test ${i}: ${shuffled.options} (Answer "${shuffled.answer}" at position ${correctPosition})`);
}