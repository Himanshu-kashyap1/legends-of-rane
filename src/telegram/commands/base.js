import { Markup } from 'telegraf';
import { loadPlayerBase } from '../../engine/voxel/baseEngine.js';
import { config } from '../../config/env.js';
import { encodeCallback } from '../buttons/callbackData.js';
import { logger } from '../../utils/logger.js';

/**
 * /base and /build command handler
 * Launches the 3D Voxel Mini App.
 */
export async function handleBaseCommand(ctx) {
  const user = ctx.state.user;
  const ownerId = String(user?.telegramId || '0');

  const { base } = await loadPlayerBase(ownerId);
  const blockCount = base?.blockCount || 0;

  const webAppUrl = `${config.WEBAPP_URL}?user=${ownerId}`;
  const isHttps = Boolean(config.WEBAPP_URL && config.WEBAPP_URL.startsWith('https://'));

  const textLines = [
    `🏰 *YOUR VOXEL KINGDOM* 🏰`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Step into your personal 3D voxel sandbox in the Realm of Rane!_`,
    '',
    `🧱 *Blocks Placed:* ${blockCount} / 2,000 blocks`,
    `📐 *Canvas Boundary:* 32×32 Grid`,
    `🎨 *Palette:* 28+ nature, stone, wood, ore & decor blocks`,
    ''
  ];

  const buttons = [];
  if (isHttps) {
    textLines.push(`Tap the button below to launch the 3D Mini App directly in Telegram:`);
    buttons.push([
      Markup.button.webApp('🏗️ Open 3D Base', webAppUrl)
    ]);
  } else {
    textLines.push(
      `🌐 *3D Mini App Link:*`,
      `\`${webAppUrl}\``
    );
  }

  buttons.push([
    Markup.button.callback('🎒 Backpack', encodeCallback({ action: 'nav_inventory', ownerId, targetId: '1' })),
    Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
  ]);

  const keyboard = Markup.inlineKeyboard(buttons);
  const fullText = textLines.join('\n');

  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {});
      if (ctx.callbackQuery.message?.photo) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(fullText, { parse_mode: 'Markdown', ...keyboard });
      } else {
        await ctx.editMessageText(fullText, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
          await ctx.reply(fullText, { parse_mode: 'Markdown', ...keyboard });
        });
      }
    } else {
      await ctx.reply(fullText, { parse_mode: 'Markdown', ...keyboard });
    }
  } catch (err) {
    logger.warn('Failed to send base view in Markdown mode, falling back to plain text:', err?.message);
    await ctx.reply(fullText.replace(/[*_`]/g, ''), keyboard).catch(() => {});
  }
}

export default {
  handleBaseCommand
};
