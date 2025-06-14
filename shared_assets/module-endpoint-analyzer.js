#!/usr/bin/env node
/**
 * Module Endpoint Analyzer
 * Analyzes all module completion endpoints to verify they integrate with module history tracking
 */

import fs from 'fs';
import path from 'path';

class ModuleEndpointAnalyzer {
  constructor() {
    this.routesFile = 'server/routes.ts';
    this.moduleEndpoints = [];
    this.historyIntegrations = [];
    this.missingIntegrations = [];
  }

  analyze() {
    console.log('🔍 Analyzing Module Endpoints for History Integration...\n');
    
    if (!fs.existsSync(this.routesFile)) {
      console.error(`❌ Routes file not found: ${this.routesFile}`);
      return;
    }

    const routesContent = fs.readFileSync(this.routesFile, 'utf8');
    this.findModuleEndpoints(routesContent);
    this.checkHistoryIntegrations(routesContent);
    this.generateReport();
  }

  findModuleEndpoints(content) {
    console.log('📋 Identifying Module Completion Endpoints:');
    
    const endpointPatterns = [
      { pattern: /app\.post\(["']\/api\/rush\/complete["']/, name: 'Math Rush', endpoint: '/api/rush/complete' },
      { pattern: /app\.post\(["']\/api\/fractions\/complete["']/, name: 'Fractions Puzzle', endpoint: '/api/fractions/complete' },
      { pattern: /app\.post\(["']\/api\/decimal-defender\/complete["']/, name: 'Decimal Defender', endpoint: '/api/decimal-defender/complete' },
      { pattern: /app\.post\(["']\/api\/ratios\/complete["']/, name: 'Ratios & Proportions', endpoint: '/api/ratios/complete' },
      { pattern: /app\.post\(["']\/api\/measurement\/submit-session["']/, name: 'Measurement Mastery', endpoint: '/api/measurement/submit-session' },
      { pattern: /app\.post\(["']\/api\/algebra\/submit-session["']/, name: 'Pre-Algebra Basics', endpoint: '/api/algebra/submit-session' },
      { pattern: /app\.post\(["']\/api\/math-facts/, name: 'Math Facts', endpoint: '/api/math-facts/*' }
    ];

    endpointPatterns.forEach(({ pattern, name, endpoint }) => {
      if (pattern.test(content)) {
        this.moduleEndpoints.push({ name, endpoint, found: true });
        console.log(`  ✅ Found: ${name} (${endpoint})`);
      } else {
        this.moduleEndpoints.push({ name, endpoint, found: false });
        console.log(`  ❌ Missing: ${name} (${endpoint})`);
      }
    });

    console.log(`\nTotal endpoints found: ${this.moduleEndpoints.filter(e => e.found).length}/${this.moduleEndpoints.length}\n`);
  }

  checkHistoryIntegrations(content) {
    console.log('🔗 Checking History Integration:');
    
    const historyCallPattern = /recordModuleHistory|storage\.recordModuleHistory/g;
    const historyMatches = content.match(historyCallPattern) || [];
    
    console.log(`Found ${historyMatches.length} history recording calls\n`);

    // Check each endpoint for history integration
    this.moduleEndpoints.forEach(endpoint => {
      if (!endpoint.found) return;

      const hasHistoryIntegration = this.checkEndpointHistoryIntegration(content, endpoint);
      
      if (hasHistoryIntegration) {
        this.historyIntegrations.push(endpoint);
        console.log(`  ✅ ${endpoint.name}: History integration found`);
      } else {
        this.missingIntegrations.push(endpoint);
        console.log(`  ❌ ${endpoint.name}: History integration MISSING`);
      }
    });
  }

  checkEndpointHistoryIntegration(content, endpoint) {
    // Extract the endpoint handler code
    const endpointRegex = new RegExp(`app\\.post\\(["']${endpoint.endpoint.replace(/\*/g, '.*')}["'][^}]*?(?=app\\.|$)`, 's');
    const match = content.match(endpointRegex);
    
    if (!match) return false;
    
    const handlerCode = match[0];
    return /recordModuleHistory|storage\.recordModuleHistory/.test(handlerCode);
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 MODULE HISTORY INTEGRATION REPORT');
    console.log('='.repeat(80));

    console.log(`\n📈 Summary:`);
    console.log(`  Total Module Endpoints: ${this.moduleEndpoints.length}`);
    console.log(`  Endpoints Found: ${this.moduleEndpoints.filter(e => e.found).length}`);
    console.log(`  History Integrations: ${this.historyIntegrations.length}`);
    console.log(`  Missing Integrations: ${this.missingIntegrations.length}`);

    if (this.historyIntegrations.length > 0) {
      console.log(`\n✅ Modules with History Integration:`);
      this.historyIntegrations.forEach(endpoint => {
        console.log(`  - ${endpoint.name} (${endpoint.endpoint})`);
      });
    }

    if (this.missingIntegrations.length > 0) {
      console.log(`\n❌ Modules Missing History Integration:`);
      this.missingIntegrations.forEach(endpoint => {
        console.log(`  - ${endpoint.name} (${endpoint.endpoint})`);
      });

      console.log(`\n🔧 Required Integration Code:`);
      console.log(`Add this to each missing endpoint handler:`);
      console.log(`
await storage.recordModuleHistory({
  userId: getUserId(req),
  moduleName: 'appropriate_module_name',
  runType: 'test' | 'token_run',
  finalScore: calculatedScore, // 0-100
  questionsTotal: totalQuestions,
  questionsCorrect: correctAnswers,
  timeSpentSeconds: sessionDuration,
  gradeLevel: userGrade,
  tokensEarned: earnedTokens
});`);
    }

    const completionRate = this.moduleEndpoints.filter(e => e.found).length > 0 
      ? (this.historyIntegrations.length / this.moduleEndpoints.filter(e => e.found).length) * 100 
      : 0;

    console.log(`\n🎯 Integration Status: ${completionRate.toFixed(1)}% Complete`);
    
    if (completionRate === 100) {
      console.log(`🎉 All module endpoints have history integration!`);
    } else {
      console.log(`⚠️  ${this.missingIntegrations.length} modules need history integration`);
    }

    console.log('='.repeat(80));
  }
}

// Run the analyzer
const analyzer = new ModuleEndpointAnalyzer();
analyzer.analyze();