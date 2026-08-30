import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { RECIPE_CATEGORIES, RECIPES, getRecipesByCategory } from '../../engine/economy/recipeConfig.js';
import { validateCrafting } from '../../engine/economy/craftingEngine.js';
import { formatNumber } from './uiHelpers.js';
import { Item } from '../../models/Item.js';

let itemCatalogCache = null;
let lastItemFetch = 0;

async function getItemInfo(itemId) {
  const now = Date.now();
  if (!itemCatalogCache || now - lastItemFetch > 60000) {
    const items = await Item.find({}).lean();
    itemCatalogCache = new Map(items.map(i => [i.itemId, i]));
    lastItemFetch = now;
  }
  const item = itemCatalogCache.get(itemId);
  return {
    displayName: item?.displayName || itemId.replace(/_/g, ' '),
    emoji: item?.emoji || '📦'
  };
}

/**
 * Screen 1: Recipe Category Selection
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderCraftingCategories(user) {
  const ownerId = String(user.telegramId);
  const craftingLevel = user.skills?.crafting?.level || 1;

  const text = [
    `🔨 *ROYAL CRAFTING WORKSHOP* 🔨`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🪙 *Treasury:* ${formatNumber(user.coins || 0)} Coins`,
    `⭐ *Crafting Mastery:* Level ${craftingLevel}`,
    '',
    `_Blueprint category select karo:_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🪵 Refined Materials', encodeCallback({ action: 'cr_cat', ownerId, targetId: 'refining' })),
      Markup.button.callback('🛠️ Tools & Gear', encodeCallback({ action: 'cr_cat', ownerId, targetId: 'tools' }))
    ],
    [
      Markup.button.callback('🧪 Consumables', encodeCallback({ action: 'cr_cat', ownerId, targetId: 'consumables' })),
      Markup.button.callback('🧱 Base Structures', encodeCallback({ action: 'cr_cat', ownerId, targetId: 'structures' }))
    ],
    [
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 2: Recipe List within Selected Category
 * @param {Object} user
 * @param {string} categoryId
 * @param {number} [page=1]
 * @returns {{ text: string, keyboard: any }}
 */
