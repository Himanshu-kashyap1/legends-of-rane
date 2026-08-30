import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';

export const COMMAND_CATALOG = {
  chop: {
    name: '/chop',
    category: '🌲 Gathering & Harvest',
    desc: 'Instantly cut oak and rare timber in the Whispering Woods.',
    usage: '`/chop`',
    example: '`/chop`',
    alt: '`/explore`'
  },
  mine: {
    name: '/mine',
    category: '🌲 Gathering & Harvest',
    desc: 'Mine granite, coal, iron, gold, and diamonds from the Quarry.',
    usage: '`/mine`',
    example: '`/mine`',
    alt: '`/explore`'
  },
  fish: {
    name: '/fish',
    category: '🌲 Gathering & Harvest',
    desc: 'Cast your line in River Rane for aquatic items and pearls.',
    usage: '`/fish`',
    example: '`/fish`',
    alt: '`/explore`'
  },
  explore: {
    name: '/explore',
    category: '🌲 Gathering & Harvest',
    desc: 'Browse all gathering territories, resource nodes, and zones.',
    usage: '`/explore` or `/gather`',
    example: '`/explore`',
    alt: '`/chop`, `/mine`, `/fish`'
  },
  craft: {
    name: '/craft',
    category: '⚒️ Blacksmith & Workshop',
    desc: 'Smelt metal ingots, saw timber planks, and forge equipment.',
    usage: '`/craft` or `/workshop`',
    example: '`/craft`',
    alt: '`/tools`'
  },
  tools: {
    name: '/tools',
    category: '⚒️ Blacksmith & Workshop',
    desc: 'Inspect tool durability, repair broken tools, and upgrade tiers.',
    usage: '`/tools` (or `/tools repair`, `/tools upgrade`)',
    example: '`/tools`',
    alt: '`/craft`'
  },
  bag: {
    name: '/bag',
    category: '🎒 Economy & Trading',
    desc: 'Open backpack to inspect materials, ores, tools, and coins.',
    usage: '`/bag` or `/inventory`',
    example: '`/bag`',
    alt: '`/inventory`'
  },
  inventory: {
    name: '/inventory',
    category: '🎒 Economy & Trading',
    desc: 'Open backpack to inspect materials, ores, tools, and coins.',
    usage: '`/inventory` or `/bag`',
    example: '`/inventory`',
    alt: '`/bag`'
  },
  market: {
    name: '/market',
    category: '🎒 Economy & Trading',
    desc: 'Browse active player marketplace orders to buy materials.',
    usage: '`/market`',
    example: '`/market`',
    alt: '`/sell`'
  },
  sell: {
    name: '/sell',
    category: '🎒 Economy & Trading',
    desc: 'List your materials for sale on the global orderbook.',
    usage: '`/sell <item_id> <quantity> <price>`',
    example: '`/sell wood_oak 10 50`',
    alt: '`/market`'
  },
  gift: {
    name: '/gift',
    category: '🎒 Economy & Trading',
    desc: 'Send items directly to friends in Telegram groups (Level 3+).',
    usage: '`/gift @username <item_id> <quantity>`',
    example: '`/gift @Arthur wood_oak 5`',
    alt: '`/bag`'
  },
  base: {
    name: '/base',
    category: '🏰 3D Voxel Base & Multiplayer',
    desc: 'Launch the deep 3D Minecraft-style Holy Sanctuary Mini App.',
    usage: '`/base` or `/build`',
    example: '`/base`',
    alt: '`/build`'
  },
  build: {
    name: '/build',
    category: '🏰 3D Voxel Base & Multiplayer',
    desc: 'Launch the deep 3D Minecraft-style Holy Sanctuary Mini App.',
    usage: '`/build` or `/base`',
    example: '`/build`',
    alt: '`/base`'
  },
  boss: {
    name: '/boss',
    category: '🏰 3D Voxel Base & Multiplayer',
    desc: 'Summon and strike the Ancient Granite Colossus in group chats.',
    usage: '`/boss` or `/groupnode`',
    example: '`/boss`',
    alt: '`/groupnode`'
  },
  pets: {
    name: '/pets',
    category: '🏰 3D Voxel Base & Multiplayer',
    desc: 'Adopt, feed, and equip companion beasts for yield bonuses.',
    usage: '`/pets` (or `/pets feed <name>`, `/pets equip <name>`)',
    example: '`/pets`',
    alt: '`/profile`'
  },
  profile: {
    name: '/profile',
    category: '🏰 3D Voxel Base & Multiplayer',
    desc: 'Check your hero level, coin treasury, and 5 skill masteries.',
    usage: '`/profile`',
    example: '`/profile`',
    alt: '`/bag`'
  },
  quests: {
    name: '/quests',
    category: '🏰 3D Voxel Base & Multiplayer',
    desc: 'Track daily bounties and claim progression rewards.',
    usage: '`/quests` or `/quest`',
    example: '`/quests`',
    alt: '`/profile`'
  },
  offline: {
    name: '/offline',
    category: '🏰 3D Voxel Base & Multiplayer',
    desc: 'Collect idle structure earnings (Lumber Mill, Quarry, Forge).',
    usage: '`/offline`',
    example: '`/offline`',
    alt: '`/profile`'
  }
};

