import {
  TOOL_TIERS,
  TOOL_REPAIR_COSTS,
  TOOL_UPGRADE_COSTS,
  getDurabilityStatus
} from './toolConfig.js';
import { logger } from '../../utils/logger.js';

/**
 * Checks if a user's inventory contains the required materials.
 * @param {Array<{ itemId: string, quantity: number }>} inventory
 * @param {Array<{ itemId: string, quantity: number }>} requiredMaterials
 * @returns {boolean}
 */
export function hasRequiredMaterials(inventory = [], requiredMaterials = []) {
  for (const req of requiredMaterials) {
    const stack = inventory.find(i => i && i.itemId === req.itemId);
    if (!stack || (stack.quantity || 0) < req.quantity) {
      return false;
    }
  }
  return true;
}

/**
 * Atomically deducts materials from player inventory.
 * @param {Array<{ itemId: string, quantity: number }>} inventory
 * @param {Array<{ itemId: string, quantity: number }>} requiredMaterials
 */
export function deductMaterials(inventory = [], requiredMaterials = []) {
  for (const req of requiredMaterials) {
    const stack = inventory.find(i => i && i.itemId === req.itemId);
    if (stack) {
      stack.quantity = Math.max(0, (stack.quantity || 0) - req.quantity);
    }
  }
}

/**
 * Retrieves comprehensive tool details, tier stats, repair and upgrade requirements.
 * @param {Object} user
 * @param {string} instanceId
 * @returns {Object|null}
 */
export function getToolDetails(user, instanceId) {
  if (!user || !user.tools) return null;
  const tool = user.tools.find(t => t.instanceId === instanceId);
  if (!tool) return null;

  const tierConfig = TOOL_TIERS[tool.tier] || TOOL_TIERS[1];
  const durabilityStatus = getDurabilityStatus(tool.durability, tool.maxDurability);
  const isDamaged = tool.durability < tool.maxDurability;

  // Repair Info
  const repairCost = TOOL_REPAIR_COSTS[tool.toolType]?.[tool.tier] || { materials: [], coins: 0 };
  const canAffordRepair = (user.coins >= repairCost.coins) && hasRequiredMaterials(user.inventory, repairCost.materials);

  // Upgrade Info
  const isMaxTier = tool.tier >= 5;
  const upgradeConfig = !isMaxTier ? TOOL_UPGRADE_COSTS[tool.tier] : null;
  const nextTierConfig = upgradeConfig ? TOOL_TIERS[upgradeConfig.nextTier] : null;
  const craftingLevel = user.skills?.crafting?.level || 1;
  const hasSkillForUpgrade = upgradeConfig ? craftingLevel >= upgradeConfig.minSkillLevel : false;
  const canAffordUpgrade = upgradeConfig
    ? (user.coins >= upgradeConfig.coins) && hasRequiredMaterials(user.inventory, upgradeConfig.materials) && hasSkillForUpgrade
    : false;

  return {
    tool,
    tierConfig,
    durabilityStatus,
    isDamaged,
    repair: {
      cost: repairCost,
      canAfford: canAffordRepair,
      isNeeded: isDamaged
    },
    upgrade: {
      isMaxTier,
      nextTierConfig,
      config: upgradeConfig,
      canAfford: canAffordUpgrade,
      hasSkill: hasSkillForUpgrade,
      craftingLevel
    }
  };
}

/**
 * Executes a full repair on a player's damaged tool.
 *
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document or plain object
 * @param {string} params.instanceId - Tool instance ID
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>} Structured result
 */
export async function executeRepairTool({ user, instanceId, now = new Date() }) {
  if (!user) return { success: false, reason: 'INVALID_USER' };

  const tool = (user.tools || []).find(t => t.instanceId === instanceId);
  if (!tool) {
    return { success: false, reason: 'TOOL_NOT_FOUND', instanceId };
  }

  if (tool.durability >= tool.maxDurability) {
    return { success: false, reason: 'ALREADY_FULL_DURABILITY', instanceId };
  }

  const cost = TOOL_REPAIR_COSTS[tool.toolType]?.[tool.tier] || { materials: [], coins: 0 };

  // Validate Coins
  if ((user.coins || 0) < cost.coins) {
    return {
      success: false,
      reason: 'INSUFFICIENT_COINS',
      requiredCoins: cost.coins,
      currentCoins: user.coins || 0
    };
  }

  // Validate Materials
  if (!hasRequiredMaterials(user.inventory, cost.materials)) {
    return {
      success: false,
      reason: 'INSUFFICIENT_MATERIALS',
      requiredMaterials: cost.materials
    };
  }

  // Atomically apply deductions
  user.coins = Math.max(0, (user.coins || 0) - cost.coins);
  deductMaterials(user.inventory, cost.materials);

  // Restore Durability
  const oldDurability = tool.durability;
  tool.durability = tool.maxDurability;
  tool.updatedAt = now;
  user.lastActiveAt = now;

  if (typeof user.save === 'function') {
    user.markModified('coins');
    user.markModified('inventory');
    user.markModified('tools');
    await user.save();
  }

  logger.info(`Player ${user.telegramId} repaired tool ${tool.toolId} (${oldDurability} -> ${tool.maxDurability})`);

  return {
    success: true,
    tool,
    oldDurability,
    newDurability: tool.maxDurability,
    coinsSpent: cost.coins,
    materialsSpent: cost.materials
  };
}

