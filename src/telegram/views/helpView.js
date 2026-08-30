import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';

export const CATEGORIES_CONFIG = {
  gathering: {
    key: 'gathering',
    title: '🌲 GATHERING & HARVEST ❞',
    displayName: '🌲 GATHERING & HARVEST',
    triggers: ['gathering', 'harvest', 'gathering & harvest', '🌲 gathering & harvest', '🌲 gathering & harvest ❞', 'woodcutting', 'mining', 'fishing'],
    commands: [
      { cmd: '/chop', desc: 'Fast woodcutting harvest in the Whispering Woods' },
      { cmd: '/mine', desc: 'Mining granite, coal, iron, gold & diamonds in the Quarry' },
      { cmd: '/fish', desc: 'Fishing for aquatic treasures along River Rane' },
      { cmd: '/explore', desc: 'Browse all gathering territories, zones & nodes' }
    ]
  },
  blacksmith: {
    key: 'blacksmith',
    title: '⚒️ BLACKSMITH & EQUIPMENT ❞',
    displayName: '⚒️ BLACKSMITH & EQUIPMENT',
    triggers: ['blacksmith', 'equipment', 'blacksmith & equipment', '⚒️ blacksmith & equipment', '⚒️ blacksmith & equipment ❞', 'workshop', 'craft', 'tools'],
    commands: [
      { cmd: '/craft', desc: 'Smelt ingots, cut planks & forge gear' },
      { cmd: '/tools', desc: 'Inspect tool durability, repair broken tools & upgrade tiers' },
      { cmd: '/tools repair', desc: 'Quick repair damaged equipment' },
      { cmd: '/tools upgrade', desc: 'Upgrade tools to higher tiers (Stone, Iron, Gold, Diamond)' }
    ]
  },
  economy: {
    key: 'economy',
    title: '🎒 ECONOMY & TRADING ❞',
    displayName: '🎒 ECONOMY & TRADING',
    triggers: ['economy', 'trading', 'economy & trading', '🎒 economy & trading', '🎒 economy & trading ❞', 'bag', 'inventory', 'market', 'sell', 'gift'],
    commands: [
      { cmd: '/bag', desc: 'View stored resources, tools & treasury balance' },
      { cmd: '/inventory', desc: 'Full backpack browser with page navigation' },
      { cmd: '/market', desc: 'Global player trade hub orderbook' },
      { cmd: '/sell <item> <qty> <price>', desc: 'List your items on the market (e.g. `/sell wood_oak 10 50`)' },
      { cmd: '/gift @user <item> <qty>', desc: 'Send gifts directly to friends in group chats (Level 3+)' }
    ]
  },
  base: {
    key: 'base',
    title: '🏰 3D VOXEL BASE & MULTIPLAYER ❞',
    displayName: '🏰 3D VOXEL BASE & MULTIPLAYER',
    triggers: ['3d voxel', 'voxel', 'base', 'multiplayer', '3d voxel base & multiplayer', '🏰 3d voxel base & multiplayer', '🏰 3d voxel base & multiplayer ❞', 'boss', 'pets', 'profile', 'quests', 'offline'],
    commands: [
      { cmd: '/base', desc: 'Launch Deep 3D Voxel Minecraft-style Kingdom Mini App' },
      { cmd: '/boss', desc: 'Summon and strike the Ancient Colossus in group chats' },
      { cmd: '/pets', desc: 'Companion pet sanctuary (adopt, feed, equip)' },
      { cmd: '/profile', desc: 'Hero level, coins treasury & 5 skill masteries' },
      { cmd: '/quests', desc: 'Daily bounties & progression milestones' },
      { cmd: '/offline', desc: 'Claim idle structure earnings (Lumber Mill, Quarry, Forge)' }
    ]
  }
};

