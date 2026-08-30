import { logger } from './logger.js';
import { config } from '../config/env.js';

let keepAliveInterval = null;

/**
 * Automatically pings the server's public HTTPS URL to prevent cloud hosting sleep (Render/Koyeb).
 */
export function startKeepAlive() {
  if (!config.IS_PRODUCTION) {
    return;
  }

  // Derive public base URL from WEBAPP_URL or environment
  let targetUrl = '';
  if (config.WEBAPP_URL && config.WEBAPP_URL.startsWith('https://')) {
    try {
      const parsed = new URL(config.WEBAPP_URL);
      targetUrl = `${parsed.origin}/health`;
    } catch {
      targetUrl = 'https://legends-of-rane.onrender.com/health';
    }
  } else {
    targetUrl = 'https://legends-of-rane.onrender.com/health';
  }

  const PING_INTERVAL_MS = 8 * 60 * 1000; // Ping every 8 minutes (before Render 15-min idle timeout)

  logger.info(`⏰ Keep-Alive service initialized for: ${targetUrl} (every 8 mins)`);

  keepAliveInterval = setInterval(async () => {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        logger.debug(`[Keep-Alive] Self-ping successful to ${targetUrl} [Status: ${response.status}]`);
      } else {
        logger.warn(`[Keep-Alive] Self-ping responded with status ${response.status}`);
      }
    } catch (err) {
      logger.warn(`[Keep-Alive] Self-ping encountered error: ${err.message}`);
    }
  }, PING_INTERVAL_MS);

  if (keepAliveInterval.unref) {
    keepAliveInterval.unref(); // Avoid holding process open during shutdown
  }
}

/**
 * Stops the keep-alive background timer.
 */
export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    logger.info('[Keep-Alive] Service stopped.');
  }
}

export default {
  startKeepAlive,
  stopKeepAlive
};
