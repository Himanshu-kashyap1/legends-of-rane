import {
  renderGatheringCategoryView,
  renderBlacksmithCategoryView,
  renderEconomyCategoryView,
  renderBaseCategoryView
} from '../views/helpView.js';

/**
 * /gatheringharvest command handler
 */
export async function handleGatheringCategoryCommand(ctx) {
  const user = ctx.state.user;
  const { text, keyboard } = renderGatheringCategoryView(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

/**
 * /blacksmithequipment command handler
 */
export async function handleBlacksmithCategoryCommand(ctx) {
  const user = ctx.state.user;
  const { text, keyboard } = renderBlacksmithCategoryView(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

/**
 * /economytrading command handler
 */
export async function handleEconomyCategoryCommand(ctx) {
  const user = ctx.state.user;
  const { text, keyboard } = renderEconomyCategoryView(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

/**
 * /3dvoxelbasemultiplayer command handler
 */
export async function handle3DMultiplayerCategoryCommand(ctx) {
  const user = ctx.state.user;
  const { text, keyboard } = renderBaseCategoryView(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

export default {
  handleGatheringCategoryCommand,
  handleBlacksmithCategoryCommand,
  handleEconomyCategoryCommand,
  handle3DMultiplayerCategoryCommand
};
