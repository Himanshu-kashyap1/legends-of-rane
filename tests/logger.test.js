import test from 'node:test';
import assert from 'node:assert/strict';
import { logger } from '../src/utils/logger.js';

test('Logger provides standard logging methods without throwing', () => {
  assert.strictEqual(typeof logger.debug, 'function');
  assert.strictEqual(typeof logger.info, 'function');
  assert.strictEqual(typeof logger.warn, 'function');
  assert.strictEqual(typeof logger.error, 'function');

  // Verify calling logger does not throw
  assert.doesNotThrow(() => {
    logger.debug('Test debug message', { meta: 'ok' });
    logger.info('Test info message');
    logger.warn('Test warn message');
    logger.error('Test error message', new Error('sample'));
  });
});
