import { Item } from '../models/Item.js';
import { formatProgressBar } from '../telegram/views/uiHelpers.js';

export const ITEMS_PER_PAGE = 6;

/**
 * In-memory item definition cache to avoid repeated DB lookups
 */
let itemCache = null;
let lastCacheFetch = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

async function getItemCatalog() {
  const now = Date.now();
  if (itemCache && now - lastCacheFetch < CACHE_TTL_MS) {
    return itemCache;
  }

  const items = await Item.find({}).lean();
  itemCache = new Map(items.map(it => [it.itemId, it]));
  lastCacheFetch = now;
  return itemCache;
}

/**
 * Builds structured inventory data for a player with pagination.
 * @param {Object} user - Mongoose User document
 * @param {number} [page=1] - 1-indexed page number
 * @param {number} [pageSize=ITEMS_PER_PAGE]
 * @returns {Promise<Object>}
 */
export async function getPlayerInventoryData(user, page = 1, pageSize = ITEMS_PER_PAGE) {
  if (!user) {
    throw new Error('User document is required to generate inventory data');
  }

  const catalog = await getItemCatalog();

  // 1. Process Stackable Items (filter out 0 quantity)
  const rawInventory = user.inventory || [];
  const stackableItems = rawInventory
    .filter(entry => entry && entry.quantity > 0)
    .map(entry => {
      const def = catalog.get(entry.itemId) || {
        itemId: entry.itemId,
        displayName: entry.itemId.replace(/_/g, ' '),
        emoji: '📦',
        category: 'raw_wood'
      };

      return {
        itemId: entry.itemId,
        displayName: def.displayName,
        emoji: def.emoji || '📦',
        category: def.category,
        quantity: entry.quantity
      };
    });

  // 2. Process Unique Tool Instances
  const rawTools = user.tools || [];
  const toolInstances = rawTools.map(tool => {
    const def = catalog.get(tool.toolId) || {
      displayName: tool.toolId.replace(/_/g, ' '),
      emoji: tool.toolType === 'axe' ? '🪓' : tool.toolType === 'pickaxe' ? '⛏️' : '🎣'
    };

    const durability = tool.durability ?? 0;
    const maxDurability = tool.maxDurability || 30;
    const durabilityPercent = Math.floor((durability / maxDurability) * 100);

    return {
      instanceId: tool.instanceId,
      toolId: tool.toolId,
      displayName: def.displayName,
      emoji: def.emoji || '🛠️',
      toolType: tool.toolType,
      tier: tool.tier,
      durability,
      maxDurability,
      durabilityPercent,
      durabilityBar: formatProgressBar(durability, maxDurability, 6),
      equipped: Boolean(tool.equipped)
    };
  });

  // 3. Compute Pagination on Stackable Items
  const totalStackables = stackableItems.length;
  const totalPages = Math.max(1, Math.ceil(totalStackables / pageSize));
  const safePage = Math.max(1, Math.min(totalPages, Math.floor(Number(page) || 1)));

  const startIndex = (safePage - 1) * pageSize;
  const paginatedItems = stackableItems.slice(startIndex, startIndex + pageSize);

  const isEmpty = totalStackables === 0 && toolInstances.length === 0;

  return {
    telegramId: user.telegramId,
    coins: user.coins || 0,
    isEmpty,
    items: paginatedItems,
    allItemCount: totalStackables,
    tools: toolInstances,
    pagination: {
      currentPage: safePage,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
      totalItems: totalStackables
    }
  };
}

export default {
  getPlayerInventoryData,
  ITEMS_PER_PAGE
};
