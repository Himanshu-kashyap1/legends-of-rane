import { Markup } from 'telegraf';
import { encodeCallback } from '../buttons/callbackData.js';
import { TOOL_TIERS, getDurabilityStatus } from '../../engine/economy/toolConfig.js';

/**
 * Renders the command-first /tools Equipped Tools overview screen.
 * @param {Object} user
 * @returns {{ text: string, keyboard: any }}
 */
export function renderEquippedTools(user) {
  const ownerId = String(user.telegramId);
  const tools = user.tools || [];

  const textLines = [
    `🛠 *EQUIPPED ADVENTURER TOOLS* 🛠`,
    `━━━━━━━━━━━━━━━━━━━━━━`
  ];

  if (tools.length === 0) {
    textLines.push(
      `_Aapke paas abhi koi tool nahi hai._`,
      `_Workshop mein naye tools craft karein._`
    );
  } else {
    for (const tool of tools) {
      const tierConfig = TOOL_TIERS[tool.tier] || TOOL_TIERS[1];
      const status = getDurabilityStatus(tool.durability, tool.maxDurability);
      const icon = tool.toolType === 'axe' ? '🪓' : tool.toolType === 'pickaxe' ? '⛏️' : '🎣';
      const typeName = tool.toolType === 'axe' ? 'Axe' : tool.toolType === 'pickaxe' ? 'Pickaxe' : 'Rod';
      const formattedName = `${tierConfig.name} ${typeName}`;

      textLines.push(
        `${icon} *${formattedName}*`,
        `  • *Tier:* ${tierConfig.emoji} ${tierConfig.name} (Tier ${tool.tier})`,
        `  • *Durability:* ${tool.durability} / ${tool.maxDurability}`,
        `  • *Condition:* ${status.emoji} ${status.label} (${status.percent}%)`,
        `  • *Modifiers:* Yield +${tierConfig.yieldBonus} | Crit +${Math.round(tierConfig.criticalBonus * 100)}% | Energy -${tierConfig.energyDiscount}`,
        ''
      );
    }
  }

  textLines.push(
    `💡 *Quick Commands:*`,
    `• \`/tools repair\` — Repair damaged tool`,
    `• \`/tools upgrade\` — Upgrade tool tier`
  );

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('⚒️ Workshop', encodeCallback({ action: 'nav_workshop', ownerId })),
      Markup.button.callback('🏠 Main Menu', encodeCallback({ action: 'nav_main', ownerId }))
    ]
  ]);

  return { text: textLines.join('\n'), keyboard };
}

export default {
  renderEquippedTools
};
