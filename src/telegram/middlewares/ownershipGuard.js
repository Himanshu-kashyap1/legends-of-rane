import { parseCallback } from '../buttons/callbackData.js';
import { logger } from '../../utils/logger.js';
import { UnauthorizedError } from '../../utils/errors.js';

/**
 * Ownership Guard Middleware
 * Protects interactive inline buttons from being hijacked by other users in group/supergroup chats.
 */
export async function ownershipGuardMiddleware(ctx, next) {
  // Only callback queries have button ownership to validate
  if (!ctx.callbackQuery || !ctx.callbackQuery.data) {
    return next();
  }

  const rawData = ctx.callbackQuery.data;
  const parsed = parseCallback(rawData);

  if (!parsed.isValid) {
    logger.warn(`Malformed callback_data received from user ${ctx.from?.id}: ${rawData}`);
    if (typeof ctx.answerCbQuery === 'function') {
      await ctx.answerCbQuery('⚠️ Invalid or expired button.', { show_alert: true }).catch(() => {});
    } else if (typeof ctx.callbackQuery?.answerCbQuery === 'function') {
      await ctx.callbackQuery.answerCbQuery('⚠️ Invalid or expired button.', { show_alert: true }).catch(() => {});
    }
    return;
  }

  // Attach parsed callback data to context state
  ctx.state = ctx.state || {};
  ctx.state.callback = parsed;

  // If callback is explicitly public, any group member can interact
  if (parsed.isPublic) {
    return next();
  }

  const clickerId = ctx.from ? String(ctx.from.id) : null;
  const ownerId = String(parsed.ownerId);

  // Validate that the user who clicked matches the owner encoded in the button
  if (clickerId !== ownerId) {
    logger.debug(`Ownership violation: User ${clickerId} attempted to click button owned by ${ownerId} [Action: ${parsed.action}]`);
    
    if (typeof ctx.answerCbQuery === 'function') {
      await ctx.answerCbQuery('⛔ This menu belongs to another adventurer!', { show_alert: true }).catch(() => {});
    } else if (typeof ctx.callbackQuery?.answerCbQuery === 'function') {
      await ctx.callbackQuery.answerCbQuery('⛔ This menu belongs to another adventurer!', { show_alert: true }).catch(() => {});
    }
    
    throw new UnauthorizedError(`Ownership violation: clicker ${clickerId} is not owner ${ownerId}`);
  }

  return next();
}

export default ownershipGuardMiddleware;
