import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { QUEST_CATEGORIES, QUESTS, getQuestsByCategory } from '../../engine/quests/questConfig.js';
import { ensurePlayerQuests } from '../../engine/quests/questEngine.js';
import { formatNumber, formatProgressBar } from './uiHelpers.js';
import { Item } from '../../models/Item.js';

let itemCatalogCache = null;
let lastItemFetch = 0;

async function getItemInfo(itemId) {
  const now = Date.now();
  if (!itemCatalogCache || now - lastItemFetch > 60000) {
    const items = await Item.find({}).lean();
    itemCatalogCache = new Map(items.map(i => [i.itemId, i]));
    lastItemFetch = now;
  }
  const item = itemCatalogCache.get(itemId);
  return {
    displayName: item?.displayName || itemId.replace(/_/g, ' '),
    emoji: item?.emoji || '📦'
  };
}

/**
 * Screen 1: Quest Hub Main Menu (/quests)
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderQuestHub(user) {
  const ownerId = String(user.telegramId);
  ensurePlayerQuests(user);

  const completedCount = user.quests.filter(q => q.status === 'completed').length;
  const activeCount = user.quests.filter(q => q.status === 'active').length;

  const text = [
    `📜 *REALM QUEST BOARD* 📜`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `⭐ *Your Level:* Level ${user.level || 1}`,
    `🎁 *Rewards Ready to Claim:* ${completedCount}`,
    `⚔️ *Active Quests:* ${activeCount}`,
    '',
    `_Select a quest category:_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📜 Story Quests', encodeCallback({ action: 'qst_cat', ownerId, targetId: 'story' })),
      Markup.button.callback('☀️ Daily Bounties', encodeCallback({ action: 'qst_cat', ownerId, targetId: 'daily' }))
    ],
    [
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Screen 2: Paginated Quest List per Category
 * @param {Object} user
 * @param {'story'|'daily'} categoryId
 * @param {number} [page=1]
 * @returns {{ text: string, keyboard: any }}
 */
