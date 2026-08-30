import { renderGiftingHub, renderGiftingResult } from '../views/giftingView.js';
import { executeGiftTransfer } from '../../engine/social/giftingEngine.js';

/**
 * /gift command handler
 * Syntax:
 * - /gift (opens hub / guide)
 * - /gift @username <itemId> <quantity>
 */
export async function handleGiftCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const text = ctx.message?.text || '';
  const parts = text.trim().split(/\s+/).slice(1);

  // If no arguments provided, show Gifting Hub & Instructions
  if (parts.length === 0) {
    const { text: hubText, keyboard } = renderGiftingHub(user);
    return ctx.reply(hubText, { parse_mode: 'Markdown', ...keyboard });
  }

  if (parts.length < 3) {
    return ctx.reply(
      `📌 *Gift Command Syntax:*\n\`/gift @username <itemId> <quantity>\`\n\n` +
      `💡 *Example:* \`/gift @friend wood_oak 10\` (Sends 10 Oak Wood to @friend)`,
      { parse_mode: 'Markdown' }
    );
  }

  const [recipientInput, itemId, qtyStr] = parts;
  const quantity = parseInt(qtyStr, 10);

  if (isNaN(quantity) || quantity <= 0) {
    return ctx.reply('⚠️ Quantity positive number honi chahiye. Example: `/gift @friend wood_oak 5`', { parse_mode: 'Markdown' });
  }

  const result = await executeGiftTransfer({
    sender: user,
    recipientInput,
    itemId,
    quantity
  });

  const { text: resultText, keyboard } = renderGiftingResult(user, result);
  await ctx.reply(resultText, { parse_mode: 'Markdown', ...keyboard });
}

export default {
  handleGiftCommand
};
