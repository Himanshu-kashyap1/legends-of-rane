import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { browseMarketListings, getPlayerActiveListings } from '../../engine/economy/marketEngine.js';
import { MarketOrder } from '../../models/MarketOrder.js';
import { Item } from '../../models/Item.js';
import { formatNumber } from './uiHelpers.js';

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
 * Screen 1: Marketplace Main Hub (/market)
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderMarketHub(user) {
  const ownerId = String(user.telegramId);

  const text = [
    `🏪 *GRAND REALM MARKETPLACE* 🏪`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Decentralized player trading exchange._`,
    '',
    `🪙 *Treasury:* ${formatNumber(user.coins || 0)} Coins`,
    `📦 *Trades Completed:* ${user.statistics?.marketTradesCompleted || 0}`,
    '',
    `_Option select karo:_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🛒 Browse Market', encodeCallback({ action: 'mkt_cats', ownerId })),
      Markup.button.callback('📦 My Listings', encodeCallback({ action: 'mkt_my_orders', ownerId }))
    ],
    [
      Markup.button.callback('🏷️ How to Sell', encodeCallback({ action: 'mkt_help_sell', ownerId })),
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 2: Category Filter Selection
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderMarketCategories(user) {
  const ownerId = String(user.telegramId);

  const text = [
    `🛒 *BROWSE MARKET CATEGORIES*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Category select karke listings browse karo:_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🪵 Raw Lumber', encodeCallback({ action: 'mkt_browse', ownerId, targetId: 'raw_wood:1' })),
      Markup.button.callback('🪨 Minerals & Ores', encodeCallback({ action: 'mkt_browse', ownerId, targetId: 'raw_ore:1' }))
    ],
    [
      Markup.button.callback('🔩 Refined Ingots', encodeCallback({ action: 'mkt_browse', ownerId, targetId: 'refined_ingot:1' })),
      Markup.button.callback('📦 All Listings', encodeCallback({ action: 'mkt_browse', ownerId, targetId: 'all:1' }))
    ],
    [
      Markup.button.callback('⬅️ Back to Hub', encodeCallback({ action: 'nav_market', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 3: Paginated Listing Browse
 * @param {Object} user
 * @param {string} category
 * @param {number} page
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderMarketListings(user, category = 'all', page = 1) {
  const ownerId = String(user.telegramId);
  const { listings, totalListings, totalPages, currentPage } = await browseMarketListings({
    category,
    page,
    pageSize: 4
  });

  const categoryTitle = category === 'all' ? 'ALL REALM LISTINGS' : `${category.toUpperCase().replace(/_/g, ' ')}`;

  const textLines = [
    `🛒 *${categoryTitle}* (Page ${currentPage}/${totalPages})`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Select an offer to inspect and buy:_`,
    ''
  ];

  if (listings.length === 0) {
    textLines.push(`_Is category mein koi active listings nahi hain._`);
  }

  const listingButtons = [];
  for (const ord of listings) {
    const itemInfo = await getItemInfo(ord.itemId);
    const label = `${itemInfo.emoji} ${ord.quantity}x ${itemInfo.displayName} • ${ord.totalPrice}c`;
    listingButtons.push(
      Markup.button.callback(
        label,
        encodeCallback({ action: 'mkt_detail', ownerId, targetId: ord.orderId })
      )
    );
  }

  const keyboardRows = [];
  for (let i = 0; i < listingButtons.length; i += 2) {
    keyboardRows.push(listingButtons.slice(i, i + 2));
  }

  // Pagination Controls
  if (totalPages > 1) {
    const navRow = [];
    if (currentPage > 1) {
      navRow.push(Markup.button.callback('◀️ Prev', encodeCallback({ action: 'mkt_browse', ownerId, targetId: `${category}:${currentPage - 1}` })));
    }
    navRow.push(Markup.button.callback(`• ${currentPage}/${totalPages} •`, encodeCallback({ action: 'noop', ownerId })));
    if (currentPage < totalPages) {
      navRow.push(Markup.button.callback('Next ▶️', encodeCallback({ action: 'mkt_browse', ownerId, targetId: `${category}:${currentPage + 1}` })));
    }
    keyboardRows.push(navRow);
  }

  keyboardRows.push([
    Markup.button.callback('⬅️ Back to Categories', encodeCallback({ action: 'mkt_cats', ownerId }))
  ]);

  return { text: textLines.join('\n'), keyboard: Markup.inlineKeyboard(keyboardRows) };
}

/**
 * Screen 4: Listing Details & Buy Confirmation
 * @param {Object} user
 * @param {string} orderId
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderListingDetails(user, orderId) {
  const ownerId = String(user.telegramId);
  const order = await MarketOrder.findOne({ orderId }).lean();

  if (!order || order.status !== 'active') {
    return {
      text: `⚠️ *Listing ab active nahi hai ya already sell ho chuki hai.*`,
      keyboard: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back to Market', encodeCallback({ action: 'mkt_cats', ownerId }))]])
    };
  }

  const itemInfo = await getItemInfo(order.itemId);
  const isOwnListing = order.sellerId === ownerId;
  const canAfford = (user.coins || 0) >= order.totalPrice;
  const coinsCheck = canAfford ? '✅' : '❌';

  const text = [
    `🏷️ *MARKET ORDER — ${itemInfo.displayName.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📦 *Item:* ${itemInfo.emoji} ${itemInfo.displayName}`,
    `🔢 *Quantity:* ${order.quantity} units in escrow`,
    `💰 *Unit Price:* ${order.pricePerUnit} Coins each`,
    `🪙 *Total Price:* *${order.totalPrice} Coins*`,
    `👤 *Merchant:* ${order.sellerName}`,
    '',
    `💳 *Your Treasury:* ${formatNumber(user.coins || 0)} Coins ${coinsCheck}`,
    '',
    isOwnListing
      ? `_Yeh aapki apni listing hai. Aap isse cancel kar sakte hain._`
      : canAfford
        ? `_Kya aap is trade ko confirm karna chahte hain?_`
        : `⚠️ *Sufficient coins available nahi hain.*`
  ].join('\n');

  const actionButtons = [];
  if (isOwnListing) {
    actionButtons.push(Markup.button.callback('🚫 Cancel Listing', encodeCallback({ action: 'mkt_cancel_do', ownerId, targetId: order.orderId })));
  } else if (canAfford) {
    actionButtons.push(Markup.button.callback('✅ Buy Now', encodeCallback({ action: 'mkt_buy_do', ownerId, targetId: order.orderId })));
  }
  actionButtons.push(Markup.button.callback('⬅️ Back', encodeCallback({ action: 'mkt_cats', ownerId })));

  const keyboard = Markup.inlineKeyboard([actionButtons]);

  return { text, keyboard };
}

/**
 * Screen 5: Player Active Listings Management
 * @param {Object} user
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderMyListingsView(user) {
  const ownerId = String(user.telegramId);
  const listings = await getPlayerActiveListings(ownerId);

  const textLines = [
    `📦 *YOUR ACTIVE MARKET LISTINGS* (${listings.length}/10)`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Listings currently held in marketplace escrow:_`,
    ''
  ];

  if (listings.length === 0) {
    textLines.push(
      `_Aapke paas koi active market listing nahi hai._`,
      `_Sell karne ke liye command use karein:_ \`/sell <item> <qty> <price>\``
    );
  }

  const buttons = [];
  for (const ord of listings) {
    const itemInfo = await getItemInfo(ord.itemId);
    buttons.push(
      Markup.button.callback(
        `🚫 Cancel ${ord.quantity}x ${itemInfo.displayName}`,
        encodeCallback({ action: 'mkt_cancel_do', ownerId, targetId: ord.orderId })
      )
    );
  }

  const keyboardRows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    keyboardRows.push(buttons.slice(i, i + 2));
  }

  keyboardRows.push([
    Markup.button.callback('🏷️ How to Sell', encodeCallback({ action: 'mkt_help_sell', ownerId })),
    Markup.button.callback('⬅️ Back to Hub', encodeCallback({ action: 'nav_market', ownerId }))
  ]);

  return { text: textLines.join('\n'), keyboard: Markup.inlineKeyboard(keyboardRows) };
}

/**
 * Screen 6: Help on Selling Items
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderHelpSellView(user) {
  const ownerId = String(user.telegramId);

  const text = [
    `🏷️ *HOW TO SELL ITEMS ON MARKET*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Aap apne inventory ka koi bhi item marketplace par sell kar sakte hain!`,
    '',
    `📌 *Command Syntax:*`,
    `\`/sell <itemId> <quantity> <pricePerUnit>\``,
    '',
    `💡 *Examples:*`,
    `• \`/sell wood_oak 10 5\` (10 Oak Wood at 5c each = 50 coins total)`,
    `• \`/sell ingot_iron 2 30\` (2 Iron Ingots at 30c each = 60 coins total)`,
    '',
    `🛡️ *Escrow Guarantee:*`,
    `Jab tak item sell nahi hota, woh marketplace escrow mein secure rehta hai.`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📦 My Listings', encodeCallback({ action: 'mkt_my_orders', ownerId })),
      Markup.button.callback('⬅️ Back to Hub', encodeCallback({ action: 'nav_market', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 7: Action Outcome View
 * @param {Object} user
 * @param {Object} result
 * @param {'buy'|'cancel'|'sell'} type
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderMarketResultView(user, result, type) {
  const ownerId = String(user.telegramId);

  if (!result.success) {
    const errorMessages = {
      INSUFFICIENT_COINS: `🪙 *Coins kam hain!* Required: ${result.requiredCoins}c, Current: ${result.currentCoins}c.`,
      INSUFFICIENT_INVENTORY: `📦 *Inventory mein enough quantity nahi hai.* Required: ${result.required}, Owned: ${result.owned}.`,
      LISTING_ALREADY_SOLD_OR_CANCELLED: `⚠️ *Yeh listing already sell ho chuki hai ya cancel kar di gayi.*`,
      CANNOT_BUY_OWN_LISTING: `🚫 *Aap apni hi listing ko buy nahi kar sakte.*`,
      MAX_LISTINGS_REACHED: `⚠️ *Maximum 10 active listings allow hain.*`,
      UNAUTHORIZED_CANCELLATION: `⛔ *Aap sirf apni hi listings cancel kar sakte hain.*`,
      ITEM_NOT_FOUND: `⚠️ *Unknown item identifier.*`,
      INVALID_QUANTITY: `⚠️ *Quantity positive integer honi chahiye.*`,
      INVALID_PRICE: `⚠️ *Price positive integer hona chahiye.*`
    };

    const text = [
      `⚠️ *MARKETPLACE ACTION FAILED*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      errorMessages[result.reason] || `Transaction nahi ho payi: ${result.reason}`
    ].join('\n');

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('⬅️ Back to Market', encodeCallback({ action: 'mkt_cats', ownerId }))
      ]
    ]);

    return { text, keyboard };
  }

  // Successful Outcome
  let header = '';
  let desc = '';

  if (type === 'buy') {
    const itemInfo = await getItemInfo(result.itemId);
    header = `🎉 *MARKET PURCHASE COMPLETE!*`;
    desc = `✅ Purchased *${result.quantity}x ${itemInfo.displayName}* for *${result.coinsSpent} Coins*!\n_Coins merchant ko transfer ho gaye aur item backpack mein add ho gaya._`;
  } else if (type === 'cancel') {
    const itemInfo = await getItemInfo(result.itemId);
    header = `📦 *LISTING CANCELLED!*`;
    desc = `✅ Listing removed. *${result.returnedQuantity}x ${itemInfo.displayName}* backpack mein wapas aa gaye.`;
  } else if (type === 'sell') {
    const itemInfo = await getItemInfo(result.order.itemId);
    header = `🏷️ *ITEM LISTED ON MARKETPLACE!*`;
    desc = `✅ *${result.order.quantity}x ${itemInfo.displayName}* listed for *${result.totalPrice} Coins* (${result.order.pricePerUnit}c each).\n_Item market escrow mein hold ho gaya hai._`;
  }

  const text = [
    header,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    desc,
    '',
    `🪙 *Remaining Balance:* ${formatNumber(user.coins || 0)} Coins`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🛒 Browse More', encodeCallback({ action: 'mkt_cats', ownerId })),
      Markup.button.callback('📦 My Listings', encodeCallback({ action: 'mkt_my_orders', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderMarketHub,
  renderMarketCategories,
  renderMarketListings,
  renderListingDetails,
  renderMyListingsView,
  renderHelpSellView,
  renderMarketResultView
};