export function renderCategoryRecipes(user, categoryId, page = 1) {
  const ownerId = String(user.telegramId);
  const category = RECIPE_CATEGORIES[categoryId] || RECIPE_CATEGORIES.refining;
  const recipes = getRecipesByCategory(category.id);
  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(recipes.length / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, page));

  const startIndex = (currentPage - 1) * pageSize;
  const visibleRecipes = recipes.slice(startIndex, startIndex + pageSize);

  const textLines = [
    `${category.emoji} *${category.name.toUpperCase()}* (Page ${currentPage}/${totalPages})`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_${category.description}_`,
    '',
    `_Recipe select karke ingredients inspect karo:_`
  ];

  if (recipes.length === 0) {
    textLines.push(`_Is category mein abhi koi recipe available nahi hai._`);
  }

  const recipeButtons = visibleRecipes.map(r => {
    const val = validateCrafting({ user, recipeId: r.recipeId });
    const statusEmoji = val.valid ? '✅' : '🔒';
    return Markup.button.callback(
      `${r.emoji} ${r.name} ${statusEmoji}`,
      encodeCallback({ action: 'cr_detail', ownerId, targetId: r.recipeId })
    );
  });

  const keyboardRows = [];
  for (let i = 0; i < recipeButtons.length; i += 2) {
    keyboardRows.push(recipeButtons.slice(i, i + 2));
  }

  // Pagination Row
  if (totalPages > 1) {
    const navRow = [];
    if (currentPage > 1) {
      navRow.push(Markup.button.callback('◀️ Prev', encodeCallback({ action: 'cr_cat_page', ownerId, targetId: `${category.id}:${currentPage - 1}` })));
    }
    navRow.push(Markup.button.callback(`• ${currentPage}/${totalPages} •`, encodeCallback({ action: 'noop', ownerId })));
    if (currentPage < totalPages) {
      navRow.push(Markup.button.callback('Next ▶️', encodeCallback({ action: 'cr_cat_page', ownerId, targetId: `${category.id}:${currentPage + 1}` })));
    }
    keyboardRows.push(navRow);
  }

  // Back specifically to Categories
  keyboardRows.push([
    Markup.button.callback('⬅️ Back to Categories', encodeCallback({ action: 'cr_menu', ownerId }))
  ]);

  return { text: textLines.join('\n'), keyboard: Markup.inlineKeyboard(keyboardRows) };
}

/**
 * Screen 3: Recipe Details & Requirement Verification
 * @param {Object} user
 * @param {string} recipeId
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderRecipeDetails(user, recipeId) {
  const recipe = RECIPES[recipeId];
  const ownerId = String(user.telegramId);

  if (!recipe) {
    return {
      text: `⚠️ *Recipe nahi mili.*`,
      keyboard: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', encodeCallback({ action: 'cr_menu', ownerId }))]])
    };
  }

  const category = RECIPE_CATEGORIES[recipe.category] || { name: 'Crafting' };
  const validation = validateCrafting({ user, recipeId });
  const craftingLevel = user.skills?.crafting?.level || 1;

  const materialLines = [];
  for (const input of recipe.inputs) {
    const itemInfo = await getItemInfo(input.itemId);
    const stack = user.inventory?.find(i => i && i.itemId === input.itemId);
    const owned = stack?.quantity || 0;
    const checkEmoji = owned >= input.quantity ? '✅' : '❌';
    materialLines.push(`  • ${itemInfo.emoji} ${itemInfo.displayName}: *${input.quantity}* (Owned: ${owned}) ${checkEmoji}`);
  }

  const coinsCheck = (user.coins || 0) >= (recipe.coinCost || 0) ? '✅' : '❌';
  if (recipe.coinCost > 0) {
    materialLines.push(`  • 🪙 Coins: *${recipe.coinCost}* (Yours: ${user.coins || 0}) ${coinsCheck}`);
  }

  const skillCheck = craftingLevel >= recipe.minCraftingLevel ? '✅' : '❌';
  materialLines.push(`  • ⭐ Crafting: Level *${recipe.minCraftingLevel}* (Yours: ${craftingLevel}) ${skillCheck}`);

  const outputInfo = await getItemInfo(recipe.output.itemId);
  const yieldDisplay = recipe.output.isTool
    ? `${recipe.emoji} *${recipe.name}* (Tier ${recipe.output.tier} Tool, ${recipe.output.maxDurability} Durability)`
    : `${outputInfo.emoji} *${outputInfo.displayName}* × ${recipe.output.quantity}`;

  const text = [
    `${recipe.emoji} *${recipe.name.toUpperCase()}*`,
    `📂 *Category:* ${category.name}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_${recipe.description}_`,
    '',
    `🎁 *Output:* ${yieldDisplay}`,
    `📈 *Experience:* +${recipe.xpReward} Crafting XP`,
    '',
    `📦 *Required Ingredients:*`,
    materialLines.join('\n'),
    '',
    validation.valid
      ? `_Kya aap yeh item craft karna chahte hain?_`
      : `⚠️ *Required materials, coins ya skill level insufficient hai.*`
  ].join('\n');

  const actionButtons = [];
  if (validation.valid) {
    actionButtons.push(Markup.button.callback('🔨 Craft Item', encodeCallback({ action: 'cr_do', ownerId, targetId: recipe.recipeId })));
  }
  actionButtons.push(Markup.button.callback('⬅️ Back', encodeCallback({ action: 'cr_cat', ownerId, targetId: recipe.category })));

  const keyboard = Markup.inlineKeyboard([actionButtons]);

  return { text, keyboard };
}

/**
 * Screen 4: Crafting Outcome & Loop View
 * @param {Object} user
 * @param {Object} result
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderCraftingResult(user, result) {
  const ownerId = String(user.telegramId);

  if (!result.success) {
    const errorMessages = {
      INSUFFICIENT_COINS: `🪙 *Coins kam hain!* Required: ${result.requiredCoins}c, Current: ${result.currentCoins}c.`,
      INSUFFICIENT_MATERIALS: `📦 *Required materials insufficient hain.* Pehle gather ya refine karo.`,
      INSUFFICIENT_SKILL_LEVEL: `⭐ *Crafting Level kam hai!* Required: Level ${result.requiredLevel}, Current: Level ${result.currentLevel}.`,
      INVALID_RECIPE: `⚠️ *Unknown recipe blueprint.*`
    };

    const text = [
      `⚠️ *CRAFTING FAILED*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      errorMessages[result.reason] || `Crafting nahi ho payi: ${result.reason}`
    ].join('\n');

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('⬅️ Back to Recipe', encodeCallback({ action: 'cr_detail', ownerId, targetId: result.recipe?.recipeId || '1' }))
      ]
    ]);

    return { text, keyboard };
  }

  // Successful Craft
  const outputInfo = await getItemInfo(result.outputItemId);
  const yieldDisplay = result.isTool
    ? `🛠️ *${result.recipeName}* (Equip via /tools)`
    : `${outputInfo.emoji} *${outputInfo.displayName}* × ${result.outputYield}`;

  const text = [
    `🎉 *CRAFTING SUCCESSFUL!*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✨ *Crafted Item:* ${yieldDisplay}`,
    `📈 *Mastery XP:* +${result.xpGained} Crafting XP`,
    `🪙 *Treasury Balance:* ${formatNumber(result.remainingCoins || 0)} Coins`,
    '',
    `_Item successfully backpack mein add ho gaya hai!_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🔨 Craft Again', encodeCallback({ action: 'cr_do', ownerId, targetId: result.recipeId })),
      Markup.button.callback('⬅️ Recipe List', encodeCallback({ action: 'cr_cat', ownerId, targetId: result.category }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderCraftingCategories,
  renderCategoryRecipes,
  renderRecipeDetails,
  renderCraftingResult
};
