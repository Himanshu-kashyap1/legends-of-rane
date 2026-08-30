import express from 'express';
import {
  getPlayerHuntingState,
  createCombatSession,
  claimMonsterKill,
  craftHuntingWeapon
} from '../../engine/hunting/huntingEngine.js';
import { HUNTING_BIOMES, MONSTER_CATALOG, WEAPON_PROGRESSION } from '../../engine/hunting/huntingConfig.js';
import { logger } from '../../utils/logger.js';

export const huntingRouter = express.Router();

/**
 * GET /api/hunting/world-state
 * Fetches player stats, equipped gear, materials, biomes, and monster catalogs.
 */
huntingRouter.get('/world-state', async (req, res) => {
  try {
    const telegramId = req.query.telegramId;
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId query parameter is required' });
    }

    const playerState = await getPlayerHuntingState(telegramId);

    res.json({
      success: true,
      player: playerState,
      biomes: HUNTING_BIOMES,
      monsters: MONSTER_CATALOG,
      weapons: WEAPON_PROGRESSION
    });
  } catch (err) {
    logger.error('Error fetching hunting world-state:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/hunting/start-session
 * Initializes an anti-cheat combat session nonce for a targeted monster.
 */
huntingRouter.post('/start-session', async (req, res) => {
  try {
    const { telegramId, monsterId } = req.body;
    if (!telegramId || !monsterId) {
      return res.status(400).json({ error: 'telegramId and monsterId are required' });
    }

    const session = await createCombatSession({ telegramId, monsterId });
    res.json({ success: true, session });
  } catch (err) {
    logger.warn('Failed to start combat session:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/hunting/claim-kill
 * Validates monster defeat and atomically awards Coins, XP, and item drops to MongoDB.
 */
huntingRouter.post('/claim-kill', async (req, res) => {
  try {
    const { telegramId, sessionToken, monsterId, timeTakenMs } = req.body;
    if (!telegramId || !sessionToken || !monsterId) {
      return res.status(400).json({ error: 'telegramId, sessionToken, and monsterId are required' });
    }

    const result = await claimMonsterKill({
      telegramId,
      sessionToken,
      monsterId,
      timeTakenMs: Number(timeTakenMs) || 1000
    });

    res.json(result);
  } catch (err) {
    logger.warn('Combat kill claim rejected:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/hunting/craft-gear
 * Crafts a higher tier weapon using player's Telegram inventory resources.
 */
huntingRouter.post('/craft-gear', async (req, res) => {
  try {
    const { telegramId, weaponId } = req.body;
    if (!telegramId || !weaponId) {
      return res.status(400).json({ error: 'telegramId and weaponId are required' });
    }

    const result = await craftHuntingWeapon({ telegramId, weaponId });
    res.json(result);
  } catch (err) {
    logger.warn('Hunting gear craft rejected:', err.message);
    res.status(400).json({ error: err.message });
  }
});

export default huntingRouter;
