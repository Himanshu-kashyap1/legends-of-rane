import crypto from 'crypto';
import { User } from '../../models/User.js';
import { MONSTER_CATALOG, WEAPON_PROGRESSION, HUNTING_BIOMES } from './huntingConfig.js';
import { addPlayerXp } from '../progression/progressionEngine.js';
import { logger } from '../../utils/logger.js';

// In-memory combat session store (nonce -> sessionData) with TTL cleanup
const activeSessions = new Map();

// Session expiry (3 minutes)
const SESSION_TTL_MS = 3 * 60 * 1000;

function cleanupStaleSessions() {
  const now = Date.now();
  for (const [nonce, session] of activeSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      activeSessions.delete(nonce);
    }
  }
}

setInterval(cleanupStaleSessions, 60000).unref();

/**
 * Loads complete player hunting state and equipment profile.
 *
 * @param {string|number} telegramId
 * @returns {Promise<Object>}
 */
export async function getPlayerHuntingState(telegramId) {
  if (!telegramId) throw new Error('telegramId is required');
  const strId = String(telegramId);

  let user = await User.findOne({ telegramId: strId });
  if (!user) {
    user = new User({
      telegramId: strId,
      username: `hunter_${strId.slice(-4)}`,
      firstName: 'Hunter'
    });
    await user.save();
  }

  // Determine current equipped weapon or default to tier 1
  const equippedWeaponId = user.equippedWeapon || 'wpn_wood_blade';
  const weaponData = WEAPON_PROGRESSION[equippedWeaponId] || WEAPON_PROGRESSION.wpn_wood_blade;

  // Compute player max HP based on Level (Base 100 + 20 per level)
  const maxHp = 100 + (user.level - 1) * 20;

  // Build inventory map for quick client lookup
  const inventoryMap = {};
  for (const item of (user.inventory || [])) {
    inventoryMap[item.itemId] = (inventoryMap[item.itemId] || 0) + item.quantity;
  }

  return {
    telegramId: strId,
    name: user.firstName || user.username || 'Hunter',
    level: user.level || 1,
    xp: user.xp || 0,
    coins: user.coins || 0,
    maxHp,
    currentHp: maxHp,
    equippedWeapon: weaponData,
    inventory: user.inventory || [],
    inventoryMap,
    availableWeapons: Object.values(WEAPON_PROGRESSION).map(w => ({
      ...w,
      canCraft: user.level >= w.levelRequired && w.cost.every(c => (inventoryMap[c.itemId] || 0) >= c.quantity),
      isEquipped: w.id === equippedWeaponId
    }))
  };
}

/**
 * Creates an authoritative combat encounter session token.
 *
 * @param {Object} params
 * @param {string|number} params.telegramId
 * @param {string} params.monsterId
 * @returns {Promise<Object>}
 */
export async function createCombatSession({ telegramId, monsterId }) {
  if (!telegramId || !monsterId) {
    throw new Error('telegramId and monsterId are required');
  }

  const monster = MONSTER_CATALOG[monsterId];
  if (!monster) {
    throw new Error(`Monster '${monsterId}' not found in catalog`);
  }

  const sessionNonce = crypto.randomBytes(16).toString('hex');
  const now = Date.now();

  const session = {
    nonce: sessionNonce,
    telegramId: String(telegramId),
    monsterId,
    createdAt: now,
    monsterHp: monster.maxHp
  };

  activeSessions.set(sessionNonce, session);

  return {
    sessionToken: sessionNonce,
    monster: {
      id: monster.id,
      name: monster.name,
      level: monster.level,
      maxHp: monster.maxHp,
      attackPower: monster.attackPower,
      defense: monster.defense
    },
    serverTime: now
  };
}

/**
 * Claims monster kill rewards with server-side validation.
 *
 * @param {Object} params
 * @param {string|number} params.telegramId
 * @param {string} params.sessionToken
 * @param {string} params.monsterId
 * @param {number} [params.timeTakenMs=1000]
 * @returns {Promise<Object>}
 */
