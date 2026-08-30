import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { MarketOrder } from '../src/models/MarketOrder.js';
import {
  createMarketListing,
  cancelMarketListing,
  purchaseMarketListing,
  browseMarketListings
} from '../src/engine/economy/marketEngine.js';
import { actionLockMiddleware, isLocked, clearAllLocks } from '../src/telegram/middlewares/actionLock.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { encodeCallback } from '../src/telegram/buttons/callbackData.js';
import { UnauthorizedError, ConcurrencyError } from '../src/utils/errors.js';

test.before(async () => {
  await connectDatabase();
  await Item.updateOne({ itemId: 'wood_oak' }, { $set: { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', basePrice: 5 } }, { upsert: true });
  await Item.updateOne({ itemId: 'ingot_iron' }, { $set: { itemId: 'ingot_iron', displayName: 'Iron Ingot', emoji: '🔩', category: 'refined_ingot', basePrice: 35 } }, { upsert: true });
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['seller_1', 'buyer_1', 'buyer_2', 'third_party'] } });
  await MarketOrder.deleteMany({ sellerId: { $in: ['seller_1', 'buyer_1', 'third_party'] } });
  await disconnectDatabase();
  clearAllLocks();
});

test('1. Valid listing creation: escrow deduction from seller inventory', async () => {
  const seller = await User.create({
    telegramId: 'seller_1',
    username: 'rich_seller',
    coins: 100,
    inventory: [{ itemId: 'wood_oak', quantity: 20 }]
  });

  const res = await createMarketListing({
    user: seller,
    itemId: 'wood_oak',
    quantity: 10,
    pricePerUnit: 5
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.totalPrice, 50);
  assert.strictEqual(seller.inventory.find(i => i.itemId === 'wood_oak').quantity, 10); // 20 - 10 = 10

  const savedOrder = await MarketOrder.findOne({ orderId: res.order.orderId });
  assert.ok(savedOrder);
  assert.strictEqual(savedOrder.status, 'active');
  assert.strictEqual(savedOrder.escrowHeld, true);
  assert.strictEqual(savedOrder.quantity, 10);
  assert.strictEqual(savedOrder.totalPrice, 50);
});

test('2, 3, 4. Insufficient inventory, invalid quantity, and non-existent item validations', async () => {
  const seller = await User.findOne({ telegramId: 'seller_1' });

  // Insufficient Inventory (has 10, requests 50)
  const res1 = await createMarketListing({ user: seller, itemId: 'wood_oak', quantity: 50, pricePerUnit: 5 });
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.reason, 'INSUFFICIENT_INVENTORY');

  // Invalid quantity (0)
  const res2 = await createMarketListing({ user: seller, itemId: 'wood_oak', quantity: 0, pricePerUnit: 5 });
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.reason, 'INVALID_QUANTITY');

  // Non-existent item
  const res3 = await createMarketListing({ user: seller, itemId: 'fake_crystal_99', quantity: 5, pricePerUnit: 10 });
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.reason, 'ITEM_NOT_FOUND');
});

test('6. Atomic purchase: buyer coins deducted, offline seller credited, escrow transferred', async () => {
  const buyer = await User.create({
    telegramId: 'buyer_1',
    username: 'eager_buyer',
    coins: 100,
    inventory: []
  });

  const activeOrder = await MarketOrder.findOne({ sellerId: 'seller_1', status: 'active' });
  assert.ok(activeOrder);

  const buyRes = await purchaseMarketListing({
    buyer,
    orderId: activeOrder.orderId
  });

  assert.strictEqual(buyRes.success, true);
  assert.strictEqual(buyRes.coinsSpent, 50);
  assert.strictEqual(buyer.coins, 50); // 100 - 50
  assert.strictEqual(buyer.inventory.find(i => i.itemId === 'wood_oak').quantity, 10);

  // Verify Seller Payout in MongoDB (Offline Seller receives coins)
  const updatedSeller = await User.findOne({ telegramId: 'seller_1' });
  assert.strictEqual(updatedSeller.coins, 150); // 100 + 50 = 150

  // Verify Order Status
  const completedOrder = await MarketOrder.findOne({ orderId: activeOrder.orderId });
  assert.strictEqual(completedOrder.status, 'sold');
  assert.strictEqual(completedOrder.escrowHeld, false);
  assert.strictEqual(completedOrder.buyerId, 'buyer_1');
});

