/**
 * Centralized Progression, Leveling, Skill Mastery & Titles Engine
 *
 * All XP additions, level-up calculations, and title unlocks must pass through
 * this authoritative engine.
 */

import { checkEligibleTitles } from './titleConfig.js';
import { logger } from '../../utils/logger.js';

export const VALID_SKILLS = ['woodcutting', 'mining', 'crafting', 'fishing', 'exploration'];

/**
 * Calculates XP required to advance from current Player Level to Level + 1.
 * Formula: floor(100 * Level^1.5)
 * @param {number} level - Current player level (>= 1)
 * @returns {number}
 */
export function getRequiredPlayerXp(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return Math.floor(100 * Math.pow(safeLevel, 1.5));
}

/**
 * Calculates XP required to advance a Skill from current Level to Level + 1.
 * Formula: floor(60 * Level^1.4)
 * @param {number} level - Current skill level (>= 1)
 * @returns {number}
 */
export function getRequiredSkillXp(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return Math.floor(60 * Math.pow(safeLevel, 1.4));
}

/**
 * Calculates clamped progress percentage (0 - 100) between current and required XP.
 * @param {number} current
 * @param {number} required
 * @returns {number} Integer between 0 and 100
 */
export function calculateProgressPercent(current, required) {
  const cur = Math.max(0, Number(current) || 0);
  const req = Math.max(1, Number(required) || 1);

  if (isNaN(cur) || isNaN(req) || req <= 0) {
    return 0;
  }

  const percent = Math.floor((cur / req) * 100);
  return Math.min(100, Math.max(0, percent));
}

/**
 * Authoritatively adds Player XP, evaluates single/multi level-ups, and awards bonuses.
 *
 * @param {Object} user - Player document or state object
 * @param {number} xpAmount - XP to grant (must be positive)
 * @returns {{ success: boolean, xpAdded: number, leveledUp: boolean, oldLevel: number, newLevel: number, levelsGained: number, coinsBonus: number, newTitlesUnlocked: string[], reason?: string }}
 */
export function addPlayerXp(user, xpAmount) {
  if (!user) return { success: false, reason: 'INVALID_USER' };

  const xpNum = Number(xpAmount);
  if (isNaN(xpNum) || xpNum <= 0 || !isFinite(xpNum)) {
    return { success: false, reason: 'INVALID_XP_AMOUNT', xpAdded: 0, leveledUp: false };
  }

  const xpToAdd = Math.floor(xpNum);
  const oldLevel = Math.max(1, user.level || 1);
  user.level = oldLevel;
  user.xp = Math.max(0, (user.xp || 0) + xpToAdd);

  let levelsGained = 0;
  let coinsBonus = 0;

  // Multi-level-up resolution loop
  while (true) {
    const requiredXp = getRequiredPlayerXp(user.level);
    if (user.xp >= requiredXp) {
      user.xp -= requiredXp;
      user.level += 1;
      levelsGained += 1;

      // Level-up milestone rewards
      const levelReward = user.level * 25;
      coinsBonus += levelReward;
      user.coins = (user.coins || 0) + levelReward;

      logger.info(`Player ${user.telegramId} reached Level ${user.level}! (+${levelReward} coins bonus)`);
    } else {
      break;
    }
  }

  return {
    success: true,
    xpAdded: xpToAdd,
    leveledUp: levelsGained > 0,
    oldLevel,
    newLevel: user.level,
    levelsGained,
    coinsBonus,
    newTitlesUnlocked: []
  };
}

/**
 * Authoritatively adds Skill XP and evaluates single/multi level-ups.
 *
 * @param {Object} user
 * @param {'woodcutting'|'mining'|'crafting'|'fishing'|'exploration'} skillName
 * @param {number} xpAmount
 * @returns {{ success: boolean, skill: string, xpAdded: number, leveledUp: boolean, oldLevel: number, newLevel: number, levelsGained: number, newTitlesUnlocked: string[], reason?: string }}
 */
export function addSkillXp(user, skillName, xpAmount) {
  if (!user) return { success: false, reason: 'INVALID_USER' };

  const validSkill = String(skillName || '').toLowerCase().trim();
  if (!VALID_SKILLS.includes(validSkill)) {
    return { success: false, reason: 'INVALID_SKILL_NAME', skill: skillName };
  }

  const xpNum = Number(xpAmount);
  if (isNaN(xpNum) || xpNum <= 0 || !isFinite(xpNum)) {
    return { success: false, reason: 'INVALID_XP_AMOUNT', skill: validSkill, xpAdded: 0, leveledUp: false };
  }

  user.skills = user.skills || {};
  if (!user.skills[validSkill]) {
    user.skills[validSkill] = { level: 1, xp: 0 };
  }

  const skillObj = user.skills[validSkill];
  const oldLevel = Math.max(1, skillObj.level || 1);
  skillObj.level = oldLevel;
  skillObj.xp = Math.max(0, (skillObj.xp || 0) + Math.floor(xpNum));

  let levelsGained = 0;

  // Multi-level-up resolution loop for skills
  while (true) {
    const requiredXp = getRequiredSkillXp(skillObj.level);
    if (skillObj.xp >= requiredXp) {
      skillObj.xp -= requiredXp;
      skillObj.level += 1;
      levelsGained += 1;
      logger.info(`Player ${user.telegramId} reached ${validSkill.toUpperCase()} Level ${skillObj.level}!`);
    } else {
      break;
    }
  }

  const newTitlesUnlocked = syncTitles(user);

  return {
    success: true,
    skill: validSkill,
    xpAdded: Math.floor(xpNum),
    leveledUp: levelsGained > 0,
    oldLevel,
    newLevel: skillObj.level,
    levelsGained,
    newTitlesUnlocked
  };
}

/**
 * Legacy Title sync stub (Titles system removed).
 * @param {Object} user
 * @returns {string[]}
 */
export function syncTitles(user) {
  return [];
}

export default {
  VALID_SKILLS,
  getRequiredPlayerXp,
  getRequiredSkillXp,
  calculateProgressPercent,
  addPlayerXp,
  addSkillXp,
  syncTitles
};
