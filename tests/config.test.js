import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config/env.js';

test('Config module exports expected structure and sanitized helpers', () => {
  assert.ok(config);
  assert.strictEqual(typeof config.NODE_ENV, 'string');
  assert.strictEqual(typeof config.PORT, 'number');
  assert.ok(config.PORT > 0);
  assert.strictEqual(typeof config.getMaskedBotToken, 'function');
  assert.strictEqual(typeof config.getMaskedMongoUri, 'function');

  // Verify masking does not leak credentials in string representation
  const maskedMongo = config.getMaskedMongoUri();
  if (config.MONGO_URI.includes('@')) {
    assert.match(maskedMongo, /\/\/\*\*\*:\*\*\*@/);
  }
});
