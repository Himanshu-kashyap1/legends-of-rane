import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  User,
  Item,
  Recipe,
  ResourceNode,
  Pet,
  Quest,
  Base,
  MarketOrder,
  BossRaid,
  GiftRecord
} from '../src/models/index.js';

test('Models: User schema validates required fields and default structures', () => {
  const user = new User({
    telegramId: '987654321',
    username: 'RaneHero',
    firstName: 'Hero'
  });

  assert.strictEqual(user.telegramId, '987654321');
  assert.strictEqual(user.coins, 100);
  assert.strictEqual(user.level, 1);
  assert.strictEqual(user.skills.woodcutting.level, 1);
  assert.strictEqual(user.skills.mining.level, 1);
  assert.strictEqual(user.skills.crafting.level, 1);
  assert.strictEqual(user.skills.fishing.level, 1);
  assert.strictEqual(user.skills.exploration.level, 1);
  assert.ok(Array.isArray(user.inventory));
  assert.ok(Array.isArray(user.tools));
  assert.ok(Array.isArray(user.pets));
  assert.ok(Array.isArray(user.quests));

  // Validation should pass for valid user
  const validationError = user.validateSync();
  assert.strictEqual(validationError, undefined);
});

test('Models: User schema prevents negative coins and negative durability', () => {
  const invalidUser = new User({
    telegramId: '111222',
    coins: -50,
    tools: [
      {
        toolId: 'tool_axe_wood',
        toolType: 'axe',
        tier: 1,
        durability: -5,
        maxDurability: 30
      }
    ]
  });

  const err = invalidUser.validateSync();
  assert.ok(err);
  assert.ok(err.errors['coins']);
  assert.ok(err.errors['tools.0.durability']);
});

test('Models: Unique Tool instances have independent instanceId', () => {
  const user = new User({
    telegramId: '333444',
    tools: [
      { toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 30, maxDurability: 30, equipped: true },
      { toolId: 'tool_axe_wood', toolType: 'axe', tier: 1, durability: 15, maxDurability: 30, equipped: false }
    ]
  });

  assert.strictEqual(user.tools.length, 2);
  assert.ok(user.tools[0].instanceId);
  assert.ok(user.tools[1].instanceId);
  assert.notStrictEqual(user.tools[0].instanceId, user.tools[1].instanceId);
  assert.strictEqual(user.tools[0].durability, 30);
  assert.strictEqual(user.tools[1].durability, 15);
});

test('Models: Item schema requires valid category and non-negative basePrice', () => {
  const validItem = new Item({
    itemId: 'wood_oak',
    displayName: 'Oak Wood',
    category: 'raw_wood',
    tier: 1,
    basePrice: 5
  });
  assert.strictEqual(validItem.validateSync(), undefined);

  const invalidItem = new Item({
    itemId: 'wood_oak',
    displayName: 'Oak Wood',
    category: 'invalid_category_xyz',
    basePrice: -10
  });
  const err = invalidItem.validateSync();
  assert.ok(err);
  assert.ok(err.errors['category']);
  assert.ok(err.errors['basePrice']);
});

test('Models: MarketOrder validates quantity, price, and default status', () => {
  const order = new MarketOrder({
    sellerId: '987654321',
    itemId: 'wood_oak',
    quantity: 10,
    pricePerUnit: 5,
    totalPrice: 50
  });

  assert.strictEqual(order.status, 'active');
  assert.strictEqual(order.escrowHeld, true);
  assert.ok(order.orderId.startsWith('ord_'));
  assert.strictEqual(order.validateSync(), undefined);

  const invalidOrder = new MarketOrder({
    sellerId: '987654321',
    itemId: 'wood_oak',
    quantity: 0,
    pricePerUnit: -5,
    totalPrice: 0
  });
  const err = invalidOrder.validateSync();
  assert.ok(err);
  assert.ok(err.errors['quantity']);
  assert.ok(err.errors['pricePerUnit']);
});

test('Models: Base validates grid bounds and block coordinates', () => {
  const base = new Base({
    telegramId: '987654321',
    gridSize: 24,
    blocks: [
      { x: 0, y: 0, z: 0, blockType: 'grass' },
      { x: 12, y: 5, z: -10, blockType: 'oak_wood' }
    ]
  });
  assert.strictEqual(base.validateSync(), undefined);

  const invalidBase = new Base({
    telegramId: '987654321',
    blocks: [
      { x: 50, y: -10, z: 100, blockType: 'grass' } // Exceeds grid and out-of-bounds negative y
    ]
  });
  const err = invalidBase.validateSync();
  assert.ok(err);
  assert.ok(err.errors['blocks.0.x']);
  assert.ok(err.errors['blocks.0.y']);
  assert.ok(err.errors['blocks.0.z']);
});

test('Models: BossRaid validates HP and participant damage tracking', () => {
  const raid = new BossRaid({
    chatId: '-100123456789',
    chatTitle: 'Rane Guild Alpha',
    currentHp: 5000,
    maxHp: 5000,
    participants: [
      { telegramId: '123', username: 'Knight1', damageDealt: 250, attackCount: 3 }
    ]
  });

  assert.strictEqual(raid.status, 'active');
  assert.ok(raid.bossInstanceId.startsWith('raid_'));
  assert.strictEqual(raid.validateSync(), undefined);
});

test('Models: GiftRecord enforces sender, recipient, and positive quantity', () => {
  const gift = new GiftRecord({
    senderId: '111',
    senderUsername: 'Alice',
    recipientId: '222',
    recipientUsername: 'Bob',
    itemId: 'wood_oak',
    quantity: 5
  });

  assert.ok(gift.giftId.startsWith('gift_'));
  assert.strictEqual(gift.validateSync(), undefined);

  const invalidGift = new GiftRecord({
    senderId: '111',
    recipientId: '222',
    itemId: 'wood_oak',
    quantity: 0
  });
  const err = invalidGift.validateSync();
  assert.ok(err);
  assert.ok(err.errors['quantity']);
});
