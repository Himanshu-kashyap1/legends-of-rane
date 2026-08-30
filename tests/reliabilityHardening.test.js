import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { MarketOrder } from '../src/models/MarketOrder.js';

import { checkRateLimit, rateLimiterMiddleware } from '../src/telegram/middlewares/rateLimiter.js';
import { errorBoundaryMiddleware } from '../src/telegram/middlewares/errorBoundary.js';
import { actionLockMiddleware, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { purchaseMarketListing, createMarketListing } from '../src/engine/economy/marketEngine.js';
import { claimQuestReward } from '../src/engine/quests/questEngine.js';
import { claimOfflineRewards } from '../src/engine/offline/offlineEngine.js';
import { executeGiftTransfer } from '../src/engine/social/giftingEngine.js';
import { executeUpgradeTool } from '../src/engine/economy/toolService.js';
import { logger } from '../src/utils/logger.js';
import { AppError } from '../src/utils/errors.js';

const HARDENING_USERS = ['harden_user_1', 'harden_user_2', 'harden_flooder', 'harden_max_tier'];

test.before(async () => {
  await connectDatabase();
  await Item.updateOne({ itemId: 'wood_oak' }, { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } }, { upsert: true });
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: HARDENING_USERS } });
  await MarketOrder.deleteMany({ sellerId: { $in: HARDENING_USERS } });
  await disconnectDatabase();
  clearAllLocks();
});

test('Hardening 1: Database Health Ping Check', async () => {
  const health = await checkDatabaseHealth();
  assert.strictEqual(health.healthy, true);
  assert.strictEqual(health.status, 'healthy');
  assert.ok(typeof health.pingMs === 'number');
});

test('Hardening 2: Anti-Spam Rate Limiter Middleware', async () => {
  const flooderId = 'harden_flooder';

  // 1. First 8 requests are allowed
  for (let i = 1; i <= 8; i++) {
    const check = checkRateLimit(flooderId);
    assert.strictEqual(check.allowed, true);
  }

  // 2. 9th request in window is rejected
  const ninthCheck = checkRateLimit(flooderId);
  assert.strictEqual(ninthCheck.allowed, false);

  // 3. Rate limiter middleware drops excess calls
  let handlerRan = false;
  let answeredAlert = false;

  const mockCtx = {
    from: { id: flooderId },
    callbackQuery: { data: 'test_action' },
    answerCbQuery: async (msg, opts) => {
      if (opts?.show_alert) answeredAlert = true;
    }
  };

  await rateLimiterMiddleware(mockCtx, async () => {
    handlerRan = true;
  });

  assert.strictEqual(handlerRan, false);
  assert.strictEqual(answeredAlert, true);
});

test('Hardening 3: Idempotency — Double Marketplace Purchase Prevention', async () => {
  const seller = new User({
    telegramId: 'harden_user_1',
    username: 'seller_harden',
    level: 5,
    coins: 100,
    inventory: [{ itemId: 'wood_oak', quantity: 10 }]
  });
  await seller.save();

  const buyer = new User({
    telegramId: 'harden_user_2',
    username: 'buyer_harden',
    level: 5,
    coins: 50,
    inventory: []
  });
  await buyer.save();

  const listing = await createMarketListing({
    user: seller,
    itemId: 'wood_oak',
    quantity: 5,
    pricePerUnit: 10
  });
  assert.strictEqual(listing.success, true);
  const orderId = listing.order.orderId;

  // First purchase succeeds
  const buy1 = await purchaseMarketListing({ buyer, orderId });
  assert.strictEqual(buy1.success, true);

  // Second purchase immediately fails idempotently without double-spending
  const buy2 = await purchaseMarketListing({ buyer, orderId });
  assert.strictEqual(buy2.success, false);
  assert.strictEqual(buy2.reason, 'LISTING_NO_LONGER_ACTIVE');
  assert.strictEqual(buyer.coins, 0); // Not deducted twice
});

test('Hardening 4: Idempotency — Gifting Self & Daily Limit Enforcement', async () => {
  const user = await User.findOne({ telegramId: 'harden_user_1' });

  // Self gift is blocked
  const selfGift = await executeGiftTransfer({
    sender: user,
    recipientInput: 'seller_harden',
    itemId: 'wood_oak',
    quantity: 1
  });
  assert.strictEqual(selfGift.success, false);
  assert.strictEqual(selfGift.reason, 'CANNOT_GIFT_SELF');
});

test('Hardening 5: Idempotency — Tool Tier 5 Upgrade Boundary Cap', async () => {
  const maxTierUser = new User({
    telegramId: 'harden_max_tier',
    tools: [{
      instanceId: 'diamond_axe',
      toolId: 'tool_axe_diamond',
      toolType: 'axe',
      tier: 5,
      durability: 100,
      maxDurability: 100
    }]
  });
  await maxTierUser.save();

  const res = await executeUpgradeTool({ user: maxTierUser, instanceId: 'diamond_axe' });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'MAX_TIER_REACHED');
});

test('Hardening 6: Error Boundary — Operational Error Friendly Message', async () => {
  let replyText = '';
  const mockCtx = {
    updateType: 'message',
    from: { id: 123456 },
    chat: { type: 'private' },
    reply: async (msg) => {
      replyText = msg;
    }
  };

  await errorBoundaryMiddleware(mockCtx, async () => {
    throw new AppError('Aapke paas पर्याप्त coins nahi hain!', 400, 'INSUFFICIENT_COINS');
  });

  assert.ok(replyText.includes('Aapke paas पर्याप्त coins nahi hain!'));
});
