# tcRCADE - Math Learning Platform

## Overview

tcRCADE is a comprehensive gamified math learning platform designed for K-6 students. It provides adaptive learning experiences through interactive mathematical modules, AI-powered content generation, and intelligent analytics. The platform focuses on text-based computational problems to minimize visual distractions while maximizing learning engagement through token rewards, achievement systems, and personalized difficulty adaptation.

## System Architecture

### Backend Architecture
- **Framework**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom session-based auth with password reset capabilities
- **API Structure**: RESTful APIs with modular route organization

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: React Context API with custom hooks
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite with HMR support

### Database Architecture
- **ORM**: Drizzle with PostgreSQL dialect
- **User Progress**: Centralized JSON storage in `users.hiddenGradeAsset` field
- **Session Tracking**: `module_history` table for comprehensive activity logging
- **Question Storage**: Module-specific tables (assessments, questions_measurementAndData, etc.)

## Key Components

### Core Modules
1. **Math Rush** - Four separate operator-specific modules (addition, subtraction, multiplication, division)
2. **Math Facts** - Algorithmic question generation with grade-based difficulty scaling
3. **Fractions Puzzle** - Interactive fraction learning with visual representations
4. **Measurement Mastery** - Lesson-based progression through measurement concepts
5. **Decimal Defender** - Decimal arithmetic with skill-based difficulty
6. **Algebra Module** - Grade-level algebra concepts with lesson progression
7. **Ratios & Proportions** - Proportional reasoning development

### AI Integration
- **Question Generation**: OpenAI integration for diverse problem creation
- **Adaptive Difficulty**: Dynamic content adjustment based on performance
- **Learning Analytics**: AI-powered insights into learning patterns
- **Recommendation System**: Personalized content suggestions

### Authentication System
- **User Management**: Registration with grade-level selection
- **CRM-Sourced Email**: Registration relies on the student's CRM record for email, so no manual entry is needed on the auth page
- **Password Security**: Bcrypt hashing with secure reset tokens
- **Session Management**: Express-session with proper cleanup
- **Email Integration**: SendGrid for password reset functionality

### Progress Tracking
- **Unified JSON Structure**: Centralized progress data in `hiddenGradeAsset`
- **Module History**: Comprehensive session tracking in dedicated table
- **Real-time Updates**: Token and progress synchronization
- **Analytics Dashboard**: Performance insights and trend analysis

## Data Flow

### User Progress Management
1. **Initial Setup**: Users register and select grade level
2. **Module Selection**: Choose from available learning modules
3. **Assessment Flow**: Take skill assessments to determine starting level
4. **Practice Sessions**: Complete adaptive practice rounds
5. **Progress Tracking**: Real-time updates to JSON progress structure
6. **Analytics Generation**: AI-powered insights based on performance data

### Question Generation Pipeline
1. **Difficulty Assessment**: Analyze user's current skill level
2. **Content Selection**: Choose appropriate question types and ranges
3. **Dynamic Generation**: Create questions using algorithmic or AI methods
4. **Validation**: Ensure answer accuracy and appropriate difficulty
5. **Delivery**: Present questions with interactive UI components

### Token and Reward System
1. **Performance Tracking**: Monitor correct answers and completion rates
2. **Token Calculation**: Award tokens based on accuracy and speed
3. **Bonus Logic**: Additional rewards for streaks and perfect sessions
4. **Persistence**: Real-time database updates for token balances
5. **Leaderboard Integration**: Rank users based on token accumulation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Database connection management
- **@anthropic-ai/sdk**: AI content generation (secondary to OpenAI)
- **@sendgrid/mail**: Email service for password resets
- **@tanstack/react-query**: Data fetching and caching
- **@radix-ui/react-***: UI component library

### Development Tools
- **drizzle-kit**: Database schema management and migrations
- **vite**: Build tool with fast HMR
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling

### AI Services
- **OpenAI**: Primary AI service for question generation
- **Anthropic**: Secondary AI service for analytics and recommendations

## Deployment Strategy

### Development Environment
- **Local Development**: `npm run dev` with hot reload
- **Database Setup**: Drizzle migrations with `npm run db:push`
- **Environment Variables**: DATABASE_URL, OPENAI_API_KEY, SENDGRID_API_KEY

### Production Build
- **Build Process**: `npm run build` creates optimized bundle
- **Server Bundle**: ESBuild creates single server executable
- **Static Assets**: Vite builds client-side assets
- **Database Migrations**: Automated via Drizzle migrations

### Architecture Decisions

#### JSON-Based Progress Storage
**Problem**: Multiple database tables for user progress created complexity and sync issues
**Solution**: Centralized JSON structure in `users.hiddenGradeAsset` field
**Benefits**: Atomic updates, flexible schema, reduced query complexity
**Trade-offs**: Less normalized data, requires careful JSON manipulation

#### Module-Specific Question Tables
**Problem**: Generic question storage limited module-specific features
**Solution**: Dedicated tables per module type (assessments, questions_measurementAndData)
**Benefits**: Optimized queries, module-specific fields, better performance
**Trade-offs**: More tables to maintain, potential data duplication

#### Wouter vs React Router
**Problem**: React Router DOM was causing import conflicts and build issues
**Solution**: Migrated to Wouter for lightweight routing
**Benefits**: Smaller bundle size, simpler API, fewer dependencies
**Trade-offs**: Less ecosystem support, different API patterns

#### AI Integration Strategy
**Problem**: Balancing AI-generated content with performance and cost
**Solution**: Hybrid approach using algorithmic generation for facts, AI for complex problems
**Benefits**: Cost-effective, consistent quality, faster response times
**Trade-offs**: Less dynamic content for basic operations

## Changelog
- July 08, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.
