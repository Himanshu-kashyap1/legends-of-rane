import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';

/**
 * Main /help and /guide Command Guide view.
 *
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderHelpView(user) {
  const ownerId = String(user?.telegramId || '0');

  const text = [
    `📜 *LEGENDS OF RANE — COMMAND GUIDE* 📜`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👇 *Type a category command:*`,
    '',
    `🌲 /gatheringharvest`,
    `⚒️ /blacksmithequipment`,
    `🎒 /economytrading`,
    `🏰 /3dvoxelbasemultiplayer`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🏠 Home', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * 1. Gathering & Harvest Category View (/gatheringharvest)
 *
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderGatheringCategoryView(user) {
  const ownerId = String(user?.telegramId || '0');

  const text = [
    `🌲 *GATHERING & HARVEST* 🌲`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Chop timber in Whispering Woods, mine granite in the Quarry, or delve into Deep Mines._`,
    '',
    `*Direct Commands:*`,
    `• \`/chop\` — Woodcutting`,
    `• \`/mine\` — Mining Ores`,
    `• \`/fish\` — Fishing River Rane`,
    `• \`/explore\` — Zone Browser`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🌳 Forest', encodeCallback({ action: 'explore_zone', ownerId, targetId: 'zone_forest' })),
      Markup.button.callback('🪨 Quarry', encodeCallback({ action: 'explore_zone', ownerId, targetId: 'zone_quarry' }))
    ],
    [
      Markup.button.callback('⛏️ Deep Mines', encodeCallback({ action: 'explore_zone', ownerId, targetId: 'zone_deep_mines' }))
    ],
    [
      Markup.button.callback('⬅️ Back', encodeCallback({ action: 'nav_help', ownerId })),
      Markup.button.callback('🏠 Home', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * 2. Blacksmith & Equipment Category View (/blacksmithequipment)
 *
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderBlacksmithCategoryView(user) {
  const ownerId = String(user?.telegramId || '0');

  const text = [
    `⚒️ *BLACKSMITH & EQUIPMENT* ⚒️`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Smelt ingots, cut planks, restore durability, and upgrade tool tiers._`,
    '',
    `*Direct Commands:*`,
    `• \`/craft\` — Smelt & Forge Recipes`,
    `• \`/tools\` — Inspect & Manage Tools`,
    `• \`/tools repair\` — Restore Durability`,
    `• \`/tools upgrade\` — Tier Upgrades`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🔨 Craft', encodeCallback({ action: 'cr_menu', ownerId })),
      Markup.button.callback('🛠️ Repair', encodeCallback({ action: 'ws_repair_req', ownerId, targetId: 'tool_axe_wood' }))
    ],
    [
      Markup.button.callback('⬆️ Upgrade', encodeCallback({ action: 'ws_upgrade_req', ownerId, targetId: 'tool_axe_wood' })),
      Markup.button.callback('🎒 Tools', encodeCallback({ action: 'ws_tools', ownerId }))
    ],
    [
      Markup.button.callback('⬅️ Back', encodeCallback({ action: 'nav_help', ownerId })),
      Markup.button.callback('🏠 Home', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * 3. Economy & Trading Category View (/economytrading)
 *
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderEconomyCategoryView(user) {
  const ownerId = String(user?.telegramId || '0');

  const text = [
    `🎒 *ECONOMY & TRADING* 🎒`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Trade resources in the global market, sell items, or gift friends in group chats._`,
    '',
    `*Direct Commands:*`,
    `• \`/bag\` or \`/inventory\` — View Backpack`,
    `• \`/market\` — Global Trade Hub`,
    `• \`/sell <item> <qty> <price>\` — List Order`,
    `• \`/gift @user <item> <qty>\` — Gift Friends`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🏪 Market', encodeCallback({ action: 'nav_market', ownerId })),
      Markup.button.callback('💰 Sell', encodeCallback({ action: 'mkt_help_sell', ownerId }))
    ],
    [
      Markup.button.callback('🎁 Gift', encodeCallback({ action: 'nav_gift_help', ownerId })),
      Markup.button.callback('🏆 Leaderboard', encodeCallback({ action: 'coming_soon', ownerId, targetId: 'leaderboard' }))
    ],
    [
      Markup.button.callback('⬅️ Back', encodeCallback({ action: 'nav_help', ownerId })),
      Markup.button.callback('🏠 Home', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * 4. 3D Voxel Base & Multiplayer Category View (/3dvoxelbasemultiplayer)
 *
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderBaseCategoryView(user) {
  const ownerId = String(user?.telegramId || '0');

  const text = [
    `🏰 *3D VOXEL BASE & MULTIPLAYER* 🏰`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Step into your 3D voxel sandbox kingdom, hunt monsters in 5 biomes, and summon Raid Titans._`,
    '',
    `*Direct Commands:*`,
    `• \`/base\` — Launch 3D Mini App`,
    `• \`/boss\` — Colossus Raid in Group Chats`,
    `• \`/pets\` — Companion Sanctuary`,
    `• \`/profile\` — Hero Masteries`,
    `• \`/quests\` — Progression Bounties`,
    `• \`/offline\` — Idle Kingdom Treasury`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🏗️ Open Base', encodeCallback({ action: 'nav_base', ownerId }))
    ],
    [
      Markup.button.callback('⚔️ Group Raid', encodeCallback({ action: 'coming_soon', ownerId, targetId: 'boss' })),
      Markup.button.callback('👥 Multiplayer', encodeCallback({ action: 'coming_soon', ownerId, targetId: 'multiplayer' }))
    ],
    [
      Markup.button.callback('⬅️ Back', encodeCallback({ action: 'nav_help', ownerId })),
      Markup.button.callback('🏠 Home', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Category Dispatcher Helper
 *
 * @param {Object} user
 * @param {string} categoryKey
 * @returns {{ text: string, keyboard: any }}
 */
