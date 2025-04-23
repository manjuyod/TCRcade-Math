// Simple test script to test all Math Facts operations across grades
const grades = ['K', '1', '2', '3', '4', '5', '6'];
const operations = ['addition', 'subtraction', 'multiplication', 'division'];

// Test all grade + operation combinations
async function testAllMathFacts() {
  console.log('Testing all Math Facts combinations...');
  
  for (const grade of grades) {
    for (const operation of operations) {
      try {
        const url = `http://localhost:5000/api/questions/math-facts?grade=${grade}&operation=${operation}`;
        console.log(`Testing ${operation} for grade ${grade}...`);
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Success: ${operation} (grade ${grade}): ${data.question.text} = ${data.answer}`);
        } else {
          console.error(`❌ Error (${response.status}): ${operation} for grade ${grade}`);
        }
      } catch (error) {
        console.error(`❌ Exception: ${operation} for grade ${grade}:`, error.message);
      }
    }
  }
  
  console.log('Testing complete!');
}

// Run tests
testAllMathFacts();