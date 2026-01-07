# DHBW Learn - JavaScript Learning Companion

## Overview
A mobile learning companion application for DHBW Lörrach students to practice and reinforce JavaScript programming concepts. The app uses AI-powered content generation via OpenAI (Replit AI Integrations) to create interactive quizzes and learning materials.

## Tech Stack
- **Frontend**: React Native with Expo SDK 54
- **Backend**: Express.js with TypeScript
- **AI**: OpenAI via Replit AI Integrations (no API key required, billed to credits)
- **Storage**: AsyncStorage for local data persistence
- **Navigation**: React Navigation 7

## Project Structure
```
client/
├── components/       # Reusable UI components
├── constants/        # Theme colors, spacing, typography
├── hooks/            # Custom React hooks
├── lib/              # Storage utilities, topics data, API client
├── navigation/       # Tab and stack navigators
└── screens/          # App screens (Learn, Progress, Quiz, Settings)

server/
├── replit_integrations/  # OpenAI integration modules
├── routes.ts             # API endpoints for quiz generation
└── index.ts              # Express server setup
```

## Key Features
- **Learn Tab**: Browse JavaScript topics by category (Fundamentals, Control Flow, Functions, Objects & Arrays, Async, Advanced)
- **Practice Button**: Central floating action button for mixed-topic quizzes
- **Progress Tab**: Track streaks, achievements, and quiz performance
- **AI-Generated Quizzes**: 10 questions per session with code snippets and explanations
- **Local Progress Storage**: Tracks topics mastered, questions answered, and streaks

## Design System
- **Primary Color**: #E2001A (DHBW Red)
- **Secondary Color**: #4A90E2 (Learning Blue)
- **Success Color**: #34C759 (Green)
- **Accent Color**: #FFB800 (Yellow for streaks/achievements)
- **Card-based layout with iOS liquid glass design inspiration**

## API Endpoints
- `POST /api/quiz/generate` - Generate quiz for specific topic
- `POST /api/quiz/generate-mixed` - Generate mixed-topic quiz
- `GET /api/health` - Health check

## Running the App
- Development: `npm run all:dev` (starts Expo + Express)
- The Expo server runs on port 8081
- The Express API runs on port 5000

## Recent Changes
- January 7, 2026: Dark mode and instant settings
  - Added dark mode with auto/light/dark options (auto follows system preference)
  - Settings changes (language, theme) now apply immediately without saving
  - ThemeProvider context manages app-wide theme state
  - Header styling adapts to dark mode properly

- December 19, 2025: Initial MVP with core learning features
  - Created 3-tab navigation (Learn, Practice, Progress)
  - Implemented AI quiz generation with OpenAI
  - Added progress tracking with AsyncStorage
  - Designed DHBW-branded UI with custom theme

## User Preferences
- German and English language support (preference stored locally, changes apply instantly)
- Theme mode: Auto (system), Light, Dark (changes apply instantly)
- Difficulty levels: Beginner, Intermediate, Advanced
- 4 avatar presets for profile customization
