
# Module History Tracking Test Agent

## Objective
Test and verify that ALL modules correctly write to the `module_history` table when completed, ensuring comprehensive historical tracking across the entire application.

## Project Context
**Stack**: React TS (client) + Node Express TS (server) + Drizzle ORM + PostgreSQL  
**Database Table**: `module_history` - tracks every module completion session  
**Goal**: Ensure 100% coverage of module completion tracking

## Modules to Test

### 1. Math Rush (`math_rush_*`)
- **Endpoint**: `/api/rush/complete`
- **Expected Data**: 
  - `moduleName`: `math_rush_${mode}` (e.g., `math_rush_addition`)
  - `runType`: `'token_run'` (always token-based)
  - `finalScore`: 0-100 based on correct/total percentage
  - `tokensEarned`: Calculated tokens from performance

### 2. Math Facts (`math-facts-*`)
- **Routes**: `/math-facts/addition`, `/math-facts/subtraction`, etc.
- **Expected Data**:
  - `moduleName`: `math-facts-${operation}` 
  - `runType`: Based on session type
  - Track individual question completions

### 3. Fractions Puzzle (`fractions_puzzle`)
- **Endpoint**: `/api/fractions/complete`
- **Expected Data**:
  - `moduleName`: `fractions_puzzle`
  - `runType`: `'token_run'`
  - `finalScore`: Based on correct answers

### 4. Decimal Defender (`decimal_defender`)
- **Endpoint**: `/api/decimal-defender/complete`
- **Expected Data**:
  - `moduleName`: `decimal_defender`
  - `runType`: `'token_run'`
  - Include skill type in module name

### 5. Ratios & Proportions (`ratios_proportions`)
- **Endpoint**: `/api/ratios/complete`
- **Expected Data**:
  - `moduleName`: `ratios_proportions`
  - `runType`: Based on session type

### 6. Measurement Mastery (`measurement_mastery`)
- **Endpoint**: `/api/measurement/submit-session`
- **Expected Data**:
  - `moduleName`: `measurement_mastery`
  - `runType`: `'practice'` or `'token_run'`

### 7. Pre-Algebra Basics (`algebra`)
- **Endpoint**: `/api/algebra/submit-session`
- **Expected Data**:
  - `moduleName`: `algebra`
  - `runType`: `'practice'` or `'token_run'`

## Testing Protocol

### Phase 1: Verification Testing
```javascript
// Test each module completion endpoint
async function testModuleHistoryTracking() {
  const testResults = [];
  
  // Test Math Rush
  const rushResult = await testModule('math_rush', {
    endpoint: '/api/rush/complete',
    payload: {
      correct: 8,
      total: 10,
      durationSec: 60,
      mode: 'addition'
    }
  });
  testResults.push(rushResult);
  
  // Test Fractions Puzzle
  const fractionsResult = await testModule('fractions_puzzle', {
    endpoint: '/api/fractions/complete',
    payload: {
      correct: 4,
      total: 5,
      skill: 'define'
    }
  });
  testResults.push(fractionsResult);
  
  // Test Measurement Mastery
  const measurementResult = await testModule('measurement_mastery', {
    endpoint: '/api/measurement/submit-session',
    payload: {
      runType: 'token_run',
      questions: [
        { isCorrect: true, timeSpent: 10 },
        { isCorrect: false, timeSpent: 15 }
      ],
      totalTime: 120,
      score: 50
    }
  });
  testResults.push(measurementResult);
  
  return testResults;
}

async function testModule(moduleName, testConfig) {
  console.log(`Testing ${moduleName} module...`);
  
  // Record initial history count
  const initialCount = await getModuleHistoryCount(moduleName);
  
  // Execute module completion
  const response = await fetch(testConfig.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testConfig.payload)
  });
  
  if (!response.ok) {
    return {
      module: moduleName,
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`
    };
  }
  
  // Verify history was recorded
  const finalCount = await getModuleHistoryCount(moduleName);
  const wasRecorded = finalCount > initialCount;
  
  // Get the latest entry for verification
  const latestEntry = await getLatestModuleHistory(moduleName);
  
  return {
    module: moduleName,
    success: wasRecorded,
    initialCount,
    finalCount,
    latestEntry,
    response: await response.json()
  };
}

async function getModuleHistoryCount(moduleName) {
  const response = await fetch(`/api/module-history/count/${moduleName}`);
  const data = await response.json();
  return data.count;
}

