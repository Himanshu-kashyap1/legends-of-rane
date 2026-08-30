import crypto from 'crypto';
import { User } from '../../models/User.js';
import { logger } from '../../utils/logger.js';

/**
 * Creates default starting attributes for a brand new adventurer.
 */
export function getNewPlayerDefaults(from) {
  const axeInstanceId = `tool_${crypto.randomUUID().slice(0, 8)}`;
  const pickaxeInstanceId = `tool_${crypto.randomUUID().slice(0, 8)}`;

  return {
    telegramId: String(from.id),
    username: from.username || '',
    firstName: from.first_name || '',
    lastName: from.last_name || '',
    coins: 100,
    level: 1,
    xp: 0,
    title: 'Novice Adventurer',
    energy: {
      current: 100,
      max: 100,
      lastRegen: new Date()
    },
    skills: {
      woodcutting: { level: 1, xp: 0 },
      mining: { level: 1, xp: 0 },
      crafting: { level: 1, xp: 0 },
      fishing: { level: 1, xp: 0 },
      exploration: { level: 1, xp: 0 }
    },
    inventory: [
      { itemId: 'wood_oak', quantity: 5 },
      { itemId: 'stone_granite', quantity: 5 }
    ],
    tools: [
      {
        instanceId: axeInstanceId,
        toolId: 'tool_axe_wood',
        toolType: 'axe',
        tier: 1,
        durability: 30,
        maxDurability: 30,
        equipped: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        instanceId: pickaxeInstanceId,
        toolId: 'tool_pickaxe_wood',
        toolType: 'pickaxe',
        tier: 1,
        durability: 30,
        maxDurability: 30,
        equipped: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    equippedTools: {
      axeInstanceId,
      pickaxeInstanceId,
      rodInstanceId: null
    },
    pets: [],
    activePet: null,
    quests: [],
    gifting: {
      dailySentCount: 0,
      lastGiftDate: ''
    },
    offline: {
      lastLogoutAt: new Date(),
      unclaimedCoins: 0,
      unclaimedResources: []
    },
    statistics: {
      gatheredCount: 0,
      craftedCount: 0,
      bossDamageDealt: 0,
      marketTradesCompleted: 0,
      giftsSent: 0,
      blocksPlaced: 0,
      blocksBroken: 0
    },
    lastActiveAt: new Date()
  };
}

/**
 * User Loader Middleware
 * Automatically finds or registers the player in MongoDB and populates ctx.state.
 */
export async function userLoaderMiddleware(ctx, next) {
  ctx.state = ctx.state || {};

  const from = ctx.from;
  const chat = ctx.chat;

  ctx.state.telegramUser = from || null;
  ctx.state.chat = chat || null;
  ctx.state.isPrivate = chat?.type === 'private';
  ctx.state.isGroup = chat?.type === 'group' || chat?.type === 'supergroup';

  if (!from || !from.id) {
    ctx.state.user = null;
    return next();
  }

  const telegramId = String(from.id);

  try {
    // Check if user exists first
    let user = await User.findOne({ telegramId });

    if (!user) {
      // Concurrency-safe registration via atomic findOneAndUpdate with upsert
      const initialData = getNewPlayerDefaults(from);
      user = await User.findOneAndUpdate(
        { telegramId },
        { $setOnInsert: initialData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      logger.info(`✨ Registered new player [ID: ${telegramId}, Username: @${from.username || 'none'}]`);
    } else {
      // Idempotently update activity timestamp & sync username changes
      user.lastActiveAt = new Date();
      if (from.username && user.username !== from.username) {
        user.username = from.username;
      }
      if (from.first_name && user.firstName !== from.first_name) {
        user.firstName = from.first_name;
      }
      await user.save();
    }

    ctx.state.user = user;
  } catch (err) {
    logger.error(`UserLoaderMiddleware failed for telegramId=${telegramId}:`, err);
    throw err;
  }

  return next();
}

export default userLoaderMiddleware;
