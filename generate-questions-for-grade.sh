#!/bin/bash

# Script to generate questions for a specific grade

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <grade>"
  echo "  grade: Grade level (K, 1, 2, 3, 4, 5, 6)"
  exit 1
fi

GRADE=$1

# Create a temporary script that will call our question bank generator
cat > ./temp-grade-generator.ts << EOL
import { generateForGradeAndCategory, generateMathFacts } from './server/scripts/generate-question-bank';

async function main() {
  const grade = "${GRADE}";
  console.log(\`\nGenerating questions for grade \${grade}\`);
  
  const categories = [
    'addition', 'subtraction', 'multiplication', 'division', 
    'fractions', 'decimals', 'algebra', 'geometry',
    'word_problems', 'number_sense', 'measurement', 'data',
    'money', 'time', 'probability', 'statistics'
  ];
  
  const mathFactsOps = ['addition', 'subtraction', 'multiplication', 'division'];
  
  let totalGenerated = 0;
  let totalSaved = 0;
  
  // Generate regular questions for each category
  for (const category of categories) {
    try {
      const result = await generateForGradeAndCategory(grade, category, 50);
      totalGenerated += result.generated;
      totalSaved += result.saved;
    } catch (error) {
      console.error(\`Error generating questions for \${grade}, \${category}:\`, error);
    }
  }
  
  // Generate Math Facts questions for each operation
  for (const operation of mathFactsOps) {
    try {
      const result = await generateMathFacts(grade, operation, 50);
      totalGenerated += result.generated;
      totalSaved += result.saved;
    } catch (error) {
      console.error(\`Error generating Math Facts for \${grade}, \${operation}:\`, error);
    }
  }
  
  console.log(\`\nQuestion generation complete for grade \${grade}!\`);
  console.log(\`- Total generated: \${totalGenerated} questions\`);
  console.log(\`- Total saved to database: \${totalSaved} questions\`);
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
EOL

# Run the temporary script with tsx
echo "Starting question generation for grade $GRADE..."
tsx ./temp-grade-generator.ts

# Clean up the temporary file
rm ./temp-grade-generator.ts

echo "Question generation for grade $GRADE completed."
