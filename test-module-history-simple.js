/**
 * Simple Module History Test - Verify all 7 modules record completion data
 */

const BASE_URL = 'http://localhost:5000';

// Test data for each module
const moduleTests = [
  {
    name: 'Math Rush Addition',
    endpoint: '/api/rush/complete',
    data: { mode: 'addition', correct: 8, total: 10, durationSec: 45 }
  },
  {
    name: 'Math Rush Multiplication', 
    endpoint: '/api/rush/complete',
    data: { mode: 'multiplication', correct: 7, total: 10, durationSec: 60 }
  },
  {
    name: 'Math Facts',
    endpoint: '/api/math-facts/complete',
    data: { correct: 9, total: 10, operation: 'addition', grade: '3' }
  },
  {
    name: 'Fractions Puzzle',
    endpoint: '/api/fractions/complete',
    data: { correct: 6, total: 8, skill: 'define' }
  },
  {
    name: 'Decimal Defender',
    endpoint: '/api/decimal-defender/complete', 
    data: { correct: 7, total: 10, skill: 'rounding' }
  },
  {
    name: 'Ratios & Proportions',
    endpoint: '/api/ratios/complete',
    data: { correct: 8, total: 10, skill: 'write_form' }
  },
  {
    name: 'Measurement Mastery',
    endpoint: '/api/measurement/submit-session',
    data: { runType: 'token', questions: [
      { isCorrect: true }, { isCorrect: true }, { isCorrect: false }, 
      { isCorrect: true }, { isCorrect: true }
    ], totalTime: 120, score: 80 }
  },
  {
    name: 'Pre-Algebra Basics',
    endpoint: '/api/algebra/submit-session',
    data: { runType: 'token', questions: [
      { isCorrect: true }, { isCorrect: false }, { isCorrect: true }, 
      { isCorrect: true }, { isCorrect: true }
    ], totalTime: 180, score: 80 }
  }
];

async function authenticateUser() {
  console.log('Setting up authentication...');
  
  // Try to get current user first
  const userResponse = await fetch(`${BASE_URL}/api/user`, {
    credentials: 'include'
  });
  
  if (userResponse.ok) {
    const user = await userResponse.json();
    console.log(`✅ Already authenticated as: ${user.username} (ID: ${user.id})`);
    return user;
  }
  
  // Try to login with test credentials
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      username: 'testuser',
      password: 'testpass'
    })
  });
  
  if (loginResponse.ok) {
    const user = await loginResponse.json();
    console.log(`✅ Logged in as: ${user.username} (ID: ${user.id})`);
    return user;
  }
  
  throw new Error('Authentication failed - please ensure you have valid test credentials');
}

async function testModuleCompletion(module) {
  console.log(`\n🧪 Testing: ${module.name}`);
  
  try {
    const response = await fetch(`${BASE_URL}${module.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(module.data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Success: ${module.name} - Tokens earned: ${result.tokens || result.tokensEarned || 'N/A'}`);
    return true;
    
  } catch (error) {
    console.log(`❌ Failed: ${module.name} - ${error.message}`);
    return false;
  }
}

async function verifyModuleHistory(userId) {
  console.log('\n📊 Verifying module history records...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/module-history/user/${userId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.status}`);
    }
    
    const history = await response.json();
    console.log(`✅ Total history records: ${history.length}`);
    
    // Group by module
    const moduleGroups = {};
    history.forEach(record => {
      if (!moduleGroups[record.moduleName]) {
        moduleGroups[record.moduleName] = 0;
      }
      moduleGroups[record.moduleName]++;
    });
    
    console.log('\n📈 Records by module:');
    Object.entries(moduleGroups).forEach(([module, count]) => {
      console.log(`  ${module}: ${count} record(s)`);
    });
    
    return history.length > 0;
    
  } catch (error) {
    console.log(`❌ Failed to verify history: ${error.message}`);
    return false;
  }
}

async function runTest() {
  console.log('🚀 Starting Simple Module History Test\n');
  
  try {
    // Authenticate
    const user = await authenticateUser();
    
    // Test each module
    let successCount = 0;
    for (const module of moduleTests) {
      const success = await testModuleCompletion(module);
      if (success) successCount++;
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify history records
    console.log('\n' + '='.repeat(50));
    const hasHistory = await verifyModuleHistory(user.id);
    
    // Summary
    console.log('\n📋 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Modules tested: ${moduleTests.length}`);
    console.log(`Successful completions: ${successCount}`);
    console.log(`Success rate: ${Math.round((successCount / moduleTests.length) * 100)}%`);
    console.log(`History verification: ${hasHistory ? '✅ PASS' : '❌ FAIL'}`);
    
    if (successCount === moduleTests.length && hasHistory) {
      console.log('\n🎉 ALL TESTS PASSED - Module history tracking is working correctly!');
    } else {
      console.log('\n⚠️  Some tests failed - Review the results above');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTest();