import { renderHelpView, renderCommandDetailView } from '../views/helpView.js';

/**
 * /help and /guide command handler with support for specific command lookups.
 * Example: `/guide chop` or `/help market`
 */
export async function handleHelpCommand(ctx) {
  const user = ctx.state.user;
  const rawArg = ctx.payload || (ctx.message?.text ? ctx.message.text.split(' ').slice(1).join(' ') : '');
  const commandArg = rawArg?.trim()?.toLowerCase()?.replace(/^\//, '');

  if (commandArg) {
    const { text, keyboard } = renderCommandDetailView(user, commandArg);
    return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }

  const { text, keyboard } = renderHelpView(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

export default {
  handleHelpCommand
};
