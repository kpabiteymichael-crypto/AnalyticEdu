import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

import logger from './lib/logger';
import { sanitizeInput, requestLogger } from './middleware/sanitize';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { runMigrations } from './db/migrate';
import { db } from './db/index';
import { sql } from 'drizzle-orm';

import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import scoreRoutes from './routes/scores';
import rankingRoutes from './routes/rankings';
import gamificationRoutes from './routes/gamification';
import analyticsRoutes from './routes/analytics';
import predictionRoutes from './routes/predictions';
import parentRoutes from './routes/parents';
import reportRoutes from './routes/reports';
import notificationRoutes from './routes/notifications';
import settingsRoutes from './routes/settings';
import classRoutes from './routes/classes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001);

app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : true;

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Compression ─────────────────────────────────────────────────────────────
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

app.use('/api', limiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Input sanitization ───────────────────────────────────────────────────────
app.use(sanitizeInput);

// ── Request logging ──────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Health check (before auth) ───────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const startTime = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      db: 'connected',
      responseTimeMs: Date.now() - startTime,
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      db: 'disconnected',
      error: (err as Error).message,
    });
  }
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/classes', classRoutes);

// ── Static files in production ───────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist/client');
  app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── 404 & centralized error handler ─────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Server startup ───────────────────────────────────────────────────────────
async function start() {
  try {
    await runMigrations();
    logger.info('Database migrations complete');

    try {
      const { seedDatabase } = await import('./db/seed.js');
      await seedDatabase();
    } catch (e) {
      logger.debug('Seed skipped or already seeded', { reason: (e as Error).message });
    }

    app.listen(PORT, () => {
      logger.info(`API Server running on http://localhost:${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message, stack: (err as Error).stack });
    process.exit(1);
  }
}

// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down...');
  process.exit(0);
});

start();
