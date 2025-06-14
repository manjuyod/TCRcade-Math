# Math Facts End-to-End Testing Agent

## Test Objective
Validate the completely refactored Math Facts module with the new algorithmic generation system, numeric grade standardization (K=0), and assessment flow.

## Test Cases

### 1. Grade System Standardization
- Verify K grade converts to 0 internally
- Verify grade 1-6 maps correctly to numeric values
- Verify grade conversion functions work bidirectionally

### 2. Algorithmic Question Generation
- Test addition questions for each grade level (0-6)
- Test subtraction questions for each grade level (0-6)
- Test multiplication questions for each grade level (0-6)
- Test division questions for each grade level (0-6)
- Verify question difficulty matches grade level expectations

### 3. Assessment Flow
- Start assessment at user's grade level
- Verify grade progression logic (up on pass, down on fail)
- Test assessment completion at correct final grade
- Verify token rewards are granted (15 tokens for assessment)

### 4. Practice Session Flow
- Generate practice questions at assessed grade level
- Track session progress and grade adjustments
- Verify token rewards for practice sessions
- Test grade level changes based on performance

### 5. Progress Tracking
- Verify user progress data updates correctly
- Test module history recording
- Validate hiddenGradeAsset structure updates

## Expected Behavior
1. Assessment starts at user's grade level or grade 6 for older students
2. System tests 2 questions per grade level
3. Passing a grade level completes assessment at that level
4. Failing drops to next lower grade immediately
5. Assessment completion grants 15 tokens
6. Practice sessions adapt difficulty based on performance
7. All data persists correctly in user progress tracking

## Success Criteria
- No OpenAI API calls (pure algorithmic generation)
- Consistent grade level progression
- Proper token rewards
- Accurate progress tracking
- Smooth user experience without errors