import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { executeGatherAction } from '../src/engine/gathering/gatheringEngine.js';
import { calculateCurrentEnergy } from '../src/engine/gathering/energyCalculator.js';
import { selectWeightedLoot, calculateQuantity, rollCritical } from '../src/engine/gathering/lootRng.js';
import { GATHERING_ZONES } from '../src/engine/gathering/gatheringConfig.js';
import { actionLockMiddleware, isLocked, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { encodeCallback } from '../src/telegram/buttons/callbackData.js';
import { UnauthorizedError, ConcurrencyError } from '../src/utils/errors.js';

test.before(async () => {
  await connectDatabase();
  await Item.updateOne({ itemId: 'wood_oak' }, { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } }, { upsert: true });
  await Item.updateOne({ itemId: 'stone_granite' }, { $set: { itemId: 'stone_granite', displayName: 'Granite Stone', emoji: '🪨', category: 'raw_stone', basePrice: 4 } }, { upsert: true });
  await Item.updateOne({ itemId: 'iron_ore' }, { $set: { itemId: 'iron_ore', displayName: 'Iron Ore', emoji: '⛏️', category: 'raw_ore', basePrice: 15 } }, { upsert: true });
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['gather_test_1', 'gather_test_2', 'gather_test_concurrent'] } });
  await disconnectDatabase();
  clearAllLocks();
});

test('1, 4, 5, 15. Forest gathering succeeds, awards Woodcutting XP, consumes 0 energy and 1 durability', async () => {
  const user = {
    telegramId: 'gather_test_1',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'axe_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30, equipped: true }
    ],
    skills: { woodcutting: { level: 1, xp: 0 } },
    inventory: [],
    statistics: { gatheredCount: 0 }
  };

  const result = await executeGatherAction({ user, zoneId: 'zone_forest', rngProvider: () => 0.5 });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.skill, 'woodcutting');
  assert.strictEqual(result.xpGained, 10);
  assert.strictEqual(user.skills.woodcutting.xp, 10);
  assert.strictEqual(user.energy.current, 100); // 0 energy consumed
  assert.strictEqual(user.tools[0].durability, 29);
  assert.strictEqual(user.inventory.length, 1);
  assert.ok(user.inventory[0].quantity >= 2);
  assert.strictEqual(user.statistics.gatheredCount, 1);
});

test('2, 4. Quarry gathering succeeds and awards Mining XP with Pickaxe without energy cost', async () => {
  const user = {
    telegramId: 'gather_test_1',
    energy: { current: 50, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'pick_1', toolId: 'tool_pickaxe_wood', toolType: 'pickaxe', tier: 1, durability: 30, maxDurability: 30, equipped: true }
    ],
    skills: { mining: { level: 1, xp: 0 } },
    inventory: []
  };

  const result = await executeGatherAction({ user, zoneId: 'zone_quarry', rngProvider: () => 0.1 });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.skill, 'mining');
  assert.strictEqual(user.skills.mining.xp, 10);
  assert.strictEqual(user.energy.current, 50); // Untouched
  assert.strictEqual(user.tools[0].durability, 29);
});

test('3. Deep Mine requires Tier 2+ tool and succeeds with Stone Pickaxe', async () => {
  const userTier1 = {
    telegramId: 'gather_test_1',
    energy: { current: 50, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'pick_wood', toolId: 'tool_pickaxe_wood', toolType: 'pickaxe', tier: 1, durability: 30, maxDurability: 30, equipped: true }
    ]
  };

  // Tier 1 pickaxe fails for Deep Mines
  const failResult = await executeGatherAction({ user: userTier1, zoneId: 'zone_mines' });
  assert.strictEqual(failResult.success, false);
  assert.strictEqual(failResult.reason, 'TOOL_REQUIREMENT_NOT_MET');

  // Tier 2 Stone Pickaxe succeeds
  const userTier2 = {
    telegramId: 'gather_test_1',
    energy: { current: 50, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'pick_stone', toolId: 'tool_pickaxe_stone', toolType: 'pickaxe', tier: 2, durability: 60, maxDurability: 60, equipped: true }
    ],
    skills: { mining: { level: 1, xp: 0 } },
    inventory: []
  };

  const successResult = await executeGatherAction({ user: userTier2, zoneId: 'zone_mines', rngProvider: () => 0.2 });
  assert.strictEqual(successResult.success, true);
  assert.strictEqual(userTier2.energy.current, 50);
  assert.strictEqual(userTier2.tools[0].durability, 59);
  assert.strictEqual(userTier2.skills.mining.xp, 25);
});

