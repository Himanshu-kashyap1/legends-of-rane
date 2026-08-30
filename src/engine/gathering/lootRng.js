/**
 * RNG Loot & Quantity Distribution Engine
 *
 * Implements weighted loot selection, bounded Gaussian-style distribution,
 * and critical roll calculations with support for custom/mock RNG providers.
 */

/**
 * Calculates a bounded integer quantity using a 3-point Gaussian approximation.
 * @param {number} min - Minimum quantity (inclusive, >= 1)
 * @param {number} max - Maximum quantity (inclusive)
 * @param {Function} [rngProvider=Math.random] - Random number generator [0, 1)
 * @returns {number} Integer between min and max
 */
export function calculateQuantity(min, max, rngProvider = Math.random) {
  const safeMin = Math.max(1, Math.floor(Number(min) || 1));
  const safeMax = Math.max(safeMin, Math.floor(Number(max) || safeMin));

  if (safeMin === safeMax) {
    return safeMin;
  }

  // 3-sample average creates a bell curve (Central Limit Theorem)
  const r1 = rngProvider();
  const r2 = rngProvider();
  const r3 = rngProvider();
  const normalApprox = (r1 + r2 + r3) / 3;

  const result = Math.round(safeMin + normalApprox * (safeMax - safeMin));
  return Math.min(safeMax, Math.max(safeMin, result));
}

/**
 * Selects an item from a drop table based on item weights.
 * @param {Array<{ itemId: string, minQuantity: number, maxQuantity: number, weight: number }>} dropTable
 * @param {Function} [rngProvider=Math.random]
 * @returns {{ itemId: string, minQuantity: number, maxQuantity: number, weight: number } | null}
 */
export function selectWeightedLoot(dropTable, rngProvider = Math.random) {
  if (!Array.isArray(dropTable) || dropTable.length === 0) {
    return null;
  }

  const totalWeight = dropTable.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
  if (totalWeight <= 0 || isNaN(totalWeight)) {
    return null;
  }

  let roll = rngProvider() * totalWeight;

  for (const entry of dropTable) {
    const weight = Math.max(0, Number(entry.weight) || 0);
    if (roll < weight) {
      return entry;
    }
    roll -= weight;
  }

  // Fallback to first entry if floating point precision edge case occurs
  return dropTable[0];
}

/**
 * Rolls for a critical harvest.
 * @param {number} [chance=0.10] - Critical chance (e.g. 0.10 = 10%)
 * @param {Function} [rngProvider=Math.random]
 * @returns {boolean}
 */
export function rollCritical(chance = 0.10, rngProvider = Math.random) {
  const safeChance = Math.min(1.0, Math.max(0.0, Number(chance) || 0.0));
  return rngProvider() < safeChance;
}

export default {
  calculateQuantity,
  selectWeightedLoot,
  rollCritical
};
