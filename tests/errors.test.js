import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConcurrencyError,
  UnauthorizedError,
  InsufficientResourceError,
  DatabaseError
} from '../src/utils/errors.js';

test('AppError and derived classes set proper status codes and properties', () => {
  const generic = new AppError('Generic issue', 500, 'GENERIC');
  assert.strictEqual(generic.statusCode, 500);
  assert.strictEqual(generic.code, 'GENERIC');
  assert.strictEqual(generic.isOperational, true);

  const validation = new ValidationError('Bad param', { field: 'username' });
  assert.strictEqual(validation.statusCode, 400);
  assert.strictEqual(validation.code, 'VALIDATION_ERROR');
  assert.deepStrictEqual(validation.details, { field: 'username' });

  const notFound = new NotFoundError('User', '12345');
  assert.strictEqual(notFound.statusCode, 404);
  assert.strictEqual(notFound.message, "User '12345' not found");

  const concurrency = new ConcurrencyError();
  assert.strictEqual(concurrency.statusCode, 409);
  assert.strictEqual(concurrency.code, 'CONCURRENCY_LOCK_ERROR');

  const unauthorized = new UnauthorizedError();
  assert.strictEqual(unauthorized.statusCode, 403);

  const resource = new InsufficientResourceError('Energy', 10, 2);
  assert.strictEqual(resource.statusCode, 400);
  assert.strictEqual(resource.required, 10);
  assert.strictEqual(resource.current, 2);

  const dbErr = new DatabaseError('Failed query');
  assert.strictEqual(dbErr.statusCode, 500);
  assert.strictEqual(dbErr.code, 'DATABASE_ERROR');
});
