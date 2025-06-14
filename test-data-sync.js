/**
 * Comprehensive Data Synchronization Test Suite
 * Tests all critical functionality of the data sync system
 */
class DataSyncTester {
  constructor() {
    this.results = [];
    this.baseUrl = 'http://localhost:5000';
  }

  async makeRequest(method, path, data = null, headers = {}) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        credentials: 'include'
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseUrl}${path}`, options);
      const responseData = await response.json();
      
      return {
        success: response.ok,
        status: response.status,
        data: responseData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logEntry);
    this.results.push({ timestamp, type, message });
  }

  async test(name, testFunction) {
    this.log(`Starting test: ${name}`, 'test');
    try {
      const result = await testFunction();
      this.log(`✅ PASSED: ${name}`, 'pass');
      return { name, status: 'passed', result };
    } catch (error) {
      this.log(`❌ FAILED: ${name} - ${error.message}`, 'fail');
      return { name, status: 'failed', error: error.message };
    }
  }

  async testUserDataConsistency() {
    const response = await this.makeRequest('GET', '/api/progress');
    
    if (!response.success) {
      throw new Error(`Failed to fetch progress: ${response.error}`);
    }

    const data = response.data;
    const globalProgress = data.progress.find(p => p.category === 'overall');
    
    // Verify consistency between sources
    if (globalProgress.score !== data.globalStats.totalTokens) {
      throw new Error("Global progress tokens should match global stats");
    }
    
    if (globalProgress.questionsAnswered !== data.globalStats.totalQuestions) {
      throw new Error("Question counts should be consistent");
    }

    if (globalProgress.correctAnswers !== data.globalStats.totalCorrect) {
      throw new Error("Correct answer counts should be consistent");
    }

    if (globalProgress.accuracy !== data.globalStats.accuracy) {
      throw new Error("Accuracy calculations should be consistent");
    }

    this.log(`Data consistency verified - Tokens: ${globalProgress.score}, Questions: ${globalProgress.questionsAnswered}, Accuracy: ${globalProgress.accuracy}%`);
    return data;
  }

  async testAccuracyCalculations() {
    const response = await this.makeRequest('GET', '/api/progress');
    
    if (!response.success) {
      throw new Error(`Failed to fetch progress: ${response.error}`);
    }

    const data = response.data;
    const { totalQuestions, totalCorrect, accuracy } = data.globalStats;
    
    // Verify accuracy calculation
    const expectedAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    if (Math.abs(accuracy - expectedAccuracy) > 0.1) {
      throw new Error(`Accuracy calculation mismatch: expected ${expectedAccuracy}%, got ${accuracy}%`);
    }

    this.log(`Accuracy calculation verified: ${totalCorrect}/${totalQuestions} = ${accuracy}%`);
    return { accuracy, expectedAccuracy };
  }

  async testPercentileCalculations() {
    const response = await this.makeRequest('GET', '/api/progress');
    
    if (!response.success) {
      throw new Error(`Failed to fetch progress: ${response.error}`);
    }

    const data = response.data;
    const { tokenPercentile, accuracyPercentile } = data.globalStats;
    
    // Verify percentiles are within valid range
    if (tokenPercentile < 0 || tokenPercentile > 100) {
      throw new Error(`Token percentile out of range: ${tokenPercentile}`);
    }

    if (accuracyPercentile < 0 || accuracyPercentile > 100) {
      throw new Error(`Accuracy percentile out of range: ${accuracyPercentile}`);
    }

    this.log(`Percentiles verified - Token: ${tokenPercentile}th, Accuracy: ${accuracyPercentile}th`);
    return { tokenPercentile, accuracyPercentile };
  }

  async testSynchronizationEndpoint() {
    const response = await this.makeRequest('POST', '/api/admin/sync-user-data', { userId: 30 });
    
    if (!response.success) {
      throw new Error(`Sync operation failed: ${response.error}`);
    }

    const result = response.data;
    if (!result.success) {
      throw new Error("Sync operation should succeed");
    }

    this.log(`Manual sync completed: ${result.message}`);
    return result;
  }

  async testModuleProgressAccuracy() {
    const response = await this.makeRequest('GET', '/api/progress');
    
    if (!response.success) {
      throw new Error(`Failed to fetch progress: ${response.error}`);
    }

    const data = response.data;
    const moduleProgress = data.progress.filter(p => p.category !== 'overall');
    
    let totalModuleTokens = 0;
    let totalModuleQuestions = 0;
    let totalModuleCorrect = 0;

    moduleProgress.forEach(module => {
      totalModuleTokens += module.score;
      totalModuleQuestions += module.questionsAnswered;
      totalModuleCorrect += module.correctAnswers;
      
      // Verify individual module accuracy
      const expectedAccuracy = module.questionsAnswered > 0 ? 
        Math.round((module.correctAnswers / module.questionsAnswered) * 100) : 0;
      
      if (Math.abs(module.accuracy - expectedAccuracy) > 0.1) {
        throw new Error(`Module ${module.category} accuracy mismatch: expected ${expectedAccuracy}%, got ${module.accuracy}%`);
      }
    });

    const globalStats = data.globalStats;
    if (totalModuleTokens !== globalStats.totalTokens) {
      throw new Error(`Module token sum (${totalModuleTokens}) should equal global total (${globalStats.totalTokens})`);
    }

    if (totalModuleQuestions !== globalStats.totalQuestions) {
      throw new Error(`Module question sum (${totalModuleQuestions}) should equal global total (${globalStats.totalQuestions})`);
    }

    if (totalModuleCorrect !== globalStats.totalCorrect) {
      throw new Error(`Module correct sum (${totalModuleCorrect}) should equal global total (${globalStats.totalCorrect})`);
    }

    this.log(`Module progress aggregation verified - Total modules processed: ${moduleProgress.length}`);
    return { totalModuleTokens, totalModuleQuestions, totalModuleCorrect };
  }

  async testRealTimeDataSync() {
    // Get initial state
    const initialResponse = await this.makeRequest('GET', '/api/progress');
    if (!initialResponse.success) {
      throw new Error(`Failed to fetch initial progress: ${initialResponse.error}`);
    }

    const initialData = initialResponse.data;
    
    // Force a sync operation
    const syncResponse = await this.makeRequest('POST', '/api/admin/sync-user-data', { userId: 30 });
    if (!syncResponse.success) {
      throw new Error(`Sync operation failed: ${syncResponse.error}`);
    }

    // Get post-sync state
    const postSyncResponse = await this.makeRequest('GET', '/api/progress');
    if (!postSyncResponse.success) {
      throw new Error(`Failed to fetch post-sync progress: ${postSyncResponse.error}`);
    }

    const postSyncData = postSyncResponse.data;
    
    // Data should remain consistent after sync
    if (initialData.globalStats.totalTokens !== postSyncData.globalStats.totalTokens) {
      throw new Error("Token counts should remain consistent after sync");
    }

    this.log(`Real-time sync verified - Data consistency maintained`);
    return { initialData, postSyncData };
  }

  async runAllTests() {
    this.log('Starting comprehensive data synchronization test suite', 'start');
    const testResults = [];

    const tests = [
      ['User Data Consistency', () => this.testUserDataConsistency()],
      ['Accuracy Calculations', () => this.testAccuracyCalculations()],
      ['Percentile Calculations', () => this.testPercentileCalculations()],
      ['Synchronization Endpoint', () => this.testSynchronizationEndpoint()],
      ['Module Progress Accuracy', () => this.testModuleProgressAccuracy()],
      ['Real-time Data Sync', () => this.testRealTimeDataSync()]
    ];

    for (const [name, testFunction] of tests) {
      const result = await this.test(name, testFunction);
      testResults.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.generateReport(testResults);
  }

  generateReport(testResults) {
    const passedTests = testResults.filter(r => r.status === 'passed');
    const failedTests = testResults.filter(r => r.status === 'failed');

    const report = {
      summary: {
        total: testResults.length,
        passed: passedTests.length,
        failed: failedTests.length,
        successRate: Math.round((passedTests.length / testResults.length) * 100)
      },
      results: testResults,
      logs: this.results
    };

    this.log(`Test suite completed: ${passedTests.length}/${testResults.length} tests passed (${report.summary.successRate}%)`, 'summary');
    
    if (failedTests.length > 0) {
      this.log(`Failed tests: ${failedTests.map(t => t.name).join(', ')}`, 'error');
    }

    return report;
  }
}

// Auto-run tests when loaded in browser
if (typeof window !== 'undefined') {
  window.DataSyncTester = DataSyncTester;
  
  // Add a button to run tests
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button');
    button.textContent = 'Run Data Sync Tests';
    button.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; padding: 10px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;';
    
    button.onclick = async () => {
      const tester = new DataSyncTester();
      const report = await tester.runAllTests();
      console.log('Data Sync Test Report:', report);
      alert(`Tests completed: ${report.summary.passed}/${report.summary.total} passed`);
    };
    
    document.body.appendChild(button);
  });
}

// Export for Node.js
if (typeof module !== 'undefined') {
  module.exports = DataSyncTester;
}