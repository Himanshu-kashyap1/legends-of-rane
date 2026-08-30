import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { MIN_GIFT_LEVEL, MAX_DAILY_GIFTS, checkDailyGifts } from '../../engine/social/giftingEngine.js';

/**
 * Renders the Social Gifting Hub & Help screen (/gift)
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderGiftingHub(user) {
  const ownerId = String(user.telegramId);
  const { giftsSentToday, remainingGiftsToday } = checkDailyGifts(user);
  const isEligible = (user.level || 1) >= MIN_GIFT_LEVEL;
  const levelCheck = isEligible ? '✅' : '🔒';

  const text = [
    `🎁 *ROYAL SOCIAL GIFTING* 🎁`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Send surplus crafting supplies and rare materials to your friends and guildmates!_`,
    '',
    `⭐ *Your Level:* Level ${user.level || 1} ${levelCheck} (Required: Level ${MIN_GIFT_LEVEL}+)`,
    `📅 *Daily Quota:* ${giftsSentToday}/${MAX_DAILY_GIFTS} Gifts Sent (${remainingGiftsToday} remaining today)`,
    '',
    `📌 *How to Send a Gift:*`,
    `Use the command syntax in chat:`,
    `\`/gift @username <itemId> <quantity>\``,
    '',
    `💡 *Examples:*`,
    `• \`/gift @friend wood_oak 10\` (Sends 10 Oak Wood)`,
    `• \`/gift @friend ingot_iron 2\` (Sends 2 Iron Ingots)`,
    '',
    `_Note: Recipient must have joined Legends of Rane via /start._`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🎒 View Inventory', encodeCallback({ action: 'nav_inventory', ownerId, targetId: '1' })),
      Markup.button.callback('🏪 Marketplace', encodeCallback({ action: 'nav_market', ownerId }))
    ],
    [
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Renders the Gift Action Outcome View
 * @param {Object} user
 * @param {Object} result
 * @returns {{ text: string, keyboard: any }}
 */
export function renderGiftingResult(user, result) {
  const ownerId = String(user.telegramId);

  if (!result.success) {
    const errorMessages = {
      INSUFFICIENT_LEVEL: `⭐ *Level Kam Hai!* Gifting unlock karne ke liye Level ${result.requiredLevel}+ required hai. (Aapka Level: ${result.currentLevel})`,
      DAILY_LIMIT_REACHED: `📅 *Daily Quota Exceeded!* Aaj ka daily gift quota (${result.maxDaily}/${result.maxDaily} gifts) complete ho chuka hai. UTC midnight par reset hoga.`,
      INSUFFICIENT_INVENTORY: `📦 *Inventory Kam Hai!* Required: ${result.required}, Owned: ${result.owned}.`,
      RECIPIENT_NOT_FOUND: `⚠️ *Recipient Player Nahi Mila!* Make sure unka username correct hai aur unhone bot ko /start kiya hua hai.`,
      CANNOT_GIFT_SELF: `🚫 *Aap apne aap ko gift nahi bhej sakte.*`,
      INVALID_QUANTITY: `⚠️ *Quantity positive integer honi chahiye.* Example: \`/gift @friend wood_oak 5\``,
      ITEM_NOT_FOUND: `⚠️ *Unknown item identifier.*`
    };

    const text = [
      `⚠️ *GIFT TRANSFER FAILED*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      errorMessages[result.reason] || `Gift could not be delivered: ${result.reason}`
    ].join('\n');

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🎒 View Backpack', encodeCallback({ action: 'nav_inventory', ownerId, targetId: '1' })),
        Markup.button.callback('🎁 Gifting Help', encodeCallback({ action: 'nav_gift_help', ownerId }))
      ],
      [
        Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
      ]
    ]);

    return { text, keyboard };
  }

  // Successful Gift Transfer
  const text = [
    `🎉 *GIFT SENT SUCCESSFULLY!*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🎁 *Delivered:* ${result.quantity}x ${result.itemEmoji} ${result.itemDisplayName}`,
    `👤 *Recipient:* ${result.recipientName}`,
    `📅 *Daily Quota Remaining:* ${result.remainingGiftsToday}/${MAX_DAILY_GIFTS} gifts left today`,
    `📦 *Remaining in Inventory:* ${result.remainingInventory} units`,
    '',
    `_Items have been placed directly into recipient's backpack!_`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🎒 View Backpack', encodeCallback({ action: 'nav_inventory', ownerId, targetId: '1' })),
      Markup.button.callback('🏪 Marketplace', encodeCallback({ action: 'nav_market', ownerId }))
    ],
    [
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderGiftingHub,
  renderGiftingResult
};
