# Monolith Recommendation System

A modular recommendation engine for personalized quiz experiences that analyzes user performance patterns and generates adaptive question recommendations.

## Overview

This system implements a sophisticated recommendation engine that:
- Analyzes user learning patterns and performance history
- Generates personalized quiz recommendations based on concept mastery
- Provides adaptive difficulty adjustment and spaced repetition
- Integrates with existing analytics infrastructure
- Delivers real-time feedback and performance tracking

## Architecture

```
monolith/
├── server/
│   ├── recommendation-engine.ts    # Core recommendation algorithms
│   ├── analytics-integration.ts    # Integration with existing analytics
│   └── routes.ts                  # API endpoints
├── client/
│   └── components/
│       └── RecommendationQuiz.tsx # React quiz interface
├── shared/
│   └── types.ts                   # Shared TypeScript types
└── README.md                      # This documentation
```

## API Endpoints

### GET /api/monolith/recommendations
Generates personalized quiz recommendations for authenticated users.

**Query Parameters:**
- `maxQuestions` (optional): Maximum number of questions (default: 10)
- `sessionType` (optional): Session type ('practice', 'assessment', 'review')
- `targetConcepts` (optional): Comma-separated list of target concepts
- `difficultyRange` (optional): Difficulty range as 'min,max'

**Response:**
```json
{
  "recommendations": [
    {
      "questionId": 123,
      "score": 0.85,
      "reasoning": "Reinforcement needed for fraction addition",
      "category": "fractions",
      "difficulty": 3,
      "concepts": ["fraction-addition", "common-denominators"],
      "recommendationType": "reinforce",
      "priority": "high"
    }
  ],
  "sessionMetadata": {
    "sessionId": "uuid-string",
    "userId": 14,
    "startTime": "2025-06-15T00:00:00Z",
    "estimatedDuration": 900,
    "targetConcepts": ["fractions", "decimals"],
    "difficultyRange": [2, 4]
  },
  "adaptiveSettings": {
    "initialDifficulty": 3,
    "difficultyAdjustmentRate": 0.2,
    "masteryThreshold": 0.8,
    "spacedRepetitionInterval": 86400
  }
}
```

### POST /api/monolith/feedback
Submits performance feedback for recommendation system improvement.

**Request Body:**
```json
{
  "sessionId": "uuid-string",
  "questionId": 123,
  "correct": true,
  "timeSpent": 45.5,
  "difficultyRating": 3,
  "engagementRating": 5
}
```

### GET /api/monolith/analytics
Retrieves recommendation system analytics and performance insights.

**Response:**
```json
{
  "totalRecommendations": 1250,
  "averageAccuracy": 0.78,
  "recommendationEffectiveness": 0.85,
  "topPerformingCategories": ["fractions", "decimals"],
  "improvementTrends": {
    "weekly": "improving",
    "monthly": "stable"
  }
}
```

### GET /api/monolith/status
Health check endpoint for system monitoring.

## Recommendation Algorithm

The system uses a multi-factor scoring algorithm that considers:

1. **Concept Mastery Analysis**
   - Historical performance on related concepts
   - Weighted scoring based on recent performance
   - Identification of knowledge gaps

2. **Adaptive Difficulty**
   - Dynamic difficulty adjustment based on success rate
   - Spaced repetition for concept reinforcement
   - Progressive challenge increase

3. **Learning Pattern Recognition**
   - Time-based performance analysis
   - Engagement pattern detection
   - Optimal question sequencing

4. **Personalization Factors**
   - Individual learning velocity
   - Preferred question types
   - Historical success patterns

## Integration Points

### Analytics Integration
- Connects to existing AI analytics system
- Utilizes user progress tracking data
- Leverages concept mastery scoring
- Integrates with module history tracking

### Question Database
- Queries existing question pools
- Filters by difficulty and concept
- Maintains question metadata
- Supports dynamic question generation

### User Progress System
- Reads from user progress tables
- Updates performance metrics
- Tracks concept mastery evolution
- Maintains learning analytics

## Usage

### Frontend Integration
```typescript
import RecommendationQuiz from '../../../monolith/client/components/RecommendationQuiz';

function MyPage() {
  return <RecommendationQuiz />;
}
```

### API Usage
```typescript
// Get recommendations
const recommendations = await fetch('/api/monolith/recommendations?maxQuestions=10');

// Submit feedback
await fetch('/api/monolith/feedback', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: 'session-id',
    questionId: 123,
    correct: true,
    timeSpent: 45.5
  })
});
```

## Testing

Access the recommendation quiz interface at:
```
http://localhost:5000/recquiz
```

The system will:
1. Analyze your learning history
2. Generate personalized recommendations
3. Present adaptive quiz questions
4. Track performance and adjust difficulty
5. Provide detailed results and insights

## Performance Optimization

The system includes several optimization strategies:

- **Caching**: Question recommendations are cached for 5 minutes
- **Batch Processing**: Multiple recommendations generated in single pass
- **Lazy Loading**: Questions loaded on-demand
- **Memory Management**: Automatic cleanup of old sessions

## Security

- All endpoints require authentication
- User data is isolated per session
- No sensitive information in client-side storage
- Rate limiting on recommendation generation

## Monitoring

The system provides comprehensive monitoring:
- Performance metrics via `/api/monolith/analytics`
- Health checks via `/api/monolith/status`
- Error logging and tracking
- Usage analytics and insights

## Future Enhancements

Planned improvements include:
- Machine learning model integration
- Advanced spaced repetition algorithms
- Real-time collaborative filtering
- Enhanced personalization features
- Performance optimization for scale

## Troubleshooting

Common issues and solutions:

**No recommendations generated:**
- Check user authentication
- Verify sufficient learning history
- Ensure questions exist in database

**Slow recommendation generation:**
- Check database query performance
- Verify analytics data availability
- Monitor system resource usage

**Frontend errors:**
- Verify API endpoint accessibility
- Check authentication status
- Review browser console for errors