/**
 * Renders the main /guide view matching the exact aesthetic screenshot provided.
 *
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderHelpView(user) {
  const ownerId = String(user?.telegramId || '0');

  const text = [
    `📜 *LEGENDS OF RANE — COMMAND GUIDE* 📜`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `COPY THESE WORD'S TO GET INFO OFF THAT PARTITION COMMANDS`,
    `👇`,
    '',
    `> 🌲 GATHERING & HARVEST ❞`,
    '',
    `> ⚒️ BLACKSMITH & EQUIPMENT ❞`,
    '',
    `> 🎒 ECONOMY & TRADING ❞`,
    '',
    `> 🏰 3D VOXEL BASE & MULTIPLAYER ❞`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🌲 Gathering', encodeCallback({ action: 'help_cat', ownerId, targetId: 'gathering' })),
      Markup.button.callback('⚒️ Blacksmith', encodeCallback({ action: 'help_cat', ownerId, targetId: 'blacksmith' }))
    ],
    [
      Markup.button.callback('🎒 Economy', encodeCallback({ action: 'help_cat', ownerId, targetId: 'economy' })),
      Markup.button.callback('🏰 3D Base', encodeCallback({ action: 'help_cat', ownerId, targetId: 'base' }))
    ],
    [
      Markup.button.callback('🔙 Back', encodeCallback({ action: 'nav_main', ownerId })),
      Markup.button.callback('❌ Close', encodeCallback({ action: 'nav_close', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Renders all commands under a specific partition/category.
 *
 * @param {Object} user
 * @param {string} categoryKey
 * @returns {{ text: string, keyboard: any }}
 */
export function renderCategoryDetailView(user, categoryKey) {
  const ownerId = String(user?.telegramId || '0');
  const cat = CATEGORIES_CONFIG[categoryKey];

  if (!cat) {
    return renderHelpView(user);
  }

  const lines = [
    `📜 *${cat.displayName}* 📜`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Commands inside this partition:_`,
    ''
  ];

  for (const item of cat.commands) {
    lines.push(`> • \`${item.cmd}\` — ${item.desc} ❞`);
  }

  const text = lines.join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📜 All Categories', encodeCallback({ action: 'nav_help', ownerId })),
      Markup.button.callback('❌ Close', encodeCallback({ action: 'nav_close', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

/**
 * Renders detail view for a specific command lookup.
 * E.g., `/guide chop` or `/help market`
 *
 * @param {Object} user
 * @param {string} commandArg
 * @returns {{ text: string, keyboard: any }}
 */
export function renderCommandDetailView(user, commandArg) {
  const ownerId = String(user?.telegramId || '0');
  const cleanArg = (commandArg || '').trim().toLowerCase().replace(/^\//, '');

  // Check if it's a category first
  const matchedCat = matchCategoryFromText(cleanArg) || (CATEGORIES_CONFIG[cleanArg] ? cleanArg : null);
  if (matchedCat) {
    return renderCategoryDetailView(user, matchedCat);
  }

  // Look for specific command in categories
  let foundCommand = null;
  let parentCat = null;

  for (const cat of Object.values(CATEGORIES_CONFIG)) {
    for (const cmd of cat.commands) {
      const bareCmd = cmd.cmd.split(' ')[0].replace(/^\//, '').toLowerCase();
      if (bareCmd === cleanArg) {
        foundCommand = cmd;
        parentCat = cat;
        break;
      }
    }
    if (foundCommand) break;
  }

  if (foundCommand) {
    const text = [
      `📜 *COMMAND INFO: \`${foundCommand.cmd}\`* 📜`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `*Category:* ${parentCat.displayName}`,
      `*Description:* ${foundCommand.desc}`,
      '',
      `_Type \`${foundCommand.cmd}\` to execute this action._`
    ].join('\n');

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('📜 All Commands', encodeCallback({ action: 'nav_help', ownerId })),
        Markup.button.callback('❌ Close', encodeCallback({ action: 'nav_close', ownerId }))
      ]
    ]);

    return { text, keyboard };
  }

  // Not found fallback
  const text = [
    `❓ *COMMAND NOT FOUND: \`/${cleanArg}\`*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Please check the available categories below or type \`/guide\` to see all partitions.`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📜 Open Guide', encodeCallback({ action: 'nav_help', ownerId })),
      Markup.button.callback('❌ Close', encodeCallback({ action: 'nav_close', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderHelpView,
  renderCategoryDetailView,
  renderCommandDetailView,
  matchCategoryFromText,
  CATEGORIES_CONFIG
};
