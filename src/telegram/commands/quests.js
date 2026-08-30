import { renderQuestHub } from '../views/questView.js';

/**
 * /quests and /quest command handler
 */
export async function handleQuestsCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const { text, keyboard } = renderQuestHub(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

export default {
  handleQuestsCommand
};
