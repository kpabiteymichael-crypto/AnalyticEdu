# EduAnalytics — Deployment & Operations Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Environment Variables](#environment-variables)
3. [Deploy to Render (Backend)](#deploy-to-render-backend)
4. [Deploy to Vercel (Frontend)](#deploy-to-vercel-frontend)
5. [Deploy to Railway (Alternative)](#deploy-to-railway-alternative)
6. [GitHub Actions CI/CD](#github-actions-cicd)
7. [Database Backups](#database-backups)
8. [Monitoring & Alerts](#monitoring--alerts)
9. [Android / Mobile Build](#android--mobile-build)
10. [Scaling Guide](#scaling-guide)
11. [Rollback Strategy](#rollback-strategy)

---

## Architecture Overview

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐
│  Vercel (CDN)   │ ─────────────► │  Render / Railway    │
│  React + Vite   │   /api/*       │  Express.js API      │
│  (Static SPA)   │               │  Port 3001 / 3000     │
└─────────────────┘               └──────────┬───────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   PostgreSQL     │
                                    │  (Render DB /    │
                                    │   Neon / Supabase│
                                    └─────────────────┘
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before deploying.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32-char random string |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | — | Defaults to 3001 (dev) / 3000 (prod) |
| `SENTRY_DSN` | optional | Backend error tracking |
| `VITE_SENTRY_DSN` | optional | Frontend error tracking |
| `VITE_POSTHOG_KEY` | optional | Product analytics |
| `ALLOWED_ORIGINS` | optional | Comma-separated CORS origins |

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Deploy to Render (Backend)

1. Push code to GitHub.
2. Create a new **Web Service** on [render.com](https://render.com).
3. Connect your GitHub repository.
4. Render auto-detects `render.yaml` — review and confirm settings.
5. Add environment variables in the Render dashboard (Settings → Environment).
6. The `DATABASE_URL` is auto-injected if you create a Render PostgreSQL instance.
7. First deploy triggers migrations and seed automatically.

**Health check:** Render pings `/api/health` every 30s. If it returns non-2xx, Render restarts the service.

**Deploy hook** (for CI/CD):
- Go to Render Dashboard → your service → Settings → Deploy Hook
- Copy the URL and add it as `RENDER_DEPLOY_HOOK_URL` in GitHub Secrets.

---

## Deploy to Vercel (Frontend)

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root and follow prompts.
3. **Important:** Update `vercel.json` — replace the `/api/*` rewrite destination with your actual Render URL.
4. Add environment variables in Vercel Dashboard:
   - `VITE_SENTRY_DSN`
   - `VITE_POSTHOG_KEY`

```bash
# One-time setup
vercel link

# Deploy to production
vercel --prod
```

**Custom domain:** Vercel Dashboard → your project → Domains → Add domain.

---

## Deploy to Railway (Alternative Backend)

1. Install Railway CLI: `npm i -g @railway/cli`
2. `railway login`
3. `railway init` → select your GitHub repo
4. Railway auto-reads `railway.toml`.
5. Add a PostgreSQL plugin from the Railway dashboard.
6. Set environment variables:
```bash
railway variables set JWT_SECRET=your-secret NODE_ENV=production
```
7. Deploy: `railway up`

---

## GitHub Actions CI/CD

Two workflows are pre-configured:

| Workflow | File | Trigger |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Every push + PR to main |
| Deploy | `.github/workflows/deploy.yml` | Push to main / manual |

**Required GitHub Secrets** (Settings → Secrets → Actions):

| Secret | Description |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | From Render dashboard |
| `VERCEL_TOKEN` | From vercel.com/account/tokens |
| `VERCEL_ORG_ID` | From `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` after `vercel link` |
| `VITE_SENTRY_DSN` | Sentry frontend DSN |
| `VITE_POSTHOG_KEY` | PostHog project key |

---

## Database Backups

**Manual backup:**
```bash
chmod +x scripts/backup.sh
DATABASE_URL=your-db-url ./scripts/backup.sh
# Backup saved to ./backups/eduanalytics_YYYYMMDD_HHMMSS.sql.gz
```

**Restore:**
```bash
DATABASE_URL=your-db-url ./scripts/backup.sh --restore backups/eduanalytics_20260515_020000.sql.gz
```

**Automated backups (cron):**
```bash
# Add to crontab (runs at 2 AM daily)
0 2 * * * DATABASE_URL=<your-url> /path/to/scripts/backup.sh >> /var/log/eduanalytics-backup.log 2>&1
```

Backups older than 7 days are pruned automatically. Override with `RETENTION_DAYS=30`.

**Render managed backups:** If using Render PostgreSQL, enable daily backups from the database dashboard (free on paid plans).

---

## Monitoring & Alerts

### Sentry (Error Tracking)
1. Create a project at [sentry.io](https://sentry.io).
2. Copy the DSN and add it to both `SENTRY_DSN` (backend) and `VITE_SENTRY_DSN` (frontend).
3. Sentry auto-captures unhandled exceptions, API errors, and frontend crashes.

### UptimeRobot (Uptime Monitoring)
1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free).
2. Add a new monitor:
   - Type: HTTP(s)
   - URL: `https://your-backend.onrender.com/api/health`
   - Interval: 5 minutes
3. Set up email/Slack alerts for downtime.
4. Add a second monitor for the Vercel frontend URL.

### PostHog (Product Analytics)
1. Create a project at [posthog.com](https://posthog.com) (free up to 1M events/month).
2. Copy the project API key and add it as `VITE_POSTHOG_KEY`.
3. Events are automatically captured (page views, clicks).
4. Add custom events in code: `import { trackEvent } from '@/lib/analytics'`.

### Structured Logging
The backend uses Winston for structured JSON logs in production:
```json
{"level":"info","message":"POST /api/auth/login","statusCode":200,"durationMs":42,"service":"eduanalytics-api","timestamp":"2026-05-15T14:00:00.000Z"}
```
On Render/Railway, logs are streamed to the dashboard and can be forwarded to Datadog/Logtail.

---

## Android / Mobile Build

Prerequisites: Android Studio + JDK 17+ installed locally.

```bash
# 1. Build the web app
npm run build

# 2. Sync to Android project
npm run cap:sync

# 3. Open in Android Studio
npm run cap:open:android

# 4. In Android Studio:
#    Build → Generate Signed Bundle/APK
#    Choose APK, create/select keystore, build release APK
```

**App configuration** is in `capacitor.config.ts`:
- App ID: `com.eduanalytics.app`
- App Name: `EduAnalytics`
- Production API URL: update `server.url` for standalone APK builds

**Icons:** Pre-generated at `public/icons/icon-192.png` and `public/icons/icon-512.png` (indigo background, white "E" logo).

---

## Scaling Guide

| Load | Recommended Setup |
|---|---|
| < 1K users | Render Starter ($7/mo) + Render DB Starter ($7/mo) |
| 1K–10K users | Render Standard ($25/mo) + Render DB Standard ($20/mo) |
| 10K+ users | Multiple instances + Render DB Pro + Redis caching |

**Connection pooling** is already configured (`max: 20` connections in `server/db/index.ts`).

For high load, add PgBouncer in front of PostgreSQL:
```
DATABASE_URL=postgresql://user:pass@pgbouncer:6432/eduanalytics?pgbouncer=true
```

---

## Rollback Strategy

**Render:** Dashboard → your service → Events → click "Redeploy" on any previous deploy.

**Vercel:** Dashboard → your project → Deployments → click "..." → "Promote to Production" on any previous deployment.

**Database rollback:**
```bash
# Restore from last known-good backup
DATABASE_URL=your-url ./scripts/backup.sh --restore backups/eduanalytics_YYYYMMDD_HHMMSS.sql.gz
```

**Git rollback:**
```bash
git revert HEAD  # creates a new commit undoing the last change
git push origin main  # triggers CI/CD automatically
```
