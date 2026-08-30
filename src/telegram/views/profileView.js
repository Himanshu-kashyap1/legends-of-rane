import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { getPlayerProfileData } from '../../services/profileService.js';
import { syncTitles } from '../../engine/progression/progressionEngine.js';

/**
 * Builds the simplified, command-first Player Profile view.
 * @param {Object} user - Mongoose User document
 * @returns {{ text: string, keyboard: any }}
 */
export function renderProfile(user) {
  syncTitles(user);
  const profile = getPlayerProfileData(user);
  const ownerId = String(user.telegramId);

  const skillsList = Object.values(profile.skills).map(skill => {
    return `${skill.emoji} *${skill.name}* (Lv ${skill.level}): \`${skill.progressBar}\` _(${skill.xp}/${skill.requiredXp} XP)_`;
  }).join('\n');

  const text = [
    `👤 *CHARACTER PROFILE* 👤`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `⚔️ *Hero:* ${profile.name}`,
    `🎖️ *Title:* 👑 _${profile.title}_`,
    `⭐ *Player Level:* Level ${profile.level}`,
    `📈 *Progress:* \`${profile.progressBar}\` _(${profile.xp}/${profile.requiredXp} XP)_`,
    '',
    `🪙 *Treasury:* ${profile.formattedCoins} Coins`,
    `⚡ *Energy:* ${profile.energy.current} / ${profile.energy.max}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🔮 *SKILL MASTERIES*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    skillsList,
    '',
    `🏆 *Titles Unlocked:* ${user.unlockedTitles?.length || 1} available`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🎒 Inventory', encodeCallback({ action: 'nav_inventory', ownerId, targetId: '1' })),
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default renderProfile;
