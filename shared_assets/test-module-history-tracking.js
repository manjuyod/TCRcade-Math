
/**
 * Module History Tracking Test Script
 * Tests all module completion endpoints to ensure they write to module_history table
 */

class ModuleHistoryTester {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.testResults = [];
    this.userId = null;
  }

  async runAllTests() {
    console.log('🚀 Starting Module History Tracking Tests...\n');

    try {
      // Setup test user session
      await this.setupTestSession();

      // Test all modules
      const modules = [
        {
          name: 'math_rush_addition',
          endpoint: '/api/rush/complete',
          payload: {
            correct: 8,
            total: 10,
            durationSec: 60,
            mode: 'addition'
          }
        },
        {
          name: 'fractions_puzzle',
          endpoint: '/api/fractions/complete',
          payload: {
            correct: 4,
            total: 5,
            skill: 'define'
          }
        },
        {
          name: 'decimal_defender',
          endpoint: '/api/decimal-defender/complete',
          payload: {
            correct: 3,
            total: 5,
            skill: 'rounding'
          }
        },
        {
          name: 'ratios_proportions',
          endpoint: '/api/ratios/complete',
          payload: {
            correct: 4,
            total: 5,
            skill: 'write_form'
          }
        },
        {
          name: 'measurement_mastery',
          endpoint: '/api/measurement/submit-session',
          payload: {
            runType: 'token_run',
            questions: [
              { isCorrect: true, timeSpent: 10 },
              { isCorrect: false, timeSpent: 15 },
              { isCorrect: true, timeSpent: 12 }
            ],
            totalTime: 120,
            score: 67
          }
        },
        {
          name: 'algebra',
          endpoint: '/api/algebra/submit-session',
          payload: {
            runType: 'token_run',
            questions: [
              { isCorrect: true, timeSpent: 20 },
              { isCorrect: true, timeSpent: 18 },
              { isCorrect: false, timeSpent: 25 }
            ],
            totalTime: 180,
            score: 67
          }
        }
      ];

      // Test each module
      for (const module of modules) {
        await this.testModule(module);
        await this.sleep(1000); // Brief pause between tests
      }

      // Validate recorded data
      await this.validateRecordedData();

      // Generate report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async setupTestSession() {
    console.log('🔧 Setting up test session...');
    
    try {
      // Login or get test user
      const response = await fetch(`${this.baseUrl}/api/user`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const user = await response.json();
        this.userId = user.id;
        console.log(`✅ Test user ID: ${this.userId}\n`);
      } else {
        throw new Error('Failed to get authenticated user');
      }
    } catch (error) {
      console.error('❌ Failed to setup test session:', error);
      throw error;
    }
  }

  async testModule(moduleConfig) {
    console.log(`📝 Testing ${moduleConfig.name}...`);

    try {
      // Get initial history count
      const initialCount = await this.getModuleHistoryCount(moduleConfig.name);
      console.log(`   Initial history count: ${initialCount}`);

      // Execute module completion
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}${moduleConfig.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(moduleConfig.payload)
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      // Check if history was recorded
      await this.sleep(500); // Brief delay for database write
      const finalCount = await this.getModuleHistoryCount(moduleConfig.name);
      const historyRecorded = finalCount > initialCount;

      // Get latest entry for verification
      const latestEntry = historyRecorded ? await this.getLatestModuleHistory(moduleConfig.name) : null;

      const result = {
        module: moduleConfig.name,
        success: response.ok,
        historyRecorded,
        initialCount,
        finalCount,
        duration,
        latestEntry,
        responseData,
        error: null
      };

      this.testResults.push(result);

      if (historyRecorded) {
        console.log(`   ✅ History recorded! Count: ${initialCount} → ${finalCount}`);
        console.log(`   📊 Latest entry ID: ${latestEntry?.id}`);
      } else {
        console.log(`   ❌ History NOT recorded! Count unchanged: ${finalCount}`);
      }

      console.log(`   ⏱️  Completion time: ${duration}ms\n`);

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      this.testResults.push({
        module: moduleConfig.name,
        success: false,
        historyRecorded: false,
        error: error.message
      });
    }
  }

  async getModuleHistoryCount(moduleName) {
    try {
      const response = await fetch(`${this.baseUrl}/api/module-history/count/${moduleName}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        // If endpoint doesn't exist, try querying directly
        return await this.queryHistoryCountDirect(moduleName);
      }
      
      const data = await response.json();
      return data.count;
    } catch (error) {
      return await this.queryHistoryCountDirect(moduleName);
    }
  }

  async queryHistoryCountDirect(moduleName) {
    // Fallback: try to get count via general API
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/module-history?module=${moduleName}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data.length : 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async getLatestModuleHistory(moduleName) {
    try {
      const response = await fetch(`${this.baseUrl}/api/module-history/latest/${moduleName}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async validateRecordedData() {
    console.log('🔍 Validating recorded data...\n');

    const requiredFields = [
      'id', 'userId', 'moduleName', 'runType', 
      'finalScore', 'questionsTotal', 'questionsCorrect',
      'timeSpentSeconds', 'completedAt', 'tokensEarned'
    ];

    for (const result of this.testResults) {
      if (result.historyRecorded && result.latestEntry) {
        const entry = result.latestEntry;
        const validation = {
          module: result.module,
          hasAllFields: requiredFields.every(field => entry.hasOwnProperty(field)),
          validScore: entry.finalScore >= 0 && entry.finalScore <= 100,
          validRunType: ['test', 'token_run'].includes(entry.runType),
          validTimestamp: new Date(entry.completedAt).getTime() > 0,
          validUserId: entry.userId === this.userId
        };

        result.validation = validation;

        console.log(`📋 ${result.module}:`);
        console.log(`   All fields present: ${validation.hasAllFields ? '✅' : '❌'}`);
        console.log(`   Valid score (0-100): ${validation.validScore ? '✅' : '❌'} (${entry.finalScore})`);
        console.log(`   Valid run type: ${validation.validRunType ? '✅' : '❌'} (${entry.runType})`);
        console.log(`   Valid timestamp: ${validation.validTimestamp ? '✅' : '❌'}`);
        console.log(`   Correct user ID: ${validation.validUserId ? '✅' : '❌'}\n`);
      }
    }
  }

  generateReport() {
    console.log('📊 FINAL REPORT\n');
    console.log('=====================================');

    const totalModules = this.testResults.length;
    const successfulModules = this.testResults.filter(r => r.success).length;
    const modulesRecording = this.testResults.filter(r => r.historyRecorded).length;
    const failedModules = this.testResults.filter(r => !r.historyRecorded);

    console.log(`Total modules tested: ${totalModules}`);
    console.log(`Successful completions: ${successfulModules}`);
    console.log(`Modules recording history: ${modulesRecording}`);
    console.log(`Success rate: ${Math.round((modulesRecording / totalModules) * 100)}%\n`);

    if (failedModules.length > 0) {
      console.log('❌ FAILED MODULES:');
      failedModules.forEach(module => {
        console.log(`   - ${module.module}: ${module.error || 'History not recorded'}`);
      });
      console.log('');
    }

    console.log('✅ SUCCESSFUL MODULES:');
    this.testResults
      .filter(r => r.historyRecorded)
      .forEach(module => {
        console.log(`   - ${module.module}: Entry ID ${module.latestEntry?.id}`);
      });

    console.log('\n=====================================');
    
    if (modulesRecording === totalModules) {
      console.log('🎉 ALL MODULES ARE CORRECTLY RECORDING TO MODULE_HISTORY TABLE!');
    } else {
      console.log('⚠️  SOME MODULES ARE NOT RECORDING HISTORY - NEEDS ATTENTION');
    }

    // Save detailed results to file
    this.saveResultsToFile();
  }

  saveResultsToFile() {
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalModules: this.testResults.length,
        modulesRecording: this.testResults.filter(r => r.historyRecorded).length,
        successRate: Math.round((this.testResults.filter(r => r.historyRecorded).length / this.testResults.length) * 100) + '%'
      },
      details: this.testResults
    };

    // In a real environment, you'd write to a file
    console.log('\n💾 Test results would be saved to: module-history-test-results.json');
    // console.log(JSON.stringify(results, null, 2));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the tests
if (typeof window === 'undefined') {
  // Node.js environment
  const tester = new ModuleHistoryTester();
  tester.runAllTests().catch(console.error);
} else {
  // Browser environment
  window.ModuleHistoryTester = ModuleHistoryTester;
}
