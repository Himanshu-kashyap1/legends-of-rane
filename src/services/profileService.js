import { getRequiredPlayerXp, getRequiredSkillXp, calculateProgressPercent } from '../engine/progression/progressionEngine.js';
import { formatProgressBar, formatNumber } from '../telegram/views/uiHelpers.js';

/**
 * Skill Metadata mapping
 */
export const SKILL_META = {
  woodcutting: { name: 'Woodcutting', emoji: '🌲' },
  mining: { name: 'Mining', emoji: '⛏️' },
  crafting: { name: 'Crafting', emoji: '⚒️' },
  fishing: { name: 'Fishing', emoji: '🎣' },
  exploration: { name: 'Exploration', emoji: '🧭' }
};

/**
 * Builds structured profile data for presentation.
 * @param {Object} user - Mongoose User document
 * @returns {Object}
 */
export function getPlayerProfileData(user) {
  if (!user) {
    throw new Error('User document is required to generate profile data');
  }

  const name = user.username ? `@${user.username}` : user.firstName || 'Adventurer';
  const level = user.level || 1;
  const currentXp = user.xp || 0;
  const requiredXp = getRequiredPlayerXp(level);
  const playerProgressPercent = calculateProgressPercent(currentXp, requiredXp);
  const playerProgressBar = formatProgressBar(currentXp, requiredXp, 10);

  const skillsData = {};
  for (const [key, meta] of Object.entries(SKILL_META)) {
    const skillState = user.skills?.[key] || { level: 1, xp: 0 };
    const sLevel = skillState.level || 1;
    const sXp = skillState.xp || 0;
    const sRequired = getRequiredSkillXp(sLevel);
    const sPercent = calculateProgressPercent(sXp, sRequired);
    const sBar = formatProgressBar(sXp, sRequired, 8);

    skillsData[key] = {
      key,
      name: meta.name,
      emoji: meta.emoji,
      level: sLevel,
      xp: sXp,
      requiredXp: sRequired,
      progressPercent: sPercent,
      progressBar: sBar
    };
  }

  return {
    telegramId: user.telegramId,
    name,
    title: user.title || 'Novice Adventurer',
    level,
    xp: currentXp,
    requiredXp,
    progressPercent: playerProgressPercent,
    progressBar: playerProgressBar,
    coins: user.coins || 0,
    formattedCoins: formatNumber(user.coins || 0),
    energy: {
      current: user.energy?.current ?? 100,
      max: user.energy?.max ?? 100
    },
    skills: skillsData,
    stats: user.statistics || {}
  };
}

export default {
  getPlayerProfileData,
  SKILL_META
};
