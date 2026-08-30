import { renderPetsHub, renderPetDetails } from '../views/petsView.js';
import { equipPet, feedPet } from '../../engine/pets/petEngine.js';
import { PETS } from '../../engine/pets/petConfig.js';

/**
 * /pets command handler with subcommand support:
 * - /pets
 * - /pets equip [wolf|mole|otter|drake]
 * - /pets feed [wolf|mole|otter|drake]
 */
export async function handlePetsCommand(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.reply('⚠️ Failed to load adventurer profile. Please try again.');
  }

  const messageText = ctx.message?.text || '';
  const parts = messageText.trim().split(/\s+/);
  const subCommand = (parts[1] || '').toLowerCase();
  const petArg = (parts[2] || '').toLowerCase();

  // Resolve target petId from shortcut or full string
  let targetPetId = null;
  if (petArg) {
    const matched = Object.keys(PETS).find(id => id.toLowerCase().includes(petArg));
    if (matched) targetPetId = matched;
  }
  if (!targetPetId) {
    targetPetId = user.activePet || user.pets?.[0]?.petId;
  }

  if (subCommand === 'equip' && targetPetId) {
    const result = await equipPet({ user, petId: targetPetId });
    if (result.success) {
      await ctx.reply(`🐾 *Equipped:* ${targetPetId} is now active!`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`⚠️ Failed to equip: ${result.reason}`, { parse_mode: 'Markdown' });
    }
    const { text, keyboard } = renderPetDetails(user, targetPetId);
    return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }

  if (subCommand === 'feed' && targetPetId) {
    const result = await feedPet({ user, petId: targetPetId });
    if (result.success) {
      await ctx.reply(`🍖 *Fed:* Happiness restored to ${result.pet.happiness}%! (-15 Coins)`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`⚠️ Failed to feed: ${result.reason}`, { parse_mode: 'Markdown' });
    }
    const { text, keyboard } = renderPetDetails(user, targetPetId);
    return ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }

  // Default: Render Pets Sanctuary Hub
  const { text, keyboard } = renderPetsHub(user);
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

export default {
  handlePetsCommand
};
