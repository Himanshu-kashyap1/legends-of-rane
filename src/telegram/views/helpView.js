import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';

/**
 * Renders the command-first Player Guide & Help screen.
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderHelpView(user) {
  const ownerId = String(user?.telegramId || '0');

  const text = [
    `📜 *LEGENDS OF RANE — COMMAND GUIDE* 📜`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_Yeh command-first realm hai. Aap naturally commands type karke har system access kar sakte ho!_`,
    '',
    `🌲 *EXPLORATION & GATHERING*`,
    `• */explore* ya */gather* — Open gathering zones (Forest, Quarry, Deep Mines)`,
    '',
    `⚒️ *WORKSHOP & EQUIPMENT*`,
    `• */craft* — Craft recipes, planks, ingots & structures`,
    `• */tools* — Inspect equipped gathering axes & pickaxes`,
    `• */tools repair* — Quick repair damaged tools`,
    `• */tools upgrade* — Upgrade tools to higher tiers (Stone, Iron, Gold, Diamond)`,
    '',
    `🎒 *BACKPACK & TRADING*`,
    `• */inventory* — View stored materials & gemstones`,
    `• */market* — Browse player-to-player orderbook listings`,
    `• */sell <item> <qty> <price>* — List item on the market (e.g. \`/sell wood_oak 10 50\`)`,
    `• */gift @user <item> <qty>* — Gift materials to friends (Level 3+)`,
    '',
    `🐾 *HERO PROGRESSION & SANCTUARY*`,
    `• */profile* — View level, titles & 5 skill masteries`,
    `• */quests* — Daily bounties & story quests`,
    `• */pets* — Adopt, feed & equip companion beasts`,
    `• */pets equip <wolf|mole|otter|drake>* — Quick equip pet`,
    `• */pets feed <wolf|mole|otter|drake>* — Quick feed pet`,
    `• */offline* — Claim idle structure earnings (Lumber Mill, Quarry, Forge)`,
    '',
    `🗿 *GROUP RAIDS & 3D SANDBOX*`,
    `• */boss* ya */groupnode* — Summon group Colossus titan in Telegram groups`,
    `• */base* ya */build* — Launch 3D Voxel Sandbox Mini App`,
    `• */start* — View hero summary & quick menu`
  ].join('\n');

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🌲 Explore Now', encodeCallback({ action: 'nav_explore', ownerId })),
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text, keyboard };
}

export default {
  renderHelpView
};
