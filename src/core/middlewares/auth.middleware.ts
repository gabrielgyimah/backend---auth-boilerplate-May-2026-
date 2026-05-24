/**
 * Authentication Middleware
 *
 * Changes:
 * - req.user typed as AccessTokenPayload (no more `any`). The global Express
 *   namespace declaration was duplicated across app.ts and auth.guard.ts causing
 *   potential type conflicts; consolidated here as the single source of truth.
 * - Token is extracted ONLY from the Authorization: Bearer header. The original
 *   also checked req.cookies.accessToken which is a security anti-pattern — access
 *   tokens in cookies require CSRF mitigations; they belong in memory/headers only.
 * - Explicit guard on `decoded.userId` presence before assigning req.user, preventing
 *   partial/malformed payloads from being trusted downstream.
 */

import { Request, Response, NextFunction } from 'express';
import type { AccessTokenPayload } from '@/core/utils';
import { verifyAccessToken } from '@/core/utils';
import { AuthenticationError } from '@/core/errors/AppError';

// ============================================================================
// GLOBAL EXPRESS AUGMENTATION — single canonical definition
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      /** Populated by `authenticate` after token verification. */
      user?: AccessTokenPayload;
      /** Populated by request-ID middleware. */
      id?: string;
      /** Optional resource ownership fields set by auth.guard.ts. */
      resourceId?: string;
      ownerId?: string;
      branchId?: string;
      scope?: { field: string; userId: string };
    }
  }
}

// ============================================================================
// TOKEN EXTRACTION
// ============================================================================

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Mandatory authentication middleware.
 * Attaches the verified payload to `req.user`.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new AuthenticationError('No authentication token provided'));
  }

  const decoded = verifyAccessToken(token);
  if (!decoded || !decoded.userId) {
    return next(new AuthenticationError('Invalid or expired token'));
  }

  req.user = decoded;
  next();
}

/**
 * Optional authentication middleware.
 * Silently ignores missing or invalid tokens.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded?.userId) req.user = decoded;
  }
  next();
}

/**
 * Helper — returns the verified user or throws.
 * Use inside controllers instead of casting req.user.
 */
export function getAuthenticatedUser(req: Request): AccessTokenPayload {
  if (!req.user) throw new AuthenticationError('User not authenticated');
  return req.user;
}