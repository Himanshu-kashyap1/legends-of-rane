import { logger } from '../../utils/logger.js';
import { AppError, UnauthorizedError, ConcurrencyError } from '../../utils/errors.js';

/**
 * Error Boundary Middleware
 * Catches all errors from downstream handlers and provides safe, user-friendly responses.
 */
export async function errorBoundaryMiddleware(ctx, next) {
  try {
    await next();
  } catch (err) {
    // 1. Concurrency and ownership violations are already answered via alert in their respective middlewares
    if (err instanceof UnauthorizedError || err instanceof ConcurrencyError) {
      return;
    }

    // 2. Log server-side with full sanitized stack
    logger.error(`Error handling Telegram update [type=${ctx.updateType}, user=${ctx.from?.id}]:`, err);

    // 3. User-facing feedback
    try {
      const friendlyMessage = err instanceof AppError && err.isOperational
        ? `⚠️ ${err.message}`
        : '⚓ An unexpected error occurred. The Grand Council is investigating. Please try again.';

      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(friendlyMessage, { show_alert: true }).catch(() => {});
      } else if (ctx.chat?.type === 'private') {
        await ctx.reply(friendlyMessage).catch(() => {});
      }
    } catch (replyErr) {
      logger.error('Failed to deliver error response to player:', replyErr);
    }
  }
}

export default errorBoundaryMiddleware;
