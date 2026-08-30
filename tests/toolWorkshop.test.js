import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import {
  executeRepairTool,
  executeUpgradeTool,
  getToolDetails
} from '../src/engine/economy/toolService.js';
import {
  TOOL_TIERS,
  TOOL_REPAIR_COSTS,
  TOOL_UPGRADE_COSTS,
  getDurabilityStatus
} from '../src/engine/economy/toolConfig.js';
import { executeGatherAction } from '../src/engine/gathering/gatheringEngine.js';
import { renderEquippedTools } from '../src/telegram/views/toolsView.js';
import { renderWorkshopMenu, renderToolsList, renderToolDetailsView } from '../src/telegram/views/workshopView.js';
import { actionLockMiddleware, isLocked, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { encodeCallback } from '../src/telegram/buttons/callbackData.js';
import { UnauthorizedError, ConcurrencyError } from '../src/utils/errors.js';

test.before(async () => {
  await connectDatabase();
  await Item.updateOne({ itemId: 'wood_oak' }, { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } }, { upsert: true });
  await Item.updateOne({ itemId: 'stone_granite' }, { $set: { itemId: 'stone_granite', displayName: 'Granite Stone', emoji: '🪨', category: 'raw_stone', basePrice: 4 } }, { upsert: true });
  await Item.updateOne({ itemId: 'iron_ore' }, { $set: { itemId: 'iron_ore', displayName: 'Iron Ore', emoji: '⛏️', category: 'raw_ore', basePrice: 15 } }, { upsert: true });
  await Item.updateOne({ itemId: 'gold_ore' }, { $set: { itemId: 'gold_ore', displayName: 'Gold Ore', emoji: '🪙', category: 'raw_ore', basePrice: 35 } }, { upsert: true });
  await Item.updateOne({ itemId: 'gem_vein' }, { $set: { itemId: 'gem_vein', displayName: 'Raw Gems', emoji: '💎', category: 'raw_gem', basePrice: 100 } }, { upsert: true });
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['ws_test_user_1', 'ws_test_user_2', 'ws_test_concurrent'] } });
  await disconnectDatabase();
  clearAllLocks();
});

test('1, 4, 5, 6. /tools and durability statuses (Excellent, Good, Damaged, Critical, Broken)', () => {
  assert.strictEqual(getDurabilityStatus(30, 30).label, 'Excellent');
  assert.strictEqual(getDurabilityStatus(20, 30).label, 'Good'); // 67%
  assert.strictEqual(getDurabilityStatus(10, 30).label, 'Damaged'); // 33%
  assert.strictEqual(getDurabilityStatus(3, 30).label, 'Critical'); // 10%
  assert.strictEqual(getDurabilityStatus(0, 30).label, 'Broken');

  const user = {
    telegramId: 'ws_user_1',
    tools: [
      { instanceId: 'axe_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 28, maxDurability: 30, equipped: true },
      { instanceId: 'pick_1', toolId: 'tool_pickaxe_wood', toolType: 'pickaxe', tier: 1, durability: 0, maxDurability: 30, equipped: true }
    ]
  };

  const { text } = renderEquippedTools(user);
  assert.ok(text.includes('Wooden Axe'));
  assert.ok(text.includes('Wooden Pickaxe'));
  assert.ok(text.includes('Broken'));
});

test('7. Broken tool cannot gather', async () => {
  const user = {
    telegramId: 'ws_user_1',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    tools: [
      { instanceId: 'axe_broken', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 0, maxDurability: 30, equipped: true }
    ],
    inventory: []
  };

  const res = await executeGatherAction({ user, nodeId: 'node_forest_oak' });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'TOOL_BROKEN');
  assert.strictEqual(user.energy.current, 100);
});

test('8, 9, 10, 11. Repair calculation, full durability restore, and full tool rejection', async () => {
  const user = {
    telegramId: 'ws_user_1',
    coins: 100,
    inventory: [{ itemId: 'wood_oak', quantity: 10 }],
    tools: [
      { instanceId: 'axe_damaged', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 5, maxDurability: 30, equipped: true }
    ]
  };

  // 1. Repair Damaged Tool
  const result = await executeRepairTool({ user, instanceId: 'axe_damaged' });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.newDurability, 30);
  assert.strictEqual(user.tools[0].durability, 30);
  assert.strictEqual(user.coins, 95); // 100 - 5
  assert.strictEqual(user.inventory[0].quantity, 7); // 10 - 3

  // 2. Try repairing already full tool -> should fail without charge
  const fullResult = await executeRepairTool({ user, instanceId: 'axe_damaged' });
  assert.strictEqual(fullResult.success, false);
  assert.strictEqual(fullResult.reason, 'ALREADY_FULL_DURABILITY');
  assert.strictEqual(user.coins, 95); // Untouched
  assert.strictEqual(user.inventory[0].quantity, 7); // Untouched
});

test('12, 13, 14. Insufficient coins or materials prevent repair and consume nothing', async () => {
  // Insufficient Coins
  const poorUser = {
    telegramId: 'poor_user',
    coins: 2, // Needs 5
    inventory: [{ itemId: 'wood_oak', quantity: 10 }],
    tools: [{ instanceId: 'axe_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 10, maxDurability: 30 }]
  };
  const poorRes = await executeRepairTool({ user: poorUser, instanceId: 'axe_1' });
  assert.strictEqual(poorRes.success, false);
  assert.strictEqual(poorRes.reason, 'INSUFFICIENT_COINS');
  assert.strictEqual(poorUser.coins, 2);
  assert.strictEqual(poorUser.inventory[0].quantity, 10);
  assert.strictEqual(poorUser.tools[0].durability, 10);

  // Insufficient Materials
  const materialPoorUser = {
    telegramId: 'mat_poor',
    coins: 100,
    inventory: [{ itemId: 'wood_oak', quantity: 1 }], // Needs 3
    tools: [{ instanceId: 'axe_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 10, maxDurability: 30 }]
  };
  const matRes = await executeRepairTool({ user: materialPoorUser, instanceId: 'axe_1' });
  assert.strictEqual(matRes.success, false);
  assert.strictEqual(matRes.reason, 'INSUFFICIENT_MATERIALS');
  assert.strictEqual(materialPoorUser.coins, 100);
  assert.strictEqual(materialPoorUser.inventory[0].quantity, 1);
  assert.strictEqual(materialPoorUser.tools[0].durability, 10);
});

test('15, 16, 17, 18, 19. All 5 Tier Upgrades (Wood -> Stone -> Iron -> Gold -> Diamond) & Max Tier Cap', async () => {
  const user = {
    telegramId: 'upgrade_master',
    coins: 5000,
    skills: { crafting: { level: 10, xp: 0 } },
    inventory: [
      { itemId: 'stone_granite', quantity: 50 },
      { itemId: 'iron_ore', quantity: 50 },
      { itemId: 'gold_ore', quantity: 50 },
      { itemId: 'gem_vein', quantity: 50 }
    ],
    tools: [
      { instanceId: 'axe_inst', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 10, maxDurability: 30 }
    ],
    statistics: { craftedCount: 0 }
  };

  // Tier 1 -> 2 (Wooden -> Stone)
  const up1 = await executeUpgradeTool({ user, instanceId: 'axe_inst' });
  assert.strictEqual(up1.success, true);
  assert.strictEqual(up1.newTier, 2);
  assert.strictEqual(user.tools[0].tier, 2);
  assert.strictEqual(user.tools[0].toolId, 'tool_axe_stone');
  assert.strictEqual(user.tools[0].maxDurability, 60);
  assert.strictEqual(user.tools[0].durability, 60); // Restored

  // Tier 2 -> 3 (Stone -> Iron)
  const up2 = await executeUpgradeTool({ user, instanceId: 'axe_inst' });
  assert.strictEqual(up2.success, true);
  assert.strictEqual(up2.newTier, 3);
  assert.strictEqual(user.tools[0].maxDurability, 120);

  // Tier 3 -> 4 (Iron -> Gold)
  const up3 = await executeUpgradeTool({ user, instanceId: 'axe_inst' });
  assert.strictEqual(up3.success, true);
  assert.strictEqual(up3.newTier, 4);
  assert.strictEqual(user.tools[0].maxDurability, 80);

  // Tier 4 -> 5 (Gold -> Diamond)
  const up4 = await executeUpgradeTool({ user, instanceId: 'axe_inst' });
  assert.strictEqual(up4.success, true);
  assert.strictEqual(up4.newTier, 5);
  assert.strictEqual(user.tools[0].maxDurability, 250);

  // Tier 5 -> Diamond is MAX TIER (cannot upgrade further)
  const up5 = await executeUpgradeTool({ user, instanceId: 'axe_inst' });
  assert.strictEqual(up5.success, false);
  assert.strictEqual(up5.reason, 'MAX_TIER_REACHED');
  assert.strictEqual(user.tools[0].tier, 5);
});

test('20, 21, 22. Crafting skill level requirement is enforced for upgrades', async () => {
  const lowSkillUser = {
    telegramId: 'low_skill',
    coins: 500,
    skills: { crafting: { level: 1, xp: 0 } }, // Needs Level 2 for Stone -> Iron
    inventory: [{ itemId: 'iron_ore', quantity: 20 }],
    tools: [{ instanceId: 'stone_axe', toolId: 'tool_axe_stone', toolType: 'axe', tier: 2, durability: 60, maxDurability: 60 }]
  };

  const res = await executeUpgradeTool({ user: lowSkillUser, instanceId: 'stone_axe' });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'INSUFFICIENT_SKILL_LEVEL');
  assert.strictEqual(lowSkillUser.tools[0].tier, 2); // Unchanged
  assert.strictEqual(lowSkillUser.coins, 500); // Uncharged
});

test('26. Gathering automatically uses upgraded tool stats (Yield Bonus, Crit Bonus)', async () => {
  const user = {
    telegramId: 'diamond_miner',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    skills: { mining: { level: 5, xp: 0 } },
    tools: [
      // Diamond Pickaxe: Yield +4, Crit +25%
      { instanceId: 'pick_diamond', toolId: 'tool_pickaxe_diamond', toolType: 'pickaxe', tier: 5, durability: 250, maxDurability: 250, equipped: true }
    ],
    inventory: []
  };

  const res = await executeGatherAction({ user, nodeId: 'node_mine_iron', rngProvider: () => 0.5 });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.energySpent, 0);
  assert.strictEqual(user.energy.current, 100);
  assert.strictEqual(user.tools[0].durability, 249);
  // Base min is 1 + tool yield bonus 4 = at least 5
  assert.ok(res.reward.quantity >= 5);
});

test('28, 29. OwnershipGuard blocks third-party workshop callbacks', async () => {
  const playerA = '111111';
  const playerB = '222222';

  const callbackData = encodeCallback({ action: 'ws_repair_do', ownerId: playerA, targetId: 'axe_1' });

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

test('30, 31, 32, 33. ActionLock prevents rapid double clicks on repair/upgrade', async () => {
  const telegramId = 'ws_test_concurrent';
  clearAllLocks();

  const ctx = {
    from: { id: telegramId },
    callbackQuery: { data: 'ws_repair_do:axe_1' },
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
  assert.strictEqual(isLocked(telegramId), false); // Released
});

test('36, 37, 38. Tool instances remain unique, never duplicate, and fail safely', async () => {
  const user = {
    telegramId: 'safe_unique',
    coins: 50,
    skills: { crafting: { level: 1, xp: 0 } },
    inventory: [{ itemId: 'stone_granite', quantity: 15 }],
    tools: [
      { instanceId: 'unique_inst_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30 }
    ]
  };

  await executeUpgradeTool({ user, instanceId: 'unique_inst_1' });
  assert.strictEqual(user.tools.length, 1);
  assert.strictEqual(user.tools[0].instanceId, 'unique_inst_1'); // Same instance preserved
  assert.strictEqual(user.tools[0].tier, 2);
});
