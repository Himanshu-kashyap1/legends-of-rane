import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { formatNumber, formatProgressBar } from './uiHelpers.js';
import { BOSS_COMBAT_CONFIG } from '../../engine/combat/bossConfig.js';

/**
 * Screen 1: Active Group Colossus Boss Status Card
 * @param {Object} boss - Mongoose Boss document
 * @param {Object} user - Current Telegram User
 * @param {Object|null} [lastAttack=null]
 * @returns {{ text: string, keyboard: any }}
 */
export function renderBossStatus(boss, user, lastAttack = null) {
  const ownerId = String(user?.telegramId || '0');
  const chatId = String(boss.chatId);

  const hpBar = formatProgressBar(boss.currentHp, boss.maxHp, 10);
  const totalDmg = Math.max(1, boss.totalDamageDealt || 1);

  const playerTgId = String(user?.telegramId);
  const participant = boss.participants?.find(p => p && p.telegramId === playerTgId);
  const playerDmg = participant?.damageDealt || 0;
  const playerShare = Math.min(100, Math.floor((playerDmg / totalDmg) * 100));

  const lastStrikeLine = lastAttack
    ? `\n💥 *Last Strike:* _+${lastAttack.damageDealt} DMG dealt!_ ${lastAttack.isCrit ? '🔥 *(CRITICAL HIT!)*' : ''}\n`
    : '';

  const text = [
    `${boss.emoji} *${boss.name.toUpperCase()}* ${boss.emoji}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_A colossal titan has arisen! Warriors of this realm must unite!_`,
    '',
    `❤️ *Boss Health:* ${formatNumber(boss.currentHp)} / ${formatNumber(boss.maxHp)}`,
    `  \`${hpBar}\``,
    lastStrikeLine,
    `⚔️ *Your Damage:* ${formatNumber(playerDmg)} DMG (${playerShare}% share)`,
    `👥 *Warriors Engaged:* ${boss.participants?.length || 0} fighters`,
    `⚡ *Attack Cost:* ${BOSS_COMBAT_CONFIG.ATTACK_ENERGY_COST} Energy`,
    '',
    `_Attack karne ke liye button tap karo:_`
  ].filter(Boolean).join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('⚔️ Attack (10⚡)', encodeCallback({ action: 'boss_attack_do', ownerId: '0', targetId: chatId })),
      Markup.button.callback('📊 Leaderboard', encodeCallback({ action: 'boss_board', ownerId: '0', targetId: chatId }))
    ],
    [
      Markup.button.callback('🔄 Refresh Status', encodeCallback({ action: 'boss_refresh', ownerId: '0', targetId: chatId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 2: Raid Contribution Leaderboard
 * @param {Object} boss
 * @returns {{ text: string, keyboard: any }}
 */
export function renderBossLeaderboard(boss) {
  const chatId = String(boss.chatId);
  const participants = [...(boss.participants || [])].sort((a, b) => (b.damageDealt || 0) - (a.damageDealt || 0));
  const totalDmg = Math.max(1, boss.totalDamageDealt || 1);

  const topRows = participants.slice(0, 8).map((p, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⚔️';
    const percent = Math.min(100, Math.floor(((p.damageDealt || 0) / totalDmg) * 100));
    return `${medal} *${p.username || 'Warrior'}:* ${formatNumber(p.damageDealt)} DMG (${percent}%)`;
  });

  const text = [
    `📊 *COLOSSUS RAID LEADERBOARD* 📊`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🏆 *Top Damage Contributors:*`,
    topRows.length > 0 ? topRows.join('\n') : `_No warriors have struck the boss yet!_`,
    '',
    `💥 *Total Raid Damage Dealt:* ${formatNumber(boss.totalDamageDealt)} DMG`,
    `_Rewards are automatically distributed proportionally upon defeat!_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('⚔️ Return to Battle', encodeCallback({ action: 'boss_refresh', ownerId: '0', targetId: chatId })),
      Markup.button.callback('🔄 Refresh Board', encodeCallback({ action: 'boss_board', ownerId: '0', targetId: chatId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 3: Boss Defeat & Victory Report
 * @param {Object} boss
 * @param {Array<Object>} rewardsSummary
 * @returns {{ text: string, keyboard: any }}
 */
export function renderBossDefeatView(boss, rewardsSummary = []) {
  const chatId = String(boss.chatId);

  const winnerLines = (rewardsSummary || []).slice(0, 5).map((w, idx) => {
    const medal = idx === 0 ? '👑 MVP' : `#${idx + 1}`;
    const rareDropStr = (w.rareDrops || []).map(d => `${d.emoji} ${d.displayName}`).join(', ');
    const dropText = rareDropStr ? ` + ${rareDropStr}` : '';
    return `• ${medal} *${w.username}:* +${formatNumber(w.coinsReward)}c, +${w.xpReward}XP${dropText} (${w.sharePercent}%)`;
  });

  const text = [
    `🎊 *COLOSSUS HAS BEEN SHATTERED!* 🎊`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🗿 *${boss.name}* has fallen under the combined might of your guild!`,
    '',
    `🎁 *Raid Rewards Distributed:*`,
    winnerLines.length > 0 ? winnerLines.join('\n') : `_Rewards distributed to all contributors._`,
    '',
    `_Coins, XP, and rare gemstone drops have been delivered directly to participants' accounts!_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('⚔️ Awaken New Titan', encodeCallback({ action: 'boss_respawn', ownerId: '0', targetId: chatId })),
      Markup.button.callback('📊 View Final Board', encodeCallback({ action: 'boss_board', ownerId: '0', targetId: chatId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 4: Private Chat Error Notice
 * @returns {{ text: string, keyboard: any }}
 */
export function renderPrivateChatError() {
  const text = [
    `⚠️ *GROUP RAID ONLY* ⚠️`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Colossus Boss fights require group coordination and can only be summoned inside Telegram Groups!_`,
    '',
    `📌 *How to play:*`,
    `  1. Add this bot to your Telegram Group.`,
    `  2. Type */boss* ya */groupnode* in the group.`,
    `  3. Rally your guild to battle together!`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🌲 Explore Wilderness', encodeCallback({ action: 'nav_explore', ownerId: '0' })),
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId: '0' }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderBossStatus,
  renderBossLeaderboard,
  renderBossDefeatView,
  renderPrivateChatError
};