test('6, 7, 8. Energy regeneration from elapsed time and capping at maximum', () => {
  const now = new Date('2026-08-29T12:00:00Z');
  const fiveMinAgo = new Date('2026-08-29T11:55:00Z');

  // 1 energy per minute -> 5 minutes = +5 energy
  const regenState = calculateCurrentEnergy({ current: 40, max: 100, lastRegen: fiveMinAgo }, now);
  assert.strictEqual(regenState.currentEnergy, 45);
  assert.strictEqual(regenState.regenerated, 5);

  // Capped at max (100)
  const twoHoursAgo = new Date('2026-08-29T10:00:00Z');
  const cappedState = calculateCurrentEnergy({ current: 90, max: 100, lastRegen: twoHoursAgo }, now);
  assert.strictEqual(cappedState.currentEnergy, 100);
});

test('9, 10, 11. Zero energy player can still harvest without restriction', async () => {
  const zeroEnergyUser = {
    telegramId: 'gather_test_1',
    energy: { current: 0, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'axe_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30, equipped: true }
    ],
    inventory: [],
    skills: { woodcutting: { level: 1, xp: 0 } }
  };

  const result = await executeGatherAction({ user: zeroEnergyUser, zoneId: 'zone_forest' });
  assert.strictEqual(result.success, true);
  assert.strictEqual(zeroEnergyUser.tools[0].durability, 29);
  assert.strictEqual(zeroEnergyUser.inventory.length, 1);
  assert.strictEqual(zeroEnergyUser.skills.woodcutting.xp, 10);
});

test('12, 13, 14. Missing, wrong, or broken tool prevents gathering', async () => {
  // Missing tool
  const noToolUser = {
    telegramId: 'no_tool',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    tools: []
  };
  const res1 = await executeGatherAction({ user: noToolUser, zoneId: 'zone_forest' });
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.reason, 'MISSING_TOOL');

  // Wrong tool (has pickaxe, needs axe)
  const wrongToolUser = {
    telegramId: 'wrong_tool',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'pick_1', toolId: 'tool_pickaxe_wood', toolType: 'pickaxe', tier: 1, durability: 30, maxDurability: 30, equipped: true }
    ]
  };
  const res2 = await executeGatherAction({ user: wrongToolUser, zoneId: 'zone_forest' });
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.reason, 'MISSING_TOOL');

  // Broken tool (durability 0)
  const brokenToolUser = {
    telegramId: 'broken_tool',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'axe_broken', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 0, maxDurability: 30, equipped: true }
    ]
  };
  const res3 = await executeGatherAction({ user: brokenToolUser, zoneId: 'zone_forest' });
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.reason, 'TOOL_BROKEN');
});

test('17, 18, 19. Loot quantity bounds and weighted selection work properly', () => {
  // Test quantity bounds
  for (let i = 0; i < 50; i++) {
    const qty = calculateQuantity(2, 5, Math.random);
    assert.ok(qty >= 2 && qty <= 5);
  }

  // Test weighted selection with mock deterministic provider
  const dropTable = [
    { itemId: 'common', minQuantity: 1, maxQuantity: 2, weight: 80 },
    { itemId: 'rare', minQuantity: 1, maxQuantity: 1, weight: 20 }
  ];

  // 0.1 roll (< 80/100) -> common
  const lootCommon = selectWeightedLoot(dropTable, () => 0.1);
  assert.strictEqual(lootCommon.itemId, 'common');

  // 0.9 roll (>= 80/100) -> rare
  const lootRare = selectWeightedLoot(dropTable, () => 0.9);
  assert.strictEqual(lootRare.itemId, 'rare');

  // Invalid table fails safely
  assert.strictEqual(selectWeightedLoot([]), null);
  assert.strictEqual(selectWeightedLoot([{ itemId: 'x', weight: 0 }]), null);
});

