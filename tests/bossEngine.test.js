import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Boss } from '../src/models/Boss.js';
import {
  spawnOrGetGroupBoss,
  calculatePlayerAttackDamage,
  executeBossAttack,
  distributeBossRewards
} from '../src/engine/combat/bossEngine.js';
import { BOSS_COMBAT_CONFIG } from '../src/engine/combat/bossConfig.js';
import { renderPrivateChatError } from '../src/telegram/views/bossView.js';
import { actionLockMiddleware, isLocked, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { encodeCallback } from '../src/telegram/buttons/callbackData.js';
import { ConcurrencyError } from '../src/utils/errors.js';

test.before(async () => {
  await connectDatabase();
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['boss_slayer_1', 'boss_slayer_2'] } });
  await Boss.deleteMany({ chatId: { $in: ['-100123456', '-100987654'] } });
  await disconnectDatabase();
  clearAllLocks();
});

test('1. Boss spawn and duplicate spawn prevention per group chat', async () => {
  const chatId = '-100123456';
  await Boss.deleteMany({ chatId });

  // 1. Initial Spawn
  const res1 = await spawnOrGetGroupBoss({ chatId });
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.isNew, true);
  assert.strictEqual(res1.boss.currentHp, 5000);
  assert.strictEqual(res1.boss.status, 'active');

  // 2. Duplicate Spawn Request (Should return existing)
  const res2 = await spawnOrGetGroupBoss({ chatId });
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.isNew, false);
  assert.strictEqual(String(res2.boss._id), String(res1.boss._id));
});

test('2. Server-side damage calculation with level and tool tier scaling', () => {
  const userLow = { level: 1, tools: [] };
  const dmgLow = calculatePlayerAttackDamage({ user: userLow, rngProvider: () => 0.9 });
  // Base: 50 + (1 * 10) = 60
  assert.strictEqual(dmgLow.finalDamage, 60);
  assert.strictEqual(dmgLow.isCrit, false);

  const userGeared = {
    level: 5,
    tools: [{ toolId: 'tool_pickaxe_diamond', tier: 5, equipped: true }]
  };
  const dmgGeared = calculatePlayerAttackDamage({ user: userGeared, rngProvider: () => 0.05 }); // Crit!
  // Base: 50 + (5 * 10) = 100; Tool Bonus: 5 * 25 = 125; Total = 225. Crit = 225 * 2 = 450
  assert.strictEqual(dmgGeared.finalDamage, 450);
  assert.strictEqual(dmgGeared.isCrit, true);
});

test('3, 4. Valid attack, energy deduction, and insufficient energy rejection', async () => {
  const chatId = '-100123456';
  const user = {
    telegramId: 'boss_slayer_1',
    level: 1,
    energy: { current: 15, max: 100, lastRegen: new Date() },
    statistics: { bossDamageDealt: 0 }
  };

  // 1. Valid Attack (Cost: 10⚡)
  const attackRes = await executeBossAttack({ user, chatId, rngProvider: () => 0.9 });
  assert.strictEqual(attackRes.success, true);
  assert.strictEqual(attackRes.damageDealt, 60);
  assert.strictEqual(user.energy.current, 5); // 15 - 10
  assert.strictEqual(user.statistics.bossDamageDealt, 60);

  // 2. Insufficient Energy Attack (Has 5⚡, Needs 10⚡)
  const lowEnergyRes = await executeBossAttack({ user, chatId });
  assert.strictEqual(lowEnergyRes.success, false);
  assert.strictEqual(lowEnergyRes.reason, 'INSUFFICIENT_ENERGY');
  assert.strictEqual(user.energy.current, 5); // Untouched
});

test('5, 6. Boss defeat detection and proportional reward distribution', async () => {
  const chatId = '-100123456';
  const boss = await Boss.findOne({ chatId, status: 'active' });
  boss.currentHp = 100; // Low HP

  // Create Users in Database for reward distribution
  await User.updateOne({ telegramId: 'boss_slayer_1' }, { $set: { telegramId: 'boss_slayer_1', coins: 100, level: 1, xp: 0, inventory: [] } }, { upsert: true });
  await User.updateOne({ telegramId: 'boss_slayer_2' }, { $set: { telegramId: 'boss_slayer_2', coins: 50, level: 1, xp: 0, inventory: [] } }, { upsert: true });

  boss.participants = [
    { telegramId: 'boss_slayer_1', username: '@slayer1', damageDealt: 3000, attackCount: 5, lastAttackAt: new Date() },
    { telegramId: 'boss_slayer_2', username: '@slayer2', damageDealt: 1900, attackCount: 3, lastAttackAt: new Date() }
  ];
  boss.totalDamageDealt = 4900;
  await boss.save();

  // Final lethal strike by slayer 2 (+100 DMG -> 5000 total DMG)
  const user2 = {
    telegramId: 'boss_slayer_2',
    level: 10,
    energy: { current: 100, max: 100, lastRegen: new Date() },
    statistics: { bossDamageDealt: 1900 }
  };

  const finalStrike = await executeBossAttack({ user: user2, chatId, rngProvider: () => 0.9 });
  assert.strictEqual(finalStrike.success, true);
  assert.strictEqual(finalStrike.isDefeated, true);
  assert.strictEqual(finalStrike.remainingHp, 0);

  // Verify rewards distributed in Database
  const updatedPlayer1 = await User.findOne({ telegramId: 'boss_slayer_1' });
  const updatedPlayer2 = await User.findOne({ telegramId: 'boss_slayer_2' });

  // Slayer 1 dealt 3000 / 5000 = 60% of damage -> 60% of 5000 coins = 3000 coins + 225 milestone level-up bonuses
  assert.strictEqual(updatedPlayer1.coins, 3325); // 100 initial + 3000 reward + 225 level bonuses
  // Slayer 2 dealt 2000 / 5000 = 40% of damage -> 40% of 5000 coins = 2000 coins + 225 level-up bonuses
  assert.strictEqual(updatedPlayer2.coins, 2275); // 50 initial + 2000 reward + 225 level bonuses

  // Slayer 1 has >15% contribution -> received Diamond Gem
  assert.ok(updatedPlayer1.inventory.find(i => i.itemId === 'gem_diamond'));

  // Double reward prevention
  const reDistribution = await distributeBossRewards({ boss: finalStrike.boss });
  assert.deepStrictEqual(reDistribution, []);
});

test('7. Group chat isolation: Chat A and Chat B have independent boss instances', async () => {
  const chatA = '-100123456';
  const chatB = '-100987654';

  const bossA = await spawnOrGetGroupBoss({ chatId: chatA });
  const bossB = await spawnOrGetGroupBoss({ chatId: chatB });

  assert.notStrictEqual(String(bossA.boss._id), String(bossB.boss._id));
  assert.strictEqual(bossA.boss.chatId, chatA);
  assert.strictEqual(bossB.boss.chatId, chatB);
});

test('8. Concurrent attack double-click protection via ActionLock', async () => {
  const telegramId = 'boss_slayer_1';
  clearAllLocks();

  const ctx = {
    from: { id: telegramId },
    callbackQuery: { data: 'boss_attack_do:-100123456' },
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

test('9. Private chat error view renders proper guidance', () => {
  const errorView = renderPrivateChatError();
  assert.ok(errorView.text.includes('GROUP RAID ONLY'));
  assert.ok(errorView.text.includes('/boss'));
});
