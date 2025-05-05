#!/bin/bash

# Script to generate Math Facts questions for a specific grade and operation

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <grade> <operation> [count]"
  echo "  grade: Grade level (K, 1, 2, 3, 4, 5, 6)"
  echo "  operation: One of (addition, subtraction, multiplication, division)"
  echo "  count: Number of questions to generate (default: 100)"
  exit 1
fi

GRADE=$1
OPERATION=$2
COUNT=${3:-100}

# Create a temporary script that will call our question bank generator
cat > ./temp-math-facts-generator.ts << EOL
import { generateMathFacts } from './server/scripts/generate-question-bank';

async function main() {
  const grade = "${GRADE}";
  const operation = "${OPERATION}";
  const count = ${COUNT};
  
  console.log(\`\nGenerating Math Facts questions:\`);
  console.log(\`- Grade: \${grade}\`);
  console.log(\`- Operation: \${operation}\`);
  console.log(\`- Count: \${count}\`);
  
  try {
    const result = await generateMathFacts(grade, operation, count);
    
    console.log(\`\nMath Facts generation complete!\`);
    console.log(\`- Generated: \${result.generated} questions\`);
    console.log(\`- Saved to database: \${result.saved} questions\`);
  } catch (error) {
    console.error(\`Error generating Math Facts questions:\`, error);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
EOL

# Run the temporary script with tsx
echo "Starting Math Facts generation for grade $GRADE, operation $OPERATION..."
tsx ./temp-math-facts-generator.ts

# Clean up the temporary file
rm ./temp-math-facts-generator.ts

echo "Math Facts generation completed."
