import { Boss } from '../../models/Boss.js';
import { User } from '../../models/User.js';
import { BOSS_COMBAT_CONFIG, BOSS_CATALOG, getBossDefinition } from './bossConfig.js';
import { calculateCurrentEnergy } from '../gathering/energyCalculator.js';
import { addPlayerXp } from '../progression/progressionEngine.js';
import { logger } from '../../utils/logger.js';

/**
 * Spawns a new Colossus Boss for a Telegram Group, or retrieves the current active boss.
 *
 * @param {Object} params
 * @param {string|number} params.chatId - Group Chat ID
 * @param {string} [params.bossId='colossus_ancient_titan']
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<{ success: boolean, boss: Object, isNew: boolean }>}
 */
export async function spawnOrGetGroupBoss({ chatId, bossId = 'colossus_ancient_titan', now = new Date() }) {
  if (!chatId) {
    return { success: false, reason: 'INVALID_CHAT_ID' };
  }

  const strChatId = String(chatId);
  const existingBoss = await Boss.findOne({ chatId: strChatId, status: 'active' });
  if (existingBoss) {
    return { success: true, boss: existingBoss, isNew: false };
  }

  const bossDef = getBossDefinition(bossId);
  const newBoss = new Boss({
    chatId: strChatId,
    bossId: bossDef.bossId,
    name: bossDef.name,
    emoji: bossDef.emoji,
    currentHp: bossDef.maxHp,
    maxHp: bossDef.maxHp,
    status: 'active',
    participants: [],
    totalDamageDealt: 0,
    rewardsDistributed: false,
    spawnedAt: now
  });

  await newBoss.save();
  logger.info(`Spawned new Colossus Raid Boss [${bossDef.name}] for group chat ${strChatId}`);

  return { success: true, boss: newBoss, isNew: true };
}

/**
 * Calculates server-side player attack damage with level and tool tier modifiers.
 *
 * @param {Object} params
 * @param {Object} params.user
 * @param {Function} [params.rngProvider=Math.random]
 * @returns {{ finalDamage: number, isCrit: boolean, baseDamage: number, toolBonus: number }}
 */
export function calculatePlayerAttackDamage({ user, rngProvider = Math.random }) {
  const level = Math.max(1, user?.level || 1);
  const baseDamage = 50 + (level * 10);

  // Highest equipped tool tier bonus
  let toolBonus = 0;
  if (Array.isArray(user?.tools)) {
    const equippedTools = user.tools.filter(t => t && t.equipped);
    for (const tool of equippedTools) {
      toolBonus = Math.max(toolBonus, (tool.tier || 1) * 25);
    }
  }

  let finalDamage = baseDamage + toolBonus;
  const isCrit = rngProvider() < BOSS_COMBAT_CONFIG.BASE_CRIT_CHANCE;
  if (isCrit) {
    finalDamage = Math.round(finalDamage * BOSS_COMBAT_CONFIG.CRIT_MULTIPLIER);
  }

  return {
    finalDamage,
    isCrit,
    baseDamage,
    toolBonus
  };
}

/**
 * Executes an attack action against the active group boss.
 *
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document
 * @param {string|number} params.chatId - Group Chat ID
 * @param {Function} [params.rngProvider=Math.random]
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>}
 */
