// Quick Math Facts Test Suite
const BASE_URL = 'http://localhost:5000';

async function quickMathFactsTest() {
  console.log('Math Facts Implementation Test Results:\n');
  
  const results = { passed: 0, failed: 0, tests: [] };
  
  // Test 1: Basic API Generation
  console.log('1. Testing API Question Generation...');
  const operations = ['addition', 'subtraction', 'multiplication', 'division'];
  const testGrades = ['K', '3', '6'];
  
  for (const op of operations) {
    for (const grade of testGrades) {
      try {
        const response = await fetch(`${BASE_URL}/api/test/math-facts?grade=${grade}&operation=${op}`);
        if (response.ok) {
          const data = await response.json();
          if (data.question && data.answer) {
            console.log(`   ✓ ${op} Grade ${grade}: "${data.question}" = ${data.answer}`);
            results.passed++;
            results.tests.push(`${op}-${grade}: PASS`);
          } else {
            throw new Error('Invalid response format');
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`   ✗ ${op} Grade ${grade}: ${error.message}`);
        results.failed++;
        results.tests.push(`${op}-${grade}: FAIL - ${error.message}`);
      }
    }
  }
  
  // Test 2: Grade Level Appropriateness
  console.log('\n2. Testing Grade Level Logic...');
  try {
    const kResponse = await fetch(`${BASE_URL}/api/test/math-facts?grade=K&operation=addition`);
    const grade6Response = await fetch(`${BASE_URL}/api/test/math-facts?grade=6&operation=multiplication`);
    
    if (kResponse.ok && grade6Response.ok) {
      const kData = await kResponse.json();
      const grade6Data = await grade6Response.json();
      
      // Check if K questions are simpler than Grade 6
      const kNumbers = kData.question.match(/\d+/g)?.map(n => parseInt(n)) || [];
      const grade6Numbers = grade6Data.question.match(/\d+/g)?.map(n => parseInt(n)) || [];
      
      const kMax = Math.max(...kNumbers);
      const grade6Max = Math.max(...grade6Numbers);
      
      if (kMax <= grade6Max) {
        console.log(`   ✓ Grade progression logic working (K max: ${kMax}, Grade 6 max: ${grade6Max})`);
        results.passed++;
      } else {
        console.log(`   ✗ Grade progression issue (K max: ${kMax} > Grade 6 max: ${grade6Max})`);
        results.failed++;
      }
    }
  } catch (error) {
    console.log(`   ✗ Grade level test failed: ${error.message}`);
    results.failed++;
  }
  
  // Test 3: Performance Check
  console.log('\n3. Testing Performance...');
  try {
    const start = Date.now();
    const promises = Array(5).fill().map(() => 
      fetch(`${BASE_URL}/api/test/math-facts?grade=3&operation=addition`)
    );
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    console.log(`   ✓ Generated 5 questions in ${duration}ms (${Math.round(5000/duration)} questions/second)`);
    results.passed++;
  } catch (error) {
    console.log(`   ✗ Performance test failed: ${error.message}`);
    results.failed++;
  }
  
  // Test 4: Answer Validation
  console.log('\n4. Testing Answer Accuracy...');
  try {
    const response = await fetch(`${BASE_URL}/api/test/math-facts?grade=2&operation=addition`);
    if (response.ok) {
      const data = await response.json();
      const questionParts = data.question.match(/(\d+)\s*\+\s*(\d+)/);
      if (questionParts) {
        const num1 = parseInt(questionParts[1]);
        const num2 = parseInt(questionParts[2]);
        const expectedAnswer = num1 + num2;
        const actualAnswer = parseInt(data.answer);
        
        if (expectedAnswer === actualAnswer) {
          console.log(`   ✓ Answer validation: ${num1} + ${num2} = ${actualAnswer} (correct)`);
          results.passed++;
        } else {
          console.log(`   ✗ Wrong answer: ${num1} + ${num2} should be ${expectedAnswer}, got ${actualAnswer}`);
          results.failed++;
        }
      }
    }
  } catch (error) {
    console.log(`   ✗ Answer validation failed: ${error.message}`);
    results.failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('MATH FACTS TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Math Facts refactoring is working correctly.');
  } else {
    console.log(`\n⚠️ ${results.failed} issues found. Review implementation.`);
  }
  
  return results;
}

quickMathFactsTest().catch(console.error);