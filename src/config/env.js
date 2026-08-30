import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory path for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates and exposes sanitized environment variables.
 */
function validateConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);
  const botToken = process.env.BOT_TOKEN?.trim() || '';
  const mongoUri = process.env.MONGO_URI?.trim() || '';
  const webappUrl = process.env.WEBAPP_URL?.trim() || `http://localhost:${port}/webapp`;

  // Parse admin IDs if provided
  const adminIds = process.env.ADMIN_IDS
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim()).filter(Boolean)
    : [];

  const errors = [];

  if (!botToken && nodeEnv === 'production') {
    errors.push('BOT_TOKEN is required in production');
  }

  if (!mongoUri && nodeEnv === 'production') {
    errors.push('MONGO_URI is required in production');
  }

  if (isNaN(port) || port <= 0 || port > 65535) {
    errors.push(`Invalid PORT value: ${process.env.PORT}`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration Validation Failed:\n- ${errors.join('\n- ')}`);
  }

  return Object.freeze({
    NODE_ENV: nodeEnv,
    IS_PRODUCTION: nodeEnv === 'production',
    IS_DEVELOPMENT: nodeEnv === 'development',
    IS_TEST: nodeEnv === 'test',
    PORT: port,
    BOT_TOKEN: botToken,
    MONGO_URI: mongoUri,
    WEBAPP_URL: webappUrl,
    ADMIN_IDS: adminIds,
    // Helper to safely mask sensitive strings for logs
    getMaskedBotToken() {
      if (!botToken) return '(empty)';
      if (botToken.length < 10) return '***';
      return `${botToken.substring(0, 4)}...${botToken.substring(botToken.length - 4)}`;
    },
    getMaskedMongoUri() {
      if (!mongoUri) return '(empty)';
      try {
        return mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
      } catch {
        return '***';
      }
    }
  });
}

export const config = validateConfig();
export default config;
