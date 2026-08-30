import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import {
  getPlayerHuntingState,
  createCombatSession,
  claimMonsterKill,
  craftHuntingWeapon
} from '../src/engine/hunting/huntingEngine.js';
import { MONSTER_CATALOG, WEAPON_PROGRESSION } from '../src/engine/hunting/huntingConfig.js';

test.before(async () => {
  await connectDatabase();
});

test.after(async () => {
  await disconnectDatabase();
});

test('1. Hunting Catalog: All 15 monsters have valid stats and biomes', () => {
  const monsterIds = Object.keys(MONSTER_CATALOG);
  assert.strictEqual(monsterIds.length, 15);

  for (const [id, m] of Object.entries(MONSTER_CATALOG)) {
    assert.strictEqual(m.id, id);
    assert.ok(m.maxHp > 0);
    assert.ok(m.attackPower > 0);
    assert.ok(m.xpReward > 0);
    assert.ok(Array.isArray(m.coinReward) && m.coinReward[0] <= m.coinReward[1]);
    assert.ok(['forest', 'quarry', 'caverns', 'volcano', 'ruins'].includes(m.biome));
  }
});

test('2. Hunting Catalog: Weapon progression has 6 balanced tiers', () => {
  const weaponIds = Object.keys(WEAPON_PROGRESSION);
  assert.strictEqual(weaponIds.length, 6);

  assert.strictEqual(WEAPON_PROGRESSION.wpn_wood_blade.tier, 1);
  assert.strictEqual(WEAPON_PROGRESSION.wpn_celestial_edge.tier, 6);
  assert.ok(WEAPON_PROGRESSION.wpn_celestial_edge.attack > WEAPON_PROGRESSION.wpn_wood_blade.attack);
});

test('3. getPlayerHuntingState: Initial state loads or creates hunter with base stats', async () => {
  const telegramId = 'test_hunter_101';
  await User.deleteOne({ telegramId });

  const state = await getPlayerHuntingState(telegramId);
  assert.strictEqual(state.telegramId, telegramId);
  assert.strictEqual(state.level, 1);
  assert.strictEqual(state.maxHp, 100);
  assert.strictEqual(state.equippedWeapon.id, 'wpn_wood_blade');
  assert.ok(Array.isArray(state.availableWeapons));
});

test('4. createCombatSession & claimMonsterKill: Validates session, awards coins, XP and drops', async () => {
  const telegramId = 'test_hunter_combat_1';
  await User.deleteOne({ telegramId });

  const user = new User({
    telegramId,
    level: 1,
    xp: 0,
    coins: 100,
    inventory: []
  });
  await user.save();

  // 1. Create Session
  const sessionRes = await createCombatSession({ telegramId, monsterId: 'forest_wolf' });
  assert.ok(sessionRes.sessionToken);
  assert.strictEqual(sessionRes.monster.name, 'Forest Wolf');

  // 2. Claim Kill
  const killRes = await claimMonsterKill({
    telegramId,
    sessionToken: sessionRes.sessionToken,
    monsterId: 'forest_wolf',
    timeTakenMs: 2500
  });

  assert.strictEqual(killRes.success, true);
  assert.strictEqual(killRes.monsterName, 'Forest Wolf');
  assert.ok(killRes.coinsEarned >= 15 && killRes.coinsEarned <= 30);
  assert.strictEqual(killRes.xpEarned, 25);
  assert.strictEqual(killRes.totalDefeated, 1);

  // Verify MongoDB updated
  const updatedUser = await User.findOne({ telegramId });
  assert.strictEqual(updatedUser.coins, 100 + killRes.coinsEarned);
  assert.strictEqual(updatedUser.xp, 25);
  assert.strictEqual(updatedUser.statistics.monstersDefeated, 1);
});

test('5. claimMonsterKill Anti-Cheat: Prevents duplicate replay claims using same sessionToken', async () => {
  const telegramId = 'test_hunter_anticheat';
  await User.deleteOne({ telegramId });

  const user = new User({ telegramId, level: 1, coins: 50 });
  await user.save();

  const session = await createCombatSession({ telegramId, monsterId: 'stone_golem' });

  // First claim succeeds
  const firstClaim = await claimMonsterKill({
    telegramId,
    sessionToken: session.sessionToken,
    monsterId: 'stone_golem'
  });
  assert.strictEqual(firstClaim.success, true);

  // Second claim fails (session consumed)
  await assert.rejects(
    async () => {
      await claimMonsterKill({
        telegramId,
        sessionToken: session.sessionToken,
        monsterId: 'stone_golem'
      });
    },
    /INVALID_OR_EXPIRED_SESSION/
  );
});

test('6. craftHuntingWeapon: Deducts Telegram materials and equips higher tier weapon', async () => {
  const telegramId = 'test_hunter_craft_1';
  await User.deleteOne({ telegramId });

  // Create player with level 2 and required materials for Granite Cleaver (Tier 2)
  const user = new User({
    telegramId,
    level: 2,
    inventory: [
      { itemId: 'wood_oak', quantity: 25 },
      { itemId: 'stone_granite', quantity: 20 }
    ]
  });
  await user.save();

  const craftRes = await craftHuntingWeapon({
    telegramId,
    weaponId: 'wpn_stone_scythe'
  });

  assert.strictEqual(craftRes.success, true);
  assert.strictEqual(craftRes.equippedWeapon.id, 'wpn_stone_scythe');
  assert.strictEqual(craftRes.equippedWeapon.attack, 35);

  // Check inventory deduction in DB
  const updatedUser = await User.findOne({ telegramId });
  assert.strictEqual(updatedUser.equippedWeapon, 'wpn_stone_scythe');
  assert.strictEqual(updatedUser.inventory.find(i => i.itemId === 'wood_oak').quantity, 5); // 25 - 20 = 5
  assert.strictEqual(updatedUser.inventory.find(i => i.itemId === 'stone_granite').quantity, 5); // 20 - 15 = 5
});

test('7. craftHuntingWeapon: Fails if player level or materials are insufficient', async () => {
  const telegramId = 'test_hunter_craft_fail';
  await User.deleteOne({ telegramId });

  const user = new User({
    telegramId,
    level: 1, // Level 1 cannot craft Tier 2 (requires Lv 2)
    inventory: [{ itemId: 'wood_oak', quantity: 10 }]
  });
  await user.save();

  await assert.rejects(
    async () => {
      await craftHuntingWeapon({ telegramId, weaponId: 'wpn_stone_scythe' });
    },
    /Requires Player Level 2/
  );
});
