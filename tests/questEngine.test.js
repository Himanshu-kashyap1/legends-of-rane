import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import {
  ensurePlayerQuests,
  trackQuestProgress,
  claimQuestReward
} from '../src/engine/quests/questEngine.js';
import { QUESTS } from '../src/engine/quests/questConfig.js';
import { actionLockMiddleware, isLocked, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { encodeCallback } from '../src/telegram/buttons/callbackData.js';
import { UnauthorizedError, ConcurrencyError } from '../src/utils/errors.js';

test.before(async () => {
  await connectDatabase();
  await Item.updateOne({ itemId: 'wood_oak' }, { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } }, { upsert: true });
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['quest_hero_1', 'quest_hero_2'] } });
  await disconnectDatabase();
  clearAllLocks();
});

test('1. Quest visibility & auto-initialization of Story and Daily quests', () => {
  const user = { telegramId: 'quest_hero_1', quests: [] };
  const quests = ensurePlayerQuests(user);

  assert.ok(quests.length >= 6);
  assert.ok(quests.find(q => q.questId === 'quest_story_first_steps'));
  assert.ok(quests.find(q => q.questId === 'quest_daily_woodcutter'));
  assert.strictEqual(quests.find(q => q.questId === 'quest_story_first_steps').status, 'active');
});

test('2, 3. Progress updates on gathering/crafting and marks completion', async () => {
  const user = {
    telegramId: 'quest_hero_1',
    quests: []
  };

  // 1. Partial Progress
  await trackQuestProgress({
    user,
    eventType: 'gather_item',
    targetId: 'wood_oak',
    count: 5
  });

  const storyQuest = user.quests.find(q => q.questId === 'quest_story_first_steps');
  assert.strictEqual(storyQuest.status, 'active');
  assert.strictEqual(storyQuest.progress[0].current, 5);

  // 2. Complete Story Quest (Needs 10 total)
  const completeRes = await trackQuestProgress({
    user,
    eventType: 'gather_item',
    targetId: 'wood_oak',
    count: 5
  });

  assert.strictEqual(storyQuest.status, 'completed');
  assert.strictEqual(storyQuest.progress[0].current, 10);
  assert.ok(completeRes.newlyCompleted.includes('quest_story_first_steps'));
});

test('4, 5, 6. Valid reward claim, duplicate claim rejection, and uncompleted claim rejection', async () => {
  const user = {
    telegramId: 'quest_hero_1',
    coins: 100,
    xp: 0,
    level: 1,
    inventory: [],
    quests: [
      {
        questId: 'quest_story_first_steps',
        status: 'completed',
        progress: [{ targetId: 'wood_oak', current: 10, required: 10 }]
      },
      {
        questId: 'quest_story_planks',
        status: 'active',
        progress: [{ targetId: 'plank_oak', current: 1, required: 4 }]
      }
    ],
    statistics: { questsCompleted: 0 }
  };

  // 1. Claim Uncompleted Quest (Should Fail)
  const uncompletedRes = await claimQuestReward({ user, questId: 'quest_story_planks' });
  assert.strictEqual(uncompletedRes.success, false);
  assert.strictEqual(uncompletedRes.reason, 'QUEST_NOT_COMPLETED');
  assert.strictEqual(user.coins, 100);

  // 2. Claim Completed Quest (Should Succeed)
  const claimRes = await claimQuestReward({ user, questId: 'quest_story_first_steps' });
  assert.strictEqual(claimRes.success, true);
  assert.strictEqual(claimRes.coinsReward, 50);
  assert.strictEqual(claimRes.xpReward, 100);
  assert.strictEqual(user.level, 2); // Leveled up from 1 to 2
  assert.strictEqual(user.coins, 200); // 100 initial + 50 quest + 50 level up bonus
  assert.strictEqual(user.xp, 0); // 100 - 100 = 0
  assert.strictEqual(user.inventory.find(i => i.itemId === 'wood_oak').quantity, 5); // Reward items
  assert.strictEqual(user.quests.find(q => q.questId === 'quest_story_first_steps').status, 'claimed');
  assert.strictEqual(user.statistics.questsCompleted, 1);

  // 3. Duplicate Claim (Should Fail)
  const dupRes = await claimQuestReward({ user, questId: 'quest_story_first_steps' });
  assert.strictEqual(dupRes.success, false);
  assert.strictEqual(dupRes.reason, 'QUEST_ALREADY_CLAIMED');
  assert.strictEqual(user.coins, 200); // Untouched
});

test('7. Daily reset resets daily quests on next UTC day without affecting claimed story quests', () => {
  const user = {
    telegramId: 'quest_hero_1',
    quests: [
      {
        questId: 'quest_story_first_steps',
        status: 'claimed',
        progress: [{ targetId: 'wood_oak', current: 10, required: 10 }]
      },
      {
        questId: 'quest_daily_woodcutter',
        status: 'claimed',
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        progress: [{ targetId: 'wood_oak', current: 15, required: 15 }]
      }
    ]
  };

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  ensurePlayerQuests(user, tomorrow);

  // Story quest remains claimed
  assert.strictEqual(user.quests.find(q => q.questId === 'quest_story_first_steps').status, 'claimed');

  // Daily quest is reset to active with 0 progress
  const dailyQuest = user.quests.find(q => q.questId === 'quest_daily_woodcutter');
  assert.strictEqual(dailyQuest.status, 'active');
  assert.strictEqual(dailyQuest.progress[0].current, 0);
});

test('10. Concurrent quest claim double-click protection via ActionLock', async () => {
  const telegramId = 'quest_hero_1';
  clearAllLocks();

  const ctx = {
    from: { id: telegramId },
    callbackQuery: { data: 'qst_claim_do:quest_story_first_steps' },
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

test('11. OwnershipGuard protects quest callbacks from third-party players', async () => {
  const playerA = '111111';
  const playerB = '222222';

  const callbackData = encodeCallback({ action: 'qst_claim_do', ownerId: playerA, targetId: 'quest_story_first_steps' });

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
