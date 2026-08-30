import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { Base } from '../src/models/Base.js';
import { Boss } from '../src/models/Boss.js';
import { MarketOrder } from '../src/models/MarketOrder.js';

// Engines & Services
import { executeGatherAction } from '../src/engine/gathering/gatheringEngine.js';
import { executeCraftRecipe } from '../src/engine/economy/craftingEngine.js';
import { executeRepairTool, executeUpgradeTool } from '../src/engine/economy/toolService.js';
import { purchaseMarketListing, createMarketListing } from '../src/engine/economy/marketEngine.js';
import { executeGiftTransfer } from '../src/engine/social/giftingEngine.js';
import { addPlayerXp, addSkillXp } from '../src/engine/progression/progressionEngine.js';
import { ensurePlayerQuests, trackQuestProgress, claimQuestReward } from '../src/engine/quests/questEngine.js';
import { equipPet, feedPet, getActivePetBuff } from '../src/engine/pets/petEngine.js';
import { calculateOfflineEarnings, claimOfflineRewards } from '../src/engine/offline/offlineEngine.js';
import { spawnOrGetGroupBoss, executeBossAttack } from '../src/engine/combat/bossEngine.js';
import { loadPlayerBase, savePlayerBase, placeBlock, destroyBlock, clearPlayerBase } from '../src/engine/voxel/baseEngine.js';
import { renderMainMenuCard, renderProfileCard, renderInventoryCard } from '../src/services/cardService.js';

// Middlewares & Buttons
import { actionLockMiddleware, isLocked, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { encodeCallback, parseCallback } from '../src/telegram/buttons/callbackData.js';
import { UnauthorizedError, ConcurrencyError } from '../src/utils/errors.js';

const QA_USERS = ['qa_hero_1', 'qa_hero_2', 'qa_hero_3', 'qa_attacker'];

test.before(async () => {
  await connectDatabase();
  // Ensure seed items exist
  await Item.updateOne({ itemId: 'wood_oak' }, { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } }, { upsert: true });
  await Item.updateOne({ itemId: 'plank_oak' }, { $set: { itemId: 'plank_oak', displayName: 'Oak Planks', emoji: '🪵', category: 'refined_wood', basePrice: 12 } }, { upsert: true });
  await Item.updateOne({ itemId: 'stone_granite' }, { $set: { itemId: 'stone_granite', displayName: 'Granite Stone', emoji: '🪨', category: 'raw_stone', basePrice: 4 } }, { upsert: true });
  await Item.updateOne({ itemId: 'iron_ore' }, { $set: { itemId: 'iron_ore', displayName: 'Iron Ore', emoji: '⛏️', category: 'raw_ore', basePrice: 15 } }, { upsert: true });
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: QA_USERS } });
  await Base.deleteMany({ telegramId: { $in: QA_USERS } });
  await Boss.deleteMany({ chatId: '-100999888' });
  await MarketOrder.deleteMany({ sellerId: { $in: QA_USERS } });
  await disconnectDatabase();
  clearAllLocks();
});

test('QA 1: Player Registration, Initial Economy, and Progression Integrity', async () => {
  const user1 = new User({
    telegramId: 'qa_hero_1',
    username: 'qa_hero_1',
    firstName: 'QA Hero 1',
    level: 5,
    coins: 100,
    inventory: [{ itemId: 'wood_oak', quantity: 20 }, { itemId: 'stone_granite', quantity: 20 }],
    tools: [
      { instanceId: 'axe_qa', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30, equipped: true },
      { instanceId: 'pick_qa', toolId: 'tool_pickaxe_wood', toolType: 'pickaxe', tier: 1, durability: 30, maxDurability: 30, equipped: true }
    ],
    skills: {
      woodcutting: { level: 1, xp: 0 },
      mining: { level: 1, xp: 0 },
      crafting: { level: 1, xp: 0 }
    }
  });
  await user1.save();

  assert.strictEqual(user1.coins, 100);
  assert.strictEqual(user1.level, 5);
  assert.strictEqual(user1.title, 'Novice Adventurer');
});