export function renderCategoryQuests(user, categoryId, page = 1) {
  const ownerId = String(user.telegramId);
  ensurePlayerQuests(user);

  const category = QUEST_CATEGORIES[categoryId] || QUEST_CATEGORIES.story;
  const questDefs = getQuestsByCategory(category.id);
  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(questDefs.length / pageSize));
  const currentPage = Math.min(totalPages, Math.max(1, page));

  const startIndex = (currentPage - 1) * pageSize;
  const visibleQuests = questDefs.slice(startIndex, startIndex + pageSize);

  const textLines = [
    `${category.emoji} *${category.name.toUpperCase()}* (Page ${currentPage}/${totalPages})`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_${category.description}_`,
    '',
    `_Select a quest to inspect:_`
  ];

  const questButtons = visibleQuests.map(qd => {
    const pq = user.quests.find(q => q && q.questId === qd.questId);
    let statusEmoji = '⏳';
    if (pq?.status === 'completed') statusEmoji = '🎁';
    else if (pq?.status === 'claimed') statusEmoji = '✨';

    return Markup.button.callback(
      `${qd.emoji} ${qd.title} ${statusEmoji}`,
      encodeCallback({ action: 'qst_detail', ownerId, targetId: qd.questId })
    );
  });

  const keyboardRows = [];
  for (let i = 0; i < questButtons.length; i += 2) {
    keyboardRows.push(questButtons.slice(i, i + 2));
  }

  // Pagination Controls
  if (totalPages > 1) {
    const navRow = [];
    if (currentPage > 1) {
      navRow.push(Markup.button.callback('◀️ Prev', encodeCallback({ action: 'qst_cat_page', ownerId, targetId: `${category.id}:${currentPage - 1}` })));
    }
    navRow.push(Markup.button.callback(`• ${currentPage}/${totalPages} •`, encodeCallback({ action: 'noop', ownerId })));
    if (currentPage < totalPages) {
      navRow.push(Markup.button.callback('Next ▶️', encodeCallback({ action: 'qst_cat_page', ownerId, targetId: `${category.id}:${currentPage + 1}` })));
    }
    keyboardRows.push(navRow);
  }

  keyboardRows.push([
    Markup.button.callback('⬅️ Back to Hub', encodeCallback({ action: 'nav_quests', ownerId }))
  ]);

  return { text: textLines.join('\n'), keyboard: Markup.inlineKeyboard(keyboardRows) };
}

/**
 * Screen 3: Quest Details, Progress Checklist & Claim Button
 * @param {Object} user
 * @param {string} questId
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderQuestDetails(user, questId) {
  const ownerId = String(user.telegramId);
  ensurePlayerQuests(user);

  const questDef = QUESTS[questId];
  if (!questDef) {
    return {
      text: `⚠️ *Quest nahi mila.*`,
      keyboard: Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', encodeCallback({ action: 'nav_quests', ownerId }))]])
    };
  }

  const pq = user.quests.find(q => q && q.questId === questId);
  const status = pq?.status || 'active';

  const reqLines = [];
  for (const req of questDef.requirements) {
    const prog = pq?.progress?.find(p => p.targetId.toLowerCase() === req.targetId.toLowerCase());
    const current = prog?.current || 0;
    const required = req.count;
    const bar = formatProgressBar(current, required, 8);
    const itemInfo = await getItemInfo(req.targetId);

    const typeDesc = req.type === 'gather_item' ? 'Harvest' : req.type === 'craft_item' ? 'Craft' : 'Trade';
    const checkEmoji = current >= required ? '✅' : '⏳';

    reqLines.push(`  • ${typeDesc} ${itemInfo.emoji} *${itemInfo.displayName}*: ${bar} ${checkEmoji}`);
  }

  const rewardLines = [];
  if (questDef.rewards.coins > 0) rewardLines.push(`  • 🪙 *${questDef.rewards.coins} Coins*`);
  if (questDef.rewards.playerXp > 0) rewardLines.push(`  • 📈 *+${questDef.rewards.playerXp} Player XP*`);
  if (Array.isArray(questDef.rewards.items)) {
    for (const rewItem of questDef.rewards.items) {
      const itemInfo = await getItemInfo(rewItem.itemId);
      rewardLines.push(`  • ${itemInfo.emoji} *${rewItem.quantity}x ${itemInfo.displayName}*`);
    }
  }

  let statusMsg = '';
  if (status === 'completed') {
    statusMsg = `🎉 *Quest Completed!* Claim button tap karke reward lo!`;
  } else if (status === 'claimed') {
    statusMsg = `✨ *Rewards Claimed!*`;
  } else {
    statusMsg = `⚔️ *In Progress:* Requirements complete karke reward unlock karo.`;
  }

  const text = [
    `${questDef.emoji} *${questDef.title.toUpperCase()}*`,
    `📂 *Type:* ${questDef.category === 'story' ? 'Story Chronicle' : 'Daily Bounty'}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_${questDef.description}_`,
    '',
    `🎯 *Requirements:*`,
    reqLines.join('\n'),
    '',
    `🎁 *Rewards:*`,
    rewardLines.join('\n'),
    '',
    statusMsg
  ].join('\n');

  const actionButtons = [];
  if (status === 'completed') {
    actionButtons.push(Markup.button.callback('🎁 Claim Reward', encodeCallback({ action: 'qst_claim_do', ownerId, targetId: questDef.questId })));
  }
  actionButtons.push(Markup.button.callback('⬅️ Back', encodeCallback({ action: 'qst_cat', ownerId, targetId: questDef.category })));

  const keyboard = Markup.inlineKeyboard([actionButtons]);

  return { text, keyboard };
}

/**
 * Screen 4: Quest Claim Outcome View
 * @param {Object} user
 * @param {Object} result
 * @returns {Promise<{ text: string, keyboard: any }>}
 */
export async function renderQuestClaimResult(user, result) {
  const ownerId = String(user.telegramId);

  if (!result.success) {
    const errorMessages = {
      QUEST_ALREADY_CLAIMED: `✨ *Yeh quest already claim ho chuka hai.*`,
      QUEST_NOT_COMPLETED: `⏳ *Quest abhi complete nahi hua hai.*`,
      QUEST_NOT_FOUND: `⚠️ *Unknown quest identifier.*`
    };

    const text = [
      `⚠️ *REWARD CLAIM FAILED*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      errorMessages[result.reason] || `Reward claim nahi ho paya: ${result.reason}`
    ].join('\n');

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('⬅️ Back to Quests', encodeCallback({ action: 'nav_quests', ownerId }))
      ]
    ]);

    return { text, keyboard };
  }

  // Successful Claim
  const itemRewards = [];
  if (Array.isArray(result.itemsGranted)) {
    for (const item of result.itemsGranted) {
      const itemInfo = await getItemInfo(item.itemId);
      itemRewards.push(`${itemInfo.emoji} ${item.quantity}x ${itemInfo.displayName}`);
    }
  }

  const levelUpText = result.leveledUp
    ? `\n🎊 *LEVEL UP!* Advanced to *Level ${result.newLevel}*! 🎊\n`
    : '';

  const text = [
    `🎉 *QUEST REWARD CLAIMED!*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🌟 *Quest:* ${result.title}`,
    levelUpText,
    `🎁 *Rewards Received:*`,
    `  • 🪙 *+${result.coinsReward} Coins* (Total: ${formatNumber(result.totalCoins)}c)`,
    `  • 📈 *+${result.xpReward} Player XP*`,
    itemRewards.length > 0 ? `  • 📦 ${itemRewards.join(', ')}` : '',
    '',
    `_Rewards treasury aur backpack mein deliver ho gaye!_`
  ].filter(Boolean).join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📜 More Quests', encodeCallback({ action: 'qst_cat', ownerId, targetId: result.category })),
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderQuestHub,
  renderCategoryQuests,
  renderQuestDetails,
  renderQuestClaimResult
};
