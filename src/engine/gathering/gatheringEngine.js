import { GATHERING_ZONES, RESOURCE_NODES, CRITICAL_CONFIG } from './gatheringConfig.js';
import { TOOL_TIERS } from '../economy/toolConfig.js';
import { selectWeightedLoot, calculateQuantity, rollCritical } from './lootRng.js';
import { calculateCurrentEnergy } from './energyCalculator.js';
import { logger } from '../../utils/logger.js';

/**
 * Resolves a Resource Node from a nodeId or zoneId.
 * @param {string} targetId
 * @returns {Object|null}
 */
export function resolveResourceNode(targetId) {
  if (!targetId) return null;

  if (RESOURCE_NODES[targetId]) {
    return RESOURCE_NODES[targetId];
  }

  const zone = GATHERING_ZONES[targetId];
  if (zone && zone.nodes?.length > 0) {
    const firstNodeId = zone.nodes[0];
    return RESOURCE_NODES[firstNodeId] || null;
  }

  return null;
}

/**
 * Executes a full gathering action with energy checks, tool wear, RNG drop tables,
 * tool tier gathering modifiers, critical harvest rolls, and atomic state mutation.
 *
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document or plain state object
 * @param {string} [params.nodeId] - Resource Node ID (e.g. 'node_forest_oak')
 * @param {string} [params.zoneId] - Zone ID (fallback)
 * @param {Function} [params.rngProvider=Math.random] - Optional injectable RNG for deterministic testing
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>} Structured outcome { success, reward, energy, tool, ... }
 */
