import { ENERGY_CONFIG } from './gatheringConfig.js';

/**
 * Calculates a player's real-time energy based on stored energy and elapsed regeneration.
 * Does not write to MongoDB automatically; gives the authoritative current energy on-demand.
 *
 * @param {Object} energyState - { current: number, max: number, lastRegen: Date }
 * @param {Date} [now=new Date()]
 * @returns {{ currentEnergy: number, maxEnergy: number, regenerated: number, newLastRegen: Date }}
 */
export function calculateCurrentEnergy(energyState, now = new Date()) {
  const current = Number(energyState?.current) ?? ENERGY_CONFIG.DEFAULT_MAX_ENERGY;
  const max = Number(energyState?.max) || ENERGY_CONFIG.DEFAULT_MAX_ENERGY;
  const lastRegen = energyState?.lastRegen ? new Date(energyState.lastRegen) : new Date(now);

  const currentTime = now.getTime();
  const lastTime = lastRegen.getTime();
  const elapsedMs = Math.max(0, currentTime - lastTime);

  // If already at or above max, current energy is preserved and timestamp refreshed
  if (current >= max) {
    return {
      currentEnergy: max,
      maxEnergy: max,
      regenerated: 0,
      newLastRegen: now
    };
  }

  // Calculate regenerated energy points
  const pointsRegenerated = Math.floor(elapsedMs / ENERGY_CONFIG.REGEN_INTERVAL_MS) * ENERGY_CONFIG.REGEN_PER_INTERVAL;
  const newCurrent = Math.min(max, current + pointsRegenerated);
  const actualRegenerated = newCurrent - current;

  // Advance lastRegen by the intervals consumed (prevents losing fractional minute progress)
  const consumedMs = (pointsRegenerated / ENERGY_CONFIG.REGEN_PER_INTERVAL) * ENERGY_CONFIG.REGEN_INTERVAL_MS;
  const newLastRegen = newCurrent >= max ? now : new Date(lastTime + consumedMs);

  return {
    currentEnergy: newCurrent,
    maxEnergy: max,
    regenerated: actualRegenerated,
    newLastRegen
  };
}

export default {
  calculateCurrentEnergy
};
