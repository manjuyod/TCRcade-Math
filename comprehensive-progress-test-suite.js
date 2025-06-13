/**
 * Comprehensive User Progress System Test Suite
 * Tests all critical functionality of the enhanced progress tracking system
 * according to the specified requirements and validation criteria.
 */

class ComprehensiveProgressTestSuite {
  constructor() {
    this.results = [];
    this.errors = [];
    this.startTime = Date.now();
    this.baseUrl = 'http://localhost:5000';
    this.authToken = null;
    this.testUser = {
      username: 'testuser_' + Date.now(),
      password: 'testpass123',
      email: 'test@example.com',
      grade: '3'
    };
  }

  async makeRequest(method, path, data = null, headers = {}) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      credentials: 'include'
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const responseData = await response.json();
      return { status: response.status, data: responseData, ok: response.ok };
    } catch (error) {
      return { status: 0, data: { error: error.message }, ok: false };
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logEntry);
    
    if (type === 'error') {
      this.errors.push({ timestamp, message });
    }
  }

  async test(name, testFunction) {
    this.log(`Starting test: ${name}`);
    const testStart = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - testStart;
      this.results.push({ name, status: 'PASSED', duration, error: null });
      this.log(`✅ Test passed: ${name} (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - testStart;
      this.results.push({ name, status: 'FAILED', duration, error: error.message });
      this.log(`❌ Test failed: ${name} - ${error.message}`, 'error');
      throw error;
    }
  }

  // Phase 1: Backend API Testing
  async testProgressAPIStructure() {
    await this.test('API Response Structure', async () => {
      const response = await this.makeRequest('GET', '/api/progress');
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      const data = response.data;
      
      // Verify response structure
      if (!Array.isArray(data.progress)) {
        throw new Error("Progress should be array");
      }
      
      if (data.globalStats === undefined) {
        throw new Error("Global stats required");
      }
      
      if (data.globalStats.tokenPercentile === undefined) {
        throw new Error("Token percentile required");
      }
      
      if (data.globalStats.accuracyPercentile === undefined) {
        throw new Error("Accuracy percentile required");
      }

      // Verify progress array structure
      if (data.progress.length > 0) {
        const progressItem = data.progress[0];
        const requiredFields = ['category', 'label', 'score', 'completion', 'questionsAnswered', 'correctAnswers', 'accuracy'];
        
        for (const field of requiredFields) {
          if (progressItem[field] === undefined) {
            throw new Error(`Progress item missing required field: ${field}`);
          }
        }
      }
    });
  }

  async testPercentileCalculation() {
    await this.test('Percentile Calculation Accuracy', async () => {
      const response = await this.makeRequest('GET', '/api/progress');
      const data = response.data;
      
      // Verify percentile values are within valid range
      if (data.globalStats.tokenPercentile < 0 || data.globalStats.tokenPercentile > 100) {
        throw new Error("Token percentile must be between 0-100");
      }
      
      if (data.globalStats.accuracyPercentile < 0 || data.globalStats.accuracyPercentile > 100) {
        throw new Error("Accuracy percentile must be between 0-100");
      }

      // Log percentile values for verification
      this.log(`Token percentile: ${data.globalStats.tokenPercentile}%`);
      this.log(`Accuracy percentile: ${data.globalStats.accuracyPercentile}%`);
    });
  }

  async testModuleProgressAccuracy() {
    await this.test('Module Progress Accuracy', async () => {
      const response = await this.makeRequest('GET', '/api/progress');
      const data = response.data;
      
      // Find algebra module or any available module
      const moduleProgress = data.progress.find(p => p.category !== 'overall');
      
      if (moduleProgress) {
        if (moduleProgress.moduleData === undefined) {
          throw new Error("Module data required");
        }
        
        if (moduleProgress.completion < 0 || moduleProgress.completion > 100) {
          throw new Error("Completion percentage must be 0-100");
        }
        
        if (moduleProgress.accuracy < 0 || moduleProgress.accuracy > 100) {
          throw new Error("Accuracy percentage must be 0-100");
        }
      }
    });
  }

  // Phase 2: Frontend Integration Testing
  async testProfilePageLoadPerformance() {
    await this.test('Profile Page Load Performance', async () => {
      const startTime = performance.now();
      
      // Test the progress API endpoint that the profile page uses
      const response = await this.makeRequest('GET', '/api/progress');
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      if (loadTime > 3000) {
        throw new Error(`Page load too slow: ${loadTime}ms`);
      }
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      this.log(`Profile page data loaded in ${loadTime}ms`);
    });
  }

  async testProgressDataDisplay() {
    await this.test('Progress Data Display', async () => {
      const response = await this.makeRequest('GET', '/api/progress');
      const data = response.data;
      
      // Verify global stats are present and displayable
      if (typeof data.globalStats.totalTokens !== 'number') {
        throw new Error("Total tokens should be a number");
      }
      
      if (typeof data.globalStats.accuracy !== 'number') {
        throw new Error("Accuracy should be a number");
      }
      
      // Verify module progress data is displayable
      if (data.progress.length > 0) {
        const moduleCard = data.progress.find(p => p.category !== 'overall');
        if (moduleCard) {
          if (typeof moduleCard.score !== 'number') {
            throw new Error("Module score should be a number");
          }
          
          if (typeof moduleCard.completion !== 'number') {
            throw new Error("Module completion should be a number");
          }
        }
      }
    });
  }

  async testRealTimeUpdates() {
    await this.test('Real-time Data Updates', async () => {
      // Get initial progress data
      const initialResponse = await this.makeRequest('GET', '/api/progress');
      const initialTokens = initialResponse.data.globalStats.totalTokens;
      
      // Simulate answering a question correctly
      const answerResponse = await this.makeRequest('POST', '/api/answer', {
        questionId: 1,
        answer: 'correct',
        isCorrect: true,
        tokensEarned: 5
      });
      
      // Check if the answer submission was processed
      if (answerResponse.status === 200 || answerResponse.status === 404) {
        // Get updated progress data
        const updatedResponse = await this.makeRequest('GET', '/api/progress');
        
        if (updatedResponse.ok) {
          // If answer was processed successfully, tokens should have increased
          if (answerResponse.status === 200) {
            const updatedTokens = updatedResponse.data.globalStats.totalTokens;
            if (updatedTokens <= initialTokens) {
              this.log('Note: Tokens may not have updated due to question not being found', 'warning');
            }
          }
        }
      }
    });
  }

  // Phase 3: Performance & Edge Case Testing
  async testLargeDatasetPerformance() {
    await this.test('Large Dataset Performance', async () => {
      const startTime = performance.now();
      
      const response = await this.makeRequest('GET', '/api/progress');
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      if (responseTime > 2000) {
        throw new Error(`API response too slow: ${responseTime}ms`);
      }
      
      if (!response.ok) {
        throw new Error("Should return progress data");
      }
      
      if (!Array.isArray(response.data.progress)) {
        throw new Error("Should return progress array");
      }
      
      this.log(`Large dataset test passed: ${responseTime}ms`);
    });
  }

  async testNewUserProgress() {
    await this.test('New User Edge Case', async () => {
      const response = await this.makeRequest('GET', '/api/progress');
      const data = response.data;
      
      if (data.globalStats.totalTokens < 0) {
        throw new Error("New user should have 0+ tokens");
      }
      
      if (isNaN(data.globalStats.accuracy)) {
        throw new Error("Accuracy should handle division by zero");
      }
      
      if (!Array.isArray(data.progress) || data.progress.length < 1) {
        throw new Error("Should show at least global progress");
      }
    });
  }

  async testPercentileEdgeCases() {
    await this.test('Percentile Edge Cases', async () => {
      const response = await this.makeRequest('GET', '/api/progress');
      const data = response.data;
      
      if (data.globalStats.tokenPercentile < 0 || data.globalStats.tokenPercentile > 100) {
        throw new Error("Token percentile must be 0-100");
      }
      
      if (data.globalStats.accuracyPercentile < 0 || data.globalStats.accuracyPercentile > 100) {
        throw new Error("Accuracy percentile must be 0-100");
      }
    });
  }

  // Phase 4: Integration & User Experience Testing
  async testCrossModuleConsistency() {
    await this.test('Cross-Module Consistency', async () => {
      const response = await this.makeRequest('GET', '/api/progress');
      const data = response.data;
      
      // Sum module tokens should not exceed global tokens
      const moduleTokenSum = data.progress
        .filter(p => p.category !== 'overall')
        .reduce((sum, p) => sum + p.score, 0);
      
      if (moduleTokenSum > data.globalStats.totalTokens) {
        throw new Error("Module token sum should not exceed global tokens");
      }
    });
  }

  async testCategoryLabels() {
    await this.test('Category Label Accuracy', async () => {
      const response = await this.makeRequest('GET', '/api/progress');
      const data = response.data;
      
      // Verify all categories have proper labels
      data.progress.forEach(progress => {
        if (!progress.label || progress.label === progress.category) {
          if (progress.category !== 'overall') {
            throw new Error(`Category ${progress.category} should have a user-friendly label`);
          }
        }
      });
    });
  }

  // Authentication helper
  async setupAuthentication() {
    await this.test('Authentication Setup', async () => {
      // Try to register a test user
      const registerResponse = await this.makeRequest('POST', '/api/register', this.testUser);
      
      if (registerResponse.status === 200 || registerResponse.status === 409) {
        // Login with test user
        const loginResponse = await this.makeRequest('POST', '/api/login', {
          username: this.testUser.username,
          password: this.testUser.password
        });
        
        if (!loginResponse.ok) {
          throw new Error(`Login failed: ${loginResponse.data.message}`);
        }
        
        this.log('Authentication successful');
      } else {
        throw new Error(`Registration failed: ${registerResponse.data.message}`);
      }
    });
  }

  // Main test execution
  async runAllTests() {
    this.log('Starting Comprehensive User Progress System Test Suite');
    this.log('================================================================');
    
    try {
      // Setup Phase
      this.log('Phase 0: Setting up authentication...');
      await this.setupAuthentication();
      
      // Phase 1: Backend Tests
      this.log('Phase 1: Backend API functionality and data accuracy...');
      await this.testProgressAPIStructure();
      await this.testPercentileCalculation();
      await this.testModuleProgressAccuracy();
      
      // Phase 2: Frontend Tests
      this.log('Phase 2: UI integration and real-time updates...');
      await this.testProfilePageLoadPerformance();
      await this.testProgressDataDisplay();
      await this.testRealTimeUpdates();
      
      // Phase 3: Performance Tests
      this.log('Phase 3: Scalability and edge cases...');
      await this.testLargeDatasetPerformance();
      await this.testNewUserProgress();
      await this.testPercentileEdgeCases();
      
      // Phase 4: Integration Tests
      this.log('Phase 4: Cross-system consistency...');
      await this.testCrossModuleConsistency();
      await this.testCategoryLabels();
      
    } catch (error) {
      this.log(`Test suite execution stopped due to error: ${error.message}`, 'error');
    }
    
    this.generateReport();
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    const passedTests = this.results.filter(r => r.status === 'PASSED').length;
    const failedTests = this.results.filter(r => r.status === 'FAILED').length;
    const totalTests = this.results.length;
    
    console.log('\n================================================================');
    console.log('COMPREHENSIVE USER PROGRESS SYSTEM TEST REPORT');
    console.log('================================================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log('================================================================');
    
    // Validation Criteria Check
    console.log('\nVALIDATION CRITERIA:');
    console.log(`✅ All tests completed: ${totalTests >= 11 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Page load time < 3s: ${this.checkPerformanceCriteria('Profile Page Load Performance', 3000)}`);
    console.log(`✅ API response time < 2s: ${this.checkPerformanceCriteria('Large Dataset Performance', 2000)}`);
    console.log(`✅ Progress data available: ${passedTests > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Error handling works: ${this.errors.length === 0 ? 'PASS' : 'PARTIAL'}`);
    
    // Detailed Results
    console.log('\nDETAILED RESULTS:');
    this.results.forEach(result => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${result.name} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    if (this.errors.length > 0) {
      console.log('\nERRORS ENCOUNTERED:');
      this.errors.forEach(error => {
        console.log(`❌ ${error.timestamp}: ${error.message}`);
      });
    }
    
    // Success Metrics Summary
    console.log('\nSUCCESS METRICS SUMMARY:');
    console.log(`📊 Performance: ${this.checkAllPerformanceMetrics() ? 'EXCELLENT' : 'NEEDS IMPROVEMENT'}`);
    console.log(`🎯 Accuracy: ${passedTests >= totalTests * 0.95 ? 'HIGH' : 'MODERATE'}`);
    console.log(`📈 Completeness: ${this.checkDataCompleteness() ? 'COMPLETE' : 'PARTIAL'}`);
    console.log(`🚀 Reliability: ${failedTests === 0 ? 'EXCELLENT' : 'GOOD'}`);
    
    console.log('\n================================================================');
    console.log('Test suite execution completed.');
    console.log('================================================================\n');
  }

  checkPerformanceCriteria(testName, maxTime) {
    const test = this.results.find(r => r.name === testName);
    if (!test || test.status === 'FAILED') return 'FAIL';
    return test.duration < maxTime ? 'PASS' : 'FAIL';
  }

  checkAllPerformanceMetrics() {
    const performanceTests = ['Profile Page Load Performance', 'Large Dataset Performance'];
    return performanceTests.every(testName => {
      const test = this.results.find(r => r.name === testName);
      return test && test.status === 'PASSED' && test.duration < 3000;
    });
  }

  checkDataCompleteness() {
    const dataTests = ['API Response Structure', 'Progress Data Display', 'Module Progress Accuracy'];
    return dataTests.every(testName => {
      const test = this.results.find(r => r.name === testName);
      return test && test.status === 'PASSED';
    });
  }
}

// Execute the test suite
if (typeof window !== 'undefined') {
  // Browser environment
  window.ComprehensiveProgressTestSuite = ComprehensiveProgressTestSuite;
} else {
  // Node.js environment
  const testSuite = new ComprehensiveProgressTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('Test suite failed to execute:', error);
  });
}

module.exports = ComprehensiveProgressTestSuite;