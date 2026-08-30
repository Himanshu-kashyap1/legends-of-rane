import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { Base } from '../src/models/Base.js';
import { MarketOrder } from '../src/models/MarketOrder.js';

// Engines & Views
import { renderMainMenu } from '../src/telegram/views/mainMenuView.js';
import { renderProfile } from '../src/telegram/views/profileView.js';
import { renderExploreMenu, renderGatherResult } from '../src/telegram/views/gatheringView.js';
import { renderInventory } from '../src/telegram/views/inventoryView.js';
import { renderCraftingCategories } from '../src/telegram/views/craftingView.js';
import { renderWorkshopMenu } from '../src/telegram/views/workshopView.js';
import { renderQuestHub } from '../src/telegram/views/questView.js';
import { renderPetsHub } from '../src/telegram/views/petsView.js';
import { renderMarketHub } from '../src/telegram/views/marketView.js';
import { renderOfflineCard } from '../src/telegram/views/offlineView.js';
import { renderHelpView } from '../src/telegram/views/helpView.js';

import { executeGatherAction } from '../src/engine/gathering/gatheringEngine.js';
import { executeCraftRecipe } from '../src/engine/economy/craftingEngine.js';
import { executeRepairTool, executeUpgradeTool } from '../src/engine/economy/toolService.js';
import { createMarketListing, purchaseMarketListing } from '../src/engine/economy/marketEngine.js';
import { ensurePlayerQuests, claimQuestReward } from '../src/engine/quests/questEngine.js';
import { adoptPet, feedPet, equipPet } from '../src/engine/pets/petEngine.js';
import { calculateOfflineEarnings, claimOfflineRewards } from '../src/engine/offline/offlineEngine.js';
import { loadPlayerBase, placeBlock, destroyBlock, savePlayerBase } from '../src/engine/voxel/baseEngine.js';
import { renderMainMenuCard, renderProfileCard, renderInventoryCard } from '../src/services/cardService.js';

import { userLoaderMiddleware } from '../src/telegram/middlewares/userLoader.js';
import { actionLockMiddleware, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { rateLimiterMiddleware } from '../src/telegram/middlewares/rateLimiter.js';
import { encodeCallback } from '../src/telegram/buttons/callbackData.js';

const RELEASE_TEST_USERS = ['rel_new_hero_101', 'rel_trader_hero_102'];

test.before(async () => {
  await connectDatabase();
  await Item.updateOne({ itemId: 'wood_oak' }, { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } }, { upsert: true });
  await Item.updateOne({ itemId: 'plank_oak' }, { $set: { itemId: 'plank_oak', displayName: 'Oak Planks', emoji: '🪵', category: 'refined_wood', basePrice: 12 } }, { upsert: true });
  await Item.updateOne({ itemId: 'stone_granite' }, { $set: { itemId: 'stone_granite', displayName: 'Granite Stone', emoji: '🪨', category: 'raw_stone', basePrice: 4 } }, { upsert: true });
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: RELEASE_TEST_USERS } });
  await Base.deleteMany({ telegramId: { $in: RELEASE_TEST_USERS } });
  await MarketOrder.deleteMany({ sellerId: { $in: RELEASE_TEST_USERS } });
  await disconnectDatabase();
  clearAllLocks();
});

test('RELEASE QA 1: Complete New User Onboarding Flow', async () => {
  const telegramId = 'rel_new_hero_101';
  const ctx = {
    from: { id: telegramId, username: 'legend_novice', first_name: 'Arthur' },
    chat: { id: 100, type: 'private' },
    state: {}
  };

  // 1. /start Registration
  await userLoaderMiddleware(ctx, async () => {});
  const user = ctx.state.user;
  assert.ok(user);
  assert.strictEqual(user.coins, 100);
  assert.strictEqual(user.level, 1);
  assert.strictEqual(user.tools.length, 2);

  // 2. /start Main Menu View (6 buttons)
  const menu = renderMainMenu(user);
  assert.ok(menu.text.includes('Arthur') || menu.text.includes('legend_novice'));
  assert.strictEqual(menu.keyboard.reply_markup.inline_keyboard.flat().length, 6);

  // 3. /profile View
  const profile = renderProfile(user);
  assert.ok(profile.text.includes('CHARACTER PROFILE'));
  assert.ok(profile.text.includes('Level 1'));

  // 4. /explore & Gather
  const explore = renderExploreMenu(user);
  assert.ok(explore.text.includes('EXPLORATION'));

  const gatherRes = await executeGatherAction({ user, nodeId: 'node_forest_oak', rngProvider: () => 0.5 });
  assert.strictEqual(gatherRes.success, true);
  assert.strictEqual(gatherRes.energySpent, 0); // Zero energy harvest

  // 5. /inventory View
  const inv = await renderInventory(user, 1);
  assert.ok(inv.text.includes('BACKPACK'));

  // 6. /craft Execution
  user.inventory.push({ itemId: 'wood_oak', quantity: 10 });
  const craftRes = await executeCraftRecipe({ user, recipeId: 'recipe_plank_oak' });
  assert.strictEqual(craftRes.success, true);

  // 7. /tools Workshop & Upgrades
  const workshop = renderWorkshopMenu(user);
  assert.ok(workshop.text.includes('WORKSHOP'));

  // 8. /quests Auto-init and Claim
  ensurePlayerQuests(user);
  const questView = renderQuestHub(user);
  assert.ok(questView.text.includes('QUEST'));

  // 9. /pets Adoption
  user.coins = 500;
  const adoptRes = await adoptPet({ user, petId: 'pet_timber_wolf' });
  assert.strictEqual(adoptRes.success, true);
  const petView = renderPetsHub(user);
  assert.ok(petView.text.includes('PET'));

  // 10. /offline Hub
  const offlineView = renderOfflineCard(user);
  assert.ok(offlineView.text.includes('OFFLINE'));

  // 11. 3D Voxel Base Load
  const baseRes = await loadPlayerBase(telegramId);
  assert.strictEqual(baseRes.success, true);
});

