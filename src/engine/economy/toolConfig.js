/**
 * Central Tool Tiers, Durability Status, Repair & Upgrade Configuration
 */

export const TOOL_TIERS = {
  1: {
    tier: 1,
    name: 'Wooden',
    emoji: '🪵',
    maxDurability: 30,
    yieldBonus: 0,
    criticalBonus: 0.00,
    energyDiscount: 0
  },
  2: {
    tier: 2,
    name: 'Stone',
    emoji: '🪨',
    maxDurability: 60,
    yieldBonus: 1,
    criticalBonus: 0.05,
    energyDiscount: 0
  },
  3: {
    tier: 3,
    name: 'Iron',
    emoji: '🔩',
    maxDurability: 120,
    yieldBonus: 2,
    criticalBonus: 0.10,
    energyDiscount: 1
  },
  4: {
    tier: 4,
    name: 'Gold',
    emoji: '🪙',
    maxDurability: 80,
    yieldBonus: 3,
    criticalBonus: 0.20,
    energyDiscount: 1
  },
  5: {
    tier: 5,
    name: 'Diamond',
    emoji: '💎',
    maxDurability: 250,
    yieldBonus: 4,
    criticalBonus: 0.25,
    energyDiscount: 2
  }
};

export const DURABILITY_STATUS_THRESHOLDS = [
  { minPercent: 90, label: 'Excellent', emoji: '✅' },
  { minPercent: 50, label: 'Good', emoji: '🟢' },
  { minPercent: 20, label: 'Damaged', emoji: '⚠️' },
  { minPercent: 1, label: 'Critical', emoji: '🔴' },
  { minPercent: 0, label: 'Broken', emoji: '❌' }
];

export const TOOL_REPAIR_COSTS = {
  axe: {
    1: { materials: [{ itemId: 'wood_oak', quantity: 3 }], coins: 5 },
    2: { materials: [{ itemId: 'stone_granite', quantity: 4 }], coins: 15 },
    3: { materials: [{ itemId: 'iron_ore', quantity: 4 }], coins: 35 },
    4: { materials: [{ itemId: 'gold_ore', quantity: 4 }], coins: 75 },
    5: { materials: [{ itemId: 'gem_vein', quantity: 2 }], coins: 150 }
  },
  pickaxe: {
    1: { materials: [{ itemId: 'wood_oak', quantity: 3 }], coins: 5 },
    2: { materials: [{ itemId: 'stone_granite', quantity: 4 }], coins: 15 },
    3: { materials: [{ itemId: 'iron_ore', quantity: 4 }], coins: 35 },
    4: { materials: [{ itemId: 'gold_ore', quantity: 4 }], coins: 75 },
    5: { materials: [{ itemId: 'gem_vein', quantity: 2 }], coins: 150 }
  }
};

export const TOOL_UPGRADE_COSTS = {
  1: {
    nextTier: 2,
    materials: [{ itemId: 'stone_granite', quantity: 15 }],
    coins: 50,
    minSkillLevel: 1
  },
  2: {
    nextTier: 3,
    materials: [{ itemId: 'iron_ore', quantity: 10 }],
    coins: 150,
    minSkillLevel: 2
  },
  3: {
    nextTier: 4,
    materials: [{ itemId: 'gold_ore', quantity: 10 }],
    coins: 350,
    minSkillLevel: 3
  },
  4: {
    nextTier: 5,
    materials: [{ itemId: 'gem_vein', quantity: 5 }],
    coins: 1000,
    minSkillLevel: 5
  }
};

/**
 * Returns formatted durability status object.
 * @param {number} current
 * @param {number} max
 * @returns {{ label: string, emoji: string, percent: number }}
 */
export function getDurabilityStatus(current, max) {
  if (max <= 0) return { label: 'Broken', emoji: '❌', percent: 0 };
  const percent = Math.min(100, Math.max(0, Math.round((current / max) * 100)));

  if (current <= 0) {
    return { label: 'Broken', emoji: '❌', percent: 0 };
  }

  for (const threshold of DURABILITY_STATUS_THRESHOLDS) {
    if (percent >= threshold.minPercent) {
      return { label: threshold.label, emoji: threshold.emoji, percent };
    }
  }

  return { label: 'Broken', emoji: '❌', percent: 0 };
}

export default {
  TOOL_TIERS,
  DURABILITY_STATUS_THRESHOLDS,
  TOOL_REPAIR_COSTS,
  TOOL_UPGRADE_COSTS,
  getDurabilityStatus
};
