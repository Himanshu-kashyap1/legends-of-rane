import {
  generateMainMenuSvg,
  generateProfileSvg,
  generateInventorySvg,
  generateLeaderboardSvg
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
      logger.warn('Failed to deliver photo card, falling back to text:', err?.message);
    }
  }

  // Text fallback
  return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard }).catch((err) => {
    logger.debug('Text fallback reply failed:', err?.message);
  });
}

export default {
  renderMainMenuCard,
  renderProfileCard,
  renderInventoryCard,
  renderLeaderboardCard,
  sendOrEditCardMessage
};
