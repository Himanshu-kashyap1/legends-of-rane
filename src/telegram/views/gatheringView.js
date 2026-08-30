import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { GATHERING_ZONES, RESOURCE_NODES } from '../../engine/gathering/gatheringConfig.js';
import { Item } from '../../models/Item.js';

let itemCatalogCache = null;
let lastItemFetch = 0;

async function getItemName(itemId) {
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
 * Screen 1: Zone Selection Menu (/explore or /gather)
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderExploreMenu(user) {
  const ownerId = String(user.telegramId);

  const text = [
    `🗺️ *REALM EXPLORATION & GATHERING* 🗺️`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Gathering ke liye territory select karo:_`,
    '',
    `🌲 *Lumberjack Forest* (Woodcutting)`,
    `⛏️ *Stone Quarry* (Mining Tier 1)`,
    `💎 *Deep Mines* (Mining Tier 2+)`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🌲 Forest', encodeCallback({ action: 'explore_zone', ownerId, targetId: 'zone_forest' })),
      Markup.button.callback('⛏️ Quarry', encodeCallback({ action: 'explore_zone', ownerId, targetId: 'zone_quarry' }))
    ],
    [
      Markup.button.callback('💎 Deep Mines', encodeCallback({ action: 'explore_zone', ownerId, targetId: 'zone_mines' })),
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 2: Node Selection inside Zone
 * @param {Object} user
 * @param {string} zoneId
 * @returns {{ text: string, keyboard: any }}
 */
export function renderZoneView(user, zoneId) {
  const zone = GATHERING_ZONES[zoneId] || GATHERING_ZONES.zone_forest;
  const ownerId = String(user.telegramId);

  const text = [
    `${zone.emoji} *${zone.name.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_${zone.description}_`,
    '',
    `_Harvest karne ke liye resource node chuno:_`
  ].join('\n');

  const nodeButtons = (zone.nodes || []).map(nodeId => {
    const node = RESOURCE_NODES[nodeId];
    return Markup.button.callback(
      `${node.emoji} ${node.name}`,
      encodeCallback({ action: 'node_detail', ownerId, targetId: nodeId })
    );
  });

  const keyboardRows = [];
  for (let i = 0; i < nodeButtons.length; i += 2) {
    keyboardRows.push(nodeButtons.slice(i, i + 2));
  }

  // Back returns specifically to Zone Selection
  keyboardRows.push([
    Markup.button.callback('⬅️ Back to Zones', encodeCallback({ action: 'nav_explore', ownerId }))
  ]);

  return { text, keyboard: Markup.inlineKeyboard(keyboardRows) };
}

/**
 * Screen 3: Specific Node Details & Harvest Preparation
 * @param {Object} user
 * @param {string} nodeId
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderNodeDetailView(user, nodeId) {
  const node = RESOURCE_NODES[nodeId] || RESOURCE_NODES.node_forest_oak;
  const zone = GATHERING_ZONES[node.zoneId] || { name: 'Realm' };
  const ownerId = String(user.telegramId);

  // Find tool status
  const tool = (user.tools || []).find(t => t.toolType === node.requiredToolType && t.equipped)
    || (user.tools || []).find(t => t.toolType === node.requiredToolType);

  const toolDisplay = tool
    ? `${tool.toolType === 'axe' ? '🪓' : '⛏️'} Tier ${tool.tier} ${tool.toolId.replace(/_/g, ' ')} (${tool.durability}/${tool.maxDurability})`
    : `❌ None equipped (Requires ${node.requiredToolType.toUpperCase()})`;

  const resources = [];
  for (const entry of node.dropTable) {
    const itemInfo = await getItemName(entry.itemId);
    resources.push(`  • ${itemInfo.emoji} ${itemInfo.displayName} (${entry.minQuantity}-${entry.maxQuantity})`);
  }

  const text = [
    `${node.emoji} *${node.name.toUpperCase()}*`,
    `📍 *Zone:* ${zone.name}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_${node.description}_`,
    '',
    `📦 *Loot Drops:*`,
    resources.join('\n'),
    '',
    `📈 *XP:* +${node.xpReward} ${node.skill.toUpperCase()} XP`,
    `🛡️ *Tool:* ${toolDisplay}`
  ].join('\n');

  const harvestLabel = node.requiredToolType === 'axe' ? '🪓 Harvest Timber' : '⛏️ Mine Node';

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(harvestLabel, encodeCallback({ action: 'gather_act', ownerId, targetId: node.nodeId })),
      Markup.button.callback('⬅️ Back', encodeCallback({ action: 'explore_zone', ownerId, targetId: node.zoneId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 4: Gathering Outcome & Action Loop
 * @param {Object} user
 * @param {Object} result
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderGatherResult(user, result) {
  const ownerId = String(user.telegramId);

  if (!result.success) {
    const errorMessages = {
      MISSING_TOOL: `❌ *Required Tool nahi hai!*\nAapke paas *${result.requiredToolType?.toUpperCase()}* hona chahiye.`,
      TOOL_REQUIREMENT_NOT_MET: `🛡️ *Tool Tier low hai!*\nIs node ke liye at least *Tier ${result.requiredTier} ${result.toolType}* required hai. Current: Tier ${result.currentTier}.`,
      TOOL_BROKEN: `💥 *Tool Toot Gaya Hai!*\nTool ki durability 0 ho chuki hai. /tools repair karo.`,
      INVALID_ZONE: `⚠️ *Node invalid hai.*`
    };

    const text = [
      `⚠️ *HARVEST HALTED*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      errorMessages[result.reason] || `⚓ Harvest nahi ho paya: ${result.reason}`
    ].join('\n');

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('⬅️ Back to Nodes', encodeCallback({ action: 'explore_zone', ownerId, targetId: result.zoneId || 'zone_forest' }))
      ]
    ]);

    return { text, keyboard };
  }

  // Successful Gathering
  const itemInfo = await getItemName(result.reward.itemId);
  const criticalBanner = result.isCritical
    ? `\n🌟 *CRITICAL HARVEST! (Yield Doubled ×2!)* 🌟\n`
    : '';

  const text = [
    `${result.isCritical ? '✨' : '🌲'} *HARVEST REPORT — ${result.nodeName}*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    criticalBanner,
    `🎁 *Loot Acquired:* ${itemInfo.emoji} *${itemInfo.displayName}* × ${result.reward.quantity}`,
    `📈 *Mastery XP:* +${result.xpGained} ${result.skill.toUpperCase()} XP`,
    `🛠️ *Tool Durability:* ${result.tool.durability}/${result.tool.maxDurability}`
  ].filter(Boolean).join('\n');

  const gatherAgainLabel = result.skill === 'woodcutting' ? '🪓 Gather Again' : '⛏️ Mine Again';

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(gatherAgainLabel, encodeCallback({ action: 'gather_act', ownerId, targetId: result.nodeId })),
      Markup.button.callback('⬅️ Back', encodeCallback({ action: 'explore_zone', ownerId, targetId: result.zoneId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderExploreMenu,
  renderZoneView,
  renderNodeDetailView,
  renderGatherResult
};
