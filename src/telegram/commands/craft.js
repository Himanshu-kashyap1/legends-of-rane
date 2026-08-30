import { renderWorkshopMenu } from '../views/workshopView.js';

/**
 * /craft and /workshop command handler
 */
export async function handleWorkshopCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const { text, keyboard } = renderWorkshopMenu(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

export default handleWorkshopCommand;