export function renderCategoryDetailView(user, categoryKey) {
  switch (categoryKey) {
    case 'gathering':
    case 'gatheringharvest':
      return renderGatheringCategoryView(user);
    case 'blacksmith':
    case 'blacksmithequipment':
      return renderBlacksmithCategoryView(user);
    case 'economy':
    case 'economytrading':
      return renderEconomyCategoryView(user);
    case 'base':
    case '3dvoxelbasemultiplayer':
      return renderBaseCategoryView(user);
    default:
      return renderHelpView(user);
  }
}

/**
 * Detail view for specific command lookup (/guide <command>)
 */
export function renderCommandDetailView(user, commandArg) {
  const cleanArg = (commandArg || '').trim().toLowerCase().replace(/^\//, '');

  if (['gathering', 'gatheringharvest', 'harvest'].includes(cleanArg)) {
    return renderGatheringCategoryView(user);
  }
  if (['blacksmith', 'blacksmithequipment', 'equipment', 'craft', 'tools'].includes(cleanArg)) {
    return renderBlacksmithCategoryView(user);
  }
  if (['economy', 'economytrading', 'trading', 'market', 'sell', 'gift'].includes(cleanArg)) {
    return renderEconomyCategoryView(user);
  }
  if (['base', '3dvoxelbasemultiplayer', 'voxel', 'boss', 'pets', 'quests'].includes(cleanArg)) {
    return renderBaseCategoryView(user);
  }

  return renderHelpView(user);
}

/**
 * Finds a category configuration matching a user's copy-pasted partition text.
 *
 * @param {string} text
 * @returns {string|null}
 */
export function matchCategoryFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text
    .toLowerCase()
    .replace(/[>•'"❞“”#*_`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 4) return null;

  if (clean.includes('gathering') || clean.includes('harvest')) {
    return 'gatheringharvest';
  }
  if (clean.includes('blacksmith') || clean.includes('equipment')) {
    return 'blacksmithequipment';
  }
  if (clean.includes('economy') || clean.includes('trading')) {
    return 'economytrading';
  }
  if (clean.includes('3d voxel') || clean.includes('voxel base') || clean.includes('multiplayer')) {
    return '3dvoxelbasemultiplayer';
  }

  return null;
}

export default {
  renderHelpView,
  renderGatheringCategoryView,
  renderBlacksmithCategoryView,
  renderEconomyCategoryView,
  renderBaseCategoryView,
  renderCategoryDetailView,
  renderCommandDetailView,
  matchCategoryFromText
};
