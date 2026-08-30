import { PET_CONFIG, PETS, getPetDefinition } from './petConfig.js';
import { logger } from '../../utils/logger.js';

/**
 * Adopts/unlocks a companion pet from the sanctuary catalog.
 *
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document
 * @param {string} params.petId - Pet ID
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>}
 */
export async function adoptPet({ user, petId, now = new Date() }) {
  if (!user || !petId) {
    return { success: false, reason: 'INVALID_PARAMETERS' };
  }

  const petDef = getPetDefinition(petId);
  if (!petDef) {
    return { success: false, reason: 'PET_NOT_FOUND', petId };
  }

  user.pets = user.pets || [];
  const alreadyOwned = user.pets.some(p => p && p.petId === petDef.petId);
  if (alreadyOwned) {
    return { success: false, reason: 'ALREADY_OWNED', petDef };
  }

  if ((user.coins || 0) < petDef.priceCoins) {
    return {
      success: false,
      reason: 'INSUFFICIENT_COINS',
      requiredCoins: petDef.priceCoins,
      currentCoins: user.coins || 0,
      petDef
    };
  }

  // 1. Deduct Coins
  user.coins = Math.max(0, (user.coins || 0) - petDef.priceCoins);

  // 2. Add to Owned Pets with 100% Happiness
  const newPet = {
    petId: petDef.petId,
    level: 1,
    happiness: PET_CONFIG.MAX_HAPPINESS,
    obtainedAt: now
  };
  user.pets.push(newPet);

  // Auto-equip if no active pet
  if (!user.activePet) {
    user.activePet = petDef.petId;
  }

  user.lastActiveAt = now;

  if (typeof user.save === 'function') {
    user.markModified('coins');
    user.markModified('pets');
    await user.save();
  }

  logger.info(`Player ${user.telegramId} adopted companion pet [${petDef.name}] for ${petDef.priceCoins} coins.`);

  return {
    success: true,
    petDef,
    activePet: user.activePet,
    remainingCoins: user.coins
  };
}

/**
 * Equips or unequips an owned companion pet.
 *
 * @param {Object} params
 * @param {Object} params.user
 * @param {string|null} params.petId
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>}
 */
export async function equipPet({ user, petId, now = new Date() }) {
  if (!user) {
    return { success: false, reason: 'INVALID_USER' };
  }

  if (!petId || petId === 'none' || petId === 'unequip') {
    user.activePet = null;
    user.lastActiveAt = now;
    if (typeof user.save === 'function') await user.save();
    return { success: true, activePet: null, petDef: null };
  }

  user.pets = user.pets || [];
  const ownedPet = user.pets.find(p => p && p.petId === petId.toLowerCase().trim());
  if (!ownedPet) {
    return { success: false, reason: 'PET_NOT_OWNED', petId };
  }

  const petDef = getPetDefinition(petId);
  user.activePet = petDef.petId;
  user.lastActiveAt = now;

  if (typeof user.save === 'function') {
    user.markModified('activePet');
    await user.save();
  }

  logger.info(`Player ${user.telegramId} equipped active pet: ${petDef.name}`);

  return {
    success: true,
    activePet: user.activePet,
    petDef,
    happiness: ownedPet.happiness
  };
}

/**
 * Feeds a pet to restore happiness and maintain active buffs.
 *
 * @param {Object} params
 * @param {Object} params.user
 * @param {string} params.petId
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>}
 */
export async function feedPet({ user, petId, now = new Date() }) {
  if (!user || !petId) {
    return { success: false, reason: 'INVALID_PARAMETERS' };
  }

  user.pets = user.pets || [];
  const ownedPet = user.pets.find(p => p && p.petId === petId.toLowerCase().trim());
  if (!ownedPet) {
    return { success: false, reason: 'PET_NOT_OWNED', petId };
  }

  if (ownedPet.happiness >= PET_CONFIG.MAX_HAPPINESS) {
    return {
      success: false,
      reason: 'ALREADY_FULL_HAPPINESS',
      currentHappiness: ownedPet.happiness
    };
  }

  if ((user.coins || 0) < PET_CONFIG.FEED_COIN_COST) {
    return {
      success: false,
      reason: 'INSUFFICIENT_COINS',
      requiredCoins: PET_CONFIG.FEED_COIN_COST,
      currentCoins: user.coins || 0
    };
  }

  // Deduct Coins & Restore Happiness
  user.coins -= PET_CONFIG.FEED_COIN_COST;
  ownedPet.happiness = Math.min(
    PET_CONFIG.MAX_HAPPINESS,
    (ownedPet.happiness || 0) + PET_CONFIG.HAPPINESS_RESTORE
  );
  user.lastActiveAt = now;

  if (typeof user.save === 'function') {
    user.markModified('coins');
    user.markModified('pets');
    await user.save();
  }

  const petDef = getPetDefinition(petId);
  logger.info(`Player ${user.telegramId} fed pet [${petDef?.name || petId}] (Happiness: ${ownedPet.happiness}%)`);

  return {
    success: true,
    petId: ownedPet.petId,
    petName: petDef?.name || ownedPet.petId,
    newHappiness: ownedPet.happiness,
    coinsSpent: PET_CONFIG.FEED_COIN_COST,
    remainingCoins: user.coins
  };
}

/**
 * Calculates the active pet buff and checks happiness state.
 *
 * @param {Object} user
 * @returns {{ active: boolean, petDef?: Object, perkType?: string, perkValue?: number, happiness?: number, reason?: string }}
 */
export function getActivePetBuff(user) {
  if (!user || !user.activePet) {
    return { active: false, perkType: null, perkValue: 0 };
  }

  user.pets = user.pets || [];
  const ownedPet = user.pets.find(p => p && p.petId === user.activePet);
  if (!ownedPet) {
    return { active: false, perkType: null, perkValue: 0 };
  }

  const petDef = getPetDefinition(user.activePet);
  if (!petDef) {
    return { active: false, perkType: null, perkValue: 0 };
  }

  const happiness = typeof ownedPet.happiness === 'number' ? ownedPet.happiness : 100;
  if (happiness < PET_CONFIG.MIN_HAPPINESS_FOR_FULL_BUFF) {
    return {
      active: false,
      petDef,
      happiness,
      reason: 'PET_HUNGRY',
      perkType: petDef.perkType,
      perkValue: 0
    };
  }

  return {
    active: true,
    petDef,
    happiness,
    perkType: petDef.perkType,
    perkValue: petDef.perkValue
  };
}

/**
 * Decays active pet happiness after gathering action.
 * @param {Object} user
 * @param {number} [decayAmount=2]
 */
export function decayActivePetHappiness(user, decayAmount = PET_CONFIG.HAPPINESS_DECAY_PER_GATHER) {
  if (!user || !user.activePet) return;
  user.pets = user.pets || [];
  const ownedPet = user.pets.find(p => p && p.petId === user.activePet);
  if (ownedPet) {
    ownedPet.happiness = Math.max(0, (ownedPet.happiness || 0) - decayAmount);
  }
}

export default {
  adoptPet,
  equipPet,
  feedPet,
  getActivePetBuff,
  decayActivePetHappiness
};