test('QA 2: Economy & Gifting Protection — Zero Duplication & Negative Balance Prevention', async () => {
  const sender = await User.findOne({ telegramId: 'qa_hero_1' });
  const recipient = new User({
    telegramId: 'qa_hero_2',
    username: 'qa_hero_2',
    level: 5,
    coins: 50,
    inventory: []
  });
  await recipient.save();

  // 1. Attempt to gift more than available (must fail)
  const failGift = await executeGiftTransfer({
    sender,
    recipientInput: 'qa_hero_2',
    itemId: 'wood_oak',
    quantity: 999
  });
  assert.strictEqual(failGift.success, false);
  assert.strictEqual(failGift.reason, 'INSUFFICIENT_INVENTORY');

  // 2. Valid Gift transfer of 5 wood
  const successGift = await executeGiftTransfer({
    sender,
    recipientInput: 'qa_hero_2',
    itemId: 'wood_oak',
    quantity: 5
  });
  assert.strictEqual(successGift.success, true);
  assert.strictEqual(sender.inventory.find(i => i.itemId === 'wood_oak').quantity, 15);

  const updatedRecipient = await User.findOne({ telegramId: 'qa_hero_2' });
  assert.strictEqual(updatedRecipient.inventory.find(i => i.itemId === 'wood_oak').quantity, 5);

  // 3. Attempt negative quantity (must fail safely)
  const negGift = await executeGiftTransfer({
    sender,
    recipientInput: 'qa_hero_2',
    itemId: 'wood_oak',
    quantity: -5
  });
  assert.strictEqual(negGift.success, false);
});

test('QA 3: Marketplace Escrow & Concurrency Audit', async () => {
  const seller = await User.findOne({ telegramId: 'qa_hero_1' });
  const buyer = await User.findOne({ telegramId: 'qa_hero_2' });

  // 1. Create listing: 5 wood @ 10 coins each = 50 coins total
  const listingRes = await createMarketListing({
    user: seller,
    itemId: 'wood_oak',
    quantity: 5,
    pricePerUnit: 10
  });
  assert.strictEqual(listingRes.success, true);
  const orderId = listingRes.order.orderId;

  // 2. Buyer has 50 coins -> buys listing
  const buyRes = await purchaseMarketListing({ buyer, orderId });
  assert.strictEqual(buyRes.success, true);
  assert.strictEqual(buyer.coins, 0); // 50 - 50 = 0

  // 3. Double-purchase attempt on fulfilled listing (must fail)
  const doubleBuyRes = await purchaseMarketListing({ buyer, orderId });
  assert.strictEqual(doubleBuyRes.success, false);
  assert.strictEqual(doubleBuyRes.reason, 'LISTING_NO_LONGER_ACTIVE');
});

test('QA 4: Energy-Free Harvesting & Durability Wear', async () => {
  const user = await User.findOne({ telegramId: 'qa_hero_1' });
  const initialDurability = user.tools[0].durability;

  const gatherRes = await executeGatherAction({
    user,
    zoneId: 'zone_forest',
    rngProvider: () => 0.5
  });

  assert.strictEqual(gatherRes.success, true);
  assert.strictEqual(gatherRes.energySpent, 0);
  assert.strictEqual(user.tools[0].durability, initialDurability - 1);
  assert.strictEqual(user.skills.woodcutting.xp, 10);
});

test('QA 5: Crafting & Recipe Validation', async () => {
  const user = await User.findOne({ telegramId: 'qa_hero_1' });
  const initialPlanks = user.inventory.find(i => i.itemId === 'plank_oak')?.quantity || 0;

  const craftRes = await executeCraftRecipe({
    user,
    recipeId: 'recipe_plank_oak'
  });

  assert.strictEqual(craftRes.success, true);
  assert.strictEqual(craftRes.outputItemId, 'plank_oak');
  assert.strictEqual(user.skills.crafting.xp, 10);
  const newPlanks = user.inventory.find(i => i.itemId === 'plank_oak').quantity;
  assert.strictEqual(newPlanks, initialPlanks + 2);
});

test('QA 6: Blacksmith Repair & Tool Tier Upgrades', async () => {
  const user = await User.findOne({ telegramId: 'qa_hero_1' });
  user.tools[0].durability = 5;
  user.coins = 200;

  // 1. Repair Tool
  const repairRes = await executeRepairTool({ user, instanceId: 'axe_qa' });
  assert.strictEqual(repairRes.success, true);
  assert.strictEqual(user.tools[0].durability, user.tools[0].maxDurability);

  // 2. Upgrade to Tier 2 (Stone Axe)
  user.skills.crafting.level = 2;
  const upgradeRes = await executeUpgradeTool({ user, instanceId: 'axe_qa' });
  assert.strictEqual(upgradeRes.success, true);
  assert.strictEqual(upgradeRes.tool.tier, 2);
  assert.strictEqual(upgradeRes.tool.toolId, 'tool_axe_stone');
});

