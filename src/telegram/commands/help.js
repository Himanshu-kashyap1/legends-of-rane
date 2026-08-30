import { renderHelpView } from '../views/helpView.js';

/**
 * /help command handler
 */
export async function handleHelpCommand(ctx) {
  const user = ctx.state.user;
  const { text, keyboard } = renderHelpView(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

export default {
  handleHelpCommand
};
