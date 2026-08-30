import { logger } from '../../utils/logger.js';
import { renderMainMenu } from '../views/mainMenuView.js';
import { renderProfile } from '../views/profileView.js';
import { renderInventory } from '../views/inventoryView.js';
import {
  renderExploreMenu,
  renderZoneView,
  renderNodeDetailView,
  renderGatherResult
} from '../views/gatheringView.js';
import {
  renderWorkshopMenu,
  renderToolsList,
  renderToolDetailsView,
  renderRepairConfirmationView,
  renderUpgradeConfirmationView,
  renderActionResultView
} from '../views/workshopView.js';
import {
  renderCraftingCategories,
  renderCategoryRecipes,
  renderRecipeDetails,
  renderCraftingResult
} from '../views/craftingView.js';
import {
  renderMarketHub,
  renderMarketCategories,
  renderMarketListings,
  renderListingDetails,
  renderMyListingsView,
  renderHelpSellView,
  renderMarketResultView
} from '../views/marketView.js';
import {
  renderQuestHub,
  renderCategoryQuests,
  renderQuestDetails,
  renderQuestClaimResult
} from '../views/questView.js';
import {
  renderPetsHub,
  renderMyPetsList,
  renderPetAdoptionShop,
  renderPetDetails,
  renderPetActionResult
} from '../views/petsView.js';
import {
  renderOfflineCard,
  renderOfflineClaimResult
} from '../views/offlineView.js';
import {
  renderBossStatus,
  renderBossLeaderboard,
  renderBossDefeatView
} from '../views/bossView.js';
import { renderEquippedTools } from '../views/toolsView.js';
import { renderGiftingHub } from '../views/giftingView.js';
import { renderHelpView } from '../views/helpView.js';
import { executeGatherAction } from '../../engine/gathering/gatheringEngine.js';
import { executeRepairTool, executeUpgradeTool } from '../../engine/economy/toolService.js';
import { executeCraftRecipe } from '../../engine/economy/craftingEngine.js';
import { purchaseMarketListing, cancelMarketListing } from '../../engine/economy/marketEngine.js';
import { claimQuestReward } from '../../engine/quests/questEngine.js';
import { adoptPet, equipPet, feedPet } from '../../engine/pets/petEngine.js';
import { claimOfflineRewards } from '../../engine/offline/offlineEngine.js';
import { handleBaseCommand } from '../commands/base.js';
import { executeBossAttack, spawnOrGetGroupBoss } from '../../engine/combat/bossEngine.js';
import { Boss } from '../../models/Boss.js';

const callbackHandlers = new Map();

/**
 * Registers an action handler for inline button clicks.
 * @param {string} action
 * @param {Function} handler
 */
export function registerCallback(action, handler) {
  callbackHandlers.set(action, handler);
}

/**
 * Dispatches parsed callback query to registered action handler.
 */
export async function callbackRouter(ctx, next) {
  if (!ctx.callbackQuery || !ctx.state?.callback) {
    return next();
  }

  const { action } = ctx.state.callback;
  const handler = callbackHandlers.get(action);

  if (!handler) {
    logger.debug(`No callback handler registered for action: ${action}`);
    await ctx.answerCbQuery('Ye menu purana ho gaya hai. Please current menu open karo.', { show_alert: true }).catch(() => {});
    return;
  }

  try {
    await handler(ctx);
  } catch (err) {
    if (err?.message?.includes('429') || err?.message?.includes('message is not modified')) {
      logger.warn(`Telegram API warning in callback handler [action=${action}]: ${err.message}`);
      return;
    }
    logger.error(`Error in callback handler [action=${action}]:`, err);
    throw err;
  }
}

/**
 * Safely edits an existing message text or falls back to reply without throwing on 429 / unmodified errors.
 */
export async function safeEditOrReply(ctx, text, keyboard = {}) {
  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
  } catch (err) {
    if (err?.message?.includes('message is not modified')) {
      return;
    }
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard }).catch((replyErr) => {
      logger.debug('Safe edit/reply fallback caught:', replyErr?.message);
    });
  }
}

