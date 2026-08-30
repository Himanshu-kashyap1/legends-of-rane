import crypto from 'crypto';
import { MarketOrder } from '../../models/MarketOrder.js';
import { User } from '../../models/User.js';
import { Item } from '../../models/Item.js';
import { logger } from '../../utils/logger.js';

const MAX_ACTIVE_LISTINGS_PER_PLAYER = 10;
const LISTING_DURATION_HOURS = 48;

/**
 * Creates a new marketplace listing and atomically escrows the listed items.
 *
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document or plain state object
 * @param {string} params.itemId - Item ID to sell
 * @param {number} params.quantity - Number of items to list
 * @param {number} params.pricePerUnit - Price per single item in coins
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>} Structured outcome
 */
export async function createMarketListing({ user, itemId, quantity, pricePerUnit, now = new Date() }) {
  if (!user) {
    return { success: false, reason: 'INVALID_USER' };
  }

  const cleanItemId = String(itemId || '').trim().toLowerCase();
  const qty = Math.floor(Number(quantity) || 0);
  const unitPrice = Math.floor(Number(pricePerUnit) || 0);

  if (qty <= 0) {
    return { success: false, reason: 'INVALID_QUANTITY', quantity: qty };
  }

  if (unitPrice <= 0) {
    return { success: false, reason: 'INVALID_PRICE', pricePerUnit: unitPrice };
  }

  // 1. Verify Item Exists in Catalog
  const itemDef = await Item.findOne({ itemId: cleanItemId }).lean();
  if (!itemDef) {
    return { success: false, reason: 'ITEM_NOT_FOUND', itemId: cleanItemId };
  }

  // 2. Check Active Listings Limit
  const activeCount = await MarketOrder.countDocuments({
    sellerId: String(user.telegramId),
    status: 'active'
  });

  if (activeCount >= MAX_ACTIVE_LISTINGS_PER_PLAYER) {
    return {
      success: false,
      reason: 'MAX_LISTINGS_REACHED',
      limit: MAX_ACTIVE_LISTINGS_PER_PLAYER
    };
  }

  // 3. Verify Seller Inventory
  user.inventory = user.inventory || [];
  const inventoryStack = user.inventory.find(i => i && i.itemId === cleanItemId);
  const ownedQty = inventoryStack?.quantity || 0;

  if (ownedQty < qty) {
    return {
      success: false,
      reason: 'INSUFFICIENT_INVENTORY',
      required: qty,
      owned: ownedQty,
      itemId: cleanItemId
    };
  }

  // 4. Atomically Escrow Items (Deduct from Seller Inventory)
  inventoryStack.quantity = ownedQty - qty;
  user.lastActiveAt = now;

  if (typeof user.save === 'function') {
    user.markModified('inventory');
    await user.save();
  }

  // 5. Create Order Document
  const totalPrice = qty * unitPrice;
  const expiresAt = new Date(now.getTime() + LISTING_DURATION_HOURS * 60 * 60 * 1000);
  const sellerName = user.username ? `@${user.username}` : user.firstName || 'Adventurer';

  const order = await MarketOrder.create({
    orderId: `ord_${crypto.randomUUID().slice(0, 10)}`,
    sellerId: String(user.telegramId),
    sellerName,
    itemId: cleanItemId,
    quantity: qty,
    pricePerUnit: unitPrice,
    totalPrice,
    status: 'active',
    escrowHeld: true,
    expiresAt
  });

  logger.info(`Player ${user.telegramId} listed ${qty}x ${cleanItemId} for ${totalPrice} coins [Order: ${order.orderId}]`);

  return {
    success: true,
    order,
    totalPrice,
    remainingQuantity: inventoryStack.quantity,
    itemDef
  };
}

/**
 * Cancels an active listing and atomically refunds the escrowed items to the seller.
 *
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document or plain state object
 * @param {string} params.orderId - Market Order ID
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>}
 */
export async function cancelMarketListing({ user, orderId, now = new Date() }) {
  if (!user || !orderId) {
    return { success: false, reason: 'INVALID_PARAMETERS' };
  }

  const sellerTelegramId = String(user.telegramId);

  // Atomically lock and cancel order if it is currently active
  const order = await MarketOrder.findOneAndUpdate(
    {
      orderId,
      sellerId: sellerTelegramId,
      status: 'active',
      escrowHeld: true
    },
    {
      $set: {
        status: 'cancelled',
        escrowHeld: false,
        cancelledAt: now
      }
    },
    { new: true }
  );

  if (!order) {
    // Check if order exists but belongs to someone else
    const existingOrder = await MarketOrder.findOne({ orderId }).lean();
    if (existingOrder && existingOrder.sellerId !== sellerTelegramId) {
      return { success: false, reason: 'UNAUTHORIZED_CANCELLATION' };
    }
    return { success: false, reason: 'ORDER_NOT_CANCELLABLE' };
  }

  // Atomically return escrowed items to Seller Inventory
  user.inventory = user.inventory || [];
  const existingStack = user.inventory.find(i => i && i.itemId === order.itemId);
  if (existingStack) {
    existingStack.quantity = (existingStack.quantity || 0) + order.quantity;
  } else {
    user.inventory.push({
      itemId: order.itemId,
      quantity: order.quantity
    });
  }
  user.lastActiveAt = now;

  if (typeof user.save === 'function') {
    user.markModified('inventory');
    await user.save();
  }

  logger.info(`Player ${sellerTelegramId} cancelled order ${orderId} (Returned ${order.quantity}x ${order.itemId})`);

  return {
    success: true,
    order,
    returnedQuantity: order.quantity,
    itemId: order.itemId
  };
}

