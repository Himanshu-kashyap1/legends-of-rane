import { QUESTS, getQuestsByCategory } from './questConfig.js';
import { getRequiredPlayerXp, addPlayerXp } from '../progression/progressionEngine.js';
import { logger } from '../../utils/logger.js';

/**
 * Ensures player has active story quests and the latest daily quests,
 * resetting daily quests if a new UTC day has started.
 *
 * @param {Object} user
 * @param {Date} [now=new Date()]
 * @returns {Array<Object>} Updated player quests array
 */
export function ensurePlayerQuests(user, now = new Date()) {
  user.quests = user.quests || [];
  const currentDateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // 1. Ensure all Story Quests exist in user.quests
  const storyQuests = getQuestsByCategory('story');
  for (const sq of storyQuests) {
    const existing = user.quests.find(q => q && q.questId === sq.questId);
    if (!existing) {
      user.quests.push({
        questId: sq.questId,
        status: 'active',
        progress: sq.requirements.map(r => ({
          targetId: r.targetId,
          current: 0,
          required: r.count
        })),
        startedAt: now,
        completedAt: null
      });
    }
  }

  // 2. Ensure all Daily Quests exist and handle Daily Midnight Reset
  const dailyQuests = getQuestsByCategory('daily');
  for (const dq of dailyQuests) {
    const existing = user.quests.find(q => q && q.questId === dq.questId);
    if (!existing) {
      user.quests.push({
        questId: dq.questId,
        status: 'active',
        progress: dq.requirements.map(r => ({
          targetId: r.targetId,
          current: 0,
          required: r.count
        })),
        startedAt: now,
        completedAt: null
      });
    } else {
      // Check if started on a previous date
      const startedDateStr = existing.startedAt ? new Date(existing.startedAt).toISOString().slice(0, 10) : '';
      if (startedDateStr !== currentDateStr) {
        // Reset daily quest for the new day
        existing.status = 'active';
        existing.progress = dq.requirements.map(r => ({
          targetId: r.targetId,
          current: 0,
          required: r.count
        }));
        existing.startedAt = now;
        existing.completedAt = null;
      }
    }
  }

  return user.quests;
}

/**
 * Reusable event hook to track quest progress across gathering, crafting, and trading.
 *
 * @param {Object} params
 * @param {Object} params.user
 * @param {'gather_item'|'craft_item'|'market_trade'} params.eventType
 * @param {string} params.targetId
 * @param {number} [params.count=1]
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<{ updated: boolean, newlyCompleted: Array<string> }>}
 */
export async function trackQuestProgress({ user, eventType, targetId, count = 1, now = new Date() }) {
  if (!user || !eventType) return { updated: false, newlyCompleted: [] };

  ensurePlayerQuests(user, now);
  const newlyCompleted = [];
  let updated = false;

  for (const pq of user.quests) {
    if (pq.status !== 'active') continue;

    const questDef = QUESTS[pq.questId];
    if (!questDef) continue;

    let questProgressChanged = false;

    for (let i = 0; i < questDef.requirements.length; i++) {
      const req = questDef.requirements[i];
      if (req.type !== eventType) continue;

      if (req.targetId === '*' || req.targetId.toLowerCase() === String(targetId || '').toLowerCase()) {
        const prog = pq.progress?.find(p => p.targetId.toLowerCase() === req.targetId.toLowerCase());
        if (prog && prog.current < prog.required) {
          prog.current = Math.min(prog.required, (prog.current || 0) + count);
          questProgressChanged = true;
          updated = true;
        }
      }
    }

    // Check if all requirements are now satisfied
    if (questProgressChanged) {
      const isAllComplete = questDef.requirements.every((req, idx) => {
        const prog = pq.progress?.find(p => p.targetId.toLowerCase() === req.targetId.toLowerCase());
        return prog && prog.current >= prog.required;
      });

      if (isAllComplete) {
        pq.status = 'completed';
        pq.completedAt = now;
        newlyCompleted.push(pq.questId);
        logger.info(`Quest Completed: Player ${user.telegramId} completed [${questDef.title}]`);
      }
    }
  }

  if (updated && typeof user.save === 'function') {
    user.markModified('quests');
    await user.save();
  }

  return { updated, newlyCompleted };
}

/**
 * Atomically claims rewards for a completed quest.
 *
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document
 * @param {string} params.questId - Quest ID
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>} Structured reward outcome
 */
export async function claimQuestReward({ user, questId, now = new Date() }) {
  if (!user || !questId) {
    return { success: false, reason: 'INVALID_PARAMETERS' };
  }

  ensurePlayerQuests(user, now);

  const quest = user.quests.find(q => q && q.questId === questId);
  if (!quest) {
    return { success: false, reason: 'QUEST_NOT_FOUND', questId };
  }

  if (quest.status === 'claimed') {
    return { success: false, reason: 'QUEST_ALREADY_CLAIMED', questId };
  }

  if (quest.status !== 'completed') {
    return {
      success: false,
      reason: 'QUEST_NOT_COMPLETED',
      questId,
      status: quest.status,
      progress: quest.progress
    };
  }

  const questDef = QUESTS[questId];
  if (!questDef) {
    return { success: false, reason: 'QUEST_NOT_FOUND', questId };
  }

  // 1. Mark Quest as Claimed
  quest.status = 'claimed';
  quest.claimedAt = now;

  // 2. Award Coins
  const coinsReward = questDef.rewards?.coins || 0;
  user.coins = (user.coins || 0) + coinsReward;

  // 3. Award XP and check Level Up via Authoritative Progression Engine
  const xpReward = questDef.rewards?.playerXp || 0;
  let progression = { leveledUp: false, newLevel: user.level || 1, newTitlesUnlocked: [] };
  if (xpReward > 0) {
    progression = addPlayerXp(user, xpReward);
  }

  // 4. Award Items
  const itemsGranted = [];
  if (Array.isArray(questDef.rewards?.items)) {
    user.inventory = user.inventory || [];
    for (const rewardItem of questDef.rewards.items) {
      const existing = user.inventory.find(i => i && i.itemId === rewardItem.itemId);
      if (existing) {
        existing.quantity = (existing.quantity || 0) + rewardItem.quantity;
      } else {
        user.inventory.push({
          itemId: rewardItem.itemId,
          quantity: rewardItem.quantity
        });
      }
      itemsGranted.push({ itemId: rewardItem.itemId, quantity: rewardItem.quantity });
    }
  }

  // 5. Update Player Statistics
  if (!user.statistics) user.statistics = {};
  user.statistics.questsCompleted = (user.statistics.questsCompleted || 0) + 1;
  user.lastActiveAt = now;

  if (typeof user.save === 'function') {
    user.markModified('quests');
    user.markModified('coins');
    user.markModified('inventory');
    user.markModified('statistics');
    await user.save();
  }

  logger.info(`Quest Claimed: Player ${user.telegramId} claimed [${questDef.title}] (+${coinsReward}c, +${xpReward}XP)`);

  return {
    success: true,
    questId: questDef.questId,
    title: questDef.title,
    category: questDef.category,
    coinsReward,
    xpReward,
    itemsGranted,
    leveledUp: progression.leveledUp,
    newLevel: user.level,
    totalCoins: user.coins
  };
}

export default {
  ensurePlayerQuests,
  trackQuestProgress,
  claimQuestReward
};
