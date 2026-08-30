import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import {
  adoptPet,
  equipPet,
  feedPet,
  getActivePetBuff,
  decayActivePetHappiness
} from '../src/engine/pets/petEngine.js';
import { PETS, PET_CONFIG } from '../src/engine/pets/petConfig.js';
import { executeGatherAction } from '../src/engine/gathering/gatheringEngine.js';
import { actionLockMiddleware, isLocked, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { encodeCallback } from '../src/telegram/buttons/callbackData.js';
import { UnauthorizedError, ConcurrencyError } from '../src/utils/errors.js';

test.before(async () => {
  await connectDatabase();
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['pet_trainer_1', 'pet_trainer_poor', 'pet_gather_tester'] } });
  await disconnectDatabase();
  clearAllLocks();
});

test('1, 2, 3. Pet adoption, coin deduction, and duplicate/insufficient coin validations', async () => {
  const user = {
    telegramId: 'pet_trainer_1',
    coins: 1000,
    pets: [],
    activePet: null
  };

  // 1. Valid Adoption (Timber Wolf = 500c)
  const res1 = await adoptPet({ user, petId: 'pet_timber_wolf' });
  assert.strictEqual(res1.success, true);
  assert.strictEqual(user.coins, 500); // 1000 - 500
  assert.strictEqual(user.pets.length, 1);
  assert.strictEqual(user.pets[0].petId, 'pet_timber_wolf');
  assert.strictEqual(user.pets[0].happiness, 100);
  assert.strictEqual(user.activePet, 'pet_timber_wolf'); // Auto-equipped

  // 2. Duplicate Adoption (Should Fail)
  const res2 = await adoptPet({ user, petId: 'pet_timber_wolf' });
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.reason, 'ALREADY_OWNED');
  assert.strictEqual(user.coins, 500); // Untouched

  // 3. Insufficient Coins (Solar Drake = 1500c, user has 500c)
  const res3 = await adoptPet({ user, petId: 'pet_solar_drake' });
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.reason, 'INSUFFICIENT_COINS');
  assert.strictEqual(user.coins, 500);
});

test('4. Equip, switch, and unequip companion pets', async () => {
  const user = {
    telegramId: 'pet_trainer_1',
    coins: 1000,
    pets: [
      { petId: 'pet_timber_wolf', level: 1, happiness: 100 },
      { petId: 'pet_crystal_mole', level: 1, happiness: 80 }
    ],
    activePet: 'pet_timber_wolf'
  };

  // 1. Switch to Crystal Mole
  const equipRes = await equipPet({ user, petId: 'pet_crystal_mole' });
  assert.strictEqual(equipRes.success, true);
  assert.strictEqual(user.activePet, 'pet_crystal_mole');

  // 2. Unequip
  const unequipRes = await equipPet({ user, petId: 'none' });
  assert.strictEqual(unequipRes.success, true);
  assert.strictEqual(user.activePet, null);

  // 3. Equip unowned pet (Should Fail)
  const unownedRes = await equipPet({ user, petId: 'pet_solar_drake' });
  assert.strictEqual(unownedRes.success, false);
  assert.strictEqual(unownedRes.reason, 'PET_NOT_OWNED');
});

test('5. Feeding pet restores happiness and bounds to 100%', async () => {
  const user = {
    telegramId: 'pet_trainer_1',
    coins: 100,
    pets: [
      { petId: 'pet_timber_wolf', level: 1, happiness: 40 }
    ]
  };

  // Feed (Restores +30, 40 -> 70, Cost: 15c)
  const feed1 = await feedPet({ user, petId: 'pet_timber_wolf' });
  assert.strictEqual(feed1.success, true);
  assert.strictEqual(feed1.newHappiness, 70);
  assert.strictEqual(user.coins, 85);

  // Feed again (70 + 30 = 100 max)
  const feed2 = await feedPet({ user, petId: 'pet_timber_wolf' });
  assert.strictEqual(feed2.success, true);
  assert.strictEqual(feed2.newHappiness, 100);

  // Feed when full (Should reject)
  const feedFull = await feedPet({ user, petId: 'pet_timber_wolf' });
  assert.strictEqual(feedFull.success, false);
  assert.strictEqual(feedFull.reason, 'ALREADY_FULL_HAPPINESS');
});

test('6, 7. Buff calculation and happiness threshold gating (50% rule)', () => {
  // 1. Happy Timber Wolf (>= 50% happiness -> Active Buff)
  const happyUser = {
    activePet: 'pet_timber_wolf',
    pets: [{ petId: 'pet_timber_wolf', happiness: 80 }]
  };
  const happyBuff = getActivePetBuff(happyUser);
  assert.strictEqual(happyBuff.active, true);
  assert.strictEqual(happyBuff.perkType, 'woodcutting_xp');
  assert.strictEqual(happyBuff.perkValue, 0.15);

  // 2. Hungry Pet (< 50% happiness -> Inactive Buff)
  const hungryUser = {
    activePet: 'pet_timber_wolf',
    pets: [{ petId: 'pet_timber_wolf', happiness: 30 }]
  };
  const hungryBuff = getActivePetBuff(hungryUser);
  assert.strictEqual(hungryBuff.active, false);
  assert.strictEqual(hungryBuff.reason, 'PET_HUNGRY');

  // 3. Legendary Solar Drake (+25% All Yield)
  const legendaryUser = {
    activePet: 'pet_solar_drake',
    pets: [{ petId: 'pet_solar_drake', happiness: 100 }]
  };
  const drakeBuff = getActivePetBuff(legendaryUser);
  assert.strictEqual(drakeBuff.active, true);
  assert.strictEqual(drakeBuff.perkType, 'all_gathering_yield');
  assert.strictEqual(drakeBuff.perkValue, 0.25);
});

test('8. Gathering integrates pet perks and decays happiness', async () => {
  const user = {
    telegramId: 'pet_gather_tester',
    energy: { current: 100, max: 100, lastRegen: new Date() },
    coins: 100,
    skills: { woodcutting: { level: 1, xp: 0 } },
    inventory: [],
    tools: [{ instanceId: 'tool_axe_1', toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30, equipped: true }],
    activePet: 'pet_timber_wolf',
    pets: [{ petId: 'pet_timber_wolf', happiness: 100 }]
  };

  const result = await executeGatherAction({ user, nodeId: 'node_forest_oak' });
  assert.strictEqual(result.success, true);
  assert.strictEqual(user.pets[0].happiness, 98); // Decayed by 2
  // Woodcutting XP increased by +15% (10 + round(10 * 0.15) = 12 XP)
  assert.ok(user.skills.woodcutting.xp >= 11);
});

test('9. Concurrent pet adoption/feeding double-click protection via ActionLock', async () => {
  const telegramId = 'pet_trainer_1';
  clearAllLocks();

  const ctx = {
    from: { id: telegramId },
    callbackQuery: { data: 'pet_adopt_do:pet_timber_wolf' },
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

test('10. OwnershipGuard protects pet callbacks from third-party players', async () => {
  const playerA = '111111';
  const playerB = '222222';

  const callbackData = encodeCallback({ action: 'pet_feed_do', ownerId: playerA, targetId: 'pet_timber_wolf' });

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