/**
 * Executes an atomic purchase of a market listing with immediate seller payout (even if seller is offline).
 *
 * @param {Object} params
 * @param {Object} params.buyer - Mongoose User document or plain state object
 * @param {string} params.orderId - Market Order ID
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>}
 */
export async function purchaseMarketListing({ buyer, orderId, now = new Date() }) {
  if (!buyer || !orderId) {
    return { success: false, reason: 'INVALID_PARAMETERS' };
  }

  const buyerTelegramId = String(buyer.telegramId);

  // 1. Fetch Authoritative Order
  const order = await MarketOrder.findOne({ orderId }).lean();
  if (!order) {
    return { success: false, reason: 'ORDER_NOT_FOUND' };
  }

  if (order.status !== 'active' || !order.escrowHeld) {
    return { success: false, reason: 'LISTING_NO_LONGER_ACTIVE', status: order.status };
  }

  if (order.expiresAt && new Date(order.expiresAt).getTime() <= now.getTime()) {
    return { success: false, reason: 'LISTING_EXPIRED' };
  }

  // Cannot buy own listing
  if (order.sellerId === buyerTelegramId) {
    return { success: false, reason: 'CANNOT_BUY_OWN_LISTING' };
  }

  // 2. Validate Buyer Coins
  if ((buyer.coins || 0) < order.totalPrice) {
    return {
      success: false,
      reason: 'INSUFFICIENT_COINS',
      requiredCoins: order.totalPrice,
      currentCoins: buyer.coins || 0
    };
  }

  // 3. Atomically Lock Order (prevents race conditions / double purchase)
  const lockedOrder = await MarketOrder.findOneAndUpdate(
    {
      orderId,
      status: 'active',
      escrowHeld: true
    },
    {
      $set: {
        status: 'sold',
        escrowHeld: false,
        buyerId: buyerTelegramId,
        buyerName: buyer.username ? `@${buyer.username}` : buyer.firstName || 'Adventurer',
        soldAt: now
      }
    },
    { new: true }
  );

  if (!lockedOrder) {
    return { success: false, reason: 'LISTING_ALREADY_SOLD_OR_CANCELLED' };
  }

  // 4. Deduct Coins & Grant Items to Buyer
  buyer.coins = Math.max(0, (buyer.coins || 0) - order.totalPrice);
  buyer.inventory = buyer.inventory || [];
  const buyerStack = buyer.inventory.find(i => i && i.itemId === order.itemId);
  if (buyerStack) {
    buyerStack.quantity = (buyerStack.quantity || 0) + order.quantity;
  } else {
    buyer.inventory.push({
      itemId: order.itemId,
      quantity: order.quantity
    });
  }

  if (!buyer.statistics) buyer.statistics = {};
  buyer.statistics.marketTradesCompleted = (buyer.statistics.marketTradesCompleted || 0) + 1;
  buyer.lastActiveAt = now;

  if (typeof buyer.save === 'function') {
    buyer.markModified('coins');
    buyer.markModified('inventory');
    buyer.markModified('statistics');
    await buyer.save();
  }

  // 5. Immediate Payout to Seller (Handles Online & Offline Sellers Safely)
  await User.updateOne(
    { telegramId: order.sellerId },
    {
      $inc: {
        coins: order.totalPrice,
        'statistics.marketTradesCompleted': 1
      }
    }
  );

  logger.info(`Trade Complete: Buyer ${buyerTelegramId} bought ${order.quantity}x ${order.itemId} for ${order.totalPrice} coins from Seller ${order.sellerId}`);

  return {
    success: true,
    order: lockedOrder,
    coinsSpent: order.totalPrice,
    itemId: order.itemId,
    quantity: order.quantity,
    sellerId: order.sellerId,
    remainingCoins: buyer.coins
  };
}

/**
 * Browses active market listings with category and item filters, sorted by lowest unit price.
 *
 * @param {Object} params
 * @param {string} [params.category]
 * @param {string} [params.itemId]
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=4]
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<{ listings: Array, totalListings: number, totalPages: number, currentPage: number }>}
 */
export async function browseMarketListings({ category, itemId, page = 1, pageSize = 4, now = new Date() }) {
  const query = {
    status: 'active',
    escrowHeld: true,
    expiresAt: { $gt: now }
  };

  if (itemId) {
    query.itemId = itemId.toLowerCase().trim();
  } else if (category && category !== 'all') {
    const matchingItems = await Item.find({ category }).select('itemId').lean();
    query.itemId = { $in: matchingItems.map(i => i.itemId) };
  }

  const totalListings = await MarketOrder.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalListings / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, page));

  const listings = await MarketOrder.find(query)
    .sort({ pricePerUnit: 1, createdAt: -1 })
    .skip((currentPage - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return {
    listings,
    totalListings,
    totalPages,
    currentPage
  };
}

/**
 * Gets a player's active marketplace listings.
 * @param {string} sellerTelegramId
 * @returns {Promise<Array>}
 */
export async function getPlayerActiveListings(sellerTelegramId) {
  return MarketOrder.find({
    sellerId: String(sellerTelegramId),
    status: 'active'
  }).sort({ createdAt: -1 }).lean();
}

export default {
  createMarketListing,
  cancelMarketListing,
  purchaseMarketListing,
  browseMarketListings,
  getPlayerActiveListings
};
