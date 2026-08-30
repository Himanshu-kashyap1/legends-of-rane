import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { calculateOfflineEarnings } from '../../engine/offline/offlineEngine.js';
import { formatNumber } from './uiHelpers.js';

/**
 * Screen 1: Offline Earnings Inspection Card (/offline)
 * @param {Object} user
 * @param {Date} [now=new Date()]
 * @returns {{ text: string, keyboard: any }}
 */
export function renderOfflineCard(user, now = new Date()) {
  const ownerId = String(user.telegramId);
  const earnings = calculateOfflineEarnings({ user, now });

  let text = '';
  const actionRow = [];

  if (!earnings.hasEarnings) {
    text = [
      `🌙 *OFFLINE IDLE TREASURY* 🌙`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_Aap abhi recently active the. Offline earnings generate hone ke liye kam se kam 5 minute time lagta hai._`,
      '',
      `⏳ *Current Away Time:* ${earnings.elapsedFormatted}`,
      `⚙️ *Idle Simulation Cap:* 12 Hours max`,
      '',
      `_Jab aap realm chhod kar jayenge, aapke Lumber Mills, Quarries, aur Gold Forges continuous resources harvest karenge!_`
    ].join('\n');

    actionRow.push(
      Markup.button.callback('🌲 Go Exploring', encodeCallback({ action: 'nav_explore', ownerId })),
      Markup.button.callback('🎒 View Backpack', encodeCallback({ action: 'nav_inventory', ownerId, targetId: '1' }))
    );
  } else {
    const resLines = earnings.resources.map(r => `  • ${r.emoji} *${r.name}:* +${r.quantity}`);
    const petLine = earnings.petBonus
      ? `\n✨ *Pet Bonus:* ${earnings.petBonus.emoji} +${earnings.petBonus.bonusPercent}% (${earnings.petBonus.petName})\n`
      : '';

    text = [
      `🌙 *OFFLINE IDLE TREASURY* 🌙`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_While you rested outside Rane, your realm structures continued working tirelessly!_`,
      '',
      `⏳ *Time Away:* ${earnings.elapsedFormatted}`,
      petLine,
      `📦 *Harvested Resources & Wealth:*`,
      ...resLines,
      `  • 🪙 *Treasury Coins:* +${formatNumber(earnings.coins)} Coins`,
      '',
      earnings.isCapped ? `⚠️ *Max 12-hour simulation cap reached.* Claim rewards now to resume idle production!\n` : '',
      `Tap button below to deposit everything into your inventory:`
    ].filter(Boolean).join('\n');

    actionRow.push(
      Markup.button.callback('✅ Claim Earnings', encodeCallback({ action: 'claim_offline_do', ownerId })),
      Markup.button.callback('🎒 Backpack', encodeCallback({ action: 'nav_inventory', ownerId, targetId: '1' }))
    );
  }

  const keyboard = Markup.inlineKeyboard([
    actionRow,
    [
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 2: Offline Claim Outcome View
 * @param {Object} user
 * @param {Object} result
 * @returns {{ text: string, keyboard: any }}
 */
export function renderOfflineClaimResult(user, result) {
  const ownerId = String(user.telegramId);

  if (!result.success) {
    const text = [
      `⚠️ *NO OFFLINE EARNINGS*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_Aapke paas claim karne ke liye koi unclaimed offline earnings nahi hain._`,
      `_Thoda time rest karein aur wapas aakar rewards collect karein!_`
    ].join('\n');

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🌲 Go Exploring', encodeCallback({ action: 'nav_explore', ownerId })),
        Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
      ]
    ]);

    return { text, keyboard };
  }

  const resList = result.earnings.resources.map(r => `${r.emoji} +${r.quantity} ${r.name}`).join(', ');

  const text = [
    `🎉 *OFFLINE TREASURY CLAIMED!*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Your idle earnings have been deposited into your vaults and backpacks!_`,
    '',
    `🎁 *Rewards Deposited:*`,
    `  • 🪙 *+${formatNumber(result.earnings.coins)} Coins*`,
    `  • 📦 ${resList}`,
    '',
    `🪙 *Total Treasury Balance:* ${formatNumber(result.totalCoins)} Coins`,
    `_Your automated structures have begun a new production cycle!_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🎒 View Backpack', encodeCallback({ action: 'nav_inventory', ownerId, targetId: '1' })),
      Markup.button.callback('🌲 Go Exploring', encodeCallback({ action: 'nav_explore', ownerId }))
    ],
    [
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderOfflineCard,
  renderOfflineClaimResult
};
