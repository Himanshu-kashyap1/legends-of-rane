import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { createExpressApp } from './server/app.js';
import { createBot } from './telegram/bot.js';
import { startKeepAlive, stopKeepAlive } from './utils/keepAlive.js';

let httpServer = null;
let botInstance = null;
let isShuttingDown = false;

async function bootstrap() {
  logger.info('====================================================');
  logger.info('🏰 Starting LEGENDS OF RANE — Server & Telegram Bot');
  logger.info('====================================================');
  logger.info(`Environment : ${config.NODE_ENV}`);
  logger.info(`Port        : ${config.PORT}`);
  logger.info(`Mini App URL: ${config.WEBAPP_URL}`);
  logger.info(`Database    : ${config.getMaskedMongoUri()}`);
  logger.info(`Bot Token   : ${config.getMaskedBotToken()}`);

  // 1. Start HTTP Express Server for Mini App & Healthchecks immediately
  const app = createExpressApp();
  httpServer = app.listen(config.PORT, () => {
    logger.info(`🚀 HTTP & Mini App server listening on port ${config.PORT}`);
  });

  // 2. Connect to Database in background/resiliently
  if (config.MONGO_URI) {
    try {
      await connectDatabase();
    } catch (err) {
      logger.error('Database connection notice on startup:', err.message);
    }
  } else {
    logger.warn('No MONGO_URI provided. Running in standalone mode.');
  }

  // 3. Initialize and Start Telegram Bot
  if (config.BOT_TOKEN) {
    try {
      botInstance = createBot();
      if (botInstance) {
        // Verify Telegram connectivity and get bot details
        const me = await botInstance.telegram.getMe();
        logger.info(`🤖 Telegram Bot connected: @${me.username} (${me.first_name}) [ID: ${me.id}]`);

        // Set native Telegram Mini App Menu Button
        if (config.WEBAPP_URL && config.WEBAPP_URL.startsWith('https://')) {
          await botInstance.telegram.setChatMenuButton({
            menu_button: {
              type: 'web_app',
              text: '🏗️ 3D Base',
              web_app: { url: config.WEBAPP_URL }
            }
          }).catch((err) => {
            logger.warn('Could not set default chat menu button:', err.message);
          });
        }

        // Launch polling in background without awaiting termination promise
        botInstance.launch({ dropPendingUpdates: true }).catch((err) => {
          logger.error('Telegram Bot polling encountered fatal error:', err.message);
        });
        logger.info('🚀 Telegram Bot polling loop is now LIVE and listening for commands.');
      }
    } catch (err) {
      logger.error('Bot initialization error:', err);
    }
  } else {
    logger.warn('No BOT_TOKEN configured. Telegram Bot polling skipped.');
  }

  // 4. Start Keep-Alive Auto-Pinger (keeps Render awake 24/7)
  startKeepAlive();
}

/**
 * Handles graceful shutdown on SIGINT/SIGTERM.
 * @param {string} signal
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Stop Keep-Alive
  stopKeepAlive();

  try {
    // 1. Stop Telegram bot polling
    if (botInstance) {
      logger.info('Stopping Telegram bot...');
      botInstance.stop(signal);
    }

    // 2. Close HTTP Server
    if (httpServer) {
      await new Promise((resolve) => {
        logger.info('Closing HTTP server...');
        httpServer.close(() => {
          logger.info('HTTP server closed.');
          resolve();
        });
      });
    }

    // 3. Disconnect Database
    await disconnectDatabase();

    logger.info('Graceful shutdown completed. Exiting cleanly.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown sequence:', err);
    process.exit(1);
  }
}

// Process lifecycle event handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection at:', { promise, reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err);
  gracefulShutdown('uncaughtException');
});

// Run Bootstrap
bootstrap().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
