import { handleStartCommand } from './start.js';
import { handleProfileCommand } from './profile.js';
import { handleInventoryCommand } from './inventory.js';
import { handleExploreCommand } from './explore.js';
import { handleToolsCommand } from './tools.js';
import { handleWorkshopCommand } from './craft.js';
import { handleMarketCommand, handleSellCommand } from './market.js';
import { handleGiftCommand } from './gift.js';
import { handleQuestsCommand } from './quests.js';
import { handlePetsCommand } from './pets.js';
import { handleOfflineCommand } from './offline.js';
import { handleBossCommand } from './boss.js';
import { handleBaseCommand } from './base.js';
import { handleHelpCommand } from './help.js';
import { logger } from '../../utils/logger.js';

/**
 * Registers all Telegram bot command handlers.
 * @param {import('telegraf').Telegraf} bot
 */
export function registerCommands(bot) {
  // Core Gameplay Commands (Active)
  bot.command('start', handleStartCommand);
  bot.command('profile', handleProfileCommand);
  bot.command(['inventory', 'backpack'], handleInventoryCommand);
  bot.command(['explore', 'gather'], handleExploreCommand);
  bot.command('tools', handleToolsCommand);
  bot.command(['craft', 'workshop'], handleWorkshopCommand);
  bot.command('market', handleMarketCommand);
  bot.command('sell', handleSellCommand);
  bot.command('gift', handleGiftCommand);
  bot.command(['quests', 'quest'], handleQuestsCommand);
  bot.command(['pets', 'pet'], handlePetsCommand);
  bot.command('offline', handleOfflineCommand);
  bot.command(['boss', 'groupnode'], handleBossCommand);
  bot.command(['base', 'build'], handleBaseCommand);
  bot.command(['help', 'guide'], handleHelpCommand);

  // Command placeholders for future steps
  const placeholderCommands = [
    'leaderboard'
  ];

  for (const cmd of placeholderCommands) {
    bot.command(cmd, async (ctx) => {
      const user = ctx.state.user;
      const cmdName = cmd.toUpperCase();
      logger.debug(`Player ${user?.telegramId} called /${cmd}`);
      await ctx.reply(`⚔️ *${cmdName}* is preparing for battle! (Will be activated in upcoming gameplay steps).`, { parse_mode: 'Markdown' });
    });
  }

  logger.info('✅ Registered /start, /profile, /inventory, /backpack, /explore, /gather, /tools, /craft, /workshop, /market, /sell, /gift, /quests, /pets, /offline, /boss, /groupnode, /base, /build, and placeholders.');
}

export default registerCommands;
