import { renderProfile } from '../views/profileView.js';
import { renderProfileCard, sendOrEditCardMessage } from '../../services/cardService.js';
import { logger } from '../../utils/logger.js';

/**
 * /profile command handler with lightweight visual card support
 */
export async function handleProfileCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load player profile. Please try again.');
  }

  const { text, keyboard } = renderProfile(user);
  let cardBuffer = null;
  try {
    cardBuffer = renderProfileCard(user);
  } catch (err) {
    logger.debug('Profile card generation notice:', err?.message);
  }

  await sendOrEditCardMessage(ctx, { text, keyboard, pngBuffer: cardBuffer });
}

export default handleProfileCommand;
