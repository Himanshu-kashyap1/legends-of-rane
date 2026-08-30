import { renderEquippedTools } from '../views/toolsView.js';
import { executeRepairTool, executeUpgradeTool } from '../../engine/economy/toolService.js';
import { renderActionResultView } from '../views/workshopView.js';

/**
 * /tools command handler with subcommand support:
 * - /tools
 * - /tools repair [axe|pickaxe]
 * - /tools upgrade [axe|pickaxe]
 */
export async function handleToolsCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const messageText = ctx.message?.text || '';
  const parts = messageText.trim().split(/\s+/);
  const subCommand = (parts[1] || '').toLowerCase();
  const targetToolArg = (parts[2] || '').toLowerCase();

  // Find target tool or first eligible tool
  const tools = Array.isArray(user.tools) ? user.tools : [];
  let targetTool = null;

  if (targetToolArg) {
    targetTool = tools.find(t => t.toolId.toLowerCase().includes(targetToolArg));
  }
  if (!targetTool && tools.length > 0) {
    if (subCommand === 'repair') {
      // Find most damaged tool
      targetTool = [...tools].sort((a, b) => (a.durability || 0) - (b.durability || 0))[0];
    } else {
      targetTool = tools.find(t => t.equipped) || tools[0];
    }
  }

  // Handle /tools repair
  if (subCommand === 'repair') {
    if (!targetTool) {
      return ctx.reply('⚠️ Repair karne ke liye koi tool available nahi hai.');
    }
    const result = await executeRepairTool({ user, toolInstanceId: targetTool.instanceId });
    const { text, keyboard } = renderActionResultView(user, result, 'repair', targetTool.instanceId);
    return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }

  // Handle /tools upgrade
  if (subCommand === 'upgrade') {
    if (!targetTool) {
      return ctx.reply('⚠️ Upgrade karne ke liye koi tool available nahi hai.');
    }
    const result = await executeUpgradeTool({ user, toolInstanceId: targetTool.instanceId });
    const { text, keyboard } = renderActionResultView(user, result, 'upgrade', targetTool.instanceId);
    return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }

  // Default: View tools
  const { text, keyboard } = renderEquippedTools(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

export default handleToolsCommand;
