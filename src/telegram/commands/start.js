import { renderMainMenu } from '../views/mainMenuView.js';
import { renderMainMenuCard, sendOrEditCardMessage } from '../../services/cardService.js';
import { logger } from '../../utils/logger.js';

/**
 * /start command handler with lightweight visual banner card support
 */
export async function handleStartCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load player profile. Please try again.');
  }

  const { text, keyboard } = renderMainMenu(user);
  let cardBuffer = null;
  try {
    cardBuffer = renderMainMenuCard(user);
  } catch (err) {
    logger.debug('Main menu card generation notice:', err?.message);
  }

  await sendOrEditCardMessage(ctx, { text, keyboard, pngBuffer: cardBuffer });
}

export default handleStartCommand;
