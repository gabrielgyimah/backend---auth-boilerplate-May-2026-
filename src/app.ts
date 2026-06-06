/**
 * Express Application Setup
 * Initializes all middleware and routes
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import 'express-async-errors';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import { config } from '@/config';
import logger, { logRequest } from '@/infrastructure/database/logger';
import { AppError } from '@/core/errors/AppError';
import { RATE_LIMIT } from '@/core/constants';
import authRoutes from '@/modules/auth/routes';
import userRoutes from '@/modules/users/routes';
import webhookRoutes from '@/modules/webhooks/routes';
import { AccessTokenPayload } from './core/utils';

// ============================================================================
// APPLICATION SETUP
// ============================================================================

export function createApp(): Express {
  const app = express();

  // =========================================================================
  // SECURITY MIDDLEWARE
  // =========================================================================

  // Helmet.js for security headers
  if (config.HELMET_ENABLED) {
    app.use(helmet());
  }

  // CORS
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: config.CORS_CREDENTIALS,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // =========================================================================
  // REQUEST PARSING MIDDLEWARE
  // =========================================================================

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  // =========================================================================
  // COMPRESSION
  // =========================================================================

  app.use(compression());

  // =========================================================================
  // REQUEST ID MIDDLEWARE
  // =========================================================================

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || uuidv4();
    req.id = String(requestId);
    res.setHeader('X-Request-ID', requestId);
    next();
  });

  // =========================================================================
  // LOGGING MIDDLEWARE
  // =========================================================================

  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logRequest(req.method, req.path, res.statusCode, duration);
    });

    next();
  });

  // =========================================================================
  // RATE LIMITING
  // =========================================================================

  const globalLimiter = rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max: RATE_LIMIT.MAX_REQUESTS,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(globalLimiter);

  // =========================================================================
  // HEALTH CHECK ENDPOINTS
  // =========================================================================

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
    });
  });

  app.get('/ready', (_req: Request, res: Response) => {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  });

  // =========================================================================
  // API ROUTES (to be added)
  // =========================================================================

  app.get('/api/v1', (_req: Request, res: Response) => {
    res.json({
      message: 'Banking Platform API v1',
      version: '1.0.0',
      status: 'running',
    });
  });

  // =========================================================================
  // MODULE ROUTES - Users, Customers, Accounts, Transactions, Auth, etc. (to be added)
  // =========================================================================
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);


  // =========================================================================
  // 404 HANDLER
  // =========================================================================

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Route not found', 404, 'NOT_FOUND'));
  });

  // =========================================================================
  // GLOBAL ERROR HANDLER
  // =========================================================================

  app.use((err: Error | AppError, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.id;

    // Log error
    logger.error({
      msg: err.message,
      stack: err.stack,
      requestId,
      path: req.path,
      method: req.method,
    });

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        errorCode: err.errorCode,
        statusCode: err.statusCode,
        timestamp: err.timestamp.toISOString(),
        requestId,
        path: req.path,
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      errorCode: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      requestId,
      path: req.path,
    });
  });

  return app;
}

// Extend Express Request type to include request ID
declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: AccessTokenPayload;
    }
  }
}