// ----------------------------------------------------
// Navigation & Core Callback Handlers
// ----------------------------------------------------

// Navigate to Main Menu
registerCallback('nav_main', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderMainMenu(user);
  try {
    await ctx.deleteMessage().catch(() => {});
  } catch (_) {}
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  await ctx.answerCbQuery().catch(() => {});
});

// Navigate to Help & Command Guide
registerCallback('nav_help', async (ctx) => {
  const user = ctx.state.user;
  const { text, keyboard } = renderHelpView(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Close View (Clean Message Termination)
registerCallback('nav_close', async (ctx) => {
  try {
    await ctx.deleteMessage().catch(() => {});
  } catch (_) {}
  await ctx.answerCbQuery('Closed').catch(() => {});
});

// Navigate to Profile
registerCallback('nav_profile', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderProfile(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Navigate to Inventory (with page support)
registerCallback('nav_inventory', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const page = parseInt(ctx.state.callback.targetId || '1', 10) || 1;
  const { text, keyboard } = await renderInventory(user, page);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// ----------------------------------------------------
// Gathering & Exploration Navigation (Step 5)
// ----------------------------------------------------

// Zone Selection Menu (/explore)
registerCallback('nav_explore', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderExploreMenu(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Node Selection within Zone (Forest / Quarry / Deep Mines)
registerCallback('explore_zone', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const zoneId = ctx.state.callback.targetId || 'zone_forest';
  const { text, keyboard } = renderZoneView(user, zoneId);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Node Details & Harvest Preparation
registerCallback('node_detail', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const nodeId = ctx.state.callback.targetId || 'node_forest_oak';
  const { text, keyboard } = await renderNodeDetailView(user, nodeId);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Execute Gathering Action
registerCallback('gather_act', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const nodeId = ctx.state.callback.targetId || 'node_forest_oak';
  const result = await executeGatherAction({ user, nodeId });

  const { text, keyboard } = await renderGatherResult(user, result);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    const alertText = result.isCritical
      ? `🌟 CRITICAL! +${result.reward.quantity} ${result.reward.itemId.replace(/_/g, ' ')}!`
      : `✨ Harvested +${result.reward.quantity} ${result.reward.itemId.replace(/_/g, ' ')}`;
    await ctx.answerCbQuery(alertText).catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ Gathering could not proceed. Check requirements.').catch(() => {});
  }
});

// ----------------------------------------------------
// Tools & Blacksmith Workshop Navigation (Step 6)
// ----------------------------------------------------

// Navigate to /tools overview
registerCallback('nav_tools', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderEquippedTools(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Navigate to Workshop (/workshop or /craft)
registerCallback('nav_workshop', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderWorkshopMenu(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// My Tools List (Paginated)
registerCallback('ws_tools', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const page = parseInt(ctx.state.callback.targetId || '1', 10) || 1;
  const { text, keyboard } = renderToolsList(user, page);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Specific Tool Details
registerCallback('ws_tool_detail', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const instanceId = ctx.state.callback.targetId;
  const { text, keyboard } = renderToolDetailsView(user, instanceId);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Request Repair Confirmation
registerCallback('ws_repair_req', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const instanceId = ctx.state.callback.targetId;
  const { text, keyboard } = await renderRepairConfirmationView(user, instanceId);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Confirm & Execute Repair Action
registerCallback('ws_repair_do', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const instanceId = ctx.state.callback.targetId;
  const result = await executeRepairTool({ user, instanceId });

  const { text, keyboard } = renderActionResultView(user, result, 'repair', instanceId);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    await ctx.answerCbQuery('✅ Tool successfully repaired!').catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ Repair failed. Check requirements.', { show_alert: true }).catch(() => {});
  }
});

// Request Upgrade Confirmation
registerCallback('ws_upgrade_req', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const instanceId = ctx.state.callback.targetId;
  const { text, keyboard } = await renderUpgradeConfirmationView(user, instanceId);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Confirm & Execute Upgrade Action
registerCallback('ws_upgrade_do', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const instanceId = ctx.state.callback.targetId;
  const result = await executeUpgradeTool({ user, instanceId });

  const { text, keyboard } = renderActionResultView(user, result, 'upgrade', instanceId);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    await ctx.answerCbQuery(`🎉 Upgraded to Tier ${result.newTierName}!`).catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ Upgrade failed. Check requirements.', { show_alert: true }).catch(() => {});
  }
});

// ----------------------------------------------------
// Crafting Engine Navigation (Step 7)
// ----------------------------------------------------

// Crafting Categories Menu
registerCallback('cr_menu', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderCraftingCategories(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Recipe List within Category
registerCallback('cr_cat', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const categoryId = ctx.state.callback.targetId || 'refining';
  const { text, keyboard } = renderCategoryRecipes(user, categoryId, 1);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Paginated Recipe List within Category
registerCallback('cr_cat_page', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const [categoryId, pageStr] = (ctx.state.callback.targetId || 'refining:1').split(':');
  const page = parseInt(pageStr, 10) || 1;
  const { text, keyboard } = renderCategoryRecipes(user, categoryId, page);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Specific Recipe Details & Verification
registerCallback('cr_detail', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const recipeId = ctx.state.callback.targetId || 'recipe_plank_oak';
  const { text, keyboard } = await renderRecipeDetails(user, recipeId);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Confirm & Execute Crafting Action
registerCallback('cr_do', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const recipeId = ctx.state.callback.targetId || 'recipe_plank_oak';
  const result = await executeCraftRecipe({ user, recipeId });

  const { text, keyboard } = await renderCraftingResult(user, result);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    await ctx.answerCbQuery(`🎉 Crafted ${result.recipeName}! (+${result.xpGained} XP)`).catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ Crafting failed. Check requirements.', { show_alert: true }).catch(() => {});
  }
});

// ----------------------------------------------------
// Player Marketplace Navigation (Step 8)
// ----------------------------------------------------

// Navigate to Market Hub (/market)
registerCallback('nav_market', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderMarketHub(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Market Category Filter Menu
registerCallback('mkt_cats', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderMarketCategories(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Browse Market Listings (with category and pagination)
registerCallback('mkt_browse', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const [category, pageStr] = (ctx.state.callback.targetId || 'all:1').split(':');
  const page = parseInt(pageStr, 10) || 1;
  const { text, keyboard } = await renderMarketListings(user, category, page);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Listing Details & Buy Confirmation Screen
registerCallback('mkt_detail', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const orderId = ctx.state.callback.targetId;
  const { text, keyboard } = await renderListingDetails(user, orderId);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Execute Purchase Action
registerCallback('mkt_buy_do', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const orderId = ctx.state.callback.targetId;
  const result = await purchaseMarketListing({ buyer: user, orderId });

  const { text, keyboard } = await renderMarketResultView(user, result, 'buy');
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    await ctx.answerCbQuery('🎉 Item purchased successfully!').catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ Purchase failed. Check requirements.', { show_alert: true }).catch(() => {});
  }
});

// View My Active Listings
registerCallback('mkt_my_orders', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = await renderMyListingsView(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Execute Cancel Listing Action
registerCallback('mkt_cancel_do', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const orderId = ctx.state.callback.targetId;
  const result = await cancelMarketListing({ user, orderId });

  const { text, keyboard } = await renderMarketResultView(user, result, 'cancel');
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    await ctx.answerCbQuery('📦 Listing cancelled and items returned!').catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ Cancellation failed.', { show_alert: true }).catch(() => {});
  }
});

// How to Sell Help View
registerCallback('mkt_help_sell', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderHelpSellView(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Navigate to Gift Help & Quota Hub
registerCallback('nav_gift_help', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderGiftingHub(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// ----------------------------------------------------
// Quest System Navigation (Step 10)
// ----------------------------------------------------

// Navigate to Quest Hub (/quests)
registerCallback('nav_quests', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderQuestHub(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Quest Category View (Story / Daily)
registerCallback('qst_cat', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const categoryId = ctx.state.callback.targetId || 'story';
  const { text, keyboard } = renderCategoryQuests(user, categoryId, 1);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Paginated Quest List per Category
registerCallback('qst_cat_page', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const [categoryId, pageStr] = (ctx.state.callback.targetId || 'story:1').split(':');
  const page = parseInt(pageStr, 10) || 1;
  const { text, keyboard } = renderCategoryQuests(user, categoryId, page);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Quest Details View
registerCallback('qst_detail', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const questId = ctx.state.callback.targetId;
  const { text, keyboard } = await renderQuestDetails(user, questId);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Confirm & Execute Quest Reward Claim
registerCallback('qst_claim_do', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const questId = ctx.state.callback.targetId;
  const result = await claimQuestReward({ user, questId });

  const { text, keyboard } = await renderQuestClaimResult(user, result);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    await ctx.answerCbQuery(`🎉 Claimed rewards for ${result.title}! (+${result.coinsReward}c)`).catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ Claim failed. Check requirements.', { show_alert: true }).catch(() => {});
  }
});

// ----------------------------------------------------
// Companion Pets Navigation (Step 11)
// ----------------------------------------------------

// Open Companion Pets Sanctuary
registerCallback('nav_pets', async (ctx) => {
  const user = ctx.state.user;
  const { text, keyboard } = renderPetsHub(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Launch 3D Base Mini App Info
registerCallback('nav_base', async (ctx) => {
  await handleBaseCommand(ctx);
  await ctx.answerCbQuery().catch(() => {});
});

// My Pets List (Paginated)
registerCallback('pet_list', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const page = parseInt(ctx.state.callback.targetId || '1', 10) || 1;
  const { text, keyboard } = renderMyPetsList(user, page);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Pet Adoption Shop (Paginated)
registerCallback('pet_adopt_shop', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const page = parseInt(ctx.state.callback.targetId || '1', 10) || 1;
  const { text, keyboard } = renderPetAdoptionShop(user, page);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Specific Pet Details View
registerCallback('pet_detail', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const petId = ctx.state.callback.targetId;
  const { text, keyboard } = renderPetDetails(user, petId);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Confirm & Execute Pet Adoption
registerCallback('pet_adopt_do', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const petId = ctx.state.callback.targetId;
  const result = await adoptPet({ user, petId });

  const { text, keyboard } = renderPetActionResult(user, result, 'adopt');
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    await ctx.answerCbQuery(`🎉 Adopted ${result.petDef.name}!`).catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ Adoption failed. Check coins.', { show_alert: true }).catch(() => {});
  }
});

// Confirm & Execute Feeding Action
registerCallback('pet_feed_do', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const petId = ctx.state.callback.targetId;
  const result = await feedPet({ user, petId });

  const { text, keyboard } = renderPetActionResult(user, result, 'feed');
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    await ctx.answerCbQuery(`🍖 Fed pet! Happiness: ${result.newHappiness}%`).catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ Feeding failed.', { show_alert: true }).catch(() => {});
  }
});

// Confirm & Execute Equip/Active Action
registerCallback('pet_equip_do', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const petId = ctx.state.callback.targetId;
  const result = await equipPet({ user, petId });

  const { text, keyboard } = renderPetActionResult(user, result, 'equip');
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    const msg = result.activePet ? `⭐ Equipped ${result.petDef.name}!` : `🛑 Pet unequipped.`;
    await ctx.answerCbQuery(msg).catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ Equip action failed.', { show_alert: true }).catch(() => {});
  }
});

// ----------------------------------------------------
// Offline Idle Earnings Navigation (Step 13)
// ----------------------------------------------------

// Navigate to Offline Earnings Card (/offline)
registerCallback('nav_offline', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const { text, keyboard } = renderOfflineCard(user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Confirm & Execute Offline Earnings Deposit
registerCallback('claim_offline_do', async (ctx) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.answerCbQuery('⚠️ Player session not found.', { show_alert: true });
  }

  const result = await claimOfflineRewards({ user });

  const { text, keyboard } = renderOfflineClaimResult(user, result);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  if (result.success) {
    await ctx.answerCbQuery(`🎉 Claimed offline earnings! (+${result.earnings.coins}c)`).catch(() => {});
  } else {
    await ctx.answerCbQuery('⚠️ No offline earnings available.', { show_alert: true }).catch(() => {});
  }
});

// ----------------------------------------------------
// Group Colossus Raid Navigation & Attack (Step 14)
// ----------------------------------------------------

// Execute Attack Strike on Group Boss
registerCallback('boss_attack_do', async (ctx) => {
  const user = ctx.state.user;
  const chatId = ctx.chat?.id || ctx.state.callback.targetId;

  if (!user || !chatId) {
    return ctx.answerCbQuery('⚠️ Combat session error.', { show_alert: true });
  }

  const result = await executeBossAttack({ user, chatId });

  if (!result.success) {
    const errorMsg = result.reason === 'INSUFFICIENT_ENERGY'
      ? `⚡ Energy kam hai! Required: ${result.requiredEnergy}⚡, Current: ${result.currentEnergy}⚡`
      : result.reason === 'BOSS_ALREADY_DEFEATED'
      ? `🏆 Boss already defeat ho chuka hai!`
      : `⚠️ Attack failed: ${result.reason}`;
    return ctx.answerCbQuery(errorMsg, { show_alert: true });
  }

  if (result.isDefeated) {
    const { text, keyboard } = renderBossDefeatView(result.boss, result.rewardsSummary);
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    });
    await ctx.answerCbQuery(`🎊 VICTORY! Boss shattered!`).catch(() => {});
  } else {
    const { text, keyboard } = renderBossStatus(result.boss, user, result);
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    });
    const strikeMsg = result.isCrit
      ? `🔥 CRITICAL HIT! +${result.damageDealt} DMG! (Boss: ${result.remainingHp} HP)`
      : `⚔️ +${result.damageDealt} DMG! (Boss: ${result.remainingHp} HP)`;
    await ctx.answerCbQuery(strikeMsg).catch(() => {});
  }
});

// View Raid Leaderboard
registerCallback('boss_board', async (ctx) => {
  const chatId = ctx.chat?.id || ctx.state.callback.targetId;
  const boss = await Boss.findOne({ chatId: String(chatId) }).sort({ createdAt: -1 });

  if (!boss) {
    return ctx.answerCbQuery('⚠️ No boss record found for this group.', { show_alert: true });
  }

  const { text, keyboard } = renderBossLeaderboard(boss);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery().catch(() => {});
});

// Refresh Boss Status
registerCallback('boss_refresh', async (ctx) => {
  const user = ctx.state.user;
  const chatId = ctx.chat?.id || ctx.state.callback.targetId;
  const boss = await Boss.findOne({ chatId: String(chatId), status: 'active' });

  if (!boss) {
    return ctx.answerCbQuery('⚠️ No active titan in this group.', { show_alert: true });
  }

  const { text, keyboard } = renderBossStatus(boss, user);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery('🔄 Boss status updated!').catch(() => {});
});

// Respawn / Awaken New Boss
registerCallback('boss_respawn', async (ctx) => {
  const user = ctx.state.user;
  const chatId = ctx.chat?.id || ctx.state.callback.targetId;

  const { boss } = await spawnOrGetGroupBoss({ chatId });
  const { text, keyboard } = renderBossStatus(boss, user);

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });
  await ctx.answerCbQuery('⚡ A new titan awakens!').catch(() => {});
});

// ----------------------------------------------------
// Coming Soon Alerts for future systems
// ----------------------------------------------------
registerCallback('coming_soon', async (ctx) => {
  const feature = ctx.state.callback.targetId || 'feature';
  const featureNames = {
    quests: '📜 Story & Daily Quests',
    pets: '🐾 Companion Pets',
    leaderboard: '🏆 Realm Leaderboards',
    offline: '🌙 Offline Idle Progress',
    base: '🏰 3D Voxel Base (Requires HTTPS WebApp tunnel in Step 5)',
    help: '❓ Help & Guides'
  };

  const name = featureNames[feature] || 'This realm feature';
  await ctx.answerCbQuery(`⚔️ ${name} is under construction by the Grand Council! (Coming in upcoming steps)`, { show_alert: true });
});

// No-op for page indicators
registerCallback('noop', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
});

export default callbackRouter;
