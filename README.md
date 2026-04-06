# tcRCADE - Math Learning Platform

A gamified math learning platform for K-6 students that provides an adaptive, engaging mathematical education experience through interactive technologies and intelligent content generation.

## Features

- **Adaptive Learning**: Dynamically adjusts difficulty based on student performance.
- **Engaging Gamification**: Token rewards, leaderboards, and achievement badges.
- **AI-Powered Content**: Uses OpenAI integration to generate diverse, age-appropriate math problems.
- **Personalized Analytics**: AI-driven insights into learning patterns and areas for improvement.
- **Text-Focused Questions**: Focused on pure computational problems without distracting visual elements.
- **Enhanced Security**: Complete password reset functionality with email-based verification.
- **Smart Student Selector**: Registration page now includes a searchable type-ahead dropdown to quickly find students from large lists.

## Authentication System

### Login and Registration
- Full authentication with secure password hashing
- Grade-level selection during registration
- Email addresses are automatically sourced from the CRM, so no entry is required on the auth page

### Password Reset Functionality
- Request password reset with username or email
- Secure token-based password reset system
- Email verification (when configured)
- Token expiration for enhanced security

### Multi-Account Login Selection
- Login identifier now accepts username or email
- If an email has multiple matching accounts with the provided password, a secure selection step is shown to pick the right account
- Selection list only shows `username` and `display_name`; no emails or IDs are exposed
- Pending selections expire after a few minutes and are tied to the active session
- Quick test pass:
  1. Username success/failure with wrong password (expect normal error)
  2. Email with one matching account + correct password (logs in directly)
  3. Email with multiple accounts and shared password (prompts selection, then logs in chosen account)

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
