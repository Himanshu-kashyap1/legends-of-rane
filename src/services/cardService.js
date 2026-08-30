import {
  generateMainMenuSvg,
  generateProfileSvg,
  generateInventorySvg,
  generateLeaderboardSvg,
  generateGatheringCategorySvg,
  generateBlacksmithCategorySvg,
  generateEconomyCategorySvg,
  generateBaseCategorySvg
} from '../renderer/cardTemplates.js';
import { renderSvgToPngBuffer } from '../renderer/cardRenderer.js';
import { logger } from '../utils/logger.js';

/**
 * Renders Main Menu Banner PNG Card buffer (800x400).
 * @param {Object} user
 * @returns {Buffer}
 */
export function renderMainMenuCard(user) {
  const svg = generateMainMenuSvg(user);
  return renderSvgToPngBuffer(svg, { fitTo: { mode: 'width', value: 800 } });
}

/**
 * Renders Player Profile PNG Card buffer (800x500).
 * @param {Object} user
 * @returns {Buffer}
 */
export function renderProfileCard(user) {
  const svg = generateProfileSvg(user);
  return renderSvgToPngBuffer(svg, { fitTo: { mode: 'width', value: 800 } });
}

/**
 * Renders Inventory Grid PNG Card buffer (800x450).
 * @param {Object} user
 * @param {number} [page=1]
 * @returns {Buffer}
 */
export function renderInventoryCard(user, page = 1) {
  const svg = generateInventorySvg(user, page);
  return renderSvgToPngBuffer(svg, { fitTo: { mode: 'width', value: 800 } });
}

/**
 * Renders Leaderboard Podium PNG Card buffer (800x500).
 * @param {Array<Object>} leaderboardData
 * @returns {Buffer}
 */
export function renderLeaderboardCard(leaderboardData) {
  const svg = generateLeaderboardSvg(leaderboardData);
  return renderSvgToPngBuffer(svg, { fitTo: { mode: 'width', value: 800 } });
}

/**
 * 1. Renders Gathering & Harvest PNG Card buffer (800x400).
 * @param {Object} user
 * @returns {Buffer}
 */
export function renderGatheringCard(user) {
  const svg = generateGatheringCategorySvg(user);
  return renderSvgToPngBuffer(svg, { fitTo: { mode: 'width', value: 800 } });
}

/**
 * 2. Renders Blacksmith & Equipment PNG Card buffer (800x400).
 * @param {Object} user
 * @returns {Buffer}
 */
export function renderBlacksmithCard(user) {
  const svg = generateBlacksmithCategorySvg(user);
  return renderSvgToPngBuffer(svg, { fitTo: { mode: 'width', value: 800 } });
}

/**
 * 3. Renders Economy & Trading PNG Card buffer (800x400).
 * @param {Object} user
 * @returns {Buffer}
 */
export function renderEconomyCard(user) {
  const svg = generateEconomyCategorySvg(user);
  return renderSvgToPngBuffer(svg, { fitTo: { mode: 'width', value: 800 } });
}

/**
 * 4. Renders 3D Voxel Base & Multiplayer PNG Card buffer (800x400).
 * @param {Object} user
 * @returns {Buffer}
 */
export function renderBaseCard(user) {
  const svg = generateBaseCategorySvg(user);
  return renderSvgToPngBuffer(svg, { fitTo: { mode: 'width', value: 800 } });
}

/**
 * Generic Category Card Renderer
 * @param {string} categoryKey
 * @param {Object} user
 * @returns {Buffer|null}
 */
export function renderCategoryCard(categoryKey, user) {
  const key = String(categoryKey || '').toLowerCase();
  if (['gathering', 'gatheringharvest', 'harvest'].includes(key)) {
    return renderGatheringCard(user);
  }
  if (['blacksmith', 'blacksmithequipment', 'equipment'].includes(key)) {
    return renderBlacksmithCard(user);
  }
  if (['economy', 'economytrading', 'trading'].includes(key)) {
    return renderEconomyCard(user);
  }
  if (['base', '3dvoxelbasemultiplayer', 'voxel'].includes(key)) {
    return renderBaseCard(user);
  }
  return null;
}

/**
 * Helper to safely send a graphical card or fallback to text if photo delivery fails.
 *
 * @param {Object} ctx - Telegraf context
 * @param {Object} params
 * @param {string} params.text - Caption or message text
 * @param {any} params.keyboard - Inline keyboard
 * @param {Buffer} [params.pngBuffer] - PNG card buffer
 */
export async function sendOrEditCardMessage(ctx, { text, keyboard, pngBuffer }) {
  if (pngBuffer && Buffer.isBuffer(pngBuffer)) {
    try {
      return await ctx.replyWithPhoto(
        { source: pngBuffer },
        { caption: text, parse_mode: 'Markdown', ...keyboard }
      );
    } catch (err) {
      logger.warn('Failed to deliver photo card in Markdown mode, trying plain photo caption:', err?.message);
      try {
        return await ctx.replyWithPhoto(
          { source: pngBuffer },
          { caption: text.replace(/[*_`\\]/g, ''), ...keyboard }
        );
      } catch (photoErr) {
        logger.warn('Photo delivery failed completely, falling back to text:', photoErr?.message);
      }
    }
  }

  // Text fallback with Markdown
  try {
    return await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  } catch (textErr) {
    logger.warn('Text Markdown reply failed, falling back to plain text:', textErr?.message);
    return await ctx.reply(text.replace(/[*_`\\]/g, ''), keyboard).catch((err) => {
      logger.error('Critical: Failed to deliver plain text message to user:', err?.message);
    });
  }
}

export default {
  renderMainMenuCard,
  renderProfileCard,
  renderInventoryCard,
  renderLeaderboardCard,
  renderGatheringCard,
  renderBlacksmithCard,
  renderEconomyCard,
  renderBaseCard,
  renderCategoryCard,
  sendOrEditCardMessage
};
