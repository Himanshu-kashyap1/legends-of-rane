import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderMainMenu } from '../views/mainMenuView.js';
import { sendOrEditCardMessage } from '../../services/cardService.js';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the appropriate Day / Night artwork buffer based on current hour.
 * Day: 06:00 to 18:00
 * Night: 18:00 to 06:00
 *
 * @param {Date} [now=new Date()]
 * @returns {Buffer|null}
 */
export function getDynamicBannerBuffer(now = new Date()) {
  try {
    const hours = now.getHours(); // Local/server hour
    const isDay = hours >= 6 && hours < 18;
    const fileName = isDay ? 'start_banner_day.jpg' : 'start_banner_night.jpg';
    const filePath = path.resolve(__dirname, '../../../public/images', fileName);

    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch (err) {
    logger.debug('Dynamic banner file resolution notice:', err?.message);
  }
  return null;
}

/**
 * /start command handler with dynamic Day/Night anime scenery
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