test('7, 8. Insufficient coins and buying own listing are prevented', async () => {
  const seller = await User.findOne({ telegramId: 'seller_1' });

  // Create another listing
  const listRes = await createMarketListing({
    user: seller,
    itemId: 'wood_oak',
    quantity: 5,
    pricePerUnit: 10 // 50 coins total
  });
  assert.strictEqual(listRes.success, true);

  // 1. Seller cannot buy own listing
  const ownRes = await purchaseMarketListing({ buyer: seller, orderId: listRes.order.orderId });
  assert.strictEqual(ownRes.success, false);
  assert.strictEqual(ownRes.reason, 'CANNOT_BUY_OWN_LISTING');

  // 2. Poor Buyer with insufficient coins
  const poorBuyer = await User.create({
    telegramId: 'buyer_2',
    coins: 10, // Needs 50
    inventory: []
  });
  const poorRes = await purchaseMarketListing({ buyer: poorBuyer, orderId: listRes.order.orderId });
  assert.strictEqual(poorRes.success, false);
  assert.strictEqual(poorRes.reason, 'INSUFFICIENT_COINS');
  assert.strictEqual(poorBuyer.coins, 10); // Untouched
});

test('9. Concurrent double-purchase attempt only allows one buyer to succeed', async () => {
  const seller = await User.findOne({ telegramId: 'seller_1' });
  const buyer1 = await User.findOne({ telegramId: 'buyer_1' });
  buyer1.coins = 500;
  await buyer1.save();

  const buyer2 = await User.findOne({ telegramId: 'buyer_2' });
  buyer2.coins = 500;
  await buyer2.save();

  // Create single active listing
  const listRes = await createMarketListing({ user: seller, itemId: 'wood_oak', quantity: 5, pricePerUnit: 10 });
  const orderId = listRes.order.orderId;

  // Run simultaneous purchases
  const [res1, res2] = await Promise.all([
    purchaseMarketListing({ buyer: buyer1, orderId }),
    purchaseMarketListing({ buyer: buyer2, orderId })
  ]);

  const successCount = (res1.success ? 1 : 0) + (res2.success ? 1 : 0);
  assert.strictEqual(successCount, 1); // Exactly one succeeds
});

test('10, 11. Listing cancellation refunds escrow to seller and rejects unauthorized cancellation', async () => {
  const seller = await User.findOne({ telegramId: 'seller_1' });
  seller.inventory = [{ itemId: 'wood_oak', quantity: 20 }];
  await seller.save();

  const listRes = await createMarketListing({ user: seller, itemId: 'wood_oak', quantity: 15, pricePerUnit: 5 });
  const orderId = listRes.order.orderId;

  // Unauthorized cancellation attempt by third-party
  const hacker = { telegramId: 'third_party' };
  const hackRes = await cancelMarketListing({ user: hacker, orderId });
  assert.strictEqual(hackRes.success, false);
  assert.strictEqual(hackRes.reason, 'UNAUTHORIZED_CANCELLATION');

  // Authorized cancellation by seller
  const cancelRes = await cancelMarketListing({ user: seller, orderId });
  assert.strictEqual(cancelRes.success, true);
  assert.strictEqual(seller.inventory.find(i => i.itemId === 'wood_oak').quantity, 20); // 5 + 15 refunded = 20

  const cancelledOrder = await MarketOrder.findOne({ orderId });
  assert.strictEqual(cancelledOrder.status, 'cancelled');
  assert.strictEqual(cancelledOrder.escrowHeld, false);
});

test('12. Expired listings cannot be purchased', async () => {
  const seller = await User.findOne({ telegramId: 'seller_1' });
  const buyer = await User.findOne({ telegramId: 'buyer_1' });

  const listRes = await createMarketListing({ user: seller, itemId: 'wood_oak', quantity: 2, pricePerUnit: 5 });
  const orderId = listRes.order.orderId;

  // Manually backdate expiration to 1 hour ago
  await MarketOrder.updateOne({ orderId }, { $set: { expiresAt: new Date(Date.now() - 3600000) } });

  const buyRes = await purchaseMarketListing({ buyer, orderId });
  assert.strictEqual(buyRes.success, false);
  assert.strictEqual(buyRes.reason, 'LISTING_EXPIRED');
});

test('14. OwnershipGuard protects marketplace callbacks from third-party players', async () => {
  const playerA = '111111';
  const playerB = '222222';

  const callbackData = encodeCallback({ action: 'mkt_buy_do', ownerId: playerA, targetId: 'ord_123' });

  const ctxB = {
    from: { id: playerB },
    callbackQuery: { data: callbackData },
    answerCbQuery: async () => {},
    state: {}
  };

  let rejected = false;
  try {
    await ownershipGuardMiddleware(ctxB, async () => {});
  } catch (err) {
    if (err instanceof UnauthorizedError) rejected = true;
  }

  assert.strictEqual(rejected, true);
});

test('15. Category browsing and pagination', async () => {
  const { listings, totalPages } = await browseMarketListings({ category: 'all', page: 1, pageSize: 4 });
  assert.ok(Array.isArray(listings));
  assert.ok(totalPages >= 1);
});
