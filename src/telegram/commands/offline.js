import { renderOfflineCard } from '../views/offlineView.js';

/**
 * /offline command handler
 */
export async function handleOfflineCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const { text, keyboard } = renderOfflineCard(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

export default {
  handleOfflineCommand
};
