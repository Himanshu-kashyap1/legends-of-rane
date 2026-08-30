import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import {
  calculateOfflineEarnings,
  claimOfflineRewards
} from '../src/engine/offline/offlineEngine.js';
import { OFFLINE_CONFIG, STRUCTURES } from '../src/engine/offline/structureConfig.js';
import { actionLockMiddleware, isLocked, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { encodeCallback } from '../src/telegram/buttons/callbackData.js';
import { UnauthorizedError, ConcurrencyError } from '../src/utils/errors.js';

test.before(async () => {
  await connectDatabase();
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['offline_hero_1', 'offline_hero_2', 'offline_pet_hero'] } });
  await disconnectDatabase();
  clearAllLocks();
});

test('1. Zero / minimal offline time (<5 mins) rejects earnings safely', () => {
  const now = new Date();
  const user = {
    telegramId: 'offline_hero_1',
    offline: {
      lastLogoutAt: new Date(now.getTime() - 2 * 60 * 1000) // 2 mins ago
    }
  };

  const res = calculateOfflineEarnings({ user, now });
  assert.strictEqual(res.hasEarnings, false);
  assert.strictEqual(res.reason, 'MINIMUM_TIME_NOT_MET');
});

test('2. Normal offline time (2 hours) calculates standard rates', () => {
  const now = new Date();
  const user = {
    telegramId: 'offline_hero_1',
    offline: {
      lastLogoutAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
    }
  };

  const res = calculateOfflineEarnings({ user, now });
  assert.strictEqual(res.hasEarnings, true);
  assert.strictEqual(res.isCapped, false);
  assert.strictEqual(res.coins, 20); // 10c/h * 2h = 20c
  assert.strictEqual(res.resources.find(r => r.itemId === 'wood_oak').quantity, 8); // 4/h * 2h = 8
  assert.strictEqual(res.resources.find(r => r.itemId === 'stone_granite').quantity, 6); // 3/h * 2h = 6
});

test('3. Max 12-hour simulation cap enforces cap even if away for 48 hours', () => {
  const now = new Date();
  const user = {
    telegramId: 'offline_hero_1',
    offline: {
      lastLogoutAt: new Date(now.getTime() - 48 * 60 * 60 * 1000) // 48 hours ago
    }
  };

  const res = calculateOfflineEarnings({ user, now });
  assert.strictEqual(res.hasEarnings, true);
  assert.strictEqual(res.isCapped, true);
  assert.strictEqual(res.coins, 120); // 10c/h * 12h = 120c
  assert.strictEqual(res.resources.find(r => r.itemId === 'wood_oak').quantity, 48); // 4/h * 12h = 48
  assert.strictEqual(res.resources.find(r => r.itemId === 'stone_granite').quantity, 36); // 3/h * 12h = 36
});

test('4. Active Companion Pet (River Otter) grants +20% offline earnings boost', () => {
  const now = new Date();
  const user = {
    telegramId: 'offline_pet_hero',
    activePet: 'pet_river_otter',
    pets: [{ petId: 'pet_river_otter', happiness: 100 }],
    offline: {
      lastLogoutAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
    }
  };

  const res = calculateOfflineEarnings({ user, now });
  assert.strictEqual(res.hasEarnings, true);
  assert.ok(res.petBonus);
  assert.strictEqual(res.petBonus.bonusPercent, 20);
  assert.strictEqual(res.coins, 24); // 20 * 1.20 = 24c
  assert.strictEqual(res.resources.find(r => r.itemId === 'wood_oak').quantity, 9); // floor(8 * 1.20) = 9
});

test('5, 6. Atomic claim deposits resources/coins and prevents duplicate second claim', async () => {
  const now = new Date();
  const user = {
    telegramId: 'offline_hero_2',
    coins: 100,
    inventory: [],
    offline: {
      lastLogoutAt: new Date(now.getTime() - 3 * 60 * 60 * 1000) // 3 hours ago
    }
  };

  // 1. Initial Valid Claim (3 hours away)
  const claimRes = await claimOfflineRewards({ user, now });
  assert.strictEqual(claimRes.success, true);
  assert.strictEqual(claimRes.earnings.coins, 30); // 10c/h * 3h
  assert.strictEqual(user.coins, 130); // 100 + 30
  assert.strictEqual(user.inventory.find(i => i.itemId === 'wood_oak').quantity, 12); // 4 * 3
  assert.strictEqual(user.inventory.find(i => i.itemId === 'stone_granite').quantity, 9); // 3 * 3

  // 2. Duplicate Claim Immediately After (Should Fail)
  const dupClaim = await claimOfflineRewards({ user, now });
  assert.strictEqual(dupClaim.success, false);
  assert.strictEqual(dupClaim.reason, 'MINIMUM_TIME_NOT_MET');
  assert.strictEqual(user.coins, 130); // Untouched
});

test('7. Concurrent claim protection via ActionLock', async () => {
  const telegramId = 'offline_hero_2';
  clearAllLocks();

  const ctx = {
    from: { id: telegramId },
    callbackQuery: { data: 'claim_offline_do' },
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

test('8. OwnershipGuard protects offline callbacks from third-party players', async () => {
  const playerA = '111111';
  const playerB = '222222';

  const callbackData = encodeCallback({ action: 'claim_offline_do', ownerId: playerA });

  const ctxB = {
    from: { id: playerB },
    callbackQuery: { data: callbackData },
    answerCbQuery: async () => {},
    state: {}
  };

  let rejected = false;
  try {
    await ownershipGuardMiddleware(ctxB, async () => {});
  } catch (err) {
    if (err instanceof UnauthorizedError) rejected = true;
  }

  assert.strictEqual(rejected, true);
});
