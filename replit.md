# EduAnalytics Platform

## Overview
A production-grade Student Performance Analytics & Gamified Learning Dashboard built with React + Vite (frontend), Express.js (backend), and PostgreSQL (database).

## Architecture
- **Frontend**: React 18 + Vite + TailwindCSS + Recharts (port 5000)
- **Backend**: Express.js + TypeScript REST API (port 3001)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT-based with bcrypt password hashing

## Modules
1. **Authentication** — JWT login/register for Admin, Teacher, Student, Parent roles
2. **Student Management** — Full CRUD with XP levels, streaks, class assignments
3. **Score Engine** — Multi-subject assessment recording with auto XP awards
4. **Ranking Engine** — Dynamic leaderboard with overall and class-level rankings
5. **Gamification** — XP system, level progression, badge awards, activity feed
6. **Analytics** — Subject breakdown, monthly trends, grade distribution, performance radar
7. **AI Predictions** — Statistical regression model for performance prediction & risk scoring
8. **Parent Portal** — Link children by student code, view real-time academic reports
9. **Reporting** — Class performance tables, individual full reports, CSV export
10. **Mobile Support** — Fully responsive design with collapsible sidebar

## Demo Accounts
| Role    | Email                            | Password    |
|---------|----------------------------------|-------------|
| Admin   | admin@eduanalytics.com           | admin123    |
| Teacher | j.rodriguez@eduanalytics.com     | teacher123  |
| Student | student@eduanalytics.com         | student123  |
| Parent  | parent@eduanalytics.com          | parent123   |

## Running the App
The "Start application" workflow runs both services concurrently:
- Vite dev server on port 5000 (proxies /api to port 3001)
- Express API server on port 3001

## Key Files
- `server/index.ts` — Express app entry point
- `server/db/schema.ts` — Drizzle ORM schema (all tables)
- `server/db/seed.ts` — Demo data seeder
- `server/lib/xp.ts` — XP/level calculation engine
- `server/lib/prediction.ts` — AI prediction algorithm
- `src/App.tsx` — React router + protected routes
- `src/lib/api.ts` — Typed API client (axios)
- `src/context/AuthContext.tsx` — Auth state management

## User Preferences
- Clean, modern UI with indigo/slate color scheme
- Production-grade code with proper error handling
- No mocked data — everything connects to real PostgreSQL
