import { config } from '../config/env.js';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './connection.js';
import { logger } from '../utils/logger.js';

async function run() {
  logger.info('--- MongoDB Health & Connection Verification ---');
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Target: ${config.getMaskedMongoUri()}`);

  try {
    const start = Date.now();
    await connectDatabase();
    const elapsed = Date.now() - start;
    logger.info(`Connected in ${elapsed}ms`);

    const health = await checkDatabaseHealth();
    logger.info('Database ping result:', health);

    if (health.healthy) {
      logger.info('✅ MongoDB connection check PASSED.');
    } else {
      logger.error('❌ MongoDB ping was not healthy:', health);
      process.exitCode = 1;
    }
  } catch (err) {
    logger.error('❌ MongoDB connection check FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
    logger.info('--- Connection Test Finished ---');
  }
}

run();
