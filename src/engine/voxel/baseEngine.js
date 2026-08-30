import { Base } from '../../models/Base.js';
import {
  WORLD_CONFIG,
  BLOCK_CATALOG,
  isValidBlockType,
  areCoordinatesValid
} from './blockConfig.js';
import { logger } from '../../utils/logger.js';

/**
 * Generates a standard default starter foundation for new bases.
 * @returns {Array<Object>}
 */
export function getDefaultStarterBlocks() {
  const starterBlocks = [];
  // 5x5 Grass platform at y = 0
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      starterBlocks.push({ x, y: 0, z, blockType: 'grass' });
    }
  }
  // Center glowing lantern at y = 1
  starterBlocks.push({ x: 0, y: 1, z: 0, blockType: 'decor_lantern' });
  return starterBlocks;
}

/**
 * Loads a player's saved base from MongoDB or initializes starter base.
 *
 * @param {string|number} telegramId
 * @returns {Promise<{ success: boolean, base: Object }>}
 */
export async function loadPlayerBase(telegramId) {
  if (!telegramId) {
    return { success: false, reason: 'INVALID_TELEGRAM_ID' };
  }

  const strId = String(telegramId);
  let base = await Base.findOne({ telegramId: strId });

  if (!base) {
    base = new Base({
      telegramId: strId,
      name: 'My Sanctuary',
      blocks: getDefaultStarterBlocks()
    });
    await base.save();
    logger.info(`Initialized new starter base for player ${strId}`);
  }

  return {
    success: true,
    base: {
      telegramId: base.telegramId,
      name: base.name,
      blocks: base.blocks || [],
      blockCount: base.blocks?.length || 0,
      lastSavedAt: base.lastSavedAt
    }
  };
}

/**
 * Batch saves a player's base with strict server-side validation and deduplication.
 *
 * @param {string|number} telegramId
 * @param {Array<Object>} blocks
 * @returns {Promise<{ success: boolean, base?: Object, reason?: string, invalidCount?: number }>}
 */
