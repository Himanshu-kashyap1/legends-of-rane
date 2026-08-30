import { config } from '../config/env.js';

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

const CURRENT_LEVEL = config.IS_PRODUCTION ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

/**
 * Masks sensitive patterns like tokens or connection strings if they appear in logs.
 * @param {string} text
 * @returns {string}
 */
function sanitize(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\/\/([^:]+):([^@]+)@/g, '//***:***@')
    .replace(/bot\d+:[A-Za-z0-9_-]+/gi, 'bot[REDACTED_TOKEN]');
}

/**
 * Formats a message with a timestamp, level tag, and optional metadata.
 */
function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const safeMessage = typeof message === 'string' ? sanitize(message) : message;
  
  let formattedMeta = '';
  if (meta !== undefined && meta !== null) {
    if (meta instanceof Error) {
      formattedMeta = `\n  Stack: ${sanitize(meta.stack || meta.message)}`;
    } else if (typeof meta === 'object') {
      try {
        formattedMeta = ` ${sanitize(JSON.stringify(meta))}`;
      } catch {
        formattedMeta = ' [Unserializable Object]';
      }
    } else {
      formattedMeta = ` ${sanitize(String(meta))}`;
    }
  }

  return `[${timestamp}] [${level}] ${safeMessage}${formattedMeta}`;
}

export const logger = {
  debug(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(formatMessage('DEBUG', message, meta));
    }
  },
  info(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(formatMessage('INFO', message, meta));
    }
  },
  warn(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, meta));
    }
  },
  error(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', message, meta));
    }
  }
};

export default logger;
