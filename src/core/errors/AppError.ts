/**
 * Custom AppError class for application-specific errors
 * All errors should extend this class for consistent error handling
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    context?: Record<string, any>
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

  toJSON(): Record<string, any> {
    return {
      success: false,
      message: this.message,
      errorCode: this.errorCode,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      ...(process.env.NODE_ENV === 'development' && { context: this.context }),
    };
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: Record<string, any>) {
    super(message, 401, 'AUTH_401', context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization/Access denied error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: Record<string, any>) {
    super(message, 403, 'AUTH_403', context);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context?: Record<string, any>) {
    super(`${resource} not found`, 404, 'NOT_FOUND', context);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error class (e.g., duplicate resource)
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, 'CONFLICT', context);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT', { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Internal server error class
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', context);
    this.name = 'InternalServerError';
  }
}

/**
 * Unprocessable entity error class
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', context);
    this.name = 'UnprocessableEntityError';
  }
}

/**
 * Business rule violation error class
 */
export class BusinessRuleViolation extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'BUSINESS_RULE_VIOLATION', context);
    this.name = 'BusinessRuleViolation';
  }
}

/**
 * Payment processing error class
 */
export class PaymentError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 402, 'PAYMENT_ERROR', context);
    this.name = 'PaymentError';
  }
}
