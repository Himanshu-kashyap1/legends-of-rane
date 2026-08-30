import { OFFLINE_CONFIG, STRUCTURES } from './structureConfig.js';
import { getActivePetBuff } from '../pets/petEngine.js';
import { logger } from '../../utils/logger.js';

/**
 * Calculates offline idle earnings based on authoritative server timestamps.
 *
 * @param {Object} params
 * @param {Object} params.user - Player document or state object
 * @param {Date} [params.now=new Date()]
 * @returns {Object} Structured earnings report
 */
export function calculateOfflineEarnings({ user, now = new Date() }) {
  if (!user) {
    return { hasEarnings: false, reason: 'INVALID_USER' };
  }

  const lastLogout = user.offline?.lastLogoutAt || user.lastActiveAt || user.createdAt || now;
  const elapsedMs = Math.max(0, now.getTime() - new Date(lastLogout).getTime());

  // Format human-readable elapsed duration
  const totalMinutes = Math.floor(elapsedMs / (1000 * 60));
  const elapsedHours = Math.floor(totalMinutes / 60);
  const elapsedMins = totalMinutes % 60;
  const isCapped = elapsedMs > OFFLINE_CONFIG.MAX_SIMULATION_MS;

  const elapsedFormatted = isCapped
    ? `12h 00m (Max Cap)`
    : `${elapsedHours}h ${elapsedMins}m`;

  if (elapsedMs < OFFLINE_CONFIG.MIN_ELAPSED_MS) {
    return {
      hasEarnings: false,
      reason: 'MINIMUM_TIME_NOT_MET',
      elapsedMs,
      elapsedFormatted,
      minRequiredMinutes: OFFLINE_CONFIG.MIN_ELAPSED_MS / (60 * 1000)
    };
  }

  // Clamp to 12 hours max simulation
  const clampedMs = Math.min(OFFLINE_CONFIG.MAX_SIMULATION_MS, elapsedMs);
  const hoursFraction = clampedMs / (1000 * 60 * 60);

  // Check Companion Pet Bonus (e.g. River Otter: +20% fishing yield & offline earnings boost)
  let petMultiplier = 1.0;
  let petBonusInfo = null;
  const petBuff = getActivePetBuff(user);
  if (petBuff.active && petBuff.perkType === 'fishing_yield') {
    petMultiplier = 1.0 + (petBuff.perkValue || 0.20);
    petBonusInfo = {
      petName: petBuff.petDef?.name || 'Companion Pet',
      emoji: petBuff.petDef?.emoji || '🐾',
      bonusPercent: Math.round((petBuff.perkValue || 0.20) * 100)
    };
  }

  // Calculate Structure Productions
  const woodYield = Math.max(1, Math.floor(STRUCTURES.structure_lumber_mill.ratePerHour * hoursFraction * petMultiplier));
  const stoneYield = Math.max(1, Math.floor(STRUCTURES.structure_quarry.ratePerHour * hoursFraction * petMultiplier));
  const coinsYield = Math.max(1, Math.floor(STRUCTURES.structure_gold_forge.ratePerHour * hoursFraction * petMultiplier));

  const resources = [
    { itemId: 'wood_oak', name: 'Oak Wood', emoji: '🪵', quantity: woodYield },
    { itemId: 'stone_granite', name: 'Granite Stone', emoji: '🪨', quantity: stoneYield }
  ];

  return {
    hasEarnings: true,
    elapsedMs,
    clampedMs,
    elapsedFormatted,
    isCapped,
    coins: coinsYield,
    resources,
    petBonus: petBonusInfo
  };
}

/**
 * Atomically claims and deposits accumulated offline idle rewards.
 *
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>}
 */
export async function claimOfflineRewards({ user, now = new Date() }) {
  if (!user) {
    return { success: false, reason: 'INVALID_USER' };
  }

  const earnings = calculateOfflineEarnings({ user, now });
  if (!earnings.hasEarnings) {
    return {
      success: false,
      reason: earnings.reason || 'NO_EARNINGS',
      elapsedFormatted: earnings.elapsedFormatted
    };
  }

  // 1. Credit Coins
  user.coins = (user.coins || 0) + earnings.coins;

  // 2. Credit Resources to Inventory
  user.inventory = user.inventory || [];
  for (const item of earnings.resources) {
    const existing = user.inventory.find(i => i && i.itemId === item.itemId);
    if (existing) {
      existing.quantity = (existing.quantity || 0) + item.quantity;
    } else {
      user.inventory.push({
        itemId: item.itemId,
        quantity: item.quantity
      });
    }
  }

  // 3. Update Authoritative Timestamps to Prevent Double Claims
  user.offline = user.offline || {};
  user.offline.lastLogoutAt = now;
  user.offline.unclaimedCoins = 0;
  user.offline.unclaimedResources = [];
  user.lastActiveAt = now;

  if (typeof user.save === 'function') {
    user.markModified('coins');
    user.markModified('inventory');
    user.markModified('offline');
    await user.save();
  }

  logger.info(`Player ${user.telegramId} claimed offline idle earnings: +${earnings.coins}c, +${earnings.resources.map(r => `${r.quantity}x ${r.itemId}`).join(', ')} (${earnings.elapsedFormatted})`);

  return {
    success: true,
    earnings,
    totalCoins: user.coins
  };
}

export default {
  calculateOfflineEarnings,
  claimOfflineRewards
};