/**
 * Renders the primary aesthetic /guide screen with small-caps headers & quote blocks.
 *
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderHelpView(user) {
  const ownerId = String(user?.telegramId || '0');

  const text = [
    `📜 *LEGENDS OF RANE — COMMAND GUIDE* 📜`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `❗️ *ᴜꜱᴀɢᴇ :* \`/guide [command_name]\``,
    `👉 *ᴀᴠᴀɪʟᴀʙʟᴇ ᴄᴏᴍᴍᴀɴᴅꜱ :* \`chop\`, \`mine\`, \`fish\`, \`explore\`, \`craft\`, \`tools\`, \`bag\`, \`market\`, \`sell\`, \`gift\`, \`base\`, \`boss\`, \`pets\`, \`profile\`, \`quests\`, \`offline\``,
    '',
    `🌲 *ɢᴀᴛʜᴇʀɪɴɢ & ʜᴀʀᴠᴇꜱᴛ*`,
    `> • \`/chop\` or \`/explore\` — Woodcutting in Forest`,
    `> • \`/mine\` — Mining ores in Granite Quarry`,
    `> • \`/fish\` — Fishing along River Rane`,
    '',
    `⚒️ *ʙʟᴀᴄᴋꜱᴍɪᴛʜ & ᴇQᴜɪᴘᴍᴇɴᴛ*`,
    `> • \`/craft\` — Smelt ingots, cut planks & forge gear`,
    `> • \`/tools\` — Inspect, repair & upgrade axes and pickaxes`,
    '',
    `🎒 *ᴇᴄᴏɴᴏᴍʏ & ᴛʀᴀᴅɪɴɢ*`,
    `> • \`/bag\` or \`/inventory\` — View stored resources`,
    `> • \`/market\` — Global player trade hub`,
    `> • \`/sell <item> <qty> <price>\` — List items for sale`,
    `> • \`/gift @user <item> <qty>\` — Send gifts to friends`,
    '',
    `🏰 *3ᴅ ᴠᴏxᴇʟ ʙᴀꜱᴇ & ᴍᴜʟᴛɪᴘʟᴀʏᴇʀ*`,
    `> • \`/base\` or \`/build\` — Deep 3D Voxel Minecraft Kingdom`,
    `> • \`/boss\` — Group Colossus Raid Battle`,
    `> • \`/pets\` — Companion pet sanctuary`,
    `> • \`/profile\` — Hero level & skill masteries`,
    `> • \`/quests\` — Daily bounties & progression`,
    `> • \`/offline\` — Claim idle structure earnings`
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

/**
 * Renders a specific command's targeted guide card.
 *
 * @param {Object} user
 * @param {string} commandName
 * @returns {{ text: string, keyboard: any }}
 */
export function renderCommandDetailView(user, commandName) {
  const ownerId = String(user?.telegramId || '0');
  const cleanCmd = (commandName || '').toLowerCase().trim().replace(/^\//, '');
  const cmd = COMMAND_CATALOG[cleanCmd];

  if (!cmd) {
    const text = [
      `⚠️ *Unknown Command:* \`/${cleanCmd}\``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `❗️ *ᴜꜱᴀɢᴇ :* \`/guide [command_name]\``,
      `👉 *ᴀᴠᴀɪʟᴀʙʟᴇ ᴄᴏᴍᴍᴀɴᴅꜱ :* \`chop\`, \`mine\`, \`fish\`, \`explore\`, \`craft\`, \`tools\`, \`bag\`, \`market\`, \`sell\`, \`gift\`, \`base\`, \`boss\`, \`pets\`, \`profile\`, \`quests\`, \`offline\``,
      '',
      `_Type \`/guide\` to view all categories._`
    ].join('\n');

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('📜 All Commands', encodeCallback({ action: 'nav_help', ownerId })),
        Markup.button.callback('❌ Close', encodeCallback({ action: 'nav_close', ownerId }))
      ]
    ]);

    return { text, keyboard };
  }

  const text = [
    `📖 *ᴄᴏᴍᴍᴀɴᴅ ɢᴜɪᴅᴇ :* \`${cmd.name}\``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `> 💡 *Category:* ${cmd.category}`,
    `> 📝 *Description:* ${cmd.desc}`,
    `> ❗️ *Usage:* ${cmd.usage}`,
    `> 🎯 *Example:* ${cmd.example}`,
    `> 🔄 *Alternative:* ${cmd.alt}`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📜 All Commands', encodeCallback({ action: 'nav_help', ownerId })),
      Markup.button.callback('❌ Close', encodeCallback({ action: 'nav_close', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderHelpView,
  renderCommandDetailView,
  COMMAND_CATALOG
};