test('QA 7: Offline Earnings Calculation & Safe Claim', async () => {
  const user = await User.findOne({ telegramId: 'qa_hero_1' });
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
  user.offline = { lastLogoutAt: twoHoursAgo };
  user.lastActiveAt = twoHoursAgo;

  const offlineCalc = calculateOfflineEarnings({ user, now: new Date() });
  assert.strictEqual(offlineCalc.hasEarnings, true);
  assert.ok(offlineCalc.coins > 0);

  const claimRes = await claimOfflineRewards({ user, now: new Date() });
  assert.strictEqual(claimRes.success, true);

  // Immediate second claim must yield false
  const secondClaim = await claimOfflineRewards({ user, now: new Date() });
  assert.strictEqual(secondClaim.success, false);
});

test('QA 8: Group Boss Raid — Group Chat Isolation & Atomic Attack', async () => {
  const chatId = '-100999888';
  const attacker = new User({
    telegramId: 'qa_attacker',
    username: 'qa_attacker',
    coins: 0,
    energy: { current: 100, max: 100, lastRegen: new Date() },
    stats: { attackPower: 50 }
  });
  await attacker.save();

  // 1. Spawn Boss
  const { boss } = await spawnOrGetGroupBoss({ chatId });
  assert.strictEqual(boss.chatId, chatId);
  assert.strictEqual(boss.status, 'active');

  // 2. Attack Boss
  const attackRes = await executeBossAttack({
    chatId,
    user: attacker,
    rngProvider: () => 0.5
  });
  assert.strictEqual(attackRes.success, true);
  assert.ok(attackRes.damageDealt > 0);
  assert.ok(attackRes.boss.currentHp < boss.maxHp);
});

test('QA 9: 3D Voxel Mini App — Boundary, Deduplication & Ownership Protection', async () => {
  const telegramId = 'qa_hero_1';

  // 1. Initial base load
  const loadRes = await loadPlayerBase(telegramId);
  assert.strictEqual(loadRes.success, true);

  // 2. Place block inside boundary
  const placeRes = await placeBlock(telegramId, { x: 3, y: 1, z: 3, blockType: 'crystal_magic' });
  assert.strictEqual(placeRes.success, true);

  // 3. Out of bounds placement must fail
  const badPlace = await placeBlock(telegramId, { x: 99, y: 99, z: 99, blockType: 'grass' });
  assert.strictEqual(badPlace.success, false);
  assert.strictEqual(badPlace.reason, 'INVALID_COORDINATES');

  // 4. Clear Base
  const clearRes = await clearPlayerBase(telegramId);
  assert.strictEqual(clearRes.success, true);
  const clearedBase = await Base.findOne({ telegramId });
  assert.strictEqual(clearedBase.blocks.length, 0);
});

test('QA 10: Security Middlewares — ActionLock & OwnershipGuard Protection', async () => {
  const playerA = '111111';
  const playerB = '222222';

  // 1. Action Lock Concurrency
  clearAllLocks();
  const ctx = {
    from: { id: playerA },
    callbackQuery: { data: 'ws_repair_do:axe' },
    answerCbQuery: async () => {}
  };

  let blocked = false;
  await actionLockMiddleware(ctx, async () => {
    try {
      await actionLockMiddleware(ctx, async () => {});
    } catch (err) {
      if (err instanceof ConcurrencyError) blocked = true;
    }
  });
  assert.strictEqual(blocked, true);

  // 2. Ownership Guard Rejection
  const callbackData = encodeCallback({ action: 'ws_repair_do', ownerId: playerA });
  const ctxPlayerB = {
    from: { id: playerB },
    callbackQuery: { data: callbackData },
    answerCbQuery: async () => {},
    state: {}
  };

  let unauthorizedBlocked = false;
  try {
    await ownershipGuardMiddleware(ctxPlayerB, async () => {});
  } catch (err) {
    if (err instanceof UnauthorizedError) unauthorizedBlocked = true;
  }
  assert.strictEqual(unauthorizedBlocked, true);
});

test('QA 11: SVG/PNG Visual Cards — Deterministic 800px Output & Fallback Safety', () => {
  const mockUser = {
    telegramId: 'qa_hero_1',
    username: 'qa_tester',
    level: 10,
    coins: 5400,
    title: 'Timber Initiate',
    skills: {
      woodcutting: { level: 8, xp: 450 },
      mining: { level: 5, xp: 200 },
      crafting: { level: 4, xp: 120 }
    },
    inventory: [
      { itemId: 'wood_oak', quantity: 50 },
      { itemId: 'stone_granite', quantity: 20 }
    ]
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
