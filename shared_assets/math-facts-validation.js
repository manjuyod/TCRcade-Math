// Math Facts Validation Script
const BASE_URL = 'http://localhost:5000';

async function validateMathFacts() {
  console.log('Math Facts End-to-End Validation\n');
  
  let passed = 0;
  let failed = 0;
  const errors = [];

  // Test 1: Basic API functionality
  console.log('1. Testing basic API generation...');
  try {
    const response = await fetch(`${BASE_URL}/api/test/math-facts?grade=3&operation=addition`);
    if (response.ok) {
      const data = await response.json();
      if (data.question && data.answer && data.options) {
        console.log('   ✓ API generates valid questions');
        passed++;
      } else {
        throw new Error('Invalid response structure');
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.log(`   ✗ API test failed: ${error.message}`);
    failed++;
    errors.push(`API Generation: ${error.message}`);
  }

  // Test 2: All operations
  console.log('\n2. Testing all operations...');
  const operations = ['addition', 'subtraction', 'multiplication', 'division'];
  for (const op of operations) {
    try {
      const response = await fetch(`${BASE_URL}/api/test/math-facts?grade=3&operation=${op}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✓ ${op}: ${data.question}`);
        passed++;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`   ✗ ${op} failed: ${error.message}`);
      failed++;
      errors.push(`${op}: ${error.message}`);
    }
  }

  // Test 3: Grade levels
  console.log('\n3. Testing grade levels...');
  const grades = ['K', '1', '2', '3', '4', '5', '6'];
  for (const grade of grades) {
    try {
      const response = await fetch(`${BASE_URL}/api/test/math-facts?grade=${grade}&operation=addition`);
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✓ Grade ${grade}: ${data.question}`);
        passed++;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`   ✗ Grade ${grade} failed: ${error.message}`);
      failed++;
      errors.push(`Grade ${grade}: ${error.message}`);
    }
  }

  // Test 4: Answer accuracy
  console.log('\n4. Testing answer accuracy...');
  try {
    const response = await fetch(`${BASE_URL}/api/test/math-facts?grade=2&operation=addition`);
    if (response.ok) {
      const data = await response.json();
      const match = data.question.match(/(\d+)\s*\+\s*(\d+)/);
      if (match) {
        const expected = parseInt(match[1]) + parseInt(match[2]);
        const actual = parseInt(data.answer);
        if (expected === actual) {
          console.log(`   ✓ Answer accuracy verified: ${match[1]} + ${match[2]} = ${actual}`);
          passed++;
        } else {
          throw new Error(`Wrong answer: expected ${expected}, got ${actual}`);
        }
      }
    }
  } catch (error) {
    console.log(`   ✗ Answer accuracy test failed: ${error.message}`);
    failed++;
    errors.push(`Answer accuracy: ${error.message}`);
  }

  // Test 5: Multiple choice validation
  console.log('\n5. Testing multiple choice options...');
  try {
    const response = await fetch(`${BASE_URL}/api/test/math-facts?grade=3&operation=multiplication`);
    if (response.ok) {
      const data = await response.json();
      if (data.options && data.options.length === 4 && data.options.includes(data.answer)) {
        console.log(`   ✓ Multiple choice: 4 options, correct answer included`);
        passed++;
      } else {
        throw new Error('Invalid options array or missing correct answer');
      }
    }
  } catch (error) {
    console.log(`   ✗ Multiple choice test failed: ${error.message}`);
    failed++;
    errors.push(`Multiple choice: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All validation tests passed!');
    console.log('Math Facts implementation is working correctly.');
  } else {
    console.log(`\n⚠️ ${failed} issues found:`);
    errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
  }
  
  return { passed, failed, errors };
}

// Export for potential reuse
if (typeof module !== 'undefined' && module.exports) {
  module.exports = validateMathFacts;
} else {
  validateMathFacts().catch(console.error);
}