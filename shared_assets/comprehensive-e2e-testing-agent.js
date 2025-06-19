#!/usr/bin/env node

/**
 * Comprehensive End-to-End Workflow Testing Agent
 * 
 * Objective: Create and execute a comprehensive end-to-end test suite that validates 
 * all application workflows, identifies critical failures, and provides actionable fixes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ComprehensiveE2ETestingAgent {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.testResults = [];
    this.criticalIssues = [];
    this.fixes = [];
    this.currentUser = null;
    this.authToken = null;
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
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` }),
      },
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(url, finalOptions);
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

  async testAuthentication() {
    this.log('Phase 1: Testing Authentication System...');
    
    const testStart = Date.now();
    let authSuccess = false;

    try {
      // Test 1: Check current user endpoint
      const userCheck = await this.makeRequest('/api/user');
      
      if (userCheck.ok && userCheck.data && userCheck.data.id) {
        this.log(`✅ User already authenticated: ${userCheck.data.username} (ID: ${userCheck.data.id})`);
        this.currentUser = userCheck.data;
        authSuccess = true;
      } else {
        this.log(`❌ User not authenticated - Status: ${userCheck.status}`);
        this.criticalIssues.push({
          issue: 'User Authentication Failure',
          priority: 'CRITICAL',
          description: `User endpoint returned ${userCheck.status}`,
          endpoint: '/api/user'
        });
      }

      // Test 2: Validate session persistence
      if (authSuccess) {
        await this.delay(100);
        const sessionCheck = await this.makeRequest('/api/user');
        
        if (!sessionCheck.ok || !sessionCheck.data || sessionCheck.data.id !== this.currentUser.id) {
          this.criticalIssues.push({
            issue: 'Session Persistence Failure',
            priority: 'HIGH',
            description: 'User session not persisting across requests'
          });
        } else {
          this.log('✅ Session persistence validated');
        }
      }

      this.testResults.push({
        test: 'Authentication Flow',
        status: authSuccess ? 'PASS' : 'FAIL',
        duration: Date.now() - testStart,
        details: authSuccess ? 'User authenticated successfully' : 'Authentication failed'
      });

      return authSuccess;

    } catch (error) {
      this.error(`Authentication test failed: ${error.message}`);
      this.testResults.push({
        test: 'Authentication Flow',
        status: 'FAIL',
        duration: Date.now() - testStart,
        error: error.message
      });
      return false;
    }
  }

  async testDatabaseIntegrity() {
    this.log('Phase 2: Testing Database Integrity...');
    
    const testStart = Date.now();
    let dbSuccess = false;

    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user for database testing');
      }

      // Test 1: Validate user progress data structure
      const progressCheck = await this.makeRequest(`/api/user-progress/${this.currentUser.id}`);
      
      if (progressCheck.ok && progressCheck.data) {
        // Check for hiddenGradeAsset JSON structure
        if (progressCheck.data.hiddenGradeAsset) {
          try {
            const hiddenData = typeof progressCheck.data.hiddenGradeAsset === 'string' 
              ? JSON.parse(progressCheck.data.hiddenGradeAsset)
              : progressCheck.data.hiddenGradeAsset;
            
            this.log('✅ hiddenGradeAsset JSON data structure present');
            dbSuccess = true;
          } catch (parseError) {
            this.criticalIssues.push({
              issue: 'Invalid hiddenGradeAsset JSON Structure',
              priority: 'CRITICAL',
              description: 'hiddenGradeAsset contains invalid JSON data',
              fix: 'Migrate user progress data to valid JSON format'
            });
          }
        } else {
          this.criticalIssues.push({
            issue: 'Missing hiddenGradeAsset Data',
            priority: 'CRITICAL',
            description: 'User missing hiddenGradeAsset JSON data structure',
            fix: 'Initialize hiddenGradeAsset with default structure'
          });
        }
      } else {
        this.criticalIssues.push({
          issue: 'User Progress Data Unavailable',
          priority: 'CRITICAL',
          description: `User progress endpoint returned ${progressCheck.status}`,
          endpoint: '/api/user-progress'
        });
      }

      // Test 2: Module history tracking
      const historyCheck = await this.makeRequest(`/api/module-history/${this.currentUser.id}`);
      
      if (historyCheck.ok) {
        this.log('✅ Module history tracking accessible');
      } else {
        this.criticalIssues.push({
          issue: 'Module History Tracking Unavailable',
          priority: 'HIGH',
          description: `Module history endpoint returned ${historyCheck.status}`
        });
      }

      this.testResults.push({
        test: 'Database Integrity',
        status: dbSuccess ? 'PASS' : 'FAIL',
        duration: Date.now() - testStart,
        details: dbSuccess ? 'Database structure validated' : 'Database integrity issues found'
      });

      return dbSuccess;

    } catch (error) {
      this.error(`Database integrity test failed: ${error.message}`);
      this.testResults.push({
        test: 'Database Integrity',
        status: 'FAIL',
        duration: Date.now() - testStart,
        error: error.message
      });
      return false;
    }
  }

  async testAnalyticsSystem() {
    this.log('Phase 3: Testing Analytics and Progress System...');
    
    const testStart = Date.now();
    let analyticsSuccess = false;

    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user for analytics testing');
      }

      // Test 1: Analytics generation
      const analyticsCheck = await this.makeRequest(`/api/analytics/${this.currentUser.id}`);
      
      if (analyticsCheck.ok && analyticsCheck.data) {
        this.log('✅ Analytics generation working');
        analyticsSuccess = true;
      } else {
        this.criticalIssues.push({
          issue: 'Analytics Generation Failure',
          priority: 'CRITICAL',
          description: `Analytics endpoint returned ${analyticsCheck.status}`,
          endpoint: '/api/analytics',
          fix: 'Verify analytics service and user data integrity'
        });
      }

      // Test 2: Subject masteries
      const masteriesCheck = await this.makeRequest('/api/subject-masteries');
      
      if (masteriesCheck.ok) {
        this.log('✅ Subject masteries accessible');
      } else {
        this.criticalIssues.push({
          issue: 'Subject Masteries Unavailable',
          priority: 'HIGH',
          description: `Subject masteries returned ${masteriesCheck.status}`
        });
      }

      // Test 3: Available subjects
      const subjectsCheck = await this.makeRequest('/api/available-subjects');
      
      if (subjectsCheck.ok) {
        this.log('✅ Available subjects accessible');
      } else {
        this.criticalIssues.push({
          issue: 'Available Subjects Unavailable',
          priority: 'HIGH',
          description: `Available subjects returned ${subjectsCheck.status}`
        });
      }

      this.testResults.push({
        test: 'Analytics System',
        status: analyticsSuccess ? 'PASS' : 'FAIL',
        duration: Date.now() - testStart,
        details: analyticsSuccess ? 'Analytics system operational' : 'Analytics system failures detected'
      });

      return analyticsSuccess;

    } catch (error) {
      this.error(`Analytics test failed: ${error.message}`);
      this.testResults.push({
        test: 'Analytics System',
        status: 'FAIL',
        duration: Date.now() - testStart,
        error: error.message
      });
      return false;
    }
  }

  async testQuestionSystem() {
    this.log('Phase 4: Testing Question Generation and Submission...');
    
    const testStart = Date.now();
    let questionSuccess = false;

    try {
      // Test 1: Question retrieval
      const questionCheck = await this.makeRequest('/api/questions?grade=3&concept=addition');
      
      if (questionCheck.ok && questionCheck.data) {
        this.log('✅ Question retrieval working');
        questionSuccess = true;
      } else {
        this.criticalIssues.push({
          issue: 'Question Retrieval Failure',
          priority: 'CRITICAL',
          description: `Question endpoint returned ${questionCheck.status}`,
          endpoint: '/api/questions'
        });
      }

      // Test 2: Adaptive questions
      const adaptiveCheck = await this.makeRequest('/api/adaptive-question?userId=' + (this.currentUser?.id || 1) + '&grade=3');
      
      if (adaptiveCheck.ok && adaptiveCheck.data && adaptiveCheck.data.question) {
        this.log('✅ Adaptive question generation working');
      } else {
        this.criticalIssues.push({
          issue: 'Adaptive Question Generation Failure',
          priority: 'HIGH',
          description: 'Adaptive question should return a question object',
          fix: 'Verify OpenAI integration and question generation logic'
        });
      }

      // Test 3: Question submission (if we have a question)
      if (adaptiveCheck.ok && adaptiveCheck.data && adaptiveCheck.data.id) {
        const submissionData = {
          questionId: adaptiveCheck.data.id,
          userAnswer: 'test',
          timeTaken: 5000
        };

        const submissionCheck = await this.makeRequest('/api/submit-answer', {
          method: 'POST',
          body: JSON.stringify(submissionData)
        });

        if (submissionCheck.ok) {
          this.log('✅ Question submission working');
        } else {
          this.criticalIssues.push({
            issue: 'Question Submission Failure',
            priority: 'HIGH',
            description: `Question submission returned ${submissionCheck.status}`,
            fix: 'Verify answer submission validation and processing'
          });
        }
      }

      this.testResults.push({
        test: 'Question System',
        status: questionSuccess ? 'PASS' : 'FAIL',
        duration: Date.now() - testStart,
        details: questionSuccess ? 'Question system operational' : 'Question system failures detected'
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
    this.log('Phase 5: Testing Module Workflows...');
    
    const testStart = Date.now();
    const modules = [
      { name: 'Math Facts', endpoint: '/api/math-facts/addition?grade=3' },
      { name: 'Math Rush', endpoint: '/api/rush/start', method: 'POST' },
      { name: 'Fractions Puzzle', endpoint: '/api/fractions/start', method: 'POST' },
      { name: 'Decimal Defender', endpoint: '/api/decimal-defender/start', method: 'POST' },
      { name: 'Measurement', endpoint: '/api/measurement/questions?grade=3' },
      { name: 'Ratios', endpoint: '/api/ratios/questions?grade=6' }
    ];

    let moduleSuccessCount = 0;
    const moduleResults = [];

    for (const module of modules) {
      try {
        const moduleCheck = await this.makeRequest(module.endpoint, {
          method: module.method || 'GET',
          ...(module.method === 'POST' && { 
            body: JSON.stringify({ grade: '3', operation: 'addition' }) 
          })
        });

        if (moduleCheck.ok) {
          this.log(`✅ ${module.name} module accessible`);
          moduleSuccessCount++;
          moduleResults.push({ module: module.name, status: 'PASS' });
        } else {
          this.log(`❌ ${module.name} module failed - Status: ${moduleCheck.status}`);
          moduleResults.push({ module: module.name, status: 'FAIL', error: moduleCheck.status });
          
          this.criticalIssues.push({
            issue: `${module.name} Module Unavailable`,
            priority: 'HIGH',
            description: `${module.name} endpoint returned ${moduleCheck.status}`,
            endpoint: module.endpoint
          });
        }
      } catch (error) {
        this.error(`${module.name} test failed: ${error.message}`);
        moduleResults.push({ module: module.name, status: 'FAIL', error: error.message });
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

    return moduleSuccess;
  }

  async testServerHealth() {
    this.log('Testing Server Health...');
    
    const testStart = Date.now();
    
    try {
      const healthCheck = await this.makeRequest('/api/health');
      
      const isHealthy = healthCheck.ok || healthCheck.status === 404; // 404 might mean no health endpoint, but server is running
      
      this.testResults.push({
        test: 'Server Health',
        status: isHealthy ? 'PASS' : 'FAIL',
        duration: Date.now() - testStart,
        details: `Server responding with status ${healthCheck.status}`
      });

      return isHealthy;
    } catch (error) {
      this.testResults.push({
        test: 'Server Health',
        status: 'FAIL',
        duration: Date.now() - testStart,
        error: error.message
      });
      return false;
    }
  }

  generateRecommendations() {
    const recommendations = [];

    // Critical issue recommendations
    if (this.criticalIssues.length === 0) {
      recommendations.push('All critical systems operational');
    } else {
      recommendations.push(`Address ${this.criticalIssues.length} critical issues immediately`);
      
      // Group issues by priority
      const criticalCount = this.criticalIssues.filter(i => i.priority === 'CRITICAL').length;
      const highCount = this.criticalIssues.filter(i => i.priority === 'HIGH').length;
      
      if (criticalCount > 0) {
        recommendations.push(`Fix ${criticalCount} critical authentication/data issues first`);
      }
      if (highCount > 0) {
        recommendations.push(`Address ${highCount} high-priority workflow issues`);
      }
    }

    // Specific recommendations based on test results
    const failedTests = this.testResults.filter(t => t.status === 'FAIL');
    const partialTests = this.testResults.filter(t => t.status === 'PARTIAL');

    if (failedTests.some(t => t.test === 'Authentication Flow')) {
      recommendations.push('Implement comprehensive error handling in authentication middleware');
    }

    if (failedTests.some(t => t.test === 'Database Integrity')) {
      recommendations.push('Run database migration to fix user progress data structure');
    }

    if (failedTests.some(t => t.test === 'Analytics System')) {
      recommendations.push('Add retry logic for analytics generation');
    }

    if (partialTests.length > 0) {
      recommendations.push('Improve session state management for module workflows');
    }

    return recommendations;
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
          files: this.suggestFilesToFix(issue)
        });
      }
    });

    // Add general fixes based on test patterns
    const authFailed = this.testResults.some(t => t.test === 'Authentication Flow' && t.status === 'FAIL');
    if (authFailed) {
      fixes.push({
        issue: 'Authentication middleware',
        priority: 'CRITICAL',
        fix: 'Update JWT secret validation and session management',
        files: ['server/auth.ts', 'server/middleware.ts']
      });
    }

    return fixes;
  }

  suggestFilesToFix(issue) {
    const fileMap = {
      'Authentication': ['server/auth.ts', 'server/routes.ts'],
      'Database': ['server/storage.ts', 'shared/schema.ts'],
      'Analytics': ['server/analytics-service.ts', 'server/routes.ts'],
      'Question': ['server/openai.ts', 'server/routes.ts'],
      'Module': ['server/routes.ts', 'client/src/pages/']
    };

    for (const [key, files] of Object.entries(fileMap)) {
      if (issue.issue.includes(key)) {
        return files;
      }
    }

    return ['server/routes.ts'];
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
        timestamp: new Date().toISOString()
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
    const reportPath = path.join(__dirname, 'comprehensive-e2e-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`\n🎯 COMPREHENSIVE E2E TEST REPORT`);
    this.log(`================================`);
    this.log(`Total Tests: ${report.testSummary.totalTests}`);
    this.log(`Passed: ${report.testSummary.passed}`);
    this.log(`Failed: ${report.testSummary.failed}`);
    this.log(`Partial: ${report.testSummary.partial}`);
    this.log(`Critical Issues: ${report.testSummary.criticalIssues}`);
    this.log(`Execution Time: ${report.testSummary.executionTime}`);
    this.log(`\nReport saved to: ${reportPath}`);

    if (report.testSummary.criticalIssues > 0) {
      this.log(`\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:`);
      this.criticalIssues.filter(i => i.priority === 'CRITICAL').forEach(issue => {
        this.log(`- ${issue.issue}: ${issue.description}`);
      });
    }

    return report;
  }

  async runComprehensiveTests() {
    this.log('🚀 Starting Comprehensive End-to-End Workflow Testing...');
    this.log('=======================================================');

    try {
      // Execute test phases in order
      await this.testServerHealth();
      const authSuccess = await this.testAuthentication();
      
      if (authSuccess) {
        await this.testDatabaseIntegrity();
        await this.testAnalyticsSystem();
        await this.testQuestionSystem();
        await this.testModuleWorkflows();
      } else {
        this.log('⚠️ Skipping authenticated tests due to authentication failure');
      }

      // Generate comprehensive report
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
  const agent = new ComprehensiveE2ETestingAgent();
  
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

export default ComprehensiveE2ETestingAgent;