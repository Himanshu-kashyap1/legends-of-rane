import { renderExploreMenu, renderGatherResult } from '../views/gatheringView.js';
import { executeGatherAction } from '../../engine/gathering/gatheringEngine.js';

/**
 * /explore and /gather command handler
 */
export async function handleExploreCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const { text, keyboard } = renderExploreMenu(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

/**
 * Direct /chop slash command handler
 */
export async function handleChopCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const result = await executeGatherAction({ user, nodeId: 'node_forest_oak' });
  const { text, keyboard } = await renderGatherResult(user, result);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

/**
 * Direct /mine slash command handler
 */
export async function handleMineCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const result = await executeGatherAction({ user, nodeId: 'node_quarry_granite' });
  const { text, keyboard } = await renderGatherResult(user, result);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

export default {
  handleExploreCommand,
  handleChopCommand,
  handleMineCommand
};
