/**
 * Centralized Group Boss Definitions & Raid Combat Configurations
 */

export const BOSS_COMBAT_CONFIG = {
  ATTACK_ENERGY_COST: 10,
  BASE_CRIT_CHANCE: 0.15, // 15%
  CRIT_MULTIPLIER: 2.0
};

export const BOSS_CATALOG = {
  colossus_ancient_titan: {
    bossId: 'colossus_ancient_titan',
    name: 'Ancient Granite Colossus',
    emoji: '🗿',
    maxHp: 5000,
    description: 'A gargantuan titan awakened from the quarry abyss. Combine forces to shatter its granite core!',
    rewards: {
      coinsPool: 5000,
      xpPool: 2500,
      rareDrops: [
        { itemId: 'gem_diamond', displayName: 'Diamond Gem', emoji: '💎', minContributionPercent: 15, maxWinners: 3 },
        { itemId: 'gem_emerald', displayName: 'Emerald Gem', emoji: '🟢', minContributionPercent: 10, maxWinners: 5 }
      ]
    }
  }
};

/**
 * Resolves boss definition.
 * @param {string} bossId
 * @returns {Object}
 */
export function getBossDefinition(bossId = 'colossus_ancient_titan') {
  return BOSS_CATALOG[bossId.toLowerCase().trim()] || BOSS_CATALOG.colossus_ancient_titan;
}

export default {
  BOSS_COMBAT_CONFIG,
  BOSS_CATALOG,
  getBossDefinition
};