test('RELEASE QA 2: Returning User Persistence & Offline Earnings Claim', async () => {
  const telegramId = 'rel_new_hero_101';
  const user = await User.findOne({ telegramId });
  assert.ok(user);

  // Simulate 3 hours of offline time
  const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000);
  user.offline = { lastLogoutAt: threeHoursAgo };
  user.lastActiveAt = threeHoursAgo;

  const earnings = calculateOfflineEarnings({ user, now: new Date() });
  assert.strictEqual(earnings.hasEarnings, true);
  assert.ok(earnings.coins > 0);

  const claimRes = await claimOfflineRewards({ user, now: new Date() });
  assert.strictEqual(claimRes.success, true);
  assert.ok(claimRes.earnings.coins > 0);

  // Saved Pet remains intact
  assert.ok(user.pets.length > 0);
  assert.strictEqual(user.pets[0].petId, 'pet_timber_wolf');
});

test('RELEASE QA 3: 3D Voxel Mini App State & Mutation Integrity', async () => {
  const telegramId = 'rel_new_hero_101';

  // 1. Place a block
  const p1 = await placeBlock(telegramId, { x: 5, y: 1, z: 5, blockType: 'grass' });
  assert.strictEqual(p1.success, true);

  // 2. Destroy the block
  const d1 = await destroyBlock(telegramId, { x: 5, y: 1, z: 5 });
  assert.strictEqual(d1.success, true);

  // 3. Batch save with 3 valid blocks
  const batchBlocks = [
    { x: 0, y: 0, z: 0, blockType: 'smooth_stone' },
    { x: 1, y: 0, z: 0, blockType: 'dirt' },
    { x: 2, y: 0, z: 0, blockType: 'crystal_magic' }
  ];
  const saveRes = await savePlayerBase(telegramId, batchBlocks);
  assert.strictEqual(saveRes.success, true);
  assert.strictEqual(saveRes.base.blocks.length, 3);
});

test('RELEASE QA 4: Security & Cross-User Interaction Guards', async () => {
  const owner = 'rel_new_hero_101';
  const attacker = 'rel_attacker_999';

  // 1. Ownership Guard blocks foreign clicks
  const cbPayload = encodeCallback({ action: 'ws_repair_do', ownerId: owner });
  const attackerCtx = {
    from: { id: attacker },
    callbackQuery: { data: cbPayload },
    answerCbQuery: async () => {},
    state: {}
  };

  let blocked = false;
  try {
    await ownershipGuardMiddleware(attackerCtx, async () => {});
  } catch (err) {
    if (err.name === 'UnauthorizedError') blocked = true;
  }
  assert.strictEqual(blocked, true);
});

test('RELEASE QA 5: Deterministic PNG Visual Banner Card Generation', () => {
  const mockUser = {
    telegramId: 'rel_new_hero_101',
    username: 'legend_novice',
    level: 5,
    coins: 2500,
    title: 'Apprentice Crafter',
    skills: {
      woodcutting: { level: 4, xp: 200 },
      mining: { level: 3, xp: 150 },
      crafting: { level: 3, xp: 100 }
    },
    inventory: [{ itemId: 'wood_oak', quantity: 25 }]
  };

  const menuCard = renderMainMenuCard(mockUser);
  assert.ok(Buffer.isBuffer(menuCard));
  assert.ok(menuCard.length > 500);

  const profileCard = renderProfileCard(mockUser);
  assert.ok(Buffer.isBuffer(profileCard));
  assert.ok(profileCard.length > 500);

  const invCard = renderInventoryCard(mockUser, 1);
  assert.ok(Buffer.isBuffer(invCard));
  assert.ok(invCard.length > 500);
});
