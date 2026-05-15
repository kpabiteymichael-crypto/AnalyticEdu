import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`,
    statusCode: 404,
  });
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id,
    });
  } else {
    logger.warn('Client error', {
      message: err.message,
      statusCode,
      path: req.path,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    error: isAppError ? err.message : 'Internal server error',
    code,
    statusCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
