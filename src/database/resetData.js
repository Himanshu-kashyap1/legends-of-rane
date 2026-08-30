import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './connection.js';
import { seedStaticCatalogs } from './seedData.js';
import { logger } from '../utils/logger.js';
import {
  User,
  Base,
  MarketOrder,
  BossRaid,
  GiftRecord,
  Item,
  Recipe,
  ResourceNode,
  Pet,
  Quest
} from '../models/index.js';

async function resetAllData() {
  logger.info('--- Clearing All Collections in MongoDB ---');
  await connectDatabase();

  // 1. Delete all runtime / player documents
  const usersDeleted = await User.deleteMany({});
  const basesDeleted = await Base.deleteMany({});
  const ordersDeleted = await MarketOrder.deleteMany({});
  const raidsDeleted = await BossRaid.deleteMany({});
  const giftsDeleted = await GiftRecord.deleteMany({});

  logger.info(`🗑️ Deleted ${usersDeleted.deletedCount} Users`);
  logger.info(`🗑️ Deleted ${basesDeleted.deletedCount} Bases`);
  logger.info(`🗑️ Deleted ${ordersDeleted.deletedCount} Market Orders`);
  logger.info(`🗑️ Deleted ${raidsDeleted.deletedCount} Boss Raids`);
  logger.info(`🗑️ Deleted ${giftsDeleted.deletedCount} Gift Records`);

  // 2. Delete all static definition collections
  await Item.deleteMany({});
  await Recipe.deleteMany({});
  await ResourceNode.deleteMany({});
  await Pet.deleteMany({});
  await Quest.deleteMany({});
  logger.info('🗑️ Deleted static Items, Recipes, Resource Nodes, Pets, and Quests');

  // 3. Re-seed clean static catalog definitions
  logger.info('--- Re-seeding Fresh Static Game Definitions ---');
  await seedStaticCatalogs();

  logger.info('✅ Database wipe and fresh re-seed complete!');
  await disconnectDatabase();
}

resetAllData().catch((err) => {
  logger.error('Failed to reset database data:', err);
  process.exit(1);
});
