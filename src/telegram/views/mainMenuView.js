import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { formatNumber } from './uiHelpers.js';

/**
 * Builds the clean, premium RPG-style Main Menu view.
 * Displays only essential hero statistics with 6 direct interactive navigation buttons.
 * Complete command reference is accessible via /help.
 *
 * @param {Object} user - Mongoose User document or state object
 * @returns {{ text: string, keyboard: any }}
 */
export function renderMainMenu(user) {
  const ownerId = String(user?.telegramId || '0');
  const name = user?.username ? `@${user.username}` : user?.firstName || 'Adventurer';

  const text = [
    `🏴‍☠️ *LEGENDS OF RANE* 🏴‍☠️`,
    `_Welcome back, hero! Realm aapka intezaar kar raha hai._`,
    '',
    `⚔️ *Hero:* ${name}`,
    `🎖️ *Title:* _${user?.title || 'Novice Adventurer'}_`,
    `⭐ *Level:* ${user?.level || 1}  •  🪙 *Coins:* ${formatNumber(user?.coins || 0)}`,
    `⚡ *Energy:* ${user?.energy?.current ?? 100} / ${user?.energy?.max ?? 100}`,
    '',
    `_Select a destination below or type /help for all commands._`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🌲 Explore', encodeCallback({ action: 'nav_explore', ownerId })),
      Markup.button.callback('⚒️ Workshop', encodeCallback({ action: 'nav_workshop', ownerId }))
    ],
    [
      Markup.button.callback('🎒 Inventory', encodeCallback({ action: 'nav_inventory', ownerId })),
      Markup.button.callback('👤 Character', encodeCallback({ action: 'nav_profile', ownerId }))
    ],
    [
      Markup.button.callback('🐾 Companions', encodeCallback({ action: 'nav_pets', ownerId })),
      Markup.button.callback('🏰 My Base', encodeCallback({ action: 'nav_base', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default renderMainMenu;
