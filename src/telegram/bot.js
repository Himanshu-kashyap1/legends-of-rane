import { Telegraf } from 'telegraf';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { errorBoundaryMiddleware } from './middlewares/errorBoundary.js';
import { rateLimiterMiddleware } from './middlewares/rateLimiter.js';
import { userLoaderMiddleware } from './middlewares/userLoader.js';
import { actionLockMiddleware } from './middlewares/actionLock.js';
import { ownershipGuardMiddleware } from './middlewares/ownershipGuard.js';
import { callbackRouter } from './buttons/callbackRouter.js';
import { registerCommands } from './commands/index.js';

let botInstance = null;

/**
 * Initializes and configures the Telegraf bot instance with the full middleware pipeline.
 * @returns {Telegraf}
 */
export function createBot() {
  if (!config.BOT_TOKEN) {
    logger.warn('BOT_TOKEN is not provided. Bot instance initialized in standby/mock mode.');
    return null;
  }

  const bot = new Telegraf(config.BOT_TOKEN);

  // Global bot error handler fallback
  bot.catch((err, ctx) => {
    logger.error(`Unhandled Telegraf error [type=${ctx.updateType}]:`, err);
  });

  // --- MIDDLEWARE PIPELINE (Strict Order) ---
  // 1. Error Boundary
  bot.use(errorBoundaryMiddleware);

  // 2. Anti-Spam Rate Limiter
  bot.use(rateLimiterMiddleware);

  // 3. User Loader & Registration
  bot.use(userLoaderMiddleware);

  // 3. Action Concurrency Locking
  bot.use(actionLockMiddleware);

  // 4. Ownership Guard for Callbacks
  bot.use(ownershipGuardMiddleware);

  // 5. Callback Router for Inline Button Actions
  bot.on('callback_query', callbackRouter);

  // 6. Command Registration (/start, /explore, etc.)
  registerCommands(bot);

  botInstance = bot;
  return bot;
}

/**
 * Get current bot instance.
 * @returns {Telegraf|null}
 */
export function getBot() {
  return botInstance;
}

export default {
  createBot,
  getBot
};
