import { spawnOrGetGroupBoss } from '../../engine/combat/bossEngine.js';
import { renderBossStatus, renderPrivateChatError } from '../views/bossView.js';

/**
 * /boss and /groupnode command handler
 */
export async function handleBossCommand(ctx) {
  const user = ctx.state.user;
  const chatType = ctx.chat?.type;

  // Enforce Group-Chat Only
  if (chatType === 'private') {
    const { text, keyboard } = renderPrivateChatError();
    return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }

  const chatId = ctx.chat?.id;
  const { boss } = await spawnOrGetGroupBoss({ chatId });

  const { text, keyboard } = renderBossStatus(boss, user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

export default {
  handleBossCommand
};
