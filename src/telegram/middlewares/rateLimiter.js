import { logger } from '../../utils/logger.js';

// Map: telegramId -> Array<timestamps>
const userRequestTimestamps = new Map();

// Configuration
const WINDOW_MS = 2000;      // 2-second sliding window
const MAX_REQUESTS = 8;      // Max 8 requests per 2s window (generous for human gameplay)
const FLOOD_THRESHOLD = 15;  // 15+ requests indicates automated spam script

/**
 * Clean up old entries from the map periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of userRequestTimestamps.entries()) {
    const valid = timestamps.filter(t => now - t < WINDOW_MS);
    if (valid.length === 0) {
      userRequestTimestamps.delete(userId);
    } else {
      userRequestTimestamps.set(userId, valid);
    }
  }
}, 30000).unref?.();

/**
 * Checks and updates rate limit for a user.
 * @param {string} userId
 * @returns {{ allowed: boolean, isFlood: boolean, count: number }}
 */
export function checkRateLimit(userId) {
  const now = Date.now();
  const id = String(userId);
  const timestamps = (userRequestTimestamps.get(id) || []).filter(t => now - t < WINDOW_MS);

  timestamps.push(now);
  userRequestTimestamps.set(id, timestamps);

  const count = timestamps.length;
  const isFlood = count >= FLOOD_THRESHOLD;
  const allowed = count <= MAX_REQUESTS;

  return { allowed, isFlood, count };
}

/**
 * Rate Limiter Middleware
 * Protects Telegram bot from flood attacks and excessive command spam.
 */
export async function rateLimiterMiddleware(ctx, next) {
  const userId = ctx.from?.id ? String(ctx.from.id) : null;
  if (!userId) {
    return next();
  }

  const { allowed, isFlood, count } = checkRateLimit(userId);

  if (isFlood) {
    logger.warn(`[SECURITY] [SPAM_DETECTED] User ${userId} exceeded flood threshold (${count} reqs in ${WINDOW_MS}ms)`);
  }

  if (!allowed) {
    const warningText = '⏳ Thoda dheere! Please wait a moment before sending more commands.';

    if (ctx.callbackQuery) {
      if (typeof ctx.answerCbQuery === 'function') {
        await ctx.answerCbQuery(warningText, { show_alert: true }).catch(() => {});
      } else if (typeof ctx.callbackQuery.answerCbQuery === 'function') {
        await ctx.callbackQuery.answerCbQuery(warningText, { show_alert: true }).catch(() => {});
      }
    } else if (ctx.chat?.type === 'private') {
      await ctx.reply(warningText).catch(() => {});
    }

    return; // Drop flood request
  }

  return next();
}

export default rateLimiterMiddleware;