async function getLatestModuleHistory(moduleName) {
  const response = await fetch(`/api/module-history/latest/${moduleName}`);
  return await response.json();
}
```

### Phase 2: Data Validation Testing
```javascript
// Validate recorded data structure
async function validateModuleHistoryData() {
  const requiredFields = [
    'id', 'user_id', 'module_name', 'run_type', 
    'final_score', 'questions_total', 'questions_correct',
    'time_spent_seconds', 'completed_at', 'tokens_earned'
  ];
  
  const validationResults = [];
  
  // Test each module's latest entry
  for (const moduleName of ['math_rush_addition', 'fractions_puzzle', 'measurement_mastery', 'algebra']) {
    const entry = await getLatestModuleHistory(moduleName);
    
    const validation = {
      module: moduleName,
      hasAllFields: requiredFields.every(field => entry.hasOwnProperty(field)),
      validScore: entry.final_score >= 0 && entry.final_score <= 100,
      validRunType: ['test', 'token_run'].includes(entry.run_type),
      validTimestamp: new Date(entry.completed_at).getTime() > 0,
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
  }
  
  return validationResults;
}
```

### Phase 3: Integration Testing
```javascript
// Test complete user journey
async function testUserJourneyHistoryTracking() {
  console.log("Testing complete user journey...");
  
  const journey = [
    { module: 'math_rush', action: 'complete_rush' },
    { module: 'fractions', action: 'complete_puzzle' },
    { module: 'measurement', action: 'complete_practice' },
    { module: 'algebra', action: 'complete_token_run' }
  ];
  
  const journeyResults = [];
  
  for (const step of journey) {
    const startTime = Date.now();
    const result = await executeModuleAction(step);
    const endTime = Date.now();
    
    journeyResults.push({
      ...result,
      duration: endTime - startTime,
      timestamp: new Date().toISOString()
    });
    
    // Brief pause between modules
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return journeyResults;
}
```

## Implementation Requirements

### 1. Add Module History API Endpoints
```typescript
// Add to routes.ts
app.get('/api/module-history/count/:moduleName', async (req, res) => {
  const { moduleName } = req.params;
  const count = await storage.getModuleHistoryCount(moduleName);
  res.json({ count });
});

app.get('/api/module-history/latest/:moduleName', async (req, res) => {
  const { moduleName } = req.params;
  const latest = await storage.getLatestModuleHistory(moduleName);
  res.json(latest);
});
```

### 2. Verify All Completion Endpoints
Ensure each module completion endpoint calls:
```typescript
await storage.recordModuleHistory({
  userId: currentUserId,
  moduleName: 'appropriate_module_name',
  runType: 'test' | 'token_run',
  finalScore: calculatedScore,
  questionsTotal: totalQuestions,
  questionsCorrect: correctAnswers,
  timeSpentSeconds: sessionDuration,
  gradeLevel: userGrade,
  tokensEarned: earnedTokens
});
```

## Success Criteria

### ✅ All Modules Recording
- [ ] Math Rush records to `module_history`
- [ ] Math Facts records to `module_history`  
- [ ] Fractions Puzzle records to `module_history`
- [ ] Decimal Defender records to `module_history`
- [ ] Ratios & Proportions records to `module_history`
- [ ] Measurement Mastery records to `module_history`
- [ ] Pre-Algebra Basics records to `module_history`

### ✅ Data Integrity
- [ ] All required fields present
- [ ] Score values within 0-100 range
- [ ] Valid run types (`test` or `token_run`)
- [ ] Accurate timestamps
- [ ] Correct user association

### ✅ Performance
- [ ] Module completion time < 2 seconds
- [ ] History recording doesn't block user flow
- [ ] Database queries optimized

## Testing Commands

```bash
# Run the comprehensive test
node module-history-test.js

# Test individual modules
node test-module-tracking.js --module=math_rush
node test-module-tracking.js --module=fractions_puzzle

# Validate data integrity
node validate-module-history.js
```

## Expected Output

```json
{
  "testSummary": {
    "totalModules": 7,
    "modulesRecording": 7,
    "successRate": "100%",
    "failedModules": []
  },
  "moduleResults": [
    {
      "module": "math_rush_addition",
      "success": true,
      "historyRecorded": true,
      "dataValid": true,
      "completionTime": "1.2s"
    }
  ],
  "recommendations": [
    "All modules successfully recording to module_history table",
    "Historical tracking system operational"
  ]
}
```

This agent will systematically test every module to ensure complete historical tracking coverage.
