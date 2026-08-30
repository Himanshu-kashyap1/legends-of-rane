import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { getPlayerInventoryData } from '../../services/inventoryService.js';
import { formatNumber } from './uiHelpers.js';

/**
 * Builds the simplified, command-first Inventory / Backpack view.
 * @param {Object} user - Mongoose User document
 * @param {number} [page=1]
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderInventory(user, page = 1) {
  const inventory = await getPlayerInventoryData(user, page);
  const ownerId = String(user.telegramId);

  const textSections = [
    `🎒 *ADVENTURER'S BACKPACK* 🎒`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🪙 *Treasury:* ${formatNumber(inventory.coins)} Coins`,
    `📦 *Total Items:* ${inventory.allItemCount}  •  🛠️ *Tools:* ${inventory.tools.length}`,
    `━━━━━━━━━━━━━━━━━━━━━━`
  ];

  if (inventory.isEmpty) {
    textSections.push(
      `_Your backpack is currently empty._`,
      `_Gathering aur Crafting karke resources collect karo!_`
    );
  } else {
    // 1. Stackable Resources Section
    if (inventory.items.length > 0) {
      textSections.push(`🪵 *RESOURCES & MATERIALS*`);
      for (const item of inventory.items) {
        textSections.push(`${item.emoji} *${item.displayName}* × ${formatNumber(item.quantity)}`);
      }
      textSections.push('');
    }

    // 2. Unique Tools Section
    if (inventory.tools.length > 0) {
      textSections.push(`🛠️ *EQUIPMENT & TOOLS*`);
      for (const tool of inventory.tools) {
        const equippedTag = tool.equipped ? ' `[EQUIPPED]`' : '';
        textSections.push(`${tool.emoji} *${tool.displayName}*${equippedTag}\n  \`${tool.durabilityBar}\` _(${tool.durability}/${tool.maxDurability})_`);
      }
    }
  }

  // Build Pagination & Navigation Keyboards
  const buttons = [];

  // Pagination row if multiple pages
  if (inventory.pagination.totalPages > 1) {
    const pageRow = [];
    const cur = inventory.pagination.currentPage;
    const total = inventory.pagination.totalPages;

    if (inventory.pagination.hasPrevPage) {
      pageRow.push(
        Markup.button.callback('◀️ Prev', encodeCallback({ action: 'nav_inventory', ownerId, targetId: String(cur - 1) }))
      );
    }

    pageRow.push(
      Markup.button.callback(`Page ${cur}/${total}`, encodeCallback({ action: 'noop', ownerId }))
    );

    if (inventory.pagination.hasNextPage) {
      pageRow.push(
        Markup.button.callback('Next ▶️', encodeCallback({ action: 'nav_inventory', ownerId, targetId: String(cur + 1) }))
      );
    }
    buttons.push(pageRow);
  }

  // Compact Action Row
  buttons.push([
    Markup.button.callback('🏪 Market', encodeCallback({ action: 'nav_market', ownerId })),
    Markup.button.callback('🔙 Back', encodeCallback({ action: 'nav_help', ownerId })),
    Markup.button.callback('❌ Close', encodeCallback({ action: 'nav_close', ownerId }))
  ]);

  const keyboard = Markup.inlineKeyboard(buttons);
  const text = textSections.join('\n');

  return { text, keyboard };
}

export default renderInventory;
