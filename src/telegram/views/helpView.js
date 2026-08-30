import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';

/**
 * Renders the streamlined Commands Guide with direct quick-action buttons.
 *
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderHelpView(user) {
  const ownerId = String(user?.telegramId || '0');

  const text = [
    `📜 *REALM COMMANDS & GUIDE* 📜`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Type any slash command or tap the quick buttons below:_`,
    '',
    `🌲 *GATHERING & HARVEST*`,
    `• \`/chop\` or \`/explore\` — Woodcutting in the Forest`,
    `• \`/mine\` — Mining ores in the Granite Quarry`,
    `• \`/fish\` — Fishing along River Rane`,
    '',
    `⚒️ *BLACKSMITH & EQUIPMENT*`,
    `• \`/craft\` — Smelt ingots, cut planks & forge gear`,
    `• \`/tools\` — Inspect, repair & upgrade axes and pickaxes`,
    '',
    `🎒 *ECONOMY & TRADING*`,
    `• \`/bag\` or \`/inventory\` — View stored resources`,
    `• \`/market\` — Global player trade hub`,
    `• \`/sell <item> <qty> <price>\` — List items for sale`,
    `• \`/gift @user <item> <qty>\` — Send gifts to friends`,
    '',
    `🏰 *3D VOXEL BASE & MULTIPLAYER*`,
    `• \`/base\` or \`/build\` — Deep 3D Voxel Minecraft-style Kingdom`,
    `• \`/boss\` — Group Colossus Raid Battle`,
    `• \`/pets\` — Companion pet sanctuary`,
    `• \`/profile\` — Hero level & skill masteries`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🌲 Explore', encodeCallback({ action: 'nav_explore', ownerId })),
      Markup.button.callback('⚒️ Workshop', encodeCallback({ action: 'nav_workshop', ownerId })),
      Markup.button.callback('🎒 Bag', encodeCallback({ action: 'nav_inventory', ownerId, targetId: '1' }))
    ],
    [
      Markup.button.callback('🏰 3D Base', encodeCallback({ action: 'nav_base', ownerId })),
      Markup.button.callback('🐾 Pets', encodeCallback({ action: 'nav_pets', ownerId })),
      Markup.button.callback('👤 Status', encodeCallback({ action: 'nav_profile', ownerId }))
    ],
    [
      Markup.button.callback('🔙 Back', encodeCallback({ action: 'nav_main', ownerId })),
      Markup.button.callback('❌ Close', encodeCallback({ action: 'nav_close', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderHelpView
};
