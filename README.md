# EduAnalytics — Student Performance & Gamified Learning Dashboard

A production-grade analytics platform for schools, combining real-time academic tracking, gamification, AI-powered predictions, and a parent portal — all in one responsive web app installable as an Android APK.

---

## Live Demo

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@eduanalytics.com | admin123 |
| Teacher | j.rodriguez@eduanalytics.com | teacher123 |
| Student | student@eduanalytics.com | student123 |
| Parent | parent@eduanalytics.com | parent123 |

---

## Features

- **Authentication** — JWT login/register with bcrypt hashing; Admin, Teacher, Student, Parent roles
- **Student Management** — Full CRUD, bulk CSV import, XP levels, streak tracking, class assignments
- **Score Engine** — Multi-subject assessment recording with automatic XP awards
- **Leaderboard** — Dynamic overall and class-level rankings updated on every score entry
- **Gamification** — XP system, level progression, badge awards, activity feed, configurable XP rewards
- **Analytics** — Subject breakdown, monthly trends, grade distribution, performance radar charts
- **AI Predictions** — Statistical regression model for performance prediction and at-risk scoring
- **Parent Portal** — Link children by student code, view real-time academic reports
- **Reporting** — Class performance tables, individual full reports, CSV export
- **PWA + Android** — Installable as a Progressive Web App and packaged as an Android APK via Capacitor
- **Mobile-first UX** — Responsive design, collapsible sidebar, bottom navigation bar on mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + Recharts |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT + bcrypt |
| Mobile | Capacitor (Android) |
| PWA | vite-plugin-pwa + Workbox |
| Logging | Winston (structured JSON) |
| Monitoring | Sentry + PostHog |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or cloud)

### Installation

```bash
git clone https://github.com/kpabiteymichael-crypto/IdealJealousGraphs.git
cd IdealJealousGraphs
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
```
DATABASE_URL=postgresql://user:password@localhost:5432/eduanalytics
JWT_SECRET=your-long-random-secret
```

### Run in Development

```bash
npm run dev
```

- Frontend: http://localhost:5000
- API: http://localhost:3001
- Health check: http://localhost:3001/api/health

### Run Database Migrations + Seed

Migrations run automatically on server start. To seed demo data:
```bash
npm run db:seed
```

---

## Project Structure

```
├── server/
│   ├── db/              # Drizzle schema, migrations, seed
│   ├── lib/             # Logger, XP engine, prediction algorithm
│   ├── middleware/       # Auth (JWT/RBAC), error handler, sanitizer
│   └── routes/          # 12 API route modules
├── src/
│   ├── components/      # Layout, shared UI components
│   ├── context/         # Auth + Class context providers
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Axios API client, Sentry, analytics
│   └── pages/           # 13 lazy-loaded page components
├── public/
│   ├── icons/           # PWA app icons (192px, 512px, maskable)
│   ├── manifest.json    # Web app manifest
│   └── offline.html     # PWA offline fallback
├── scripts/
│   ├── backup.sh        # PostgreSQL backup + restore script
│   └── healthcheck.sh   # Health check for UptimeRobot / Docker
├── .github/workflows/   # CI (typecheck + build) + Deploy pipelines
├── docs/API.md          # Full API reference
├── DEPLOYMENT.md        # Complete deployment + operations guide
├── render.yaml          # Render deployment config
├── railway.toml         # Railway deployment config
└── vercel.json          # Vercel frontend config
```

---

## Deployment

### Backend — Render

1. Connect this repo to [render.com](https://render.com)
2. Render auto-reads `render.yaml` — review and confirm
3. Set environment variables in the Render dashboard
4. `DATABASE_URL` is auto-injected from the managed Render PostgreSQL instance

### Frontend — Vercel

1. Connect this repo to [vercel.com](https://vercel.com)
2. Update the `/api/*` rewrite in `vercel.json` to point to your Render backend URL
3. Set `VITE_SENTRY_DSN` and `VITE_POSTHOG_KEY` if using monitoring

Full step-by-step instructions are in [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## API

Full API reference is in [docs/API.md](./docs/API.md).

Base URL: `https://your-backend.onrender.com/api`  
All protected routes require: `Authorization: Bearer <token>`

**Route groups:** `/auth` · `/students` · `/scores` · `/rankings` · `/gamification` · `/analytics` · `/predictions` · `/parents` · `/reports` · `/notifications` · `/classes` · `/settings`

---

## Android Build

Prerequisites: Android Studio + JDK 17

```bash
npm run build
npm run cap:sync
npm run cap:open:android
# Then: Build → Generate Signed Bundle/APK in Android Studio
```

---

## Database Backup

```bash
# Backup
DATABASE_URL=your-url ./scripts/backup.sh

# Restore
DATABASE_URL=your-url ./scripts/backup.sh --restore backups/eduanalytics_20260515_020000.sql.gz
```

---

## CI/CD

GitHub Actions workflows run automatically:

| Workflow | Trigger | Actions |
|----------|---------|---------|
| CI | Every push + PR | TypeScript check, Vite build, security audit |
| Deploy | Push to `main` | Deploy backend (Render) + frontend (Vercel) |

Required GitHub Secrets: `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## Monitoring

| Service | Purpose | Setup |
|---------|---------|-------|
| Sentry | Error tracking (frontend + backend) | Set `SENTRY_DSN` + `VITE_SENTRY_DSN` |
| PostHog | Product analytics | Set `VITE_POSTHOG_KEY` |
| UptimeRobot | Uptime alerts | Monitor `/api/health` |

---

## License

MIT
