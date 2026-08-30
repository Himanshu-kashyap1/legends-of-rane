import { User } from '../../models/User.js';
import { Item } from '../../models/Item.js';
import { GiftRecord } from '../../models/GiftRecord.js';
import { logger } from '../../utils/logger.js';

export const MIN_GIFT_LEVEL = 3;
export const MAX_DAILY_GIFTS = 5;

/**
 * Checks and resets the daily gifting counter if a new UTC day has started.
 * @param {Object} user
 * @param {Date} [now=new Date()]
 * @returns {{ giftsSentToday: number, remainingGiftsToday: number }}
 */
export function checkDailyGifts(user, now = new Date()) {
  if (!user.gifting) {
    user.gifting = { dailySentCount: 0, lastGiftDate: '' };
  }

  const currentDateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  if (user.gifting.lastGiftDate !== currentDateStr) {
    user.gifting.dailySentCount = 0;
    user.gifting.lastGiftDate = currentDateStr;
  }

  const giftsSentToday = user.gifting.dailySentCount || 0;
  const remainingGiftsToday = Math.max(0, MAX_DAILY_GIFTS - giftsSentToday);

  return {
    giftsSentToday,
    remainingGiftsToday
  };
}

/**
 * Resolves a recipient user by Telegram username or Telegram ID.
 * @param {string} recipientInput
 * @returns {Promise<Object|null>}
 */
export async function resolveRecipient(recipientInput) {
  if (!recipientInput) return null;
  const cleanInput = String(recipientInput).trim().replace(/^@/, '');

  if (!cleanInput) return null;

  // Search by exact username (case-insensitive) or numeric telegram ID
  const isNumeric = /^\d+$/.test(cleanInput);
  const query = isNumeric
    ? { $or: [{ telegramId: cleanInput }, { username: new RegExp(`^${cleanInput}$`, 'i') }] }
    : { username: new RegExp(`^${cleanInput}$`, 'i') };

  return User.findOne(query);
}

/**
 * Validates whether a gift transfer can proceed.
 * @param {Object} params
 * @param {Object} params.sender
 * @param {string} params.recipientInput
 * @param {string} params.itemId
 * @param {number} params.quantity
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>}
 */
export async function validateGift({ sender, recipientInput, itemId, quantity, now = new Date() }) {
  if (!sender) {
    return { valid: false, reason: 'INVALID_SENDER' };
  }

  // 1. Level Requirement (Level 3+)
  const senderLevel = sender.level || 1;
  if (senderLevel < MIN_GIFT_LEVEL) {
    return {
      valid: false,
      reason: 'INSUFFICIENT_LEVEL',
      requiredLevel: MIN_GIFT_LEVEL,
      currentLevel: senderLevel
    };
  }

  // 2. Daily Gifting Limit (Max 5 per day)
  const { giftsSentToday, remainingGiftsToday } = checkDailyGifts(sender, now);
  if (remainingGiftsToday <= 0) {
    return {
      valid: false,
      reason: 'DAILY_LIMIT_REACHED',
      maxDaily: MAX_DAILY_GIFTS,
      giftsSentToday
    };
  }

  // 3. Validate Quantity
  const qty = Math.floor(Number(quantity) || 0);
  if (qty <= 0) {
    return { valid: false, reason: 'INVALID_QUANTITY', quantity: qty };
  }

  // 4. Validate Item in Catalog
  const cleanItemId = String(itemId || '').trim().toLowerCase();
  const itemDef = await Item.findOne({ itemId: cleanItemId }).lean();
  if (!itemDef) {
    return { valid: false, reason: 'ITEM_NOT_FOUND', itemId: cleanItemId };
  }

  // 5. Validate Sender Inventory
  sender.inventory = sender.inventory || [];
  const senderStack = sender.inventory.find(i => i && i.itemId === cleanItemId);
  const ownedQty = senderStack?.quantity || 0;

  if (ownedQty < qty) {
    return {
      valid: false,
      reason: 'INSUFFICIENT_INVENTORY',
      required: qty,
      owned: ownedQty,
      itemId: cleanItemId
    };
  }

  // 6. Resolve Recipient
  const recipient = await resolveRecipient(recipientInput);
  if (!recipient) {
    return {
      valid: false,
      reason: 'RECIPIENT_NOT_FOUND',
      recipientInput
    };
  }

  // 7. Self-Gift Protection
  if (String(sender.telegramId) === String(recipient.telegramId)) {
    return {
      valid: false,
      reason: 'CANNOT_GIFT_SELF'
    };
  }

  return {
    valid: true,
    sender,
    recipient,
    itemDef,
    qty,
    senderStack,
    giftsSentToday,
    remainingGiftsToday
  };
}

