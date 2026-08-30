import {
  renderGatheringCategoryView,
  renderBlacksmithCategoryView,
  renderEconomyCategoryView,
  renderBaseCategoryView
} from '../views/helpView.js';
import {
  renderGatheringCard,
  renderBlacksmithCard,
  renderEconomyCard,
  renderBaseCard,
  sendOrEditCardMessage
} from '../../services/cardService.js';
import { logger } from '../../utils/logger.js';

/**
 * /gatheringharvest command handler
 * Sends premium Gathering & Harvest visual RPG card + gathering action buttons
 */
export async function handleGatheringCategoryCommand(ctx) {
  try {
    const user = ctx.state.user;
    const { text, keyboard } = renderGatheringCategoryView(user);
    const pngBuffer = renderGatheringCard(user);
    await sendOrEditCardMessage(ctx, { text, keyboard, pngBuffer });
  } catch (err) {
    logger.warn('Failed to render gathering visual card, falling back to text view:', err?.message);
    const user = ctx.state.user;
    const { text, keyboard } = renderGatheringCategoryView(user);
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }
}

/**
 * /blacksmithequipment command handler
 * Sends premium Blacksmith & Equipment visual RPG card + workshop action buttons
 */
export async function handleBlacksmithCategoryCommand(ctx) {
  try {
    const user = ctx.state.user;
    const { text, keyboard } = renderBlacksmithCategoryView(user);
    const pngBuffer = renderBlacksmithCard(user);
    await sendOrEditCardMessage(ctx, { text, keyboard, pngBuffer });
  } catch (err) {
    logger.warn('Failed to render blacksmith visual card, falling back to text view:', err?.message);
    const user = ctx.state.user;
    const { text, keyboard } = renderBlacksmithCategoryView(user);
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }
}

/**
 * /economytrading command handler
 * Sends premium Economy & Trading visual RPG card + economy action buttons
 */
export async function handleEconomyCategoryCommand(ctx) {
  try {
    const user = ctx.state.user;
    const { text, keyboard } = renderEconomyCategoryView(user);
    const pngBuffer = renderEconomyCard(user);
    await sendOrEditCardMessage(ctx, { text, keyboard, pngBuffer });
  } catch (err) {
    logger.warn('Failed to render economy visual card, falling back to text view:', err?.message);
    const user = ctx.state.user;
    const { text, keyboard } = renderEconomyCategoryView(user);
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }
}

/**
 * /3dvoxelbasemultiplayer command handler
 * Sends premium 3D Voxel Base & Multiplayer visual RPG card + base action buttons
 */
export async function handle3DMultiplayerCategoryCommand(ctx) {
  try {
    const user = ctx.state.user;
    const { text, keyboard } = renderBaseCategoryView(user);
    const pngBuffer = renderBaseCard(user);
    await sendOrEditCardMessage(ctx, { text, keyboard, pngBuffer });
  } catch (err) {
    logger.warn('Failed to render 3D voxel base visual card, falling back to text view:', err?.message);
    const user = ctx.state.user;
    const { text, keyboard } = renderBaseCategoryView(user);
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }
}

export default {
  handleGatheringCategoryCommand,
  handleBlacksmithCategoryCommand,
  handleEconomyCategoryCommand,
  handle3DMultiplayerCategoryCommand
};
