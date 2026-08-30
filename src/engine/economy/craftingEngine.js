import crypto from 'crypto';
import { RECIPES } from './recipeConfig.js';
import { hasRequiredMaterials, deductMaterials } from './toolService.js';
import { logger } from '../../utils/logger.js';

/**
 * Validates whether a user can craft a given recipe.
 * @param {Object} params
 * @param {Object} params.user
 * @param {string} params.recipeId
 * @param {number} [params.quantity=1]
 * @returns {{ valid: boolean, reason?: string, recipe?: Object, totalCoins?: number, scaledInputs?: Array }}
 */
export function validateCrafting({ user, recipeId, quantity = 1 }) {
  if (!user) {
    return { valid: false, reason: 'INVALID_USER' };
  }

  const recipe = RECIPES[recipeId];
  if (!recipe) {
    return { valid: false, reason: 'INVALID_RECIPE', recipeId };
  }

  const craftQty = Math.max(1, Math.floor(Number(quantity) || 1));
  const craftingLevel = user.skills?.crafting?.level || 1;

  // 1. Validate Skill Level
  if (craftingLevel < recipe.minCraftingLevel) {
    return {
      valid: false,
      reason: 'INSUFFICIENT_SKILL_LEVEL',
      requiredLevel: recipe.minCraftingLevel,
      currentLevel: craftingLevel,
      recipe
    };
  }

  // 2. Validate Coins
  const totalCoins = (recipe.coinCost || 0) * craftQty;
  if ((user.coins || 0) < totalCoins) {
    return {
      valid: false,
      reason: 'INSUFFICIENT_COINS',
      requiredCoins: totalCoins,
      currentCoins: user.coins || 0,
      recipe
    };
  }

  // 3. Validate Materials
  const scaledInputs = recipe.inputs.map(input => ({
    itemId: input.itemId,
    quantity: input.quantity * craftQty
  }));

  if (!hasRequiredMaterials(user.inventory, scaledInputs)) {
    return {
      valid: false,
      reason: 'INSUFFICIENT_MATERIALS',
      requiredMaterials: scaledInputs,
      recipe
    };
  }

  return {
    valid: true,
    recipe,
    craftQty,
    totalCoins,
    scaledInputs
  };
}

/**
 * Executes a full crafting operation, deducting inputs & coins, adding crafted output items/tools,
 * and awarding Crafting Skill XP atomically.
 *
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document or plain object
 * @param {string} params.recipeId - Recipe ID
 * @param {number} [params.quantity=1] - Craft quantity multiplier
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>} Structured result
 */
export async function executeCraftRecipe({ user, recipeId, quantity = 1, now = new Date() }) {
  const validation = validateCrafting({ user, recipeId, quantity });
  if (!validation.valid) {
    return {
      success: false,
      reason: validation.reason,
      requiredLevel: validation.requiredLevel,
      currentLevel: validation.currentLevel,
      requiredCoins: validation.requiredCoins,
      currentCoins: validation.currentCoins,
      requiredMaterials: validation.requiredMaterials,
      recipe: validation.recipe
    };
  }

  const { recipe, craftQty, totalCoins, scaledInputs } = validation;

  // 1. Deduct Coins
  user.coins = Math.max(0, (user.coins || 0) - totalCoins);

  // 2. Deduct Materials
  deductMaterials(user.inventory, scaledInputs);

  // 3. Generate Output Items / Tools
  const totalYield = recipe.output.quantity * craftQty;
  const newTools = [];

  if (recipe.output.isTool) {
    user.tools = user.tools || [];
    for (let i = 0; i < craftQty; i++) {
      const toolInstance = {
        instanceId: `tool_${crypto.randomUUID().slice(0, 8)}`,
        toolId: recipe.output.itemId,
        toolType: recipe.output.toolType,
        tier: recipe.output.tier || 1,
        durability: recipe.output.maxDurability || 30,
        maxDurability: recipe.output.maxDurability || 30,
        equipped: false,
        createdAt: now,
        updatedAt: now
      };
      user.tools.push(toolInstance);
      newTools.push(toolInstance);
    }
  } else {
    user.inventory = user.inventory || [];
    const existingStack = user.inventory.find(i => i && i.itemId === recipe.output.itemId);
    if (existingStack) {
      existingStack.quantity = (existingStack.quantity || 0) + totalYield;
    } else {
      user.inventory.push({
        itemId: recipe.output.itemId,
        quantity: totalYield
      });
    }
  }

  // 4. Award Crafting XP & Player Progression
  const totalCraftXp = (recipe.xpReward || 10) * craftQty;
  const playerXpGain = Math.max(1, Math.round(totalCraftXp / 2));

  try {
    const { addSkillXp, addPlayerXp } = await import('../progression/progressionEngine.js');
    addSkillXp(user, 'crafting', totalCraftXp);
    addPlayerXp(user, playerXpGain);
  } catch (err) {
    logger.debug('Progression notice (crafting):', err?.message);
  }

  // 5. Update Stats & Timestamp
  if (!user.statistics) user.statistics = {};
  user.statistics.craftedCount = (user.statistics.craftedCount || 0) + craftQty;
  user.lastActiveAt = now;

  // Track Quest Progress
  try {
    const { trackQuestProgress } = await import('../quests/questEngine.js');
    await trackQuestProgress({
      user,
      eventType: 'craft_item',
      targetId: recipe.output.itemId,
      count: totalYield,
      now
    });
  } catch (err) {
    logger.debug('Quest tracking notice (crafting):', err?.message);
  }

  // 6. Atomic MongoDB Persistence
  if (typeof user.save === 'function') {
    user.markModified('coins');
    user.markModified('inventory');
    user.markModified('tools');
    user.markModified('skills');
    user.markModified('quests');
    user.markModified('statistics');
    await user.save();
  }

  logger.info(`Player ${user.telegramId} crafted ${recipe.name} x${craftQty} (+${totalCraftXp} Crafting XP)`);

  return {
    success: true,
    recipeId: recipe.recipeId,
    recipeName: recipe.name,
    category: recipe.category,
    craftQty,
    outputItemId: recipe.output.itemId,
    outputYield: totalYield,
    isTool: Boolean(recipe.output.isTool),
    newTools,
    coinsSpent: totalCoins,
    materialsSpent: scaledInputs,
    xpGained: totalCraftXp,
    remainingCoins: user.coins
  };
}

export default {
  validateCrafting,
  executeCraftRecipe
};
