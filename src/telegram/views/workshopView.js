import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { getToolDetails } from '../../engine/economy/toolService.js';
import { TOOL_TIERS, getDurabilityStatus } from '../../engine/economy/toolConfig.js';
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
 * Screen 1: Workshop Main Menu (/workshop or /craft)
 */
export function renderWorkshopMenu(user) {
  const ownerId = String(user.telegramId);
  const craftingLevel = user.skills?.crafting?.level || 1;

  const text = [
    `⚒️ *BLACKSMITH FORGE & WORKSHOP* ⚒️`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Tools repair aur upgrades ke liye workshop use karein._`,
    '',
    `🪙 *Treasury:* ${formatNumber(user.coins || 0)} Coins`,
    `⭐ *Crafting Mastery:* Level ${craftingLevel}`,
    `🛠 *Tools Owned:* ${user.tools?.length || 0}`,
    '',
    `_Select an option:_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🔨 Craft Recipes', encodeCallback({ action: 'cr_menu', ownerId })),
      Markup.button.callback('🛠 My Tools', encodeCallback({ action: 'ws_tools', ownerId, targetId: '1' }))
    ],
    [
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 2: Paginated List of Owned Tools
 */
export function renderToolsList(user, page = 1) {
  const ownerId = String(user.telegramId);
  const tools = user.tools || [];
  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(tools.length / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, page));

  const startIndex = (currentPage - 1) * pageSize;
  const visibleTools = tools.slice(startIndex, startIndex + pageSize);

  const textLines = [
    `🛠 *YOUR TOOL ARSENAL* (Page ${currentPage}/${totalPages})`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Select a tool to repair or upgrade:_`,
    ''
  ];

  if (tools.length === 0) {
    textLines.push(`_Aapke paas abhi koi tool nahi hai._`);
  }

  const toolButtons = visibleTools.map(t => {
    const status = getDurabilityStatus(t.durability, t.maxDurability);
    const tierConfig = TOOL_TIERS[t.tier] || TOOL_TIERS[1];
    const icon = t.toolType === 'axe' ? '🪓' : '⛏️';
    const label = `${icon} ${tierConfig.name} (${t.durability}/${t.maxDurability}) ${status.emoji}`;

    return Markup.button.callback(
      label,
      encodeCallback({ action: 'ws_tool_detail', ownerId, targetId: t.instanceId })
    );
  });

  const keyboardRows = [];
  for (let i = 0; i < toolButtons.length; i += 2) {
    keyboardRows.push(toolButtons.slice(i, i + 2));
  }

  // Pagination row if needed
  if (totalPages > 1) {
    const navRow = [];
    if (currentPage > 1) {
      navRow.push(Markup.button.callback('◀️ Prev', encodeCallback({ action: 'ws_tools', ownerId, targetId: String(currentPage - 1) })));
    }
    navRow.push(Markup.button.callback(`• ${currentPage}/${totalPages} •`, encodeCallback({ action: 'noop', ownerId })));
    if (currentPage < totalPages) {
      navRow.push(Markup.button.callback('Next ▶️', encodeCallback({ action: 'ws_tools', ownerId, targetId: String(currentPage + 1) })));
    }
    keyboardRows.push(navRow);
  }

  keyboardRows.push([
    Markup.button.callback('⬅️ Back to Workshop', encodeCallback({ action: 'nav_workshop', ownerId }))
  ]);

  return { text: textLines.join('\n'), keyboard: Markup.inlineKeyboard(keyboardRows) };
}

/**
 * Screen 3: Tool Details & Action Hub
 */
export function renderToolDetailsView(user, instanceId) {
  const details = getToolDetails(user, instanceId);
  const ownerId = String(user.telegramId);

  if (!details) {
    return {
      text: `⚠️ *Tool nahi mila.*`,
      keyboard: Markup.inlineKeyboard([[
        Markup.button.callback('⬅️ Back', encodeCallback({ action: 'ws_tools', ownerId, targetId: '1' }))
      ]])
    };
  }

  const { tool, tierConfig, durabilityStatus, repair, upgrade } = details;
  const icon = tool.toolType === 'axe' ? '🪓' : '⛏️';
  const name = tool.toolId.replace(/_/g, ' ').toUpperCase();

  const text = [
    `${icon} *${name}*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `• *Tier:* ${tierConfig.emoji} ${tierConfig.name} (Tier ${tool.tier})`,
    `• *Durability:* ${tool.durability} / ${tool.maxDurability}`,
    `• *Condition:* ${durabilityStatus.emoji} ${durabilityStatus.label} (${durabilityStatus.percent}%)`,
    '',
    `📈 *Modifiers:* Yield +${tierConfig.yieldBonus} | Crit +${Math.round(tierConfig.criticalBonus * 100)}% | Energy -${tierConfig.energyDiscount}`,
    '',
    `🔧 *Repair:* ${repair.isNeeded ? '⚠️ Damaged (Repair available)' : '✅ Fully Repaired'}`,
    `⬆️ *Upgrade:* ${upgrade.isMaxTier ? '💎 MAX TIER (Diamond)' : `Ready for Tier ${upgrade.nextTierConfig?.name}`}`
  ].join('\n');

  const actionButtons = [];
  if (repair.isNeeded) {
    actionButtons.push(Markup.button.callback('🔧 Repair Tool', encodeCallback({ action: 'ws_repair_req', ownerId, targetId: tool.instanceId })));
  }
  if (!upgrade.isMaxTier) {
    actionButtons.push(Markup.button.callback('⬆️ Upgrade Tier', encodeCallback({ action: 'ws_upgrade_req', ownerId, targetId: tool.instanceId })));
  }

  const keyboardRows = [];
  if (actionButtons.length > 0) {
    keyboardRows.push(actionButtons);
  }

  keyboardRows.push([
    Markup.button.callback('⬅️ Back to Tools', encodeCallback({ action: 'ws_tools', ownerId, targetId: '1' }))
  ]);

  return { text, keyboard: Markup.inlineKeyboard(keyboardRows) };
}

/**
 * Screen 4: Repair Requirements & Confirmation
 */
export async function renderRepairConfirmationView(user, instanceId) {
  const details = getToolDetails(user, instanceId);
  const ownerId = String(user.telegramId);

  if (!details) {
    return {
      text: `⚠️ *Tool nahi mila.*`,
      keyboard: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', encodeCallback({ action: 'ws_tools', ownerId }))]])
    };
  }

  const { tool, tierConfig, repair } = details;
  const costLines = [];

  for (const mat of repair.cost.materials) {
    const itemInfo = await getItemInfo(mat.itemId);
    const playerStack = user.inventory?.find(i => i.itemId === mat.itemId);
    const ownedQty = playerStack?.quantity || 0;
    const checkEmoji = ownedQty >= mat.quantity ? '✅' : '❌';
    costLines.push(`  • ${itemInfo.emoji} ${itemInfo.displayName}: *${mat.quantity}* (Owned: ${ownedQty}) ${checkEmoji}`);
  }

  const coinsCheck = (user.coins || 0) >= repair.cost.coins ? '✅' : '❌';
  costLines.push(`  • 🪙 Coins: *${repair.cost.coins}* (Yours: ${user.coins || 0}) ${coinsCheck}`);

  const text = [
    `🔧 *TOOL REPAIR CONFIRMATION*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Tool: *${tool.toolId.replace(/_/g, ' ').toUpperCase()}*`,
    `Durability: *${tool.durability} / ${tool.maxDurability}* ➔ *${tool.maxDurability} / ${tool.maxDurability}*`,
    '',
    `💰 *Repair Cost:*`,
    costLines.join('\n'),
    '',
    repair.canAfford
      ? `_Kya aap is tool ko full repair karna chahte hain?_`
      : `⚠️ *Repair ke liye materials ya coins kam hain.*`
  ].join('\n');

  const actionButtons = [];
  if (repair.canAfford) {
    actionButtons.push(Markup.button.callback('✅ Confirm Repair', encodeCallback({ action: 'ws_repair_do', ownerId, targetId: tool.instanceId })));
  }
  actionButtons.push(Markup.button.callback('❌ Cancel', encodeCallback({ action: 'ws_tool_detail', ownerId, targetId: tool.instanceId })));

  const keyboard = Markup.inlineKeyboard([actionButtons]);

  return { text, keyboard };
}

/**
 * Screen 5: Upgrade Requirements & Confirmation
 */
export async function renderUpgradeConfirmationView(user, instanceId) {
  const details = getToolDetails(user, instanceId);
  const ownerId = String(user.telegramId);

  if (!details || details.upgrade.isMaxTier) {
    return {
      text: `⚠️ *Yeh tool maximum tier par hai.*`,
      keyboard: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', encodeCallback({ action: 'ws_tools', ownerId }))]])
    };
  }

  const { tool, tierConfig, upgrade } = details;
  const nextTier = upgrade.nextTierConfig;
  const costLines = [];

  for (const mat of upgrade.config.materials) {
    const itemInfo = await getItemInfo(mat.itemId);
    const playerStack = user.inventory?.find(i => i.itemId === mat.itemId);
    const ownedQty = playerStack?.quantity || 0;
    const checkEmoji = ownedQty >= mat.quantity ? '✅' : '❌';
    costLines.push(`  • ${itemInfo.emoji} ${itemInfo.displayName}: *${mat.quantity}* (Owned: ${ownedQty}) ${checkEmoji}`);
  }

  const coinsCheck = (user.coins || 0) >= upgrade.config.coins ? '✅' : '❌';
  costLines.push(`  • 🪙 Coins: *${upgrade.config.coins}* (Yours: ${user.coins || 0}) ${coinsCheck}`);

  const skillCheck = upgrade.hasSkill ? '✅' : '❌';
  costLines.push(`  • ⭐ Crafting Mastery: Level *${upgrade.config.minSkillLevel}* (Yours: ${upgrade.craftingLevel}) ${skillCheck}`);

  const text = [
    `⬆️ *TIER UPGRADE FORGE*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Tool: *${tool.toolId.replace(/_/g, ' ').toUpperCase()}*`,
    `Progression: *${tierConfig.name} (T${tool.tier})* ➔ *${nextTier.name} (T${nextTier.tier})*`,
    '',
    `✨ *Stats Preview:*`,
    `  • Max Durability: *${nextTier.maxDurability}* (Fully Restored)`,
    `  • Yield Bonus: +${tierConfig.yieldBonus} ➔ *+${nextTier.yieldBonus}*`,
    `  • Critical Chance: +${Math.round(tierConfig.criticalBonus * 100)}% ➔ *+${Math.round(nextTier.criticalBonus * 100)}%*`,
    `  • Energy Cost: -${tierConfig.energyDiscount} ➔ *-${nextTier.energyDiscount} Energy*`,
    '',
    `💰 *Requirements:*`,
    costLines.join('\n'),
    '',
    upgrade.canAfford
      ? `_Kya aap is tool ko agle tier mein upgrade karna chahte hain?_`
      : `⚠️ *Requirements insufficient hain.*`
  ].join('\n');

  const actionButtons = [];
  if (upgrade.canAfford) {
    actionButtons.push(Markup.button.callback('✅ Confirm Upgrade', encodeCallback({ action: 'ws_upgrade_do', ownerId, targetId: tool.instanceId })));
  }
  actionButtons.push(Markup.button.callback('❌ Cancel', encodeCallback({ action: 'ws_tool_detail', ownerId, targetId: tool.instanceId })));

  const keyboard = Markup.inlineKeyboard([actionButtons]);

  return { text, keyboard };
}

/**
 * Screen 6: Operation Outcome View
 */
export function renderActionResultView(user, result, type, instanceId) {
  const ownerId = String(user.telegramId);

  if (!result.success) {
    const errorMessages = {
      INSUFFICIENT_COINS: `🪙 *Coins kam hain!* Required: ${result.requiredCoins}c, Current: ${result.currentCoins}c.`,
      INSUFFICIENT_MATERIALS: `📦 *Required materials insufficient hain.*`,
      INSUFFICIENT_SKILL_LEVEL: `⭐ *Crafting Mastery kam hai!* Required: Level ${result.requiredLevel}, Current: Level ${result.currentLevel}.`,
      ALREADY_FULL_DURABILITY: `🔧 *Tool already full durability par hai.*`,
      MAX_TIER_REACHED: `💎 *Yeh tool already Maximum Tier (Diamond) par hai!*`,
      TOOL_NOT_FOUND: `⚠️ *Tool record nahi mila.*`
    };

    const text = [
      `⚠️ *BLACKSMITH OPERATION FAILED*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      errorMessages[result.reason] || `Operation nahi ho paya: ${result.reason}`
    ].join('\n');

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('⬅️ Back to Tool', encodeCallback({ action: 'ws_tool_detail', ownerId, targetId: instanceId || '1' }))
      ]
    ]);

    return { text, keyboard };
  }

  // Successful Outcome
  const isRepair = type === 'repair';
  const header = isRepair ? `🔧 *TOOL REPAIR SUCCESSFUL!*` : `✨ *TIER UPGRADE COMPLETE!*`;
  const desc = isRepair
    ? `✅ *${result.tool.toolId.replace(/_/g, ' ').toUpperCase()}* fully repair ho gaya (${result.newDurability}/${result.tool.maxDurability})!`
    : `🎉 *Congratulations!* Tool ab *Tier ${result.newTier} (${result.newTierName})* ban chuka hai! (+${result.xpGained} Crafting XP).`;

  const text = [
    header,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    desc,
    '',
    `🪙 *Remaining Treasury:* ${formatNumber(user.coins || 0)} Coins`,
    `🛠 *Durability:* ${result.tool.durability} / ${result.tool.maxDurability}`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🛠 Inspect Tool', encodeCallback({ action: 'ws_tool_detail', ownerId, targetId: result.tool.instanceId })),
      Markup.button.callback('⬅️ Workshop', encodeCallback({ action: 'nav_workshop', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderWorkshopMenu,
  renderToolsList,
  renderToolDetailsView,
  renderRepairConfirmationView,
  renderUpgradeConfirmationView,
  renderActionResultView
};
