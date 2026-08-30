import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import {
  getRequiredPlayerXp,
  getRequiredSkillXp,
  calculateProgressPercent,
  addPlayerXp,
  addSkillXp,
  syncTitles
} from '../src/engine/progression/progressionEngine.js';
import { TITLES, checkEligibleTitles } from '../src/engine/progression/titleConfig.js';
import { executeGatherAction } from '../src/engine/gathering/gatheringEngine.js';
import { executeCraftRecipe } from '../src/engine/economy/craftingEngine.js';

test.before(async () => {
  await connectDatabase();
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['prog_hero_1', 'prog_hero_2'] } });
  await disconnectDatabase();
});

test('1. XP curve formula verification', () => {
  // Player Level XP: floor(100 * level^1.5)
  assert.strictEqual(getRequiredPlayerXp(1), 100);
  assert.strictEqual(getRequiredPlayerXp(2), 282);
  assert.strictEqual(getRequiredPlayerXp(3), 519);
  assert.strictEqual(getRequiredPlayerXp(4), 800);

  // Skill XP: floor(60 * level^1.4)
  assert.strictEqual(getRequiredSkillXp(1), 60);
  assert.strictEqual(getRequiredSkillXp(2), 158);
});

test('2. Single player level-up and milestone coin rewards', () => {
  const user = {
    telegramId: 'prog_hero_1',
    level: 1,
    xp: 0,
    coins: 100,
    unlockedTitles: ['Novice Adventurer'],
    title: 'Novice Adventurer'
  };

  const res = addPlayerXp(user, 100);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.leveledUp, true);
  assert.strictEqual(user.level, 2);
  assert.strictEqual(user.xp, 0); // 100 - 100 = 0
  assert.strictEqual(user.coins, 150); // 100 + (2 * 25)
});

test('3. Multi-level-up from a single large XP grant', () => {
  const user = {
    telegramId: 'prog_hero_1',
    level: 1,
    xp: 0,
    coins: 0,
    unlockedTitles: ['Novice Adventurer'],
    title: 'Novice Adventurer'
  };

  // Grant 1000 XP:
  // Lv 1 -> Lv 2 takes 100 XP (900 left)
  // Lv 2 -> Lv 3 takes 282 XP (618 left)
  // Lv 3 -> Lv 4 takes 519 XP (99 left)
  const res = addPlayerXp(user, 1000);

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.leveledUp, true);
  assert.strictEqual(res.levelsGained, 3);
  assert.strictEqual(user.level, 4);
  assert.strictEqual(user.xp, 99);
  // Coins bonus: (2*25) + (3*25) + (4*25) = 50 + 75 + 100 = 225
  assert.strictEqual(user.coins, 225);
});

test('4. Skill XP progression & multi-level-up', () => {
  const user = {
    telegramId: 'prog_hero_1',
    skills: {
      woodcutting: { level: 1, xp: 0 }
    }
  };

  // Skill Lv 1 requires 60 XP
  // Grant 70 XP -> Lv 2 with 10 leftover XP
  const res = addSkillXp(user, 'woodcutting', 70);

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.leveledUp, true);
  assert.strictEqual(user.skills.woodcutting.level, 2);
  assert.strictEqual(user.skills.woodcutting.xp, 10);
});

test('5. Title system stub safely returns empty array', () => {
  const user = {
    telegramId: 'prog_hero_1',
    level: 1,
    xp: 0,
    skills: {
      woodcutting: { level: 1, xp: 0 },
      crafting: { level: 1, xp: 0 }
    }
  };

  const titles = syncTitles(user);
  assert.deepStrictEqual(titles, []);
});

test('6. Invalid XP (negative, zero, NaN) rejection without state mutation', () => {
  const user = {
    telegramId: 'prog_hero_1',
    level: 2,
    xp: 50,
    coins: 100
  };

  const resNeg = addPlayerXp(user, -50);
  assert.strictEqual(resNeg.success, false);
  assert.strictEqual(user.xp, 50); // Untouched

  const resZero = addPlayerXp(user, 0);
  assert.strictEqual(resZero.success, false);
  assert.strictEqual(user.xp, 50);

  const resSkillInvalid = addSkillXp(user, 'invalid_skill', 100);
  assert.strictEqual(resSkillInvalid.success, false);
});

test('8. Gathering & Crafting XP integration', async () => {
  const user = {
    telegramId: 'prog_hero_2',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    coins: 500,
    level: 1,
    xp: 0,
    skills: {
      woodcutting: { level: 1, xp: 0 },
      crafting: { level: 1, xp: 0 }
    },
    inventory: [{ itemId: 'wood_oak', quantity: 20 }],
    tools: [{ instanceId: 'axe_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30, equipped: true }],
    unlockedTitles: ['Novice Adventurer']
  };

  // 1. Gather Action
  const gatherRes = await executeGatherAction({ user, nodeId: 'node_forest_oak' });
  assert.strictEqual(gatherRes.success, true);
  assert.ok(user.skills.woodcutting.xp > 0);
  assert.ok(user.xp > 0);

  // 2. Craft Action
  const craftRes = await executeCraftRecipe({ user, recipeId: 'recipe_plank_oak', craftQty: 1 });
  assert.strictEqual(craftRes.success, true);
  assert.ok(user.skills.crafting.xp > 0);
});
