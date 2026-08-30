import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { getPlayerProfileData } from '../../services/profileService.js';
import { escapeMarkdown } from './uiHelpers.js';

/**
 * Builds the simplified, command-first Player Profile view.
 * @param {Object} user - Mongoose User document
 * @returns {{ text: string, keyboard: any }}
 */
export function renderProfile(user) {
  const profile = getPlayerProfileData(user);
  const ownerId = String(user.telegramId);
  const safeName = escapeMarkdown(profile.name);

  const skillsList = Object.values(profile.skills).map(skill => {
    return `${skill.emoji} *${skill.name}* (Lv ${skill.level}): \`${skill.progressBar}\` _(${skill.xp}/${skill.requiredXp} XP)_`;
  }).join('\n');

  const text = [
    `👤 *HERO STATUS* 👤`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `⚔️ *Player:* ${safeName}`,
    `⭐ *Level:* Level ${profile.level}`,
    `📈 *Level Progress:* \`${profile.progressBar}\` _(${profile.xp}/${profile.requiredXp} XP)_`,
    `🪙 *Treasury:* ${profile.formattedCoins} Coins`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🔮 *SKILL MASTERIES*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    skillsList
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🎒 Bag', encodeCallback({ action: 'nav_inventory', ownerId, targetId: '1' })),
      Markup.button.callback('⚒️ Workshop', encodeCallback({ action: 'nav_workshop', ownerId }))
    ],
    [
      Markup.button.callback('🔙 Back', encodeCallback({ action: 'nav_main', ownerId })),
      Markup.button.callback('❌ Close', encodeCallback({ action: 'nav_close', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default renderProfile;
