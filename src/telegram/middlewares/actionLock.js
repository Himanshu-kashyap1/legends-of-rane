import { logger } from '../../utils/logger.js';
import { ConcurrencyError } from '../../utils/errors.js';

// In-memory lock map: telegramId -> { acquiredAt: number, timeoutHandle: NodeJS.Timeout }
const activeLocks = new Map();
const DEFAULT_LOCK_TIMEOUT_MS = 6000;

/**
 * List of actions/commands considered state-changing and requiring concurrency locking.
 */
const STATE_MUTATING_ACTIONS = new Set([
  'gather',
  'gather_act',
  'craft',
  'cr_do',
  'ws_repair_do',
  'ws_upgrade_do',
  'buy',
  'sell',
  'mkt_buy_do',
  'mkt_cancel_do',
  'qst_claim_do',
  'claim_quest',
  'gift',
  'pet_adopt_do',
  'pet_feed_do',
  'pet_equip_do',
  'claim_offline_do',
  'boss_attack_do',
  'adopt_pet',
  'feed_pet',
  'equip',
  'place_block',
  'break_block'
]);

/**
 * Checks if a telegramId currently holds an active action lock.
 * @param {string} telegramId
 * @returns {boolean}
 */
export function isLocked(telegramId) {
  return activeLocks.has(String(telegramId));
}

/**
 * Acquires a concurrency lock for a user with automatic timeout failsafe.
 * @param {string} telegramId
 * @param {number} [timeoutMs=DEFAULT_LOCK_TIMEOUT_MS]
 * @returns {boolean} True if lock acquired, false if already locked
 */
export function acquireLock(telegramId, timeoutMs = DEFAULT_LOCK_TIMEOUT_MS) {
  const id = String(telegramId);
  if (activeLocks.has(id)) {
    return false;
  }

  const timeoutHandle = setTimeout(() => {
    if (activeLocks.has(id)) {
      logger.warn(`Action lock for user ${id} expired via failsafe timeout.`);
      activeLocks.delete(id);
    }
  }, timeoutMs);

  // Unref to not block process exit during tests
  if (timeoutHandle.unref) {
    timeoutHandle.unref();
  }

  activeLocks.set(id, {
    acquiredAt: Date.now(),
    timeoutHandle
  });

  return true;
}

/**
 * Releases the action lock for a user.
 * @param {string} telegramId
 */
export function releaseLock(telegramId) {
  const id = String(telegramId);
  const lock = activeLocks.get(id);
  if (lock) {
    clearTimeout(lock.timeoutHandle);
    activeLocks.delete(id);
  }
}

/**
 * Clears all active locks (primarily for testing).
 */
export function clearAllLocks() {
  for (const [id, lock] of activeLocks.entries()) {
    clearTimeout(lock.timeoutHandle);
  }
  activeLocks.clear();
}

/**
 * Determines whether the current Telegram update constitutes a state-changing action.
 * @param {Object} ctx
 * @returns {boolean}
 */
function isStateChangingUpdate(ctx) {
  // Check callback data
  if (ctx.callbackQuery?.data) {
    const raw = ctx.callbackQuery.data;
    const action = raw.split(':')[0];
    return STATE_MUTATING_ACTIONS.has(action);
  }

  // Check commands
  if (ctx.message?.text?.startsWith('/')) {
    const command = ctx.message.text.split(' ')[0].replace('/', '').toLowerCase();
    return ['sell', 'gift', 'gather', 'craft', 'attack'].includes(command);
  }

  return false;
}

/**
 * Action Lock Middleware
 * Enforces serial execution of state-changing transactions per player.
 */
export async function actionLockMiddleware(ctx, next) {
  const telegramId = ctx.from?.id ? String(ctx.from.id) : null;

  // Read-only updates or missing user identity do not acquire a lock
  if (!telegramId || !isStateChangingUpdate(ctx)) {
    return next();
  }

  const acquired = acquireLock(telegramId);
  if (!acquired) {
    logger.warn(`Blocked concurrent action attempt for user ${telegramId}`);
    
    if (typeof ctx.answerCbQuery === 'function') {
      await ctx.answerCbQuery('⏳ Action in progress! Please wait a moment.', { show_alert: true }).catch(() => {});
    } else if (typeof ctx.callbackQuery?.answerCbQuery === 'function') {
      await ctx.callbackQuery.answerCbQuery('⏳ Action in progress! Please wait a moment.', { show_alert: true }).catch(() => {});
    } else if (typeof ctx.reply === 'function') {
      await ctx.reply('⚠️ Please wait for your previous action to finish before starting another.').catch(() => {});
    }
    
    throw new ConcurrencyError(`Concurrent action blocked for user ${telegramId}`);
  }

  try {
    return await next();
  } finally {
    releaseLock(telegramId);
  }
}

export default actionLockMiddleware;
