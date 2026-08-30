import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { GiftRecord } from '../src/models/GiftRecord.js';
import {
  executeGiftTransfer,
  validateGift,
  checkDailyGifts,
  resolveRecipient
} from '../src/engine/social/giftingEngine.js';
import { actionLockMiddleware, isLocked, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { ConcurrencyError } from '../src/utils/errors.js';

test.before(async () => {
  await connectDatabase();
  await Item.updateOne({ itemId: 'wood_oak' }, { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } }, { upsert: true });
  await Item.updateOne({ itemId: 'ingot_iron' }, { $set: { itemId: 'ingot_iron', displayName: 'Iron Ingot', emoji: '🔩', category: 'refined_ingot', basePrice: 35 } }, { upsert: true });
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['gift_sender_1', 'gift_recipient_1', 'gift_low_level', 'gift_self_user'] } });
  await GiftRecord.deleteMany({ senderId: { $in: ['gift_sender_1', 'gift_low_level', 'gift_self_user'] } });
  await disconnectDatabase();
  clearAllLocks();
});

test('1. Valid gift: Level 3+ sender transfers item to recipient with GiftRecord audit', async () => {
  const sender = await User.create({
    telegramId: 'gift_sender_1',
    username: 'generous_sender',
    level: 3,
    inventory: [{ itemId: 'wood_oak', quantity: 20 }],
    gifting: { dailySentCount: 0, lastGiftDate: new Date().toISOString().slice(0, 10) }
  });

  const recipient = await User.create({
    telegramId: 'gift_recipient_1',
    username: 'happy_friend',
    level: 1,
    inventory: []
  });

  const result = await executeGiftTransfer({
    sender,
    recipientInput: 'happy_friend',
    itemId: 'wood_oak',
    quantity: 5
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.quantity, 5);
  assert.strictEqual(result.giftsSentToday, 1);
  assert.strictEqual(result.remainingGiftsToday, 4);

  // Verify Sender Inventory & Stats
  const updatedSender = await User.findOne({ telegramId: 'gift_sender_1' });
  assert.strictEqual(updatedSender.inventory.find(i => i.itemId === 'wood_oak').quantity, 15);
  assert.strictEqual(updatedSender.gifting.dailySentCount, 1);
  assert.strictEqual(updatedSender.statistics.giftsSent, 1);

  // Verify Recipient Inventory & Stats (Immediate transfer)
  const updatedRecipient = await User.findOne({ telegramId: 'gift_recipient_1' });
  assert.strictEqual(updatedRecipient.inventory.find(i => i.itemId === 'wood_oak').quantity, 5);
  assert.strictEqual(updatedRecipient.statistics.giftsReceived, 1);

  // Verify Audit Log in GiftRecord
  const audit = await GiftRecord.findOne({ giftId: result.giftId });
  assert.ok(audit);
  assert.strictEqual(audit.senderId, 'gift_sender_1');
  assert.strictEqual(audit.recipientId, 'gift_recipient_1');
  assert.strictEqual(audit.quantity, 5);
});

test('2. Level < 3 rejected with INSUFFICIENT_LEVEL', async () => {
  const lowLevelSender = await User.create({
    telegramId: 'gift_low_level',
    username: 'rookie_player',
    level: 2,
    inventory: [{ itemId: 'wood_oak', quantity: 10 }]
  });

  const result = await executeGiftTransfer({
    sender: lowLevelSender,
    recipientInput: 'happy_friend',
    itemId: 'wood_oak',
    quantity: 2
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.reason, 'INSUFFICIENT_LEVEL');
  assert.strictEqual(result.requiredLevel, 3);
  assert.strictEqual(result.currentLevel, 2);
  assert.strictEqual(lowLevelSender.inventory[0].quantity, 10); // Untouched
});

test('3, 4. 5 gifts allowed per day; 6th rejected; resets on next UTC day', async () => {
  const sender = await User.findOne({ telegramId: 'gift_sender_1' });
  sender.inventory = [{ itemId: 'wood_oak', quantity: 50 }];
  sender.gifting = {
    dailySentCount: 4,
    lastGiftDate: new Date().toISOString().slice(0, 10)
  };
  await sender.save();

  // 5th Gift (Should Succeed)
  const gift5 = await executeGiftTransfer({
    sender,
    recipientInput: 'happy_friend',
    itemId: 'wood_oak',
    quantity: 1
  });
  assert.strictEqual(gift5.success, true);
  assert.strictEqual(gift5.giftsSentToday, 5);
  assert.strictEqual(gift5.remainingGiftsToday, 0);

  // 6th Gift on same day (Should Fail)
  const gift6 = await executeGiftTransfer({
    sender,
    recipientInput: 'happy_friend',
    itemId: 'wood_oak',
    quantity: 1
  });
  assert.strictEqual(gift6.success, false);
  assert.strictEqual(gift6.reason, 'DAILY_LIMIT_REACHED');

  // Daily Reset on new UTC Day
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const resetCheck = checkDailyGifts(sender, tomorrow);
  assert.strictEqual(resetCheck.giftsSentToday, 0);
  assert.strictEqual(resetCheck.remainingGiftsToday, 5);

  const giftNextDay = await executeGiftTransfer({
    sender,
    recipientInput: 'happy_friend',
    itemId: 'wood_oak',
    quantity: 1,
    now: tomorrow
  });
  assert.strictEqual(giftNextDay.success, true);
  assert.strictEqual(giftNextDay.giftsSentToday, 1);
});

test('5, 6, 7. Insufficient inventory, unknown recipient, and self-gift validations', async () => {
  const sender = await User.findOne({ telegramId: 'gift_sender_1' });
  sender.inventory = [{ itemId: 'wood_oak', quantity: 2 }];
  sender.gifting = { dailySentCount: 0, lastGiftDate: new Date().toISOString().slice(0, 10) };
  await sender.save();

  // Insufficient Inventory
  const res1 = await executeGiftTransfer({
    sender,
    recipientInput: 'happy_friend',
    itemId: 'wood_oak',
    quantity: 10
  });
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.reason, 'INSUFFICIENT_INVENTORY');

  // Recipient Not Found
  const res2 = await executeGiftTransfer({
    sender,
    recipientInput: 'ghost_player_999',
    itemId: 'wood_oak',
    quantity: 1
  });
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.reason, 'RECIPIENT_NOT_FOUND');

  // Self Gifting
  const res3 = await executeGiftTransfer({
    sender,
    recipientInput: 'generous_sender',
    itemId: 'wood_oak',
    quantity: 1
  });
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.reason, 'CANNOT_GIFT_SELF');
});

test('9. Concurrent gifting double-click protection via ActionLock', async () => {
  const telegramId = 'gift_sender_1';
  clearAllLocks();

  const ctx = {
    from: { id: telegramId },
    callbackQuery: { data: 'gift:wood_oak' },
    answerCbQuery: async () => {}
  };

  let concurrentBlocked = false;
  await actionLockMiddleware(ctx, async () => {
    assert.strictEqual(isLocked(telegramId), true);
    try {
      await actionLockMiddleware(ctx, async () => {});
    } catch (err) {
      if (err instanceof ConcurrencyError) concurrentBlocked = true;
    }
  });

  assert.strictEqual(concurrentBlocked, true);
  assert.strictEqual(isLocked(telegramId), false);
});