/**
 * Atomically executes a gift transfer from sender to recipient.
 *
 * @param {Object} params
 * @param {Object} params.sender - Mongoose User document
 * @param {string} params.recipientInput - Username or Telegram ID
 * @param {string} params.itemId - Item ID to gift
 * @param {number} params.quantity - Quantity of items
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>}
 */
export async function executeGiftTransfer({ sender, recipientInput, itemId, quantity, now = new Date() }) {
  const validation = await validateGift({ sender, recipientInput, itemId, quantity, now });
  if (!validation.valid) {
    return {
      success: false,
      reason: validation.reason,
      requiredLevel: validation.requiredLevel,
      currentLevel: validation.currentLevel,
      maxDaily: validation.maxDaily,
      required: validation.required,
      owned: validation.owned,
      recipientInput: validation.recipientInput,
      itemId: validation.itemId
    };
  }

  const { recipient, itemDef, qty, senderStack } = validation;
  const currentDateStr = now.toISOString().slice(0, 10);

  // 1. Deduct from Sender
  senderStack.quantity -= qty;
  sender.gifting = sender.gifting || {};
  sender.gifting.dailySentCount = (sender.gifting.dailySentCount || 0) + 1;
  sender.gifting.lastGiftDate = currentDateStr;

  if (!sender.statistics) sender.statistics = {};
  sender.statistics.giftsSent = (sender.statistics.giftsSent || 0) + 1;
  sender.lastActiveAt = now;

  if (typeof sender.save === 'function') {
    sender.markModified('inventory');
    sender.markModified('gifting');
    sender.markModified('statistics');
    await sender.save();
  }

  // 2. Add to Recipient (Immediate offline recipient update)
  recipient.inventory = recipient.inventory || [];
  const recipientStack = recipient.inventory.find(i => i && i.itemId === itemDef.itemId);
  if (recipientStack) {
    recipientStack.quantity = (recipientStack.quantity || 0) + qty;
  } else {
    recipient.inventory.push({
      itemId: itemDef.itemId,
      quantity: qty
    });
  }

  if (!recipient.statistics) recipient.statistics = {};
  recipient.statistics.giftsReceived = (recipient.statistics.giftsReceived || 0) + 1;

  if (typeof recipient.save === 'function') {
    recipient.markModified('inventory');
    recipient.markModified('statistics');
    await recipient.save();
  }

  // 3. Create Audit Record in GiftRecord collection
  const giftRecord = await GiftRecord.create({
    senderId: String(sender.telegramId),
    senderUsername: sender.username || '',
    recipientId: String(recipient.telegramId),
    recipientUsername: recipient.username || '',
    itemId: itemDef.itemId,
    quantity: qty,
    sentAt: now
  });

  logger.info(`Social Gift: Sender ${sender.telegramId} sent ${qty}x ${itemDef.itemId} to Recipient ${recipient.telegramId} [Gift ID: ${giftRecord.giftId}]`);

  const remainingDaily = Math.max(0, MAX_DAILY_GIFTS - sender.gifting.dailySentCount);

  return {
    success: true,
    giftId: giftRecord.giftId,
    senderId: sender.telegramId,
    recipientId: recipient.telegramId,
    recipientName: recipient.username ? `@${recipient.username}` : (recipient.firstName || 'Adventurer'),
    itemId: itemDef.itemId,
    itemDisplayName: itemDef.displayName,
    itemEmoji: itemDef.emoji || '🎁',
    quantity: qty,
    giftsSentToday: sender.gifting.dailySentCount,
    remainingGiftsToday: remainingDaily,
    remainingInventory: senderStack.quantity
  };
}

export default {
  MIN_GIFT_LEVEL,
  MAX_DAILY_GIFTS,
  checkDailyGifts,
  resolveRecipient,
  validateGift,
  executeGiftTransfer
};