export async function claimMonsterKill({
  telegramId,
  sessionToken,
  monsterId,
  timeTakenMs = 1000
}) {
  const strId = String(telegramId);
  const session = activeSessions.get(sessionToken);

  if (!session) {
    throw new Error('INVALID_OR_EXPIRED_SESSION');
  }

  if (session.telegramId !== strId || session.monsterId !== monsterId) {
    throw new Error('SESSION_MISMATCH');
  }

  // Consume session immediately to prevent replay / duplicate claims
  activeSessions.delete(sessionToken);

  const monster = MONSTER_CATALOG[monsterId];
  if (!monster) {
    throw new Error('UNKNOWN_MONSTER');
  }

  // Validate user in DB
  const user = await User.findOne({ telegramId: strId });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // 1. Calculate Coin Reward
  const minCoins = monster.coinReward[0];
  const maxCoins = monster.coinReward[1];
  const coinsEarned = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;

  // 2. Calculate XP Reward and Level Up Progression
  const xpEarned = monster.xpReward;
  const xpProgression = addPlayerXp(user, xpEarned);

  // 3. Roll Item Drops
  const itemsEarned = [];
  user.inventory = Array.isArray(user.inventory) ? user.inventory : [];

  for (const drop of monster.drops) {
    if (Math.random() <= drop.chance) {
      const qty = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
      itemsEarned.push({ itemId: drop.itemId, quantity: qty });

      // Add to user inventory
      const existing = user.inventory.find(i => i.itemId === drop.itemId);
      if (existing) {
        existing.quantity += qty;
      } else {
        user.inventory.push({ itemId: drop.itemId, quantity: qty });
      }
    }
  }

  // 4. Update coins and monster kill statistics atomically
  user.coins = (user.coins || 0) + coinsEarned;
  if (!user.statistics) user.statistics = {};
  user.statistics.monstersDefeated = (user.statistics.monstersDefeated || 0) + 1;
  user.statistics.totalCoinsEarned = (user.statistics.totalCoinsEarned || 0) + coinsEarned;

  await user.save();

  logger.info(`⚔️ Hunter ${strId} defeated [${monster.name}]! +${coinsEarned} Coins, +${xpEarned} XP, Drops: ${itemsEarned.map(i => `${i.itemId}x${i.quantity}`).join(', ') || 'None'}`);

  return {
    success: true,
    monsterName: monster.name,
    coinsEarned,
    xpEarned,
    newLevel: user.level,
    levelGained: xpProgression.leveledUp,
    itemsEarned,
    updatedCoins: user.coins,
    updatedXp: user.xp,
    totalDefeated: user.statistics.monstersDefeated
  };
}

/**
 * Crafts and equips a weapon using player's Telegram inventory resources.
 *
 * @param {Object} params
 * @param {string|number} params.telegramId
 * @param {string} params.weaponId
 * @returns {Promise<Object>}
 */
export async function craftHuntingWeapon({ telegramId, weaponId }) {
  const strId = String(telegramId);
  const targetWeapon = WEAPON_PROGRESSION[weaponId];

  if (!targetWeapon) {
    throw new Error(`Weapon '${weaponId}' does not exist`);
  }

  const user = await User.findOne({ telegramId: strId });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Check Level Requirement
  if (user.level < targetWeapon.levelRequired) {
    throw new Error(`Requires Player Level ${targetWeapon.levelRequired}. Current: Level ${user.level}`);
  }

  user.inventory = Array.isArray(user.inventory) ? user.inventory : [];

  // Check material costs
  for (const cost of targetWeapon.cost) {
    const item = user.inventory.find(i => i.itemId === cost.itemId);
    if (!item || item.quantity < cost.quantity) {
      throw new Error(`Insufficient ${cost.itemId}! Required: ${cost.quantity}, Available: ${item?.quantity || 0}`);
    }
  }

  // Deduct materials
  for (const cost of targetWeapon.cost) {
    const item = user.inventory.find(i => i.itemId === cost.itemId);
    item.quantity -= cost.quantity;
  }

  // Filter out empty inventory slots
  user.inventory = user.inventory.filter(i => i.quantity > 0);

  // Equip weapon
  user.equippedWeapon = targetWeapon.id;
  await user.save();

  logger.info(`🔨 Hunter ${strId} crafted & equipped [${targetWeapon.name}] (Tier ${targetWeapon.tier})!`);

  return {
    success: true,
    equippedWeapon: targetWeapon,
    updatedInventory: user.inventory
  };
}

export default {
  getPlayerHuntingState,
  createCombatSession,
  claimMonsterKill,
  craftHuntingWeapon,
  HUNTING_BIOMES,
  MONSTER_CATALOG,
  WEAPON_PROGRESSION
};
