import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { formatNumber, escapeMarkdown } from './uiHelpers.js';

/**
 * Builds the streamlined, elegant /start view with exactly 2 primary buttons.
 *
 * @param {Object} user - Mongoose User document or state object
 * @param {string} [botUsername='IamRaneBot'] - Bot username for group add link
 * @returns {{ text: string, keyboard: any }}
 */
export function renderMainMenu(user, botUsername = 'IamRaneBot') {
  const ownerId = String(user?.telegramId || '0');
  const rawName = user?.firstName || (user?.username ? `@${user.username}` : 'Adventurer');
  const name = escapeMarkdown(rawName);

  const text = [
    `🏰 *LEGENDS OF RANE* 🏰`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Step into the realm of adventure, mining & multiplayer voxel creation!_`,
    '',
    `⚔️ *Hero:* ${name}`,
    `⭐ *Level:* ${user?.level || 1}  •  🪙 *Coins:* ${formatNumber(user?.coins || 0)}`,
    '',
    `_Tap *Commands Info* to explore all actions or add me to your group to play together!_`
  ].join('\n');

  const addGroupUrl = `https://t.me/${botUsername}?startgroup=true`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.url('🌸 Add Me', addGroupUrl),
      Markup.button.callback('📜 Commands Info', encodeCallback({ action: 'nav_help', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default renderMainMenu;
