import { renderInventory } from '../views/inventoryView.js';
import { renderInventoryCard, sendOrEditCardMessage } from '../../services/cardService.js';
import { logger } from '../../utils/logger.js';

/**
 * /inventory and /backpack command handler with optional visual grid card
 */
export async function handleInventoryCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load player inventory. Please try again.');
  }

  const { text, keyboard } = await renderInventory(user, 1);
  let cardBuffer = null;
  try {
    cardBuffer = renderInventoryCard(user, 1);
  } catch (err) {
    logger.debug('Inventory card generation notice:', err?.message);
  }

  await sendOrEditCardMessage(ctx, { text, keyboard, pngBuffer: cardBuffer });
}

export default handleInventoryCommand;