/**
 * Executes a tier upgrade on an eligible player tool.
 *
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document or plain object
 * @param {string} params.instanceId - Tool instance ID
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>} Structured result
 */
export async function executeUpgradeTool({ user, instanceId, now = new Date() }) {
  if (!user) return { success: false, reason: 'INVALID_USER' };

  const tool = (user.tools || []).find(t => t.instanceId === instanceId);
  if (!tool) {
    return { success: false, reason: 'TOOL_NOT_FOUND', instanceId };
  }

  if (tool.tier >= 5) {
    return { success: false, reason: 'MAX_TIER_REACHED', tier: tool.tier };
  }

  const upgradeConfig = TOOL_UPGRADE_COSTS[tool.tier];
  if (!upgradeConfig) {
    return { success: false, reason: 'INVALID_UPGRADE_CONFIG', tier: tool.tier };
  }

  // Validate Skill Level
  const craftingLevel = user.skills?.crafting?.level || 1;
  if (craftingLevel < upgradeConfig.minSkillLevel) {
    return {
      success: false,
      reason: 'INSUFFICIENT_SKILL_LEVEL',
      requiredLevel: upgradeConfig.minSkillLevel,
      currentLevel: craftingLevel
    };
  }

  // Validate Coins
  if ((user.coins || 0) < upgradeConfig.coins) {
    return {
      success: false,
      reason: 'INSUFFICIENT_COINS',
      requiredCoins: upgradeConfig.coins,
      currentCoins: user.coins || 0
    };
  }

  // Validate Materials
  if (!hasRequiredMaterials(user.inventory, upgradeConfig.materials)) {
    return {
      success: false,
      reason: 'INSUFFICIENT_MATERIALS',
      requiredMaterials: upgradeConfig.materials
    };
  }

  // Deduct Coins and Materials
  user.coins = Math.max(0, (user.coins || 0) - upgradeConfig.coins);
  deductMaterials(user.inventory, upgradeConfig.materials);

  // Upgrade Tool Tier & Durability
  const oldTier = tool.tier;
  const newTier = upgradeConfig.nextTier;
  const newTierStats = TOOL_TIERS[newTier];

  tool.tier = newTier;
  tool.toolId = `tool_${tool.toolType}_${newTierStats.name.toLowerCase()}`;
  tool.maxDurability = newTierStats.maxDurability;
  tool.durability = newTierStats.maxDurability;
  tool.updatedAt = now;

  // Award Crafting Skill XP
  const xpReward = newTier * 25;
  if (!user.skills) user.skills = {};
  if (!user.skills.crafting) user.skills.crafting = { level: 1, xp: 0 };
  user.skills.crafting.xp = (user.skills.crafting.xp || 0) + xpReward;

  // Player Stats
  if (!user.statistics) user.statistics = {};
  user.statistics.craftedCount = (user.statistics.craftedCount || 0) + 1;
  user.lastActiveAt = now;

  if (typeof user.save === 'function') {
    user.markModified('coins');
    user.markModified('inventory');
    user.markModified('tools');
    user.markModified('skills');
    user.markModified('statistics');
    await user.save();
  }

  logger.info(`Player ${user.telegramId} upgraded tool to Tier ${newTier} (${tool.toolId})`);

  return {
    success: true,
    tool,
    oldTier,
    newTier,
    newTierName: newTierStats.name,
    coinsSpent: upgradeConfig.coins,
    materialsSpent: upgradeConfig.materials,
    xpGained: xpReward
  };
}

export default {
  hasRequiredMaterials,
  deductMaterials,
  getToolDetails,
  executeRepairTool,
  executeUpgradeTool
};
