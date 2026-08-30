import { renderMarketHub, renderMarketResultView } from '../views/marketView.js';
import { createMarketListing } from '../../engine/economy/marketEngine.js';

/**
 * /market command handler
 */
export async function handleMarketCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const { text, keyboard } = renderMarketHub(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

/**
 * /sell command handler
 * Syntax: /sell <itemId> <quantity> <pricePerUnit>
 */
export async function handleSellCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const text = ctx.message?.text || '';
  const parts = text.trim().split(/\s+/).slice(1);

  if (parts.length < 3) {
    return ctx.reply(
      `📌 *Market Sell Syntax:*\n\`/sell <itemId> <quantity> <pricePerUnit>\`\n\n` +
      `💡 *Example:* \`/sell wood_oak 10 5\` (Sells 10 Oak Wood for 5 coins each = 50 coins total)`,
      { parse_mode: 'Markdown' }
    );
  }

  const [itemId, qtyStr, priceStr] = parts;
  const quantity = parseInt(qtyStr, 10);
  const pricePerUnit = parseInt(priceStr, 10);

  if (isNaN(quantity) || quantity <= 0 || isNaN(pricePerUnit) || pricePerUnit <= 0) {
    return ctx.reply('⚠️ Quantity aur Price positive numbers hone chahiye. Example: `/sell wood_oak 5 10`', { parse_mode: 'Markdown' });
  }

  const result = await createMarketListing({
    user,
    itemId,
    quantity,
    pricePerUnit
  });

  const { text: resultText, keyboard } = await renderMarketResultView(user, result, 'sell');
  await ctx.reply(resultText, { parse_mode: 'Markdown', ...keyboard });
}

export default {
  handleMarketCommand,
  handleSellCommand
};
