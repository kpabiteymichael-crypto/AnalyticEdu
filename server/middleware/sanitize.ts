import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

function stripNullBytes(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\0/g, '').trim();
  }
  if (Array.isArray(value)) {
    return value.map(stripNullBytes);
  }
  if (value && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      cleaned[k] = stripNullBytes(v);
    }
    return cleaned;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = stripNullBytes(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      const v = req.query[key];
      if (typeof v === 'string') {
        req.query[key] = v.replace(/\0/g, '').trim();
      }
    }
  }
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userId: (req as any).user?.id,
    });
  });
  next();
}
