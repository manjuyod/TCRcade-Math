# tcRCADE - Math Learning Platform

A gamified math learning platform for K-6 students that provides an adaptive, engaging mathematical education experience through interactive technologies and intelligent content generation.

## Features

- **Adaptive Learning**: Dynamically adjusts difficulty based on student performance.
- **Engaging Gamification**: Token rewards, leaderboards, and achievement badges.
- **AI-Powered Content**: Uses OpenAI integration to generate diverse, age-appropriate math problems.
- **Personalized Analytics**: AI-driven insights into learning patterns and areas for improvement.
- **Text-Focused Questions**: Focused on pure computational problems without distracting visual elements.
- **Enhanced Security**: Complete password reset functionality with email-based verification.

## Authentication System

### Login and Registration
- Full authentication with secure password hashing
- Grade-level selection during registration
- Optional email for account recovery

### Password Reset Functionality
- Request password reset with username or email
- Secure token-based password reset system
- Email verification (when configured)
- Token expiration for enhanced security

## Components and Modules

- **Math Question Engine**: Adaptive difficulty with intelligent randomization
- **Leaderboard**: Track student progress and encourage friendly competition
- **AI Tutor**: Personalized math assistance and explanations
- **Analytics Dashboard**: Track progress and identify improvement areas
- **Admin Panel**: Manage users and view system analytics

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI for content generation
- **Styling**: Tailwind CSS
- **Authentication**: Custom auth with password reset capabilities

## Development

The platform is built with a focus on performance, security, and educational engagement, delivering a text-based computational approach to math learning that prioritizes content over visual distractions while maintaining engaging gamification elements.