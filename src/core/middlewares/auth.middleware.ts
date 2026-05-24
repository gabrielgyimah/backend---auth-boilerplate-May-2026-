/**
 * Authentication Middleware
 * Verifies JWT tokens and extracts user information
 * 
 * FIXES:
 * - Removed cookie check for accessToken (not used)
 * - Only Authorization header is used
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/core/utils';
import { AuthenticationError } from '@/core/errors/AppError';

/**
 * Extract token from Authorization header only.
 * (Cookies are used for refresh token, not access token)
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Authentication middleware
 * Verifies JWT token and populates req.user
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      throw new AuthenticationError('Invalid or expired token');
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(error instanceof AuthenticationError ? error : new AuthenticationError('Authentication failed'));
  }
}

/**
 * Optional authentication middleware
 * Does not fail if token is missing, but verifies if present
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) req.user = decoded;
    }
    next();
  } catch {
    next();
  }
}

/**
 * Verify token without middleware
 */
export function verifyToken(token: string): Record<string, any> | null {
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Get user from request
 */
export function getAuthenticatedUser(req: Request): Record<string, any> {
  if (!req.user) throw new AuthenticationError('User not authenticated');
  return req.user;
}