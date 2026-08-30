import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderMainMenu } from '../views/mainMenuView.js';
import { sendOrEditCardMessage } from '../../services/cardService.js';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the appropriate Day / Noon / Sunset / Night anime scenery buffer
 * based on the current hour of the day.
 *
 * 🌅 05:00 - 10:00: Early Morning Sunrise (start_banner_morning.jpg)
 * ☀️ 10:00 - 16:00: Bright Sunny Afternoon (start_banner_noon.jpg)
 * 🌇 16:00 - 19:30: Golden Sunset Twilight (start_banner_sunset.jpg)
 * 🌌 19:30 - 05:00: Starlit Galaxy Midnight (start_banner_midnight.jpg)
 *
 * @param {Date} [now=new Date()]
 * @returns {Buffer|null}
 */
export function getDynamicBannerBuffer(now = new Date()) {
  try {
    const hours = now.getHours();
    let fileName = 'start_banner_noon.jpg';

    if (hours >= 5 && hours < 10) {
      fileName = 'start_banner_morning.jpg';
    } else if (hours >= 10 && hours < 16) {
      fileName = 'start_banner_noon.jpg';
    } else if (hours >= 16 && hours < 20) {
      fileName = 'start_banner_sunset.jpg';
    } else {
      fileName = 'start_banner_midnight.jpg';
    }

    const filePath = path.resolve(__dirname, '../../../public/images', fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }

    // Fallbacks
    const fallbackPath = path.resolve(__dirname, '../../../public/images/start_banner_day.jpg');
    if (fs.existsSync(fallbackPath)) {
      return fs.readFileSync(fallbackPath);
    }
  } catch (err) {
    logger.debug('Dynamic banner file resolution notice:', err?.message);
  }
  return null;
}

/**
 * /start command handler with dynamic Day/Noon/Sunset/Night anime scenery
 */
export async function handleStartCommand(ctx) {
  try {
    const user = ctx.state.user;
    if (!user) {
      return ctx.reply('🏰 Welcome to Legends of Rane! Registering your adventurer profile...');
    }

    const botUsername = ctx.botInfo?.username || ctx.me?.username || 'IamRaneBot';
    const { text, keyboard } = renderMainMenu(user, botUsername);
    const bannerBuffer = getDynamicBannerBuffer();

    await sendOrEditCardMessage(ctx, { text, keyboard, pngBuffer: bannerBuffer });
  } catch (err) {
    logger.error('Error executing /start command:', err);
    try {
      const user = ctx.state?.user;
      const { text, keyboard } = renderMainMenu(user || { telegramId: ctx.from?.id, level: 1, coins: 100 });
      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    } catch (fallbackErr) {
      logger.error('Fallback /start delivery failed:', fallbackErr);
    }
  }
}

export default handleStartCommand;