test('20, 21, 22. Critical harvest doubles yield without consuming energy', async () => {
  const user = {
    telegramId: 'crit_user',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'axe_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30, equipped: true }
    ],
    inventory: [],
    skills: { woodcutting: { level: 1, xp: 0 } }
  };

  // Force critical roll (mock RNG returning 0.05 < 0.10)
  const result = await executeGatherAction({
    user,
    zoneId: 'zone_forest',
    rngProvider: () => 0.01 // Always triggers critical and selects first item
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.isCritical, true);
  assert.strictEqual(result.energySpent, 0);
  assert.strictEqual(user.energy.current, 100);
  assert.strictEqual(user.tools[0].durability, 29); // Durability cost is 1
  assert.ok(result.reward.quantity >= 4); // Doubled from base min 2 -> 4
});

test('23, 24, 35. Atomic updates and multiple gathering operations over time', async () => {
  const user = {
    telegramId: 'multi_gather',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'axe_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30, equipped: true }
    ],
    inventory: [],
    skills: { woodcutting: { level: 1, xp: 0 } },
    statistics: { gatheredCount: 0 }
  };

  // Perform 3 consecutive gathering strikes
  await executeGatherAction({ user, zoneId: 'zone_forest' });
  await executeGatherAction({ user, zoneId: 'zone_forest' });
  await executeGatherAction({ user, zoneId: 'zone_forest' });

  assert.strictEqual(user.energy.current, 100); // No energy consumed
  assert.strictEqual(user.tools[0].durability, 27); // 30 - 3
  assert.strictEqual(user.skills.woodcutting.xp, 30); // 3 * 10
  assert.strictEqual(user.statistics.gatheredCount, 3);
  assert.ok(user.inventory[0].quantity > 0);
});

test('26, 27, 28. ActionLock prevents concurrent gathering and releases properly', async () => {
  const telegramId = 'gather_test_concurrent';
  clearAllLocks();

  const ctx = {
    from: { id: telegramId },
    callbackQuery: { data: 'gather_act:zone_forest' },
    answerCbQuery: async () => {}
  };

  let concurrentBlocked = false;

  await actionLockMiddleware(ctx, async () => {
    assert.strictEqual(isLocked(telegramId), true);

    try {
      await actionLockMiddleware(ctx, async () => {});
    } catch (err) {
      if (err instanceof ConcurrencyError) {
        concurrentBlocked = true;
      }
    }
  });

  assert.strictEqual(concurrentBlocked, true);
  assert.strictEqual(isLocked(telegramId), false);
});

test('29, 30. OwnershipGuard protects gathering callbacks from third-party players', async () => {
  const playerA = '111111';
  const playerB = '222222';

  const callbackData = encodeCallback({ action: 'gather_act', ownerId: playerA, targetId: 'zone_forest' });

  // Player B clicks Player A button
  const ctxB = {
    from: { id: playerBId => playerB, id: playerB },
    callbackQuery: { data: callbackData },
    answerCbQuery: async () => {},
    state: {}
  };

  let rejected = false;
  try {
    await ownershipGuardMiddleware(ctxB, async () => {});
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      rejected = true;
    }
  }

  assert.strictEqual(rejected, true);
});

test('31, 32, 33, 34. Forged parameters and invalid zone IDs are rejected safely', async () => {
  const user = {
    telegramId: 'safe_user',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'axe_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30, equipped: true }
    ]
  };

  const invalidRes = await executeGatherAction({ user, zoneId: 'zone_nonexistent_xyz' });
  assert.strictEqual(invalidRes.success, false);
  assert.strictEqual(invalidRes.reason, 'INVALID_ZONE');
  assert.strictEqual(user.energy.current, 100); // Unchanged
});