export async function savePlayerBase(telegramId, blocks) {
  if (!telegramId) {
    return { success: false, reason: 'INVALID_TELEGRAM_ID' };
  }

  if (!Array.isArray(blocks)) {
    return { success: false, reason: 'BLOCKS_MUST_BE_ARRAY' };
  }

  if (blocks.length > WORLD_CONFIG.MAX_BLOCKS_PER_BASE) {
    return {
      success: false,
      reason: 'EXCEEDED_MAX_BLOCKS',
      maxAllowed: WORLD_CONFIG.MAX_BLOCKS_PER_BASE,
      received: blocks.length
    };
  }

  const strId = String(telegramId);
  const validatedBlocks = [];
  const coordinateMap = new Set();
  let invalidCount = 0;

  for (const block of blocks) {
    if (!block || typeof block !== 'object') {
      invalidCount++;
      continue;
    }

    const x = Number(block.x);
    const y = Number(block.y);
    const z = Number(block.z);
    const blockType = String(block.blockType || '').toLowerCase().trim();

    if (!areCoordinatesValid(x, y, z) || !isValidBlockType(blockType)) {
      invalidCount++;
      continue;
    }

    const coordKey = `${x},${y},${z}`;
    if (coordinateMap.has(coordKey)) {
      // Deduplicate coordinates: keep the latest block at coordinate
      const existingIdx = validatedBlocks.findIndex(b => b.x === x && b.y === y && b.z === z);
      if (existingIdx !== -1) {
        validatedBlocks[existingIdx] = { x, y, z, blockType, placedAt: new Date() };
      }
    } else {
      coordinateMap.add(coordKey);
      validatedBlocks.push({ x, y, z, blockType, placedAt: new Date() });
    }
  }

  const updatedBase = await Base.findOneAndUpdate(
    { telegramId: strId },
    {
      $set: {
        blocks: validatedBlocks,
        blockCount: validatedBlocks.length,
        lastSavedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  logger.info(`Saved base for player ${strId}: ${validatedBlocks.length} blocks (${invalidCount} invalid dropped)`);

  return {
    success: true,
    base: {
      telegramId: updatedBase.telegramId,
      name: updatedBase.name,
      blocks: updatedBase.blocks,
      blockCount: updatedBase.blocks.length,
      lastSavedAt: updatedBase.lastSavedAt
    },
    invalidCount
  };
}

/**
 * Places or updates a single block in a player's base.
 *
 * @param {string|number} telegramId
 * @param {Object} params
 * @param {number} params.x
 * @param {number} params.y
 * @param {number} params.z
 * @param {string} params.blockType
 * @returns {Promise<{ success: boolean, reason?: string, block?: Object }>}
 */
export async function placeBlock(telegramId, { x, y, z, blockType }) {
  if (!telegramId) return { success: false, reason: 'INVALID_TELEGRAM_ID' };

  const numX = Number(x);
  const numY = Number(y);
  const numZ = Number(z);
  const type = String(blockType || '').toLowerCase().trim();

  if (!areCoordinatesValid(numX, numY, numZ)) {
    return { success: false, reason: 'INVALID_COORDINATES' };
  }

  if (!isValidBlockType(type)) {
    return { success: false, reason: 'INVALID_BLOCK_TYPE' };
  }

  const strId = String(telegramId);
  const base = await Base.findOne({ telegramId: strId }) || new Base({ telegramId: strId, blocks: [] });

  if (base.blocks.length >= WORLD_CONFIG.MAX_BLOCKS_PER_BASE) {
    return { success: false, reason: 'EXCEEDED_MAX_BLOCKS' };
  }

  const existingIdx = base.blocks.findIndex(b => b.x === numX && b.y === numY && b.z === numZ);
  const blockData = { x: numX, y: numY, z: numZ, blockType: type, placedAt: new Date() };

  if (existingIdx !== -1) {
    base.blocks[existingIdx] = blockData;
  } else {
    base.blocks.push(blockData);
  }

  base.lastSavedAt = new Date();
  await base.save();

  return { success: true, block: blockData, totalBlocks: base.blocks.length };
}

/**
 * Removes a block at coordinate (x, y, z).
 *
 * @param {string|number} telegramId
 * @param {Object} params
 * @param {number} params.x
 * @param {number} params.y
 * @param {number} params.z
 * @returns {Promise<{ success: boolean, reason?: string, removed?: boolean }>}
 */
export async function destroyBlock(telegramId, { x, y, z }) {
  if (!telegramId) return { success: false, reason: 'INVALID_TELEGRAM_ID' };

  const numX = Number(x);
  const numY = Number(y);
  const numZ = Number(z);

  const strId = String(telegramId);
  const base = await Base.findOne({ telegramId: strId });
  if (!base) return { success: false, reason: 'BASE_NOT_FOUND' };

  const initialCount = base.blocks.length;
  base.blocks = base.blocks.filter(b => !(b.x === numX && b.y === numY && b.z === numZ));
  const removed = base.blocks.length < initialCount;

  if (removed) {
    base.lastSavedAt = new Date();
    await base.save();
  }

  return { success: true, removed, totalBlocks: base.blocks.length };
}

/**
 * Clears all blocks from a player's base.
 *
 * @param {string|number} telegramId
 * @returns {Promise<{ success: boolean }>}
 */
export async function clearPlayerBase(telegramId) {
  if (!telegramId) return { success: false, reason: 'INVALID_TELEGRAM_ID' };

  const strId = String(telegramId);
  await Base.findOneAndUpdate(
    { telegramId: strId },
    { $set: { blocks: [], blockCount: 0, lastSavedAt: new Date() } },
    { upsert: true }
  );

  logger.info(`Cleared all blocks for base of player ${strId}`);
  return { success: true };
}

export default {
  getDefaultStarterBlocks,
  loadPlayerBase,
  savePlayerBase,
  placeBlock,
  destroyBlock,
  clearPlayerBase
};
