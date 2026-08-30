import { renderExploreMenu } from '../views/gatheringView.js';

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

export default handleExploreCommand;
