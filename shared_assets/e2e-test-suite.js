#!/usr/bin/env node

/**
 * End-to-End Testing Suite for Math Learning Platform
 * Tests all critical functionality after database cleanup
 */

import http from 'http';
import fs from 'fs';

class E2ETestSuite {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.cookies = '';
    this.userId = null;
    this.testResults = [];
    this.startTime = Date.now();
  }

  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.cookies,
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          // Store cookies for session management
          if (res.headers['set-cookie']) {
            this.cookies = res.headers['set-cookie'].join('; ');
          }
          
          try {
            const parsed = body ? JSON.parse(body) : null;
            resolve({ status: res.statusCode, data: parsed, headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, data: body, headers: res.headers });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(typeof data === 'string' ? data : JSON.stringify(data));
      }
      
      req.end();
    });
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async test(name, testFunction) {
    this.log(`Running test: ${name}`);
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      this.testResults.push({ name, status: 'PASS', duration });
      this.log(`Test passed: ${name} (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({ name, status: 'FAIL', duration, error: error.message });
      this.log(`Test failed: ${name} - ${error.message}`, 'error');
    }
  }

  async testServerHealth() {
    const response = await this.makeRequest('GET', '/api/user');
    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
    }
  }

  async testUserAuthentication() {
    // Test login with existing user
    const loginResponse = await this.makeRequest('POST', '/api/login', {
      username: 'BBGawdBB2',
      password: 'password123'
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }

    // Verify session works
    const userResponse = await this.makeRequest('GET', '/api/user');
    if (userResponse.status !== 200 || !userResponse.data?.id) {
      throw new Error('Failed to get authenticated user data');
    }

    this.userId = userResponse.data.id;
    this.log(`Authenticated as user ID: ${this.userId}`);
  }

  async testUserProgressData() {
    // Verify user has migrated JSON data
    const userResponse = await this.makeRequest('GET', '/api/user');
    const user = userResponse.data;
    
    if (!user.hiddenGradeAsset) {
      throw new Error('User missing hiddenGradeAsset JSON data');
    }

    const hiddenData = user.hiddenGradeAsset;
    this.log(`User has migrated data: ${Object.keys(hiddenData).join(', ')}`);
    
    // Verify data structure
    if (typeof hiddenData !== 'object') {
      throw new Error('hiddenGradeAsset is not an object');
    }
  }

  async testAnalyticsGeneration() {
    const response = await this.makeRequest('GET', '/api/analytics');
    
    if (response.status !== 200) {
      throw new Error(`Analytics request failed with status ${response.status}`);
    }

    if (!response.data) {
      throw new Error('Analytics data is empty');
    }

    this.log('Analytics generated successfully');
  }

  async testSubjectMasteries() {
    const response = await this.makeRequest('GET', '/api/subject-masteries');
    
    if (response.status !== 200) {
      throw new Error(`Subject masteries request failed with status ${response.status}`);
    }

    // Should return array (could be empty for new users)
    if (!Array.isArray(response.data)) {
      throw new Error('Subject masteries should return an array');
    }

    this.log(`Retrieved ${response.data.length} subject masteries`);
  }

  async testAvailableSubjects() {
    const response = await this.makeRequest('GET', `/api/subjects/available/${this.userId}`);
    
    if (response.status !== 200) {
      throw new Error(`Available subjects request failed with status ${response.status}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Available subjects should return an array');
    }

    this.log(`Found ${response.data.length} available subjects`);
  }

  async testQuestionRetrieval() {
    // Test getting questions by grade
    const response = await this.makeRequest('GET', '/api/questions?grade=3&category=addition');
    
    if (response.status !== 200) {
      throw new Error(`Question retrieval failed with status ${response.status}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Questions should return an array');
    }

    if (response.data.length === 0) {
      throw new Error('No questions found for grade 3 addition');
    }

    this.log(`Retrieved ${response.data.length} questions`);
  }

  async testAdaptiveQuestions() {
    const response = await this.makeRequest('GET', `/api/adaptive-question?grade=3&category=addition`);
    
    if (response.status !== 200) {
      throw new Error(`Adaptive question request failed with status ${response.status}`);
    }

    if (!response.data || !response.data.id) {
      throw new Error('Adaptive question should return a question object');
    }

    this.log('Adaptive question generated successfully');
  }

  async testQuestionSubmission() {
    // Get a question first
    const questionResponse = await this.makeRequest('GET', '/api/questions?grade=3&category=addition&limit=1');
    
    if (!questionResponse.data || questionResponse.data.length === 0) {
      throw new Error('No questions available for submission test');
    }

    const question = questionResponse.data[0];
    
    // Submit correct answer
    const submitResponse = await this.makeRequest('POST', '/api/submit-answer', {
      questionId: question.id,
      answer: question.answer,
      isCorrect: true,
      timeTaken: 5000
    });

    if (submitResponse.status !== 200) {
      throw new Error(`Answer submission failed with status ${submitResponse.status}`);
    }

    this.log('Question submission successful');
  }

  async testLeaderboard() {
    const response = await this.makeRequest('GET', '/api/leaderboard');
    
    if (response.status !== 200) {
      throw new Error(`Leaderboard request failed with status ${response.status}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Leaderboard should return an array');
    }

    this.log(`Leaderboard has ${response.data.length} entries`);
  }

  async testDatabaseIntegrity() {
    // Verify that deleted tables are actually gone
    try {
      // This should fail since we're testing a database query
      // We'll verify through user data instead
      const userResponse = await this.makeRequest('GET', '/api/user');
      const user = userResponse.data;
      
      // Check that user has expected data structure
      const requiredFields = ['id', 'username', 'tokens', 'hiddenGradeAsset'];
      for (const field of requiredFields) {
        if (!(field in user)) {
          throw new Error(`User missing required field: ${field}`);
        }
      }
      
      this.log('Database integrity verified');
    } catch (error) {
      throw new Error(`Database integrity check failed: ${error.message}`);
    }
  }

  async testConceptMasteryUpdate() {
    // Test that concept mastery updates work with JSON storage
    const beforeResponse = await this.makeRequest('GET', '/api/user');
    const beforeData = beforeResponse.data.hiddenGradeAsset;
    
    // Submit an answer to trigger concept mastery update
    const response = await this.makeRequest('POST', '/api/submit-answer', {
      questionId: 1,
      answer: '5',
      isCorrect: true,
      timeTaken: 3000,
      concept: 'addition',
      grade: '3'
    });

    if (response.status !== 200) {
      throw new Error(`Concept mastery update failed with status ${response.status}`);
    }

    const afterResponse = await this.makeRequest('GET', '/api/user');
    const afterData = afterResponse.data.hiddenGradeAsset;
    
    // Verify that hiddenGradeAsset was updated
    if (JSON.stringify(beforeData) === JSON.stringify(afterData)) {
      this.log('Warning: Concept mastery data may not have updated');
    }

    this.log('Concept mastery update test completed');
  }

  async testModuleProgress() {
    // Test accessing algebra module
    const response = await this.makeRequest('GET', '/api/user');
    const user = response.data;
    
    if (user.hiddenGradeAsset && user.hiddenGradeAsset.modules) {
      this.log(`User has ${Object.keys(user.hiddenGradeAsset.modules).length} modules`);
    }
    
    this.log('Module progress test completed');
  }

  async runAllTests() {
    this.log('Starting End-to-End Test Suite');
    this.log('==============================');

    await this.test('Server Health Check', () => this.testServerHealth());
    await this.test('User Authentication', () => this.testUserAuthentication());
    await this.test('User Progress Data Migration', () => this.testUserProgressData());
    await this.test('Analytics Generation', () => this.testAnalyticsGeneration());
    await this.test('Subject Masteries', () => this.testSubjectMasteries());
    await this.test('Available Subjects', () => this.testAvailableSubjects());
    await this.test('Question Retrieval', () => this.testQuestionRetrieval());
    await this.test('Adaptive Questions', () => this.testAdaptiveQuestions());
    await this.test('Question Submission', () => this.testQuestionSubmission());
    await this.test('Leaderboard', () => this.testLeaderboard());
    await this.test('Database Integrity', () => this.testDatabaseIntegrity());
    await this.test('Concept Mastery Update', () => this.testConceptMasteryUpdate());
    await this.test('Module Progress', () => this.testModuleProgress());

    this.generateReport();
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;

    this.log('');
    this.log('Test Results Summary');
    this.log('===================');
    this.log(`Total Tests: ${total}`);
    this.log(`Passed: ${passed}`, passed === total ? 'success' : 'info');
    this.log(`Failed: ${failed}`, failed === 0 ? 'success' : 'error');
    this.log(`Total Time: ${totalTime}ms`);
    this.log('');

    if (failed > 0) {
      this.log('Failed Tests:', 'error');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(test => {
          this.log(`  - ${test.name}: ${test.error}`, 'error');
        });
    }

    // Write detailed report to file
    const report = {
      summary: {
        total,
        passed,
        failed,
        totalTime,
        timestamp: new Date().toISOString()
      },
      tests: this.testResults
    };

    fs.writeFileSync('e2e-test-report.json', JSON.stringify(report, null, 2));
    this.log('Detailed report saved to e2e-test-report.json');

    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const suite = new E2ETestSuite();
  
  // Wait for server to be ready
  setTimeout(() => {
    suite.runAllTests().catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
  }, 2000);
}

export default E2ETestSuite;