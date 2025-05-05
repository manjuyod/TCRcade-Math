import { generateMathFacts } from './server/scripts/generate-question-bank';

async function main() {
  const grade = "1";
  const operation = "division";
  const count = 10;
  
  console.log(`\nGenerating Math Facts questions:`);
  console.log(`- Grade: ${grade}`);
  console.log(`- Operation: ${operation}`);
  console.log(`- Count: ${count}`);
  
  try {
    const result = await generateMathFacts(grade, operation, count);
    
    console.log(`\nMath Facts generation complete!`);
    console.log(`- Generated: ${result.generated} questions`);
    console.log(`- Saved to database: ${result.saved} questions`);
  } catch (error) {
    console.error(`Error generating Math Facts questions:`, error);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