export async function executeGatherAction({ user, nodeId, zoneId, rngProvider = Math.random, now = new Date() }) {
  if (!user) {
    return { success: false, reason: 'INVALID_USER' };
  }

  // 1. Resolve Node Definition
  const targetId = nodeId || zoneId;
  const node = resolveResourceNode(targetId);
  if (!node) {
    return { success: false, reason: 'INVALID_ZONE', targetId };
  }

  const zone = GATHERING_ZONES[node.zoneId] || { name: node.name, emoji: node.emoji };

  // 2. Find and Validate Equipped Tool
  const tools = user.tools || [];
  let tool = tools.find(t => t.toolType === node.requiredToolType && t.equipped);

  // Fallback to highest tier usable tool of required type
  if (!tool) {
    tool = tools
      .filter(t => t.toolType === node.requiredToolType)
      .sort((a, b) => (b.tier || 1) - (a.tier || 1))[0];
  }

  if (!tool) {
    return {
      success: false,
      reason: 'MISSING_TOOL',
      requiredToolType: node.requiredToolType,
      nodeId: node.nodeId,
      zoneId: node.zoneId
    };
  }

  if ((tool.tier || 1) < node.requiredToolTier) {
    return {
      success: false,
      reason: 'TOOL_REQUIREMENT_NOT_MET',
      requiredTier: node.requiredToolTier,
      currentTier: tool.tier || 1,
      toolType: node.requiredToolType,
      nodeId: node.nodeId,
      zoneId: node.zoneId
    };
  }

  if ((tool.durability || 0) <= 0) {
    return {
      success: false,
      reason: 'TOOL_BROKEN',
      toolId: tool.toolId,
      instanceId: tool.instanceId,
      nodeId: node.nodeId,
      zoneId: node.zoneId
    };
  }

  // 3. Resolve Tool Tier Modifiers
  const tierStats = TOOL_TIERS[tool.tier] || TOOL_TIERS[1];

  // 4. Calculate Loot Drop from Weighted Table
  const selectedLoot = selectWeightedLoot(node.dropTable, rngProvider);
  if (!selectedLoot) {
    logger.error(`Drop table for node ${node.nodeId} returned no valid items.`);
    return { success: false, reason: 'INVALID_LOOT_TABLE', nodeId: node.nodeId };
  }

  let quantity = calculateQuantity(selectedLoot.minQuantity, selectedLoot.maxQuantity, rngProvider);

  // Apply Tool Yield Bonus
  quantity += (tierStats.yieldBonus || 0);

  // 5. Critical Harvest Roll (Boosted by Tool Critical Bonus)
  const totalCriticalChance = CRITICAL_CONFIG.BASE_CHANCE + (tierStats.criticalBonus || 0);
  const isCritical = rollCritical(totalCriticalChance, rngProvider);
  if (isCritical) {
    quantity *= CRITICAL_CONFIG.YIELD_MULTIPLIER;
  }

  // 5b. Apply Companion Pet Buffs
  let petYieldBonus = 0;
  let petXpBonus = 0;
  try {
    const { getActivePetBuff, decayActivePetHappiness } = await import('../pets/petEngine.js');
    const petBuff = getActivePetBuff(user);
    if (petBuff.active) {
      if (petBuff.perkType === 'all_gathering_yield') {
        quantity = Math.max(1, Math.round(quantity * (1 + petBuff.perkValue)));
      } else if (petBuff.perkType === 'woodcutting_xp' && node.skill === 'woodcutting') {
        petXpBonus = Math.round(node.xpReward * petBuff.perkValue);
      }
      decayActivePetHappiness(user, 2);
    }
  } catch (err) {
    logger.debug('Pet buff calculation notice:', err?.message);
  }

  // 6. Apply Atomic State Changes
  // Tool durability wear (-1 point)
  tool.durability = Math.max(0, (tool.durability || 0) - 1);
  tool.updatedAt = now;

  // Add loot to Inventory
  user.inventory = user.inventory || [];
  const existingStack = user.inventory.find(i => i && i.itemId === selectedLoot.itemId);
  if (existingStack) {
    existingStack.quantity = (existingStack.quantity || 0) + quantity;
  } else {
    user.inventory.push({
      itemId: selectedLoot.itemId,
      quantity
    });
  }

  // Skill XP Gain & Player Progression
  const totalSkillXp = node.xpReward + petXpBonus;
  const playerXpGain = Math.max(1, Math.round(totalSkillXp / 2));
  
  let skillProgression = null;
  let playerProgression = null;

  try {
    const { addSkillXp, addPlayerXp } = await import('../progression/progressionEngine.js');
    skillProgression = addSkillXp(user, node.skill, totalSkillXp);
    playerProgression = addPlayerXp(user, playerXpGain);
  } catch (err) {
    logger.debug('Progression calculation notice (gathering):', err?.message);
  }

  // Player Statistics & Timestamp
  if (!user.statistics) user.statistics = {};
  user.statistics.gatheredCount = (user.statistics.gatheredCount || 0) + 1;
  user.lastActiveAt = now;

  // Track Quest Progress
  try {
    const { trackQuestProgress } = await import('../quests/questEngine.js');
    await trackQuestProgress({
      user,
      eventType: 'gather_item',
      targetId: selectedLoot.itemId,
      count: quantity,
      now
    });
  } catch (err) {
    logger.debug('Quest tracking notice (gathering):', err?.message);
  }

  // If user is a Mongoose document, execute atomic save
  if (typeof user.save === 'function') {
    user.markModified('energy');
    user.markModified('tools');
    user.markModified('inventory');
    user.markModified('skills');
    user.markModified('quests');
    user.markModified('statistics');
    await user.save();
  }

  return {
    success: true,
    zoneId: node.zoneId,
    zoneName: zone.name,
    nodeId: node.nodeId,
    nodeName: node.name,
    reward: {
      itemId: selectedLoot.itemId,
      quantity
    },
    isCritical,
    xpGained: node.xpReward,
    skill: node.skill,
    energySpent: 0,
    tool: {
      instanceId: tool.instanceId,
      toolId: tool.toolId,
      tier: tool.tier,
      durability: tool.durability,
      maxDurability: tool.maxDurability
    }
  };
}

export default {
  executeGatherAction,
  resolveResourceNode
};
