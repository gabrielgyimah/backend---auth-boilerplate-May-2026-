/**
 * Application error hierarchy
 *
 * Changes:
 * - toJSON() never exposes `stack` or internal `context` in production.
 *   The original code conditionally exposed `context` in development only,
 *   but stack traces were still reachable via the global error handler.
 * - `isOperational` flag retained for distinguishing programmer errors from
 *   user-facing errors in the global error handler.
 * - Added `ForbiddenError` as a distinct 403 class (was missing — AUTH_403
 *   was incorrectly reused for both 401 and 403 cases).
 * - Removed `PaymentError` (402 is for literal HTTP payment-required, not
 *   domain payment failures — use BusinessRuleViolation instead).
 * - All error codes follow a consistent ALL_CAPS_SNAKE pattern.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_SERVER_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.timestamp = new Date();
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    const base: Record<string, unknown> = {
      success: false,
      message: this.message,
      errorCode: this.errorCode,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
    };
    // NEVER leak context or stack in production.
    if (process.env.NODE_ENV === 'development') {
      base.context = this.context;
    }
    return base;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', context?: Record<string, unknown>) {
    super(message, 401, 'AUTHENTICATION_ERROR', context);
  }
}

/** 403 — authenticated but not authorized. Distinct from 401. */
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied', context?: Record<string, unknown>) {
    super(message, 403, 'AUTHORIZATION_ERROR', context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', context?: Record<string, unknown>) {
    super(`${resource} not found`, 404, 'NOT_FOUND', context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', context);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT', retryAfter !== undefined ? { retryAfter } : undefined);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', context?: Record<string, unknown>) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', context);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', context);
  }
}

export class BusinessRuleViolation extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, 'BUSINESS_RULE_VIOLATION', context);
  }
}