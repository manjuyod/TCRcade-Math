#!/usr/bin/env node
/**
 * Comprehensive Module History Tracking Test Suite
 * Tests all critical functionality of the module history tracking system
 * according to the specified requirements and validation criteria.
 */

class ComprehensiveModuleHistoryTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.testResults = [];
    this.userId = null;
    this.sessionCookie = null;
    this.moduleConfigs = [
      {
        name: 'math_rush_addition',
        endpoint: '/api/rush/complete',
        payload: {
          correct: 8,
          total: 10,
          durationSec: 60,
          mode: 'addition'
        },
        expectedModuleName: 'math_rush_addition'
      },
      {
        name: 'math_rush_multiplication',
        endpoint: '/api/rush/complete',
        payload: {
          correct: 7,
          total: 10,
          durationSec: 75,
          mode: 'multiplication'
        },
        expectedModuleName: 'math_rush_multiplication'
      },
      {
        name: 'fractions_puzzle',
        endpoint: '/api/fractions/complete',
        payload: {
          correct: 4,
          total: 5,
          skill: 'define'
        },
        expectedModuleName: 'fractions_puzzle'
      },
      {
        name: 'decimal_defender',
        endpoint: '/api/decimal-defender/complete',
        payload: {
          correct: 6,
          total: 8,
          skill: 'compare'
        },
        expectedModuleName: 'decimal_defender'
      },
      {
        name: 'ratios_proportions',
        endpoint: '/api/ratios/complete',
        payload: {
          runType: 'token_run',
          questions: [
            { isCorrect: true, timeSpent: 12 },
            { isCorrect: true, timeSpent: 8 },
            { isCorrect: false, timeSpent: 20 }
          ],
          totalTime: 180,
          score: 67
        },
        expectedModuleName: 'ratios_proportions'
      },
      {
        name: 'measurement_mastery',
        endpoint: '/api/measurement/submit-session',
        payload: {
          runType: 'token_run',
          questions: [
            { isCorrect: true, timeSpent: 10 },
            { isCorrect: false, timeSpent: 15 },
            { isCorrect: true, timeSpent: 8 }
          ],
          totalTime: 120,
          score: 67
        },
        expectedModuleName: 'measurement_mastery'
      },
      {
        name: 'algebra',
        endpoint: '/api/algebra/submit-session',
        payload: {
          runType: 'token_run',
          questions: [
            { isCorrect: true, timeSpent: 15 },
            { isCorrect: true, timeSpent: 12 },
            { isCorrect: true, timeSpent: 18 }
          ],
          totalTime: 200,
          score: 100
        },
        expectedModuleName: 'algebra'
      }
    ];
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

    const response = await fetch(url, options);
    return response;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async test(name, testFunction) {
    try {
      this.log(`Starting test: ${name}`);
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;
      this.log(`Test completed: ${name} (${duration}ms)`, 'success');
      return { success: true, result, duration };
    } catch (error) {
      this.log(`Test failed: ${name} - ${error.message}`, 'error');
      return { success: false, error: error.message, duration: 0 };
    }
  }

  async setupAuthentication() {
    this.log('Setting up test authentication...');
    
    // Try to get current user first
    try {
      const userResponse = await this.makeRequest('GET', '/api/user');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        this.userId = userData.id;
        this.log(`Using existing user: ${userData.username} (ID: ${this.userId})`);
        return true;
      }
    } catch (error) {
      this.log('No existing session found, need to login');
    }

    // If no user, try to login with a test account
    try {
      const loginResponse = await this.makeRequest('POST', '/api/login', {
        username: 'testuser',
        password: 'testpass'
      });

      if (loginResponse.ok) {
        const userData = await loginResponse.json();
        this.userId = userData.user.id;
        this.log(`Logged in as: ${userData.user.username} (ID: ${this.userId})`);
        return true;
      }
    } catch (error) {
      this.log('Login failed, need valid test credentials');
    }

    throw new Error('Authentication setup failed - please ensure you have a valid test account');
  }

  async testModuleHistoryEndpoints() {
    this.log('Testing module history API endpoints...');
    
    // Test the count endpoint
    const countResponse = await this.makeRequest('GET', '/api/module-history/count/test_module');
    if (!countResponse.ok) {
      throw new Error(`Count endpoint failed: ${countResponse.status}`);
    }
    
    const countData = await countResponse.json();
    if (typeof countData.count !== 'number') {
      throw new Error('Count endpoint did not return valid count');
    }

    this.log(`Count endpoint working - returned: ${countData.count}`);

    // Test the latest endpoint (may return 404 if no history)
    const latestResponse = await this.makeRequest('GET', '/api/module-history/latest/test_module');
    if (latestResponse.status !== 404 && !latestResponse.ok) {
      throw new Error(`Latest endpoint failed: ${latestResponse.status}`);
    }

    this.log('Latest endpoint working');

    return {
      countEndpoint: true,
      latestEndpoint: true
    };
  }

  async testModuleCompletion(moduleConfig) {
    this.log(`Testing module completion: ${moduleConfig.name}`);
    
    const startTime = Date.now();
    
    // Get initial history count
    const initialCount = await this.getModuleHistoryCount(moduleConfig.expectedModuleName);
    
    // Execute module completion
    const response = await this.makeRequest('POST', moduleConfig.endpoint, moduleConfig.payload);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Module completion failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    
    // Verify history was recorded
    await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for DB write
    const finalCount = await this.getModuleHistoryCount(moduleConfig.expectedModuleName);
    const historyRecorded = finalCount > initialCount;
    
    // Get the latest entry for verification
    let latestEntry = null;
    if (historyRecorded) {
      latestEntry = await this.getLatestModuleHistory(moduleConfig.expectedModuleName);
    }
    
    const duration = Date.now() - startTime;
    
    return {
      module: moduleConfig.name,
      success: response.ok,
      historyRecorded,
      initialCount,
      finalCount,
      latestEntry,
      responseData,
      duration,
      performanceOk: duration < 2000 // Should complete within 2 seconds
    };
  }

  async getModuleHistoryCount(moduleName) {
    try {
      const response = await this.makeRequest('GET', `/api/module-history/count/${moduleName}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get count: ${response.status}`);
      }
      
      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      this.log(`Error getting module count for ${moduleName}: ${error.message}`, 'error');
      return 0;
    }
  }

  async getLatestModuleHistory(moduleName) {
    try {
      const response = await this.makeRequest('GET', `/api/module-history/latest/${moduleName}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to get latest: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      this.log(`Error getting latest history for ${moduleName}: ${error.message}`, 'error');
      return null;
    }
  }

  async validateDataIntegrity() {
    this.log('Validating recorded data integrity...');
    
    const requiredFields = [
      'id', 'userId', 'moduleName', 'runType', 
      'finalScore', 'questionsTotal', 'questionsCorrect',
      'timeSpentSeconds', 'completedAt', 'tokensEarned'
    ];

    const validationResults = [];

    for (const result of this.testResults) {
      if (result.historyRecorded && result.latestEntry) {
        const entry = result.latestEntry;
        const validation = {
          module: result.module,
          hasAllFields: requiredFields.every(field => entry.hasOwnProperty(field)),
          validScore: entry.finalScore >= 0 && entry.finalScore <= 100,
          validRunType: ['test', 'token_run'].includes(entry.runType),
          validTimestamp: new Date(entry.completedAt).getTime() > 0,
          validUserId: entry.userId === this.userId,
          fieldSummary: {}
        };

        // Check each field
        requiredFields.forEach(field => {
          validation.fieldSummary[field] = {
            present: entry.hasOwnProperty(field),
            value: entry[field],
            type: typeof entry[field]
          };
        });

        validationResults.push(validation);

        this.log(`Data validation for ${result.module}:`);
        this.log(`  All fields present: ${validation.hasAllFields ? '✅' : '❌'}`);
        this.log(`  Valid score (0-100): ${validation.validScore ? '✅' : '❌'} (${entry.finalScore})`);
        this.log(`  Valid run type: ${validation.validRunType ? '✅' : '❌'} (${entry.runType})`);
        this.log(`  Valid timestamp: ${validation.validTimestamp ? '✅' : '❌'}`);
        this.log(`  Correct user ID: ${validation.validUserId ? '✅' : '❌'}`);
      }
    }

    return validationResults;
  }

  async testPerformanceMetrics() {
    this.log('Analyzing performance metrics...');
    
    const performanceResults = {
      averageCompletionTime: 0,
      maxCompletionTime: 0,
      minCompletionTime: Infinity,
      modulesUnder2Seconds: 0,
      totalModules: this.testResults.length
    };

    let totalTime = 0;
    
    for (const result of this.testResults) {
      if (result.duration) {
        totalTime += result.duration;
        performanceResults.maxCompletionTime = Math.max(performanceResults.maxCompletionTime, result.duration);
        performanceResults.minCompletionTime = Math.min(performanceResults.minCompletionTime, result.duration);
        
        if (result.duration < 2000) {
          performanceResults.modulesUnder2Seconds++;
        }
      }
    }

    performanceResults.averageCompletionTime = totalTime / performanceResults.totalModules;
    performanceResults.performanceScore = (performanceResults.modulesUnder2Seconds / performanceResults.totalModules) * 100;

    this.log(`Performance Analysis:`);
    this.log(`  Average completion time: ${performanceResults.averageCompletionTime.toFixed(0)}ms`);
    this.log(`  Max completion time: ${performanceResults.maxCompletionTime}ms`);
    this.log(`  Min completion time: ${performanceResults.minCompletionTime}ms`);
    this.log(`  Modules under 2s: ${performanceResults.modulesUnder2Seconds}/${performanceResults.totalModules}`);
    this.log(`  Performance score: ${performanceResults.performanceScore.toFixed(1)}%`);

    return performanceResults;
  }

  async runComprehensiveTest() {
    this.log('🚀 Starting Comprehensive Module History Tracking Test Suite');
    this.log('=' .repeat(80));
    
    try {
      // Phase 1: Setup and Authentication
      await this.test('Authentication Setup', () => this.setupAuthentication());
      
      // Phase 2: API Endpoint Testing
      await this.test('Module History API Endpoints', () => this.testModuleHistoryEndpoints());
      
      // Phase 3: Module Completion Testing
      this.log('\n📋 Testing Module Completions:');
      for (const moduleConfig of this.moduleConfigs) {
        const testResult = await this.test(
          `Module: ${moduleConfig.name}`, 
          () => this.testModuleCompletion(moduleConfig)
        );
        
        if (testResult.success) {
          this.testResults.push(testResult.result);
        }
        
        // Brief delay between tests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Phase 4: Data Integrity Validation
      this.log('\n🔍 Data Integrity Validation:');
      const validationResults = await this.test('Data Integrity', () => this.validateDataIntegrity());
      
      // Phase 5: Performance Analysis
      this.log('\n⚡ Performance Analysis:');
      const performanceResults = await this.test('Performance Metrics', () => this.testPerformanceMetrics());
      
      // Generate Final Report
      this.generateFinalReport(validationResults.result, performanceResults.result);
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  generateFinalReport(validationResults, performanceResults) {
    this.log('\n' + '='.repeat(80));
    this.log('📊 COMPREHENSIVE TEST REPORT');
    this.log('='.repeat(80));
    
    const successfulModules = this.testResults.filter(r => r.success && r.historyRecorded);
    const totalModules = this.testResults.length;
    const successRate = totalModules > 0 ? (successfulModules.length / totalModules) * 100 : 0;
    
    this.log(`\n📈 Overall Results:`);
    this.log(`  Total Modules Tested: ${totalModules}`);
    this.log(`  Modules Recording History: ${successfulModules.length}`);
    this.log(`  Success Rate: ${successRate.toFixed(1)}%`);
    this.log(`  Average Performance: ${performanceResults?.performanceScore?.toFixed(1) || 0}%`);
    
    this.log(`\n✅ Successful Modules:`);
    successfulModules.forEach(module => {
      this.log(`  - ${module.module}: Score recorded, ${module.duration}ms`);
    });
    
    const failedModules = this.testResults.filter(r => !r.success || !r.historyRecorded);
    if (failedModules.length > 0) {
      this.log(`\n❌ Failed Modules:`);
      failedModules.forEach(module => {
        this.log(`  - ${module.module}: ${!module.success ? 'Completion failed' : 'History not recorded'}`);
      });
    }
    
    this.log(`\n🎯 Validation Summary:`);
    if (validationResults && validationResults.length > 0) {
      const validModules = validationResults.filter(v => v.hasAllFields && v.validScore && v.validRunType);
      this.log(`  Data Integrity: ${validModules.length}/${validationResults.length} modules passed`);
    }
    
    this.log(`\n⚡ Performance Summary:`);
    if (performanceResults) {
      this.log(`  Average Response Time: ${performanceResults.averageCompletionTime?.toFixed(0) || 0}ms`);
      this.log(`  Modules Under 2s: ${performanceResults.modulesUnder2Seconds || 0}/${performanceResults.totalModules || 0}`);
    }
    
    // Success Criteria Check
    this.log(`\n🎯 Success Criteria:`);
    this.log(`  ✅ All Modules Recording: ${successRate === 100 ? '✅' : '❌'} (${successRate.toFixed(1)}%)`);
    this.log(`  ✅ Data Integrity: ${validationResults?.every(v => v.hasAllFields && v.validScore) ? '✅' : '❌'}`);
    this.log(`  ✅ Performance: ${performanceResults?.performanceScore >= 80 ? '✅' : '❌'} (${performanceResults?.performanceScore?.toFixed(1) || 0}%)`);
    
    if (successRate === 100) {
      this.log('\n🎉 ALL TESTS PASSED - Module History Tracking System is operational!');
    } else {
      this.log('\n⚠️  Some tests failed - Review the failed modules above');
    }
    
    this.log('='.repeat(80));
  }
}

// Run the comprehensive test if called directly
if (typeof window === 'undefined') {
  const tester = new ComprehensiveModuleHistoryTest();
  tester.runComprehensiveTest().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ComprehensiveModuleHistoryTest();
  tester.runComprehensiveTest();
}

export default ComprehensiveModuleHistoryTest;