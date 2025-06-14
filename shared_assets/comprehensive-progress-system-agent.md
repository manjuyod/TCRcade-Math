
# Comprehensive User Progress System - Agent Implementation & Testing Prompt

## Project Context
**Stack**: React TS (client) + Node Express TS (server) + Drizzle ORM + PostgreSQL  
**Module**: Enhanced User Progress System with Global Analytics  
**Goal**: Implement and test a comprehensive progress tracking system that leverages the `hiddenGradeAsset` JSON structure for detailed analytics.

## Implementation Requirements

### 1. Backend API Enhancement (`/api/progress`)
- **Data Source**: Utilize `user.hiddenGradeAsset.modules` and `user.hiddenGradeAsset.global_stats`
- **Progress Calculation**: 
  - Total tokens earned across all modules
  - Question accuracy (correct/total questions)
  - Percentile ranking among all users (async calculation)
  - Module-specific completion percentages
- **Performance**: Async percentile calculation to prevent blocking
- **Response Format**: Include both module progress and global statistics

### 2. Frontend Progress Display (`profile-page.tsx`)
- **Global Stats Card**: Overall performance with percentile rankings
- **Module Cards**: Individual module progress with completion tracking
- **Real-time Loading**: Fetch on every profile page visit
- **Responsive Design**: Grid layout for stats and progress bars

### 3. Category Management (`questions.ts`)
- **Module Labels**: Support for all current modules (algebra, fractions_puzzle, math_rush, etc.)
- **Consistent Naming**: User-friendly labels for all categories

## End-to-End Testing Protocol

### Phase 1: Backend API Testing
```javascript
// Test 1: API Response Structure
async function testProgressAPIStructure() {
  const response = await fetch('/api/progress', {
    headers: { 'Authorization': 'Bearer [valid-token]' }
  });
  const data = await response.json();
  
  // Verify response structure
  assert(data.progress instanceof Array, "Progress should be array");
  assert(data.globalStats !== undefined, "Global stats required");
  assert(data.globalStats.tokenPercentile !== undefined, "Token percentile required");
  assert(data.globalStats.accuracyPercentile !== undefined, "Accuracy percentile required");
  
  console.log("✅ API structure test passed");
}

// Test 2: Percentile Calculation Accuracy
async function testPercentileCalculation() {
  // Create test users with known token values
  const testUsers = [
    { tokens: 100 }, { tokens: 200 }, { tokens: 300 }, 
    { tokens: 400 }, { tokens: 500 }
  ];
  
  // User with 350 tokens should be in ~70th percentile
  const response = await fetch('/api/progress');
  const data = await response.json();
  
  assert(data.globalStats.tokenPercentile >= 60 && data.globalStats.tokenPercentile <= 80, 
    "Percentile calculation appears accurate");
  
  console.log("✅ Percentile calculation test passed");
}

// Test 3: Module Progress Accuracy
async function testModuleProgress() {
  const response = await fetch('/api/progress');
  const data = await response.json();
  
  // Find algebra module
  const algebraModule = data.progress.find(p => p.category === 'algebra');
  if (algebraModule) {
    assert(algebraModule.moduleData !== undefined, "Module data required");
    assert(algebraModule.completion >= 0 && algebraModule.completion <= 100, 
      "Completion percentage must be 0-100");
  }
  
  console.log("✅ Module progress test passed");
}
```

### Phase 2: Frontend Integration Testing
```javascript
// Test 4: Profile Page Load Performance
async function testProfilePageLoad() {
  const startTime = performance.now();
  
  // Navigate to profile page
  window.location.href = '/profile';
  
  // Wait for progress data to load
  await waitForElement('[data-testid="progress-container"]');
  
  const endTime = performance.now();
  const loadTime = endTime - startTime;
  
  assert(loadTime < 3000, `Page load too slow: ${loadTime}ms`);
  console.log(`✅ Profile page loaded in ${loadTime}ms`);
}

// Test 5: Progress Card Display
async function testProgressCardDisplay() {
  // Verify global stats card
  const globalStatsCard = document.querySelector('[data-testid="global-stats"]');
  assert(globalStatsCard !== null, "Global stats card should be visible");
  
  // Verify percentile display
  const percentileElements = document.querySelectorAll('.percentile-display');
  assert(percentileElements.length >= 2, "Should show token and accuracy percentiles");
  
  // Verify module cards
  const moduleCards = document.querySelectorAll('[data-testid="module-card"]');
  assert(moduleCards.length > 0, "Should display module progress cards");
  
  console.log("✅ Progress card display test passed");
}

// Test 6: Real-time Data Updates
async function testRealTimeUpdates() {
  const initialTokens = document.querySelector('[data-testid="total-tokens"]').textContent;
  
  // Simulate earning tokens (answer a question correctly)
  await fetch('/api/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: 1,
      answer: 'correct',
      isCorrect: true,
      tokensEarned: 5
    })
  });
  
  // Navigate back to profile page
  window.location.href = '/profile';
  await waitForElement('[data-testid="progress-container"]');
  
  const updatedTokens = document.querySelector('[data-testid="total-tokens"]').textContent;
  assert(parseInt(updatedTokens) > parseInt(initialTokens), "Tokens should update after earning");
  
  console.log("✅ Real-time updates test passed");
}
```

### Phase 3: Performance & Edge Case Testing
```javascript
// Test 7: Large Dataset Performance
async function testLargeDatasetPerformance() {
  // Simulate user with extensive module progress
  const startTime = performance.now();
  
  const response = await fetch('/api/progress');
  const data = await response.json();
  
  const endTime = performance.now();
  const responseTime = endTime - startTime;
  
  assert(responseTime < 2000, `API response too slow: ${responseTime}ms`);
  assert(data.progress.length > 0, "Should return progress data");
  
  console.log(`✅ Large dataset test passed: ${responseTime}ms`);
}

// Test 8: New User Edge Case
async function testNewUserProgress() {
  // Test with user who has no progress data
  const response = await fetch('/api/progress');
  const data = await response.json();
  
  assert(data.globalStats.totalTokens >= 0, "New user should have 0+ tokens");
  assert(data.globalStats.accuracy >= 0, "Accuracy should handle division by zero");
  assert(data.progress.length >= 1, "Should show at least global progress");
  
  console.log("✅ New user edge case test passed");
}

// Test 9: Percentile Edge Cases
async function testPercentileEdgeCases() {
  const response = await fetch('/api/progress');
  const data = await response.json();
  
  assert(data.globalStats.tokenPercentile >= 0 && data.globalStats.tokenPercentile <= 100,
    "Token percentile must be 0-100");
  assert(data.globalStats.accuracyPercentile >= 0 && data.globalStats.accuracyPercentile <= 100,
    "Accuracy percentile must be 0-100");
  
  console.log("✅ Percentile edge cases test passed");
}
```

### Phase 4: Integration & User Experience Testing
```javascript
// Test 10: Cross-Module Consistency
async function testCrossModuleConsistency() {
  const response = await fetch('/api/progress');
  const data = await response.json();
  
  // Sum module tokens should not exceed global tokens
  const moduleTokenSum = data.progress
    .filter(p => p.category !== 'overall')
    .reduce((sum, p) => sum + p.score, 0);
  
  assert(moduleTokenSum <= data.globalStats.totalTokens,
    "Module token sum should not exceed global tokens");
  
  console.log("✅ Cross-module consistency test passed");
}

// Test 11: Category Label Accuracy
async function testCategoryLabels() {
  const response = await fetch('/api/progress');
  const data = await response.json();
  
  // Verify all categories have proper labels
  data.progress.forEach(progress => {
    const label = getCategoryLabel(progress.category);
    assert(label !== progress.category || progress.category === 'overall',
      `Category ${progress.category} should have a user-friendly label`);
  });
  
  console.log("✅ Category labels test passed");
}
```

## Execution Sequence

### Setup Phase
1. Ensure test database with multiple user profiles
2. Seed users with varying progress levels in `hiddenGradeAsset`
3. Verify authentication system is working

### Testing Phase
1. **Backend Tests** (Tests 1-3): API functionality and data accuracy
2. **Frontend Tests** (Tests 4-6): UI integration and real-time updates  
3. **Performance Tests** (Tests 7-9): Scalability and edge cases
4. **Integration Tests** (Tests 10-11): Cross-system consistency

### Validation Criteria
- ✅ All 11 tests pass without errors
- ✅ Page load time < 3 seconds
- ✅ API response time < 2 seconds  
- ✅ Percentile calculations are mathematically accurate
- ✅ Progress data updates in real-time
- ✅ UI displays correctly on mobile and desktop
- ✅ Error handling for edge cases (new users, no data)

## Success Metrics
1. **Performance**: Sub-3s profile page loads
2. **Accuracy**: Percentile calculations within 5% margin
3. **Completeness**: All modules display progress data
4. **Usability**: Intuitive progress visualization
5. **Reliability**: Graceful handling of missing data

## Implementation Notes
- Use async operations for percentile calculations
- Implement proper error boundaries in React components
- Add loading states for better UX
- Cache percentile calculations for improved performance
- Ensure backward compatibility with existing user data

---

**Execute this comprehensive test suite to validate the enhanced user progress system. All tests must pass before considering the implementation complete.**
