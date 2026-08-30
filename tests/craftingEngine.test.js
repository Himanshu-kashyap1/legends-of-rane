import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import {
  executeCraftRecipe,
  validateCrafting
} from '../src/engine/economy/craftingEngine.js';
import { RECIPES, RECIPE_CATEGORIES, getRecipesByCategory } from '../src/engine/economy/recipeConfig.js';
import { renderCraftingCategories, renderCategoryRecipes } from '../src/telegram/views/craftingView.js';
import { actionLockMiddleware, isLocked, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { encodeCallback } from '../src/telegram/buttons/callbackData.js';
import { UnauthorizedError, ConcurrencyError } from '../src/utils/errors.js';

test.before(async () => {
  await connectDatabase();
  await Item.updateOne({ itemId: 'wood_oak' }, { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } }, { upsert: true });
  await Item.updateOne({ itemId: 'plank_oak' }, { $set: { itemId: 'plank_oak', displayName: 'Oak Plank', emoji: '🪵', category: 'refined_plank', basePrice: 12 } }, { upsert: true });
  await Item.updateOne({ itemId: 'iron_ore' }, { $set: { itemId: 'iron_ore', displayName: 'Iron Ore', emoji: '⛏️', category: 'raw_ore', basePrice: 15 } }, { upsert: true });
  await Item.updateOne({ itemId: 'coal' }, { $set: { itemId: 'coal', displayName: 'Coal', emoji: '⚫', category: 'raw_ore', basePrice: 6 } }, { upsert: true });
  await Item.updateOne({ itemId: 'ingot_iron' }, { $set: { itemId: 'ingot_iron', displayName: 'Iron Ingot', emoji: '🔩', category: 'refined_ingot', basePrice: 35 } }, { upsert: true });
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['craft_test_1', 'craft_test_2', 'craft_test_concurrent'] } });
  await disconnectDatabase();
  clearAllLocks();
});

test('1. Valid craft: Oak Wood -> Oak Planks with Crafting XP award', async () => {
  const user = {
    telegramId: 'craft_test_1',
    coins: 100,
    skills: { crafting: { level: 1, xp: 0 } },
    inventory: [{ itemId: 'wood_oak', quantity: 6 }],
    statistics: { craftedCount: 0 }
  };

  const result = await executeCraftRecipe({ user, recipeId: 'recipe_plank_oak', quantity: 2 });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.outputYield, 4); // 2 * 2 = 4 planks
  assert.strictEqual(result.xpGained, 20); // 10 * 2 = 20 XP
  assert.strictEqual(user.skills.crafting.xp, 20);
  assert.strictEqual(user.coins, 100); // 0 coin cost
  assert.strictEqual(user.inventory.find(i => i.itemId === 'wood_oak').quantity, 2); // 6 - 4 = 2
  assert.strictEqual(user.inventory.find(i => i.itemId === 'plank_oak').quantity, 4);
  assert.strictEqual(user.statistics.craftedCount, 2);
});

test('2. Valid craft with multiple inputs and coin cost: Iron Ingot', async () => {
  const user = {
    telegramId: 'craft_test_1',
    coins: 50,
    skills: { crafting: { level: 2, xp: 0 } },
    inventory: [
      { itemId: 'iron_ore', quantity: 4 },
      { itemId: 'coal', quantity: 2 }
    ]
  };

  const result = await executeCraftRecipe({ user, recipeId: 'recipe_ingot_iron', quantity: 2 });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.outputYield, 2);
  assert.strictEqual(user.coins, 40); // 50 - (5 * 2) = 40
  assert.strictEqual(user.inventory.find(i => i.itemId === 'iron_ore').quantity, 0); // 4 - 4 = 0
  assert.strictEqual(user.inventory.find(i => i.itemId === 'coal').quantity, 0); // 2 - 2 = 0
  assert.strictEqual(user.inventory.find(i => i.itemId === 'ingot_iron').quantity, 2);
  assert.strictEqual(user.skills.crafting.xp, 50); // 25 * 2 = 50
});

test('3. Tool recipe craft: Stone Pickaxe creates unique ToolInstance in user.tools', async () => {
  const user = {
    telegramId: 'craft_test_1',
    coins: 50,
    skills: { crafting: { level: 1, xp: 0 } },
    inventory: [
      { itemId: 'stone_granite', quantity: 5 },
      { itemId: 'plank_oak', quantity: 5 }
    ],
    tools: []
  };

  const result = await executeCraftRecipe({ user, recipeId: 'recipe_pickaxe_stone', quantity: 1 });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.isTool, true);
  assert.strictEqual(user.tools.length, 1);
  assert.strictEqual(user.tools[0].toolId, 'tool_pickaxe_stone');
  assert.strictEqual(user.tools[0].tier, 2);
  assert.strictEqual(user.tools[0].maxDurability, 60);
  assert.strictEqual(user.tools[0].durability, 60);
  assert.strictEqual(user.tools[0].equipped, false);
  assert.strictEqual(user.coins, 25); // 50 - 25 = 25
  assert.strictEqual(user.inventory.find(i => i.itemId === 'stone_granite').quantity, 2); // 5 - 3 = 2
});

test('4, 5, 6, 7. Insufficient materials, coins, skill level, and invalid recipe validation', async () => {
  // Insufficient Materials
  const matUser = {
    telegramId: 'no_mats',
    coins: 100,
    skills: { crafting: { level: 5, xp: 0 } },
    inventory: [{ itemId: 'wood_oak', quantity: 1 }] // Needs 2
  };
  const matRes = await executeCraftRecipe({ user: matUser, recipeId: 'recipe_plank_oak' });
  assert.strictEqual(matRes.success, false);
  assert.strictEqual(matRes.reason, 'INSUFFICIENT_MATERIALS');
  assert.strictEqual(matUser.coins, 100);
  assert.strictEqual(matUser.inventory[0].quantity, 1);

  // Insufficient Coins
  const poorUser = {
    telegramId: 'poor_crafter',
    coins: 2, // Needs 5
    skills: { crafting: { level: 2, xp: 0 } },
    inventory: [{ itemId: 'iron_ore', quantity: 2 }, { itemId: 'coal', quantity: 1 }]
  };
  const poorRes = await executeCraftRecipe({ user: poorUser, recipeId: 'recipe_ingot_iron' });
  assert.strictEqual(poorRes.success, false);
  assert.strictEqual(poorRes.reason, 'INSUFFICIENT_COINS');
  assert.strictEqual(poorUser.coins, 2);

  // Insufficient Skill Level
  const lowSkillUser = {
    telegramId: 'low_skill_crafter',
    coins: 100,
    skills: { crafting: { level: 1, xp: 0 } }, // Needs Level 3 for Gold Ingot
    inventory: [{ itemId: 'gold_ore', quantity: 2 }, { itemId: 'coal', quantity: 2 }]
  };
  const skillRes = await executeCraftRecipe({ user: lowSkillUser, recipeId: 'recipe_ingot_gold' });
  assert.strictEqual(skillRes.success, false);
  assert.strictEqual(skillRes.reason, 'INSUFFICIENT_SKILL_LEVEL');
  assert.strictEqual(lowSkillUser.coins, 100);

  // Invalid Recipe
  const invalidRes = await executeCraftRecipe({ user: lowSkillUser, recipeId: 'recipe_fake_xyz' });
  assert.strictEqual(invalidRes.success, false);
  assert.strictEqual(invalidRes.reason, 'INVALID_RECIPE');
});

test('9. ActionLock prevents concurrent crafting double-click requests', async () => {
  const telegramId = 'craft_test_concurrent';
  clearAllLocks();

  const ctx = {
    from: { id: telegramId },
    callbackQuery: { data: 'cr_do:recipe_plank_oak' },
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

test('13. OwnershipGuard protects crafting callbacks from third-party players', async () => {
  const playerA = '111111';
  const playerB = '222222';

  const callbackData = encodeCallback({ action: 'cr_do', ownerId: playerA, targetId: 'recipe_plank_oak' });

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

test('14. Recipe category filtering and UI pagination generation', () => {
  const refining = getRecipesByCategory('refining');
  assert.ok(refining.length >= 4);

  const tools = getRecipesByCategory('tools');
  assert.ok(tools.length >= 4);

  const user = {
    telegramId: 'view_user',
    coins: 100,
    skills: { crafting: { level: 2, xp: 0 } },
    inventory: []
  };

  const { text, keyboard } = renderCategoryRecipes(user, 'refining', 1);
  assert.ok(text.includes('REFINED MATERIALS'));
  assert.ok(keyboard.reply_markup.inline_keyboard.length >= 2);
});
