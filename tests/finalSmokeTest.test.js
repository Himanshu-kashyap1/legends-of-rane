import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { Base } from '../src/models/Base.js';
import { MarketOrder } from '../src/models/MarketOrder.js';
import { BossRaid } from '../src/models/BossRaid.js';

import { executeGatherAction } from '../src/engine/gathering/gatheringEngine.js';
import { executeCraftRecipe } from '../src/engine/economy/craftingEngine.js';
import { createMarketListing, purchaseMarketListing } from '../src/engine/economy/marketEngine.js';
import { ensurePlayerQuests, claimQuestReward } from '../src/engine/quests/questEngine.js';
import { adoptPet, feedPet, equipPet } from '../src/engine/pets/petEngine.js';
import { spawnOrGetGroupBoss, executeBossAttack } from '../src/engine/combat/bossEngine.js';
import { calculateOfflineEarnings, claimOfflineRewards } from '../src/engine/offline/offlineEngine.js';
import { loadPlayerBase, placeBlock, destroyBlock, savePlayerBase } from '../src/engine/voxel/baseEngine.js';

import { userLoaderMiddleware } from '../src/telegram/middlewares/userLoader.js';
import { clearAllLocks } from '../src/telegram/middlewares/actionLock.js';

const SMOKE_TEST_USERS = ['smoke_hero_101', 'smoke_hero_102'];
const SMOKE_CHAT_ID = -100555888999;

test.before(async () => {
  await connectDatabase();
  await Item.updateOne({ itemId: 'wood_oak' }, { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } }, { upsert: true });
  await Item.updateOne({ itemId: 'plank_oak' }, { $set: { itemId: 'plank_oak', displayName: 'Oak Planks', emoji: '🪵', category: 'refined_wood', basePrice: 12 } }, { upsert: true });
  await Item.updateOne({ itemId: 'stone_granite' }, { $set: { itemId: 'stone_granite', displayName: 'Granite Stone', emoji: '🪨', category: 'raw_stone', basePrice: 4 } }, { upsert: true });
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: SMOKE_TEST_USERS } });
  await Base.deleteMany({ telegramId: { $in: SMOKE_TEST_USERS } });
  await MarketOrder.deleteMany({ sellerId: { $in: SMOKE_TEST_USERS } });
  await BossRaid.deleteMany({ chatId: SMOKE_CHAT_ID });
  await disconnectDatabase();
  clearAllLocks();
});

test('STEP 21: Full End-to-End Smoke Test Sequence', async () => {
  const p1Id = 'smoke_hero_101';
  const p2Id = 'smoke_hero_102';

  // 1. New User Registration
  const ctx1 = { from: { id: p1Id, username: 'p1_smoke' }, chat: { id: 101, type: 'private' }, state: {} };
  const ctx2 = { from: { id: p2Id, username: 'p2_smoke' }, chat: { id: 102, type: 'private' }, state: {} };
  await userLoaderMiddleware(ctx1, async () => {});
  await userLoaderMiddleware(ctx2, async () => {});

  const p1 = ctx1.state.user;
  const p2 = ctx2.state.user;
  assert.ok(p1 && p2);
  assert.strictEqual(p1.coins, 100);
  assert.strictEqual(p2.coins, 100);

  // 2. Gather (Zero Energy)
  const gatherRes = await executeGatherAction({ user: p1, nodeId: 'node_forest_oak', rngProvider: () => 0.5 });
  assert.strictEqual(gatherRes.success, true);
  assert.strictEqual(gatherRes.energySpent, 0);

  // 3. Craft
  p1.inventory.push({ itemId: 'wood_oak', quantity: 10 });
  const craftRes = await executeCraftRecipe({ user: p1, recipeId: 'recipe_plank_oak' });
  assert.strictEqual(craftRes.success, true);
  const hasPlank = p1.inventory.some(i => i.itemId === 'plank_oak' && i.quantity > 0);
  assert.strictEqual(hasPlank, true);

  // 4. Trade (P2P Market)
  const listRes = await createMarketListing({ user: p1, itemId: 'plank_oak', quantity: 1, pricePerUnit: 20 });
  assert.strictEqual(listRes.success, true);

  const buyRes = await purchaseMarketListing({ buyer: p2, orderId: listRes.order.orderId });
  assert.strictEqual(buyRes.success, true);
  assert.strictEqual(p2.coins, 80); // 100 - 20 = 80
  const p2HasPlank = p2.inventory.some(i => i.itemId === 'plank_oak' && i.quantity === 1);
  assert.strictEqual(p2HasPlank, true);

  // 5. Quests (Ensure & Claim)
  ensurePlayerQuests(p1);
  const storyQ = p1.quests[0];
  assert.ok(storyQ);
  storyQ.progress.forEach(p => { p.current = p.required; });
  storyQ.status = 'completed';
  const claimRes = await claimQuestReward({ user: p1, questId: storyQ.questId });
  assert.strictEqual(claimRes.success, true);

  // 6. Pet Adoption & Buff
  p1.coins += 500;
  const petRes = await adoptPet({ user: p1, petId: 'pet_timber_wolf' });
  assert.strictEqual(petRes.success, true);
  const equipRes = await equipPet({ user: p1, petId: 'pet_timber_wolf' });
  assert.strictEqual(equipRes.success, true);

  // 7. World Boss Raid Combat
  const bossRes = await spawnOrGetGroupBoss({ chatId: SMOKE_CHAT_ID });
  assert.strictEqual(bossRes.success, true);
  const atkRes = await executeBossAttack({ user: p1, chatId: SMOKE_CHAT_ID, rngProvider: () => 0.5 });
  assert.strictEqual(atkRes.success, true);
  assert.ok(atkRes.damageDealt > 0);

  // 8. Offline Idle Accrual & Claim
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
  p1.offline = { lastLogoutAt: twoHoursAgo };
  p1.lastActiveAt = twoHoursAgo;
  const offEarnings = calculateOfflineEarnings({ user: p1, now: new Date() });
  assert.strictEqual(offEarnings.hasEarnings, true);
  const offClaim = await claimOfflineRewards({ user: p1, now: new Date() });
  assert.strictEqual(offClaim.success, true);
  assert.ok(offClaim.earnings.coins > 0);

  // 9. 3D Voxel Base Island
  const baseRes = await loadPlayerBase(p1Id);
  assert.strictEqual(baseRes.success, true);
  const blockSave = await savePlayerBase(p1Id, [
    { x: 0, y: 0, z: 0, blockType: 'grass' },
    { x: 1, y: 0, z: 0, blockType: 'smooth_stone' }
  ]);
  assert.strictEqual(blockSave.success, true);
  assert.strictEqual(blockSave.base.blocks.length, 2);
});
