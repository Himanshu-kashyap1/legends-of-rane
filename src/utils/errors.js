/**
 * Base Application Error class with operational flag and HTTP status codes.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} [statusCode=500] - Associated HTTP/status code
   * @param {string} [code='APP_ERROR'] - Machine-readable error code
   * @param {boolean} [isOperational=true] - Whether the error is a trusted operational error
   */
  constructor(message, statusCode = 500, code = 'APP_ERROR', isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error for invalid input, missing parameters, or schema mismatch.
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * Not Found Error when a requested entity (User, Item, Order, Quest) is missing.
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', identifier = '') {
    const msg = identifier ? `${resource} '${identifier}' not found` : `${resource} not found`;
    super(msg, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

/**
 * Concurrency / Lock Error to prevent race conditions in bot actions and market transactions.
 */
export class ConcurrencyError extends AppError {
  constructor(message = 'Action already in progress. Please wait for completion.') {
    super(message, 409, 'CONCURRENCY_LOCK_ERROR');
  }
}

/**
 * Unauthorized / Ownership Error when a user attempts an unauthorized action or button click.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'You are not authorized to perform this action.') {
    super(message, 403, 'UNAUTHORIZED_ERROR');
  }
}

/**
 * Insufficient Resources Error for economy and gathering failures (e.g. not enough coins/energy).
 */
export class InsufficientResourceError extends AppError {
  constructor(resource = 'resource', required = 0, current = 0) {
    super(`Insufficient ${resource}. Required: ${required}, Available: ${current}`, 400, 'INSUFFICIENT_RESOURCE');
    this.resource = resource;
    this.required = required;
    this.current = current;
  }
}

/**
 * Database Operation Error.
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}