export async function executeBossAttack({ user, chatId, rngProvider = Math.random, now = new Date() }) {
  if (!user || !chatId) {
    return { success: false, reason: 'INVALID_PARAMETERS' };
  }

  const strChatId = String(chatId);

  // 1. Energy Validation
  const energyCalc = calculateCurrentEnergy(user.energy, now);
  if (energyCalc.currentEnergy < BOSS_COMBAT_CONFIG.ATTACK_ENERGY_COST) {
    return {
      success: false,
      reason: 'INSUFFICIENT_ENERGY',
      currentEnergy: energyCalc.currentEnergy,
      requiredEnergy: BOSS_COMBAT_CONFIG.ATTACK_ENERGY_COST
    };
  }

  // 2. Fetch Active Boss
  const boss = await Boss.findOne({ chatId: strChatId, status: 'active' });
  if (!boss) {
    return { success: false, reason: 'NO_ACTIVE_BOSS' };
  }

  if (boss.currentHp <= 0) {
    return { success: false, reason: 'BOSS_ALREADY_DEFEATED' };
  }

  // 3. Calculate Damage
  const { finalDamage, isCrit } = calculatePlayerAttackDamage({ user, rngProvider });
  const actualDamage = Math.min(boss.currentHp, finalDamage);

  // 4. Update Boss State
  boss.currentHp = Math.max(0, boss.currentHp - actualDamage);
  boss.totalDamageDealt = (boss.totalDamageDealt || 0) + actualDamage;

  const playerTgId = String(user.telegramId);
  const username = user.username ? `@${user.username}` : user.firstName || 'Warrior';

  let participant = boss.participants.find(p => p && p.telegramId === playerTgId);
  if (participant) {
    participant.damageDealt += actualDamage;
    participant.attackCount += 1;
    participant.lastAttackAt = now;
    participant.username = username;
  } else {
    boss.participants.push({
      telegramId: playerTgId,
      username,
      firstName: user.firstName || '',
      damageDealt: actualDamage,
      attackCount: 1,
      lastAttackAt: now
    });
  }

  let isDefeated = false;
  let rewardsSummary = null;

  if (boss.currentHp === 0) {
    boss.status = 'defeated';
    boss.defeatedAt = now;
    isDefeated = true;
  }

  await boss.save();

  // 5. Update User State (Energy & Stats)
  user.energy = {
    current: energyCalc.currentEnergy - BOSS_COMBAT_CONFIG.ATTACK_ENERGY_COST,
    max: energyCalc.maxEnergy,
    lastRegen: energyCalc.newLastRegen
  };
  user.statistics = user.statistics || {};
  user.statistics.bossDamageDealt = (user.statistics.bossDamageDealt || 0) + actualDamage;
  user.lastActiveAt = now;

  if (typeof user.save === 'function') {
    user.markModified('energy');
    user.markModified('statistics');
    await user.save();
  }

  // 6. If Defeated, Distribute Rewards
  if (isDefeated) {
    rewardsSummary = await distributeBossRewards({ boss, now });
  }

  logger.info(`Player ${user.telegramId} struck ${boss.name} for ${actualDamage} DMG ${isCrit ? '(CRIT!)' : ''} [HP: ${boss.currentHp}/${boss.maxHp}]`);

  return {
    success: true,
    damageDealt: actualDamage,
    isCrit,
    remainingHp: boss.currentHp,
    maxHp: boss.maxHp,
    isDefeated,
    rewardsSummary,
    boss
  };
}

/**
 * Distributes proportional rewards to all raid participants upon boss defeat.
 *
 * @param {Object} params
 * @param {Object} params.boss - Mongoose Boss document
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Array<Object>>}
 */
export async function distributeBossRewards({ boss, now = new Date() }) {
  if (!boss || boss.rewardsDistributed || !Array.isArray(boss.participants)) {
    return [];
  }

  boss.rewardsDistributed = true;
  const bossDef = getBossDefinition(boss.bossId);
  const totalDamage = Math.max(1, boss.totalDamageDealt || boss.maxHp);
  const distributionResults = [];

  for (const part of boss.participants) {
    const sharePercent = part.damageDealt / totalDamage;
    const coinsReward = Math.max(10, Math.floor(bossDef.rewards.coinsPool * sharePercent));
    const xpReward = Math.max(20, Math.floor(bossDef.rewards.xpPool * sharePercent));

    const earnedDrops = [];
    if (Array.isArray(bossDef.rewards.rareDrops)) {
      for (const drop of bossDef.rewards.rareDrops) {
        if ((sharePercent * 100) >= drop.minContributionPercent) {
          earnedDrops.push({ itemId: drop.itemId, displayName: drop.displayName, emoji: drop.emoji, quantity: 1 });
        }
      }
    }

    // Atomically credit participant user profile
    const participantDoc = await User.findOne({ telegramId: part.telegramId });
    if (participantDoc) {
      participantDoc.coins = (participantDoc.coins || 0) + coinsReward;
      addPlayerXp(participantDoc, xpReward);

      if (earnedDrops.length > 0) {
        participantDoc.inventory = participantDoc.inventory || [];
        for (const drop of earnedDrops) {
          const existing = participantDoc.inventory.find(i => i && i.itemId === drop.itemId);
          if (existing) {
            existing.quantity = (existing.quantity || 0) + 1;
          } else {
            participantDoc.inventory.push({ itemId: drop.itemId, quantity: 1 });
          }
        }
      }

      participantDoc.markModified('coins');
      participantDoc.markModified('inventory');
      await participantDoc.save();
    }

    distributionResults.push({
      telegramId: part.telegramId,
      username: part.username,
      damageDealt: part.damageDealt,
      sharePercent: Math.round(sharePercent * 100),
      coinsReward,
      xpReward,
      rareDrops: earnedDrops
    });
  }

  await boss.save();
  logger.info(`Distributed Colossus raid rewards to ${distributionResults.length} participants for chat ${boss.chatId}`);

  return distributionResults;
}

export default {
  spawnOrGetGroupBoss,
  calculatePlayerAttackDamage,
  executeBossAttack,
  distributeBossRewards
};
