import express from 'express';
import {
  loadPlayerBase,
  savePlayerBase,
  placeBlock,
  destroyBlock,
  clearPlayerBase
} from '../../engine/voxel/baseEngine.js';
import { BLOCK_CATALOG, BLOCK_CATEGORIES, getBlocksByCategory } from '../../engine/voxel/blockConfig.js';
import { logger } from '../../utils/logger.js';

export const baseRouter = express.Router();

// In-memory rate limiter for save/clear operations (max 1 request per 200ms per user)
const lastActionTimes = new Map();

function rateLimitUser(telegramId, minIntervalMs = 200) {
  const now = Date.now();
  const lastTime = lastActionTimes.get(telegramId) || 0;
  if (now - lastTime < minIntervalMs) {
    return false;
  }
  lastActionTimes.set(telegramId, now);
  return true;
}

/**
 * GET /api/base/blocks
 * Returns centralized block palette and categories.
 */
baseRouter.get('/blocks', (req, res) => {
  res.json({
    success: true,
    categories: BLOCK_CATEGORIES,
    blocks: BLOCK_CATALOG,
    grouped: getBlocksByCategory()
  });
});

/**
 * GET /api/base/load?telegramId=...
 * Loads player base blocks.
 */
baseRouter.get('/load', async (req, res) => {
  try {
    const telegramId = req.query.telegramId;
    if (!telegramId || typeof telegramId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid telegramId is required' });
    }

    const cleanId = telegramId.trim().slice(0, 64);
    const result = await loadPlayerBase(cleanId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    logger.error('API /api/base/load error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/base/save
 * Batch saves whole base with server-side validation.
 */
baseRouter.post('/save', async (req, res) => {
  try {
    const { telegramId, blocks } = req.body;
    if (!telegramId || typeof telegramId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid telegramId is required' });
    }

    if (!Array.isArray(blocks)) {
      return res.status(400).json({ success: false, error: 'Blocks payload must be an array' });
    }

    const cleanId = telegramId.trim().slice(0, 64);

    if (!rateLimitUser(cleanId, 200)) {
      return res.status(429).json({ success: false, error: 'Too many save requests. Please slow down.' });
    }

    const result = await savePlayerBase(cleanId, blocks);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    logger.error('API /api/base/save error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/base/place
 * Places or replaces a single block.
 */
baseRouter.post('/place', async (req, res) => {
  try {
    const { telegramId, x, y, z, blockType } = req.body;
    if (!telegramId || typeof telegramId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid telegramId is required' });
    }

    const cleanId = telegramId.trim().slice(0, 64);
    const result = await placeBlock(cleanId, { x, y, z, blockType });
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    logger.error('API /api/base/place error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/base/destroy
 * Destroys a single block.
 */
baseRouter.post('/destroy', async (req, res) => {
  try {
    const { telegramId, x, y, z } = req.body;
    if (!telegramId || typeof telegramId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid telegramId is required' });
    }

    const cleanId = telegramId.trim().slice(0, 64);
    const result = await destroyBlock(cleanId, { x, y, z });
    res.json(result);
  } catch (err) {
    logger.error('API /api/base/destroy error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/base/clear
 * Clears all blocks for player base.
 */
baseRouter.post('/clear', async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId || typeof telegramId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid telegramId is required' });
    }

    const cleanId = telegramId.trim().slice(0, 64);
    if (!rateLimitUser(cleanId, 500)) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded on base clear.' });
    }

    const result = await clearPlayerBase(cleanId);
    res.json(result);
  } catch (err) {
    logger.error('API /api/base/clear error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default baseRouter;
