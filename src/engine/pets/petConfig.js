/**
 * Centralized Companion Pet Definitions & Configurations
 */

export const PET_CONFIG = {
  FEED_COIN_COST: 15,
  HAPPINESS_RESTORE: 30,
  MAX_HAPPINESS: 100,
  MIN_HAPPINESS_FOR_FULL_BUFF: 50,
  HAPPINESS_DECAY_PER_GATHER: 2
};

export const PETS = {
  pet_timber_wolf: {
    petId: 'pet_timber_wolf',
    name: 'Timber Wolf',
    emoji: '🐺',
    rarity: 'rare',
    priceCoins: 500,
    perkType: 'woodcutting_xp',
    perkValue: 0.15, // +15%
    perkDisplay: '+15% Woodcutting XP',
    description: 'Loyal woodland companion that guides your strikes, boosting Woodcutting XP by +15%.'
  },
  pet_crystal_mole: {
    petId: 'pet_crystal_mole',
    name: 'Crystal Mole',
    emoji: '🦡',
    rarity: 'rare',
    priceCoins: 500,
    perkType: 'lucky_gem',
    perkValue: 0.05, // +5%
    perkDisplay: '+5% Lucky Gem Discovery',
    description: 'Subterranean digger with keen senses, granting +5% extra chance to unearth rare gems while mining.'
  },
  pet_river_otter: {
    petId: 'pet_river_otter',
    name: 'River Otter',
    emoji: '🦦',
    rarity: 'rare',
    priceCoins: 750,
    perkType: 'fishing_yield',
    perkValue: 0.20, // +20%
    perkDisplay: '+20% Fishing Yield & Offline Boost',
    description: 'Energetic swimmer that catches surplus fish and enhances offline treasury progress.'
  },
  pet_solar_drake: {
    petId: 'pet_solar_drake',
    name: 'Solar Drake',
    emoji: '🐲',
    rarity: 'legendary',
    priceCoins: 1500,
    perkType: 'all_gathering_yield',
    perkValue: 0.25, // +25%
    perkDisplay: '+25% All Gathering Yield',
    description: 'Legendary miniature dragon radiating solar power, boosting resource yields by +25% across all zones.'
  }
};

/**
 * Resolves pet definition by petId.
 * @param {string} petId
 * @returns {Object|null}
 */
export function getPetDefinition(petId) {
  if (!petId) return null;
  return PETS[petId.toLowerCase().trim()] || null;
}

export default {
  PET_CONFIG,
  PETS,
  getPetDefinition
};
