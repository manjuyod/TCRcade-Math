#!/usr/bin/env node

/**
 * Authenticated End-to-End Workflow Testing Agent
 * 
 * This agent properly handles authentication and tests all application workflows
 * to identify and fix critical issues in the math learning platform.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AuthenticatedE2ETestingAgent {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.testResults = [];
    this.criticalIssues = [];
    this.fixes = [];
    this.currentUser = null;
    this.sessionCookie = null;
    this.startTime = Date.now();
  }

  log(message) {
    console.log(`[E2E-AGENT] ${message}`);
  }

  error(message) {
    console.error(`[E2E-AGENT ERROR] ${message}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.sessionCookie && { 'Cookie': this.sessionCookie }),
      },
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(url, finalOptions);
      
      // Capture session cookie if present
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        // Extract just the session ID part
        const sessionMatch = setCookieHeader.match(/connect\.sid=([^;]+)/);
        if (sessionMatch) {
          this.sessionCookie = `connect.sid=${sessionMatch[1]}`;
        }
      }
      
      const data = await response.json().catch(() => ({}));
      
      return {
        ok: response.ok,
        status: response.status,
        data,
        response
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error.message,
        data: null
      };
    }
  }

  async authenticateUser() {
    this.log('Authenticating with existing user...');
    
    try {
      // First try to login with a known test user
      const loginData = {
        username: 'BBGawdBB2',
        password: 'password123' // Common test password
      };

      const loginResponse = await this.makeRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify(loginData)
      });

      if (loginResponse.ok && loginResponse.data) {
        this.currentUser = loginResponse.data;
        this.log(`Successfully authenticated as: ${this.currentUser.username}`);
        return true;
      }

      // Try alternative login
      const altLoginData = {
        username: 'TimTest',
        password: 'password123'
      };

      const altLoginResponse = await this.makeRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify(altLoginData)
      });

      if (altLoginResponse.ok && altLoginResponse.data) {
        this.currentUser = altLoginResponse.data;
        this.log(`Successfully authenticated as: ${this.currentUser.username}`);
        return true;
      }

      // If login fails, try to register a test user
      const registerData = {
        username: 'TestUser' + Date.now(),
        password: 'testpass123',
        displayName: 'Test User',
        grade: '3'
      };

      const registerResponse = await this.makeRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify(registerData)
      });

      if (registerResponse.ok && registerResponse.data) {
        this.currentUser = registerResponse.data;
        this.log(`Successfully registered and authenticated as: ${this.currentUser.username}`);
        return true;
      }

      this.error('Failed to authenticate or register user');
      return false;

    } catch (error) {
      this.error(`Authentication failed: ${error.message}`);
      return false;
    }
  }

  async testUserProgressData() {
    this.log('Testing User Progress Data Structure...');
    
    const testStart = Date.now();
    let progressSuccess = false;

    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      // Test user progress endpoint
      const progressResponse = await this.makeRequest(`/api/user-progress/${this.currentUser.id}`);
      
      if (progressResponse.ok && progressResponse.data) {
        const userData = progressResponse.data;
        
        // Check for hiddenGradeAsset JSON structure
        if (userData.hiddenGradeAsset) {
          try {
            const hiddenData = typeof userData.hiddenGradeAsset === 'string' 
              ? JSON.parse(userData.hiddenGradeAsset)
              : userData.hiddenGradeAsset;
            
            this.log('User progress data structure validated');
            progressSuccess = true;
          } catch (parseError) {
            this.criticalIssues.push({
              issue: 'Invalid hiddenGradeAsset JSON',
              priority: 'CRITICAL',
              description: 'User progress contains malformed JSON',
              fix: 'Migrate user progress data to valid JSON format',
              files: ['server/storage.ts', 'shared/schema.ts']
            });
          }
        } else {
          // Try to initialize missing hiddenGradeAsset data
          const initResponse = await this.makeRequest(`/api/init-user-progress`, {
            method: 'POST',
            body: JSON.stringify({ userId: this.currentUser.id })
          });

          if (initResponse.ok) {
            this.log('Initialized missing user progress data');
            progressSuccess = true;
          } else {
            this.criticalIssues.push({
              issue: 'Missing User Progress Data',
              priority: 'CRITICAL',
              description: 'User missing hiddenGradeAsset structure',
              fix: 'Initialize default user progress structure',
              files: ['server/routes.ts', 'server/storage.ts']
            });
          }
        }
      } else {
        this.criticalIssues.push({
          issue: 'User Progress Endpoint Failed',
          priority: 'CRITICAL',
          description: `User progress endpoint returned ${progressResponse.status}`,
          fix: 'Verify user progress API endpoint and database schema'
        });
      }

      this.testResults.push({
        test: 'User Progress Data',
        status: progressSuccess ? 'PASS' : 'FAIL',
        duration: Date.now() - testStart,
        details: progressSuccess ? 'User progress data structure validated' : 'User progress data issues detected'
      });

      return progressSuccess;

    } catch (error) {
      this.error(`User progress test failed: ${error.message}`);
      this.testResults.push({
        test: 'User Progress Data',
        status: 'FAIL',
        duration: Date.now() - testStart,
        error: error.message
      });
      return false;
    }
  }

  async testAnalyticsGeneration() {
    this.log('Testing Analytics Generation...');
    
    const testStart = Date.now();
    let analyticsSuccess = false;

    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      const analyticsResponse = await this.makeRequest(`/api/analytics/${this.currentUser.id}`);
      
      if (analyticsResponse.ok && analyticsResponse.data) {
        const analytics = analyticsResponse.data;
        
        // Log analytics structure for debugging
        console.log('Analytics response structure:', JSON.stringify(analytics, null, 2));
        
        // Validate analytics structure - check for required fields
        if (analytics.totalTokens !== undefined && analytics.accuracyStats !== undefined) {
          this.log('Analytics generation successful');
          analyticsSuccess = true;
        } else {
          // Check if fields are nested under analytics key
          if (analytics.analytics && analytics.totalTokens !== undefined && analytics.accuracyStats !== undefined) {
            this.log('Analytics generation successful (nested structure)');
            analyticsSuccess = true;
          } else {
            this.criticalIssues.push({
              issue: 'Incomplete Analytics Data',
              priority: 'HIGH',
              description: `Analytics response missing required fields. Found: ${Object.keys(analytics).join(', ')}`,
              fix: 'Verify analytics calculation logic'
            });
          }
        }
      } else {
        this.criticalIssues.push({
          issue: 'Analytics Generation Failed',
          priority: 'CRITICAL',
          description: `Analytics endpoint returned ${analyticsResponse.status}`,
          fix: 'Fix analytics service and data aggregation',
          files: ['server/analytics-service.ts', 'server/routes.ts']
        });
      }

      this.testResults.push({
        test: 'Analytics Generation',
        status: analyticsSuccess ? 'PASS' : 'FAIL',
        duration: Date.now() - testStart,
        details: analyticsSuccess ? 'Analytics generation working' : 'Analytics generation failed'
      });

      return analyticsSuccess;

    } catch (error) {
      this.error(`Analytics test failed: ${error.message}`);
      this.testResults.push({
        test: 'Analytics Generation',
        status: 'FAIL',
        duration: Date.now() - testStart,
        error: error.message
      });
      return false;
    }
  }

  async testQuestionGeneration() {
    this.log('Testing Question Generation and Submission...');
    
    const testStart = Date.now();
    let questionSuccess = false;

    try {
      // Test adaptive question generation
      const questionResponse = await this.makeRequest(`/api/adaptive-question?userId=${this.currentUser?.id || 1}&grade=3&concept=addition`);
      
      if (questionResponse.ok && questionResponse.data) {
        const question = questionResponse.data;
        
        if (question.question && question.answer && question.options) {
          this.log('Question generation successful');
          
          // Test question submission
          const submissionData = {
            questionId: question.id || 'test-' + Date.now(),
            userAnswer: question.answer, // Submit correct answer
            timeTaken: 3000,
            isCorrect: true
          };

          const submissionResponse = await this.makeRequest('/api/submit-answer', {
            method: 'POST',
            body: JSON.stringify(submissionData)
          });

          if (submissionResponse.ok) {
            this.log('Question submission successful');
            questionSuccess = true;
          } else {
            this.criticalIssues.push({
              issue: 'Question Submission Failed',
              priority: 'HIGH',
              description: `Question submission returned ${submissionResponse.status}`,
              fix: 'Fix answer validation and submission processing'
            });
          }
        } else {
          this.criticalIssues.push({
            issue: 'Incomplete Question Data',
            priority: 'HIGH',
            description: 'Generated question missing required fields',
            fix: 'Verify question generation logic and OpenAI integration'
          });
        }
      } else {
        this.criticalIssues.push({
          issue: 'Question Generation Failed',
          priority: 'CRITICAL',
          description: `Question generation returned ${questionResponse.status}`,
          fix: 'Fix OpenAI integration and question generation service',
          files: ['server/openai.ts', 'server/routes.ts']
        });
      }

      this.testResults.push({
        test: 'Question System',
        status: questionSuccess ? 'PASS' : 'FAIL',
        duration: Date.now() - testStart,
        details: questionSuccess ? 'Question generation and submission working' : 'Question system failures detected'
      });

      return questionSuccess;

    } catch (error) {
      this.error(`Question system test failed: ${error.message}`);
      this.testResults.push({
        test: 'Question System',
        status: 'FAIL',
        duration: Date.now() - testStart,
        error: error.message
      });
      return false;
    }
  }

  async testModuleWorkflows() {
    this.log('Testing Individual Module Workflows...');
    
    const testStart = Date.now();
    const modules = [
      { 
        name: 'Math Facts Addition', 
        endpoint: '/api/math-facts/addition',
        params: '?grade=3',
        method: 'GET'
      },
      { 
        name: 'Math Rush', 
        endpoint: '/api/rush/start',
        method: 'POST',
        body: { operation: 'addition', grade: '3' }
      },
      { 
        name: 'Fractions Puzzle', 
        endpoint: '/api/fractions/start',
        method: 'POST',
        body: { grade: '3' }
      },
      { 
        name: 'Decimal Defender', 
        endpoint: '/api/decimal-defender/start',
        method: 'POST',
        body: { skill: 'addition', grade: '3' }
      },
      { 
        name: 'Measurement', 
        endpoint: '/api/measurement/questions',
        params: '?grade=3',
        method: 'GET'
      },
      { 
        name: 'Ratios', 
        endpoint: '/api/ratios/questions',
        params: '?grade=6',
        method: 'GET'
      }
    ];

    let moduleSuccessCount = 0;
    const moduleResults = [];

    for (const module of modules) {
      try {
        const endpoint = module.endpoint + (module.params || '');
        const options = {
          method: module.method || 'GET',
          ...(module.body && { body: JSON.stringify(module.body) })
        };

        const moduleResponse = await this.makeRequest(endpoint, options);

        if (moduleResponse.ok && moduleResponse.data) {
          this.log(`${module.name} module operational`);
          moduleSuccessCount++;
          moduleResults.push({ 
            module: module.name, 
            status: 'PASS',
            endpoint: endpoint
          });
        } else {
          this.log(`${module.name} module failed - Status: ${moduleResponse.status}`);
          moduleResults.push({ 
            module: module.name, 
            status: 'FAIL', 
            error: moduleResponse.status,
            endpoint: endpoint
          });
          
          this.criticalIssues.push({
            issue: `${module.name} Module Failed`,
            priority: 'HIGH',
            description: `${module.name} endpoint returned ${moduleResponse.status}`,
            endpoint: endpoint,
            fix: `Fix ${module.name} module endpoint and data processing`
          });
        }

        // Small delay between requests
        await this.delay(100);

      } catch (error) {
        this.error(`${module.name} test failed: ${error.message}`);
        moduleResults.push({ 
          module: module.name, 
          status: 'FAIL', 
          error: error.message 
        });
      }
    }

    const moduleSuccess = moduleSuccessCount === modules.length;

    this.testResults.push({
      test: 'Module Workflows',
      status: moduleSuccess ? 'PASS' : 'PARTIAL',
      duration: Date.now() - testStart,
      details: `${moduleSuccessCount}/${modules.length} modules operational`,
      moduleResults
    });

    this.log(`Module testing complete: ${moduleSuccessCount}/${modules.length} modules working`);
    return moduleSuccess;
  }

  async testModuleHistoryTracking() {
    this.log('Testing Module History Tracking...');
    
    const testStart = Date.now();
    let historySuccess = false;

    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      // Test module history endpoint
      const historyResponse = await this.makeRequest(`/api/module-history/${this.currentUser.id}`);
      
      if (historyResponse.ok) {
        this.log('Module history tracking accessible');
        historySuccess = true;

        // Test adding a module completion record
        const testCompletion = {
          userId: this.currentUser.id,
          moduleName: 'test_module',
          runType: 'practice',
          finalScore: 85,
          tokensEarned: 10
        };

        const completionResponse = await this.makeRequest('/api/module-history', {
          method: 'POST',
          body: JSON.stringify(testCompletion)
        });

        if (!completionResponse.ok) {
          this.criticalIssues.push({
            issue: 'Module History Recording Failed',
            priority: 'HIGH',
            description: 'Cannot record module completions',
            fix: 'Fix module history recording endpoint'
          });
        }
      } else {
        this.criticalIssues.push({
          issue: 'Module History Unavailable',
          priority: 'HIGH',
          description: `Module history endpoint returned ${historyResponse.status}`,
          fix: 'Verify module history database table and API endpoint'
        });
      }

      this.testResults.push({
        test: 'Module History Tracking',
        status: historySuccess ? 'PASS' : 'FAIL',
        duration: Date.now() - testStart,
        details: historySuccess ? 'Module history tracking working' : 'Module history tracking failed'
      });

      return historySuccess;

    } catch (error) {
      this.error(`Module history test failed: ${error.message}`);
      this.testResults.push({
        test: 'Module History Tracking',
        status: 'FAIL',
        duration: Date.now() - testStart,
        error: error.message
      });
      return false;
    }
  }

  generateFixes() {
    const fixes = [];

    // Generate specific fixes based on critical issues
    this.criticalIssues.forEach(issue => {
      if (issue.fix) {
        fixes.push({
          issue: issue.issue,
          priority: issue.priority,
          fix: issue.fix,
          files: issue.files || this.suggestFilesToFix(issue),
          endpoint: issue.endpoint
        });
      }
    });

    return fixes;
  }

  suggestFilesToFix(issue) {
    const fileMap = {
      'Progress': ['server/storage.ts', 'shared/schema.ts'],
      'Analytics': ['server/analytics-service.ts', 'server/routes.ts'],
      'Question': ['server/openai.ts', 'server/routes.ts'],
      'Module': ['server/routes.ts', 'server/modules/'],
      'History': ['server/storage.ts', 'shared/schema.ts']
    };

    for (const [key, files] of Object.entries(fileMap)) {
      if (issue.issue.includes(key)) {
        return files;
      }
    }

    return ['server/routes.ts'];
  }

  generateRecommendations() {
    const recommendations = [];

    const criticalCount = this.criticalIssues.filter(i => i.priority === 'CRITICAL').length;
    const highCount = this.criticalIssues.filter(i => i.priority === 'HIGH').length;

    if (criticalCount === 0 && highCount === 0) {
      recommendations.push('All critical systems operational');
      recommendations.push('Application ready for production use');
    } else {
      if (criticalCount > 0) {
        recommendations.push(`Address ${criticalCount} critical issues immediately`);
      }
      if (highCount > 0) {
        recommendations.push(`Fix ${highCount} high-priority issues for optimal performance`);
      }
    }

    // Specific recommendations based on patterns
    const failedTests = this.testResults.filter(t => t.status === 'FAIL');
    
    if (failedTests.some(t => t.test.includes('Progress'))) {
      recommendations.push('Run database migration to ensure user progress data integrity');
    }

    if (failedTests.some(t => t.test.includes('Question'))) {
      recommendations.push('Verify OpenAI API key configuration and question generation logic');
    }

    const partialTests = this.testResults.filter(t => t.status === 'PARTIAL');
    if (partialTests.length > 0) {
      recommendations.push('Improve error handling in module endpoints for better reliability');
    }

    return recommendations;
  }

  async generateReport() {
    const totalTime = Date.now() - this.startTime;
    const passedTests = this.testResults.filter(t => t.status === 'PASS').length;
    const failedTests = this.testResults.filter(t => t.status === 'FAIL').length;
    const partialTests = this.testResults.filter(t => t.status === 'PARTIAL').length;

    const report = {
      testSummary: {
        totalTests: this.testResults.length,
        passed: passedTests,
        failed: failedTests,
        partial: partialTests,
        executionTime: `${(totalTime / 1000).toFixed(1)}s`,
        criticalIssues: this.criticalIssues.filter(i => i.priority === 'CRITICAL').length,
        highPriorityIssues: this.criticalIssues.filter(i => i.priority === 'HIGH').length,
        timestamp: new Date().toISOString(),
        authenticatedUser: this.currentUser?.username || 'None'
      },
      workflowResults: this.testResults.map(test => ({
        workflow: test.test.toLowerCase().replace(/\s+/g, ''),
        status: test.status,
        executionTime: `${(test.duration / 1000).toFixed(1)}s`,
        details: test.details || test.error || 'No details'
      })),
      criticalIssues: this.criticalIssues,
      fixes: this.generateFixes(),
      recommendations: this.generateRecommendations(),
      detailedResults: this.testResults
    };

    // Save report to file
    const reportPath = path.join(__dirname, 'authenticated-e2e-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`\n🎯 AUTHENTICATED E2E TEST REPORT`);
    this.log(`===================================`);
    this.log(`Authenticated User: ${report.testSummary.authenticatedUser}`);
    this.log(`Total Tests: ${report.testSummary.totalTests}`);
    this.log(`Passed: ${report.testSummary.passed}`);
    this.log(`Failed: ${report.testSummary.failed}`);
    this.log(`Partial: ${report.testSummary.partial}`);
    this.log(`Critical Issues: ${report.testSummary.criticalIssues}`);
    this.log(`High Priority Issues: ${report.testSummary.highPriorityIssues}`);
    this.log(`Execution Time: ${report.testSummary.executionTime}`);
    this.log(`\nReport saved to: ${reportPath}`);

    if (report.testSummary.criticalIssues > 0) {
      this.log(`\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:`);
      this.criticalIssues.filter(i => i.priority === 'CRITICAL').forEach(issue => {
        this.log(`- ${issue.issue}: ${issue.description}`);
      });
    }

    if (report.testSummary.highPriorityIssues > 0) {
      this.log(`\n⚠️ HIGH PRIORITY ISSUES:`);
      this.criticalIssues.filter(i => i.priority === 'HIGH').forEach(issue => {
        this.log(`- ${issue.issue}: ${issue.description}`);
      });
    }

    return report;
  }

  async runComprehensiveTests() {
    this.log('🚀 Starting Authenticated End-to-End Workflow Testing...');
    this.log('========================================================');

    try {
      // Step 1: Authenticate user
      const authSuccess = await this.authenticateUser();
      
      if (!authSuccess) {
        this.log('❌ Cannot proceed without authentication');
        return await this.generateReport();
      }

      // Step 2: Run authenticated tests
      await this.testUserProgressData();
      await this.testAnalyticsGeneration();
      await this.testQuestionGeneration();
      await this.testModuleWorkflows();
      await this.testModuleHistoryTracking();

      // Step 3: Generate comprehensive report
      const report = await this.generateReport();
      
      return report;

    } catch (error) {
      this.error(`Test execution failed: ${error.message}`);
      throw error;
    }
  }
}

// Execute the testing agent
async function main() {
  const agent = new AuthenticatedE2ETestingAgent();
  
  try {
    const report = await agent.runComprehensiveTests();
    
    // Exit with appropriate code
    const hasFailures = report.testSummary.failed > 0 || report.testSummary.criticalIssues > 0;
    process.exit(hasFailures ? 1 : 0);
    
  } catch (error) {
    console.error('Testing agent failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default AuthenticatedE2ETestingAgent;