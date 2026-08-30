import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { getRequiredPlayerXp, getRequiredSkillXp, calculateProgressPercent } from '../src/engine/progression/progressionEngine.js';
import { formatProgressBar } from '../src/telegram/views/uiHelpers.js';
import { getPlayerProfileData } from '../src/services/profileService.js';
import { getPlayerInventoryData } from '../src/services/inventoryService.js';
import { renderMainMenu } from '../src/telegram/views/mainMenuView.js';
import { renderProfile } from '../src/telegram/views/profileView.js';
import { renderInventory } from '../src/telegram/views/inventoryView.js';
import { userLoaderMiddleware } from '../src/telegram/middlewares/userLoader.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { encodeCallback, parseCallback } from '../src/telegram/buttons/callbackData.js';
import { UnauthorizedError } from '../src/utils/errors.js';

test.before(async () => {
  await connectDatabase();
  // Ensure test item catalog exists
  await Item.updateOne(
    { itemId: 'wood_oak' },
    { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } },
    { upsert: true }
  );
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['core_test_1', 'core_test_2', 'core_test_empty'] } });
  await disconnectDatabase();
});

test('1, 2, 3. /start creates a new player, displays correct info, and preserves existing data', async () => {
  const telegramId = 'core_test_1';
  await User.deleteOne({ telegramId });

  const ctx = {
    from: { id: telegramId, username: 'legend_hero', first_name: 'Arthur' },
    chat: { id: 100, type: 'private' },
    state: {}
  };

  // 1. User loader creates user
  await userLoaderMiddleware(ctx, async () => {});
  assert.ok(ctx.state.user);
  assert.strictEqual(ctx.state.user.telegramId, telegramId);

  // 2. Render Main Menu
  const { text } = renderMainMenu(ctx.state.user);
  assert.ok(text.includes('Arthur') || text.includes('legend_hero'));
  assert.ok(text.includes('Novice Adventurer'));
  assert.ok(text.includes('100')); // 100 coins
  assert.ok(text.includes('Level'));

  // 3. Modifying coins and re-loading preserves data
  await User.updateOne({ telegramId }, { $set: { coins: 999, level: 5 } });
  await userLoaderMiddleware(ctx, async () => {});
  assert.strictEqual(ctx.state.user.coins, 999);
  assert.strictEqual(ctx.state.user.level, 5);
});

test('4, 5, 6. /profile displays level, XP, and follows floor(100 * level^1.5) formula', () => {
  assert.strictEqual(getRequiredPlayerXp(1), 100);
  assert.strictEqual(getRequiredPlayerXp(2), Math.floor(100 * Math.pow(2, 1.5))); // 282
  assert.strictEqual(getRequiredPlayerXp(3), Math.floor(100 * Math.pow(3, 1.5))); // 519

  const mockUser = {
    telegramId: '123',
    username: 'RaneMaster',
    level: 3,
    xp: 250,
    coins: 450,
    title: 'Master Gatherer',
    energy: { current: 80, max: 100 },
    skills: {
      woodcutting: { level: 2, xp: 50 },
      mining: { level: 1, xp: 10 },
      crafting: { level: 1, xp: 0 },
      fishing: { level: 1, xp: 0 },
      exploration: { level: 1, xp: 0 }
    }
  };

  const profile = getPlayerProfileData(mockUser);
  assert.strictEqual(profile.level, 3);
  assert.strictEqual(profile.xp, 250);
  assert.strictEqual(profile.requiredXp, 519);
  assert.strictEqual(profile.progressPercent, Math.floor((250 / 519) * 100)); // 48%
});

test('7, 8. Progress bar clamps correctly between 0% and 100%, handling zero/NaN safely', () => {
  assert.strictEqual(calculateProgressPercent(0, 100), 0);
  assert.strictEqual(calculateProgressPercent(150, 100), 100); // Clamped at 100
  assert.strictEqual(calculateProgressPercent(-20, 100), 0); // Clamped at 0
  assert.strictEqual(calculateProgressPercent(NaN, 0), 0);

  const barZero = formatProgressBar(0, 100, 10);
  assert.strictEqual(barZero, '░░░░░░░░░░ 0%');

  const barFull = formatProgressBar(100, 100, 10);
  assert.strictEqual(barFull, '██████████ 100%');

  const barOver = formatProgressBar(200, 100, 10);
  assert.strictEqual(barOver, '██████████ 100%');
});

test('9, 10, 11. Profile displays all five masteries, coins, and energy', () => {
  const mockUser = {
    telegramId: '123',
    username: 'Hero',
    level: 1,
    xp: 0,
    coins: 750,
    energy: { current: 95, max: 100 },
    skills: {
      woodcutting: { level: 3, xp: 100 },
      mining: { level: 2, xp: 40 },
      crafting: { level: 1, xp: 15 },
      fishing: { level: 4, xp: 200 },
      exploration: { level: 2, xp: 30 }
    }
  };

  const { text } = renderProfile(mockUser);
  assert.ok(text.includes('750 Coins'));
  assert.ok(text.includes('95 / 100'));
  assert.ok(text.includes('Woodcutting'));
  assert.ok(text.includes('Mining'));
  assert.ok(text.includes('Crafting'));
  assert.ok(text.includes('Fishing'));
  assert.ok(text.includes('Exploration'));
});

test('12, 13, 14. /inventory and /backpack display stackable item quantities correctly', async () => {
  const mockUser = {
    telegramId: 'core_test_2',
    coins: 300,
    inventory: [
      { itemId: 'wood_oak', quantity: 25 },
      { itemId: 'stone_granite', quantity: 12 }
    ],
    tools: []
  };

  const invData = await getPlayerInventoryData(mockUser, 1);
  assert.strictEqual(invData.items.length, 2);
  assert.strictEqual(invData.items[0].quantity, 25);
  assert.strictEqual(invData.items[1].quantity, 12);

  const { text } = await renderInventory(mockUser, 1);
  assert.ok(text.includes('25'));
  assert.ok(text.includes('12'));
});

test('15. Empty inventory displays friendly message', async () => {
  const emptyUser = {
    telegramId: 'core_test_empty',
    coins: 50,
    inventory: [],
    tools: []
  };

  const invData = await getPlayerInventoryData(emptyUser, 1);
  assert.strictEqual(invData.isEmpty, true);

  const { text } = await renderInventory(emptyUser, 1);
  assert.ok(text.includes('backpack is currently empty'));
});

test('16. Unique tools are displayed with durability and not as stackable resources', async () => {
  const userWithTools = {
    telegramId: 'core_test_tools',
    coins: 100,
    inventory: [{ itemId: 'wood_oak', quantity: 5 }],
    tools: [
      {
        instanceId: 'tool_1',
        toolId: 'tool_axe_wood',
        toolType: 'axe',
        tier: 1,
        durability: 24,
        maxDurability: 30,
        equipped: true
      }
    ]
  };

  const invData = await getPlayerInventoryData(userWithTools, 1);
  assert.strictEqual(invData.tools.length, 1);
  assert.strictEqual(invData.tools[0].durability, 24);
  assert.strictEqual(invData.tools[0].maxDurability, 30);
  assert.strictEqual(invData.tools[0].equipped, true);

  const { text } = await renderInventory(userWithTools, 1);
  assert.ok(text.includes('24/30'));
  assert.ok(text.includes('[EQUIPPED]'));
});

test('17, 18. Inventory pagination calculates pages and clamps invalid page values safely', async () => {
  const userManyItems = {
    telegramId: 'core_test_many',
    coins: 100,
    inventory: Array.from({ length: 15 }, (_, i) => ({ itemId: `item_${i + 1}`, quantity: i + 1 })),
    tools: []
  };

  // Page 1 (PAGE_SIZE = 6 -> 3 total pages)
  const page1 = await getPlayerInventoryData(userManyItems, 1, 6);
  assert.strictEqual(page1.pagination.currentPage, 1);
  assert.strictEqual(page1.pagination.totalPages, 3);
  assert.strictEqual(page1.items.length, 6);

  // Out of bound page 99 -> clamped to page 3
  const pageOut = await getPlayerInventoryData(userManyItems, 99, 6);
  assert.strictEqual(pageOut.pagination.currentPage, 3);
  assert.strictEqual(pageOut.items.length, 3); // 15 - 12 = 3 items on last page

  // Negative page -> clamped to page 1
  const pageNeg = await getPlayerInventoryData(userManyItems, -5, 6);
  assert.strictEqual(pageNeg.pagination.currentPage, 1);
});

test('19, 20. Back button uses ownership and Player B cannot use Player A callbacks', async () => {
  const playerAId = '111111';
  const playerBId = '222222';

  const backCallback = encodeCallback({ action: 'nav_main', ownerId: playerAId });

  // Player B clicks Player A back button
  const ctxB = {
    from: { id: playerBId },
    callbackQuery: { data: backCallback },
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

test('21. Profile & Inventory views are read-only and do not mutate user economy data', async () => {
  const originalUser = {
    telegramId: 'read_only_user',
    coins: 100,
    level: 1,
    xp: 0,
    energy: { current: 100, max: 100 },
    inventory: [{ itemId: 'wood_oak', quantity: 5 }],
    tools: [{ toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30, equipped: true }]
  };

  // Clone to check immutability
  const userCopy = JSON.parse(JSON.stringify(originalUser));

  getPlayerProfileData(userCopy);
  await getPlayerInventoryData(userCopy, 1);
  renderProfile(userCopy);
  await renderInventory(userCopy, 1);

  assert.strictEqual(userCopy.coins, 100);
  assert.strictEqual(userCopy.level, 1);
  assert.strictEqual(userCopy.xp, 0);
  assert.strictEqual(userCopy.inventory[0].quantity, 5);
  assert.strictEqual(userCopy.tools[0].durability, 30);
});

test('22. Malformed callback data is safely rejected', () => {
  const parsed = parseCallback('invalid:');
  assert.strictEqual(parsed.isValid, false);
});
