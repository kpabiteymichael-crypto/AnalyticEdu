# EduAnalytics — Deployment & Operations Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Environment Variables](#environment-variables)
3. [Push to GitHub](#push-to-github)
4. [Deploy Backend to Render](#deploy-backend-to-render)
5. [Deploy Frontend to Vercel](#deploy-frontend-to-vercel)
6. [Connect Vercel ↔ Render](#connect-vercel--render)
7. [GitHub Actions CI/CD](#github-actions-cicd)
8. [Password Reset / SMTP Email](#password-reset--smtp-email)
9. [Database Backups](#database-backups)
10. [Monitoring & Alerts](#monitoring--alerts)
11. [Android / Mobile Build](#android--mobile-build)
12. [Scaling Guide](#scaling-guide)
13. [Rollback Strategy](#rollback-strategy)

---

## Architecture Overview

```
┌──────────────────────┐   HTTPS /api/*   ┌─────────────────────┐
│   Vercel (CDN)        │ ───────────────► │  Render (Backend)   │
│   React + Vite SPA    │   server-side    │  Express.js API     │
│   dist/client/        │   rewrite        │  Port 3000          │
└──────────────────────┘                  └──────────┬──────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │  PostgreSQL DB       │
                                          │  (Render / Neon /   │
                                          │   Supabase)         │
                                          └─────────────────────┘
```

**How it works:**
- The frontend is a static React SPA deployed on Vercel's CDN.
- `vercel.json` rewrites all `/api/*` calls server-side to your Render backend URL — no CORS preflight from the browser.
- The backend handles JWT auth, database, and all business logic.
- Both services auto-deploy from the `main` branch via GitHub.

---

## Environment Variables

### Backend (Render)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32-char random string |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | — | Defaults to 3000 in production |
| `APP_URL` | ✅ | Your Vercel frontend URL — used in password reset email links |
| `ALLOWED_ORIGINS` | ✅ | Your Vercel frontend URL — allows CORS from Vercel |
| `SEED_SECRET` | — | Secret for `/api/admin/seed` endpoint |
| `SMTP_HOST` | — | SMTP server (e.g. smtp.gmail.com). If not set, reset links return in API response |
| `SMTP_PORT` | — | Usually 587 (TLS) or 465 (SSL) |
| `SMTP_SECURE` | — | `true` for port 465, `false` for 587 |
| `SMTP_USER` | — | SMTP username / email |
| `SMTP_PASS` | — | SMTP password or app password |
| `SMTP_FROM` | — | Sender name/email, e.g. `"EduAnalytics" <no-reply@yourdomain.com>` |
| `SENTRY_DSN` | — | Backend error tracking |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_APP_VERSION` | — | Shown in UI, e.g. `1.0.0` |
| `VITE_APP_NAME` | — | App name, e.g. `EduAnalytics` |
| `VITE_SENTRY_DSN` | — | Frontend error tracking |
| `VITE_POSTHOG_KEY` | — | Product analytics |

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Push to GitHub

The Replit checkpoint system automatically commits your changes. To push them to GitHub:

```bash
# In the Replit Shell tab (or your local terminal):
git push origin main
```

That's it — the remote is already configured to `https://github.com/kpabiteymichael-crypto/AnalyticEdu.git`.

If you get an authentication error, use a Personal Access Token (PAT):
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Create a token with **Contents: Read and write** and **Workflows: Read and write** permissions
3. Use it as your password when prompted, or update the remote:
```bash
git remote set-url origin https://YOUR_PAT@github.com/kpabiteymichael-crypto/AnalyticEdu.git
git push origin main
```

---

## Deploy Backend to Render

### First-time setup

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub account and select the `AnalyticEdu` repository
3. Render auto-detects `render.yaml` — click **Apply** to use its settings
4. Set these environment variables in **Settings → Environment**:

```
NODE_ENV          = production
PORT              = 3000
JWT_SECRET        = <generate with command above>
APP_URL           = https://your-vercel-app.vercel.app   ← fill in after Vercel deploy
ALLOWED_ORIGINS   = https://your-vercel-app.vercel.app   ← same as APP_URL
```

5. For the database: Render auto-injects `DATABASE_URL` if you use a Render PostgreSQL instance (created via `render.yaml`'s `databases` section)
6. Click **Deploy** — migrations and seed data run automatically on first start

### After deploy

- Your Render backend URL will be: `https://eduanalytics-api.onrender.com` (or similar)
- Copy it — you'll need it for Vercel and the `vercel.json` rewrite

**Health check endpoint:** `GET /api/health` — Render pings this every 30s.

**Manual reseed** (if needed):
```bash
curl -X POST https://your-api.onrender.com/api/admin/force-seed?secret=YOUR_SEED_SECRET
```

---

## Deploy Frontend to Vercel

### First-time setup

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import the `AnalyticEdu` repo
2. Configure the project:
   - **Framework Preset:** Other (Vite)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/client`
   - **Install Command:** `npm install`
3. Add environment variables (optional):
   - `VITE_APP_VERSION` = `1.0.0`
   - `VITE_SENTRY_DSN` = your Sentry DSN
4. Click **Deploy**

Your Vercel URL will be: `https://your-project.vercel.app`

### Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link        # links project, creates .vercel/project.json
vercel --prod      # deploy to production
```

---

## Connect Vercel ↔ Render

This is the critical step that makes the split deployment work.

### Step 1 — Update `vercel.json`

Open `vercel.json` and replace the placeholder with your actual Render URL:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://eduanalytics-api.onrender.com/api/:path*"
    },
    ...
  ]
}
```

Commit and push — Vercel redeploys automatically.

### Step 2 — Update Render environment variables

In Render Dashboard → your service → Environment:
- Set `APP_URL` = `https://your-project.vercel.app`
- Set `ALLOWED_ORIGINS` = `https://your-project.vercel.app`

Click **Save Changes** — Render restarts automatically.

### Step 3 — Verify

```bash
# Test API health from Vercel domain (goes through Vercel rewrite → Render)
curl https://your-project.vercel.app/api/health

# Test login
curl -X POST https://your-project.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@eduanalytics.com","password":"admin123"}'
```

Both should return JSON from your Render backend. If login works here, the full stack is connected.

---

## GitHub Actions CI/CD

Two workflows are pre-configured in `.github/workflows/`:

| Workflow | File | Trigger |
|---|---|---|
| CI (lint + build) | `ci.yml` | Every push + PR to `main` |
| Deploy | `deploy.yml` | Push to `main` / manual dispatch |

### Required GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions** → **New repository secret**:

| Secret | Where to get it |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Render dashboard → service → Settings → Deploy Hook |
| `VERCEL_TOKEN` | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after `vercel link` |
| `VITE_SENTRY_DSN` | sentry.io project DSN |
| `VITE_POSTHOG_KEY` | posthog.com project key |

Once set, every push to `main` automatically:
1. Runs CI (build + lint)
2. Triggers a Render redeploy via webhook
3. Deploys the frontend to Vercel

---

## Password Reset / SMTP Email

The password reset flow works in two modes:

### Demo mode (no SMTP configured)
The `/api/auth/forgot-password` endpoint returns the reset link directly in the JSON response. Useful for development and testing without email setup.

### Production mode (SMTP configured)
Set these env vars on Render and a real email is sent:

```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_SECURE = false
SMTP_USER = your@gmail.com
SMTP_PASS = your-16-char-app-password   ← Gmail: myaccount.google.com/apppasswords
SMTP_FROM = "EduAnalytics" <no-reply@yourdomain.com>
APP_URL   = https://your-vercel-app.vercel.app
```

**Other providers:**
- **Resend:** `SMTP_HOST=smtp.resend.com`, port 465, get API key at resend.com (100 emails/day free)
- **SendGrid:** `SMTP_HOST=smtp.sendgrid.net`, port 587, user=`apikey`, pass=your SendGrid API key
- **Mailgun:** `SMTP_HOST=smtp.mailgun.org`, port 587

Reset tokens expire after **1 hour** and can only be used once.

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

**Render managed backups:** Enable daily backups from the Render database dashboard (free on paid plans).

---

## Monitoring & Alerts

### Sentry (Error Tracking)
1. Create a project at [sentry.io](https://sentry.io).
2. Copy the DSN and add it to both `SENTRY_DSN` (Render) and `VITE_SENTRY_DSN` (Vercel).
3. Sentry auto-captures unhandled exceptions, API errors, and frontend crashes.

### UptimeRobot (Uptime Monitoring)
1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free).
2. Add monitors for:
   - `https://your-api.onrender.com/api/health` — backend
   - `https://your-project.vercel.app` — frontend
3. Set up email/Slack alerts for downtime.

### PostHog (Product Analytics)
1. Create a project at [posthog.com](https://posthog.com) (free up to 1M events/month).
2. Copy the project API key and add it as `VITE_POSTHOG_KEY` in Vercel.

---

## Android / Mobile Build

Prerequisites: Android Studio + JDK 17+ installed locally.

```bash
npm run build          # build web app
npm run cap:sync       # sync to Android project
npm run cap:open:android  # open in Android Studio
# Build → Generate Signed Bundle/APK → choose APK → create/select keystore → build release
```

Update `capacitor.config.ts` → `server.url` with your production Vercel URL for standalone APK builds.

---

## Scaling Guide

| Load | Recommended Setup |
|---|---|
| < 1K users | Render Starter ($7/mo) + Render DB Starter ($7/mo) + Vercel Hobby (free) |
| 1K–10K users | Render Standard ($25/mo) + Render DB Standard ($20/mo) |
| 10K+ users | Multiple instances + Render DB Pro + Redis caching layer |

Connection pooling is pre-configured (`max: 20` in `server/db/index.ts`).

---

## Rollback Strategy

**Render:** Dashboard → your service → Events → click **Redeploy** on any previous deploy.

**Vercel:** Dashboard → your project → Deployments → click `...` → **Promote to Production**.

**Database rollback:**
```bash
DATABASE_URL=your-url ./scripts/backup.sh --restore backups/eduanalytics_YYYYMMDD.sql.gz
```

**Git rollback:**
```bash
git revert HEAD      # creates a new commit undoing the last change
git push origin main  # triggers CI/CD automatically
```
