import { Item, Recipe, ResourceNode, Pet, Quest } from '../models/index.js';
import { connectDatabase, disconnectDatabase } from './connection.js';
import { logger } from '../utils/logger.js';

export const SEED_ITEMS = [
  // --- Raw Woods ---
  { itemId: 'wood_oak', displayName: 'Oak Wood', emoji: '🪵', category: 'raw_wood', tier: 1, rarity: 'common', stackable: true, basePrice: 5, description: 'Sturdy oak log gathered from Lumberjack Forest.' },
  { itemId: 'wood_willow', displayName: 'Willow Wood', emoji: '🎋', category: 'raw_wood', tier: 2, rarity: 'uncommon', stackable: true, basePrice: 12, description: 'Flexible willow wood with magical resonance.' },
  { itemId: 'wood_ancient', displayName: 'Ancient Heartwood', emoji: '🌲', category: 'raw_wood', tier: 4, rarity: 'epic', stackable: true, basePrice: 50, description: 'Rare, glowing wood from millennial trees.' },

  // --- Raw Stones & Ores ---
  { itemId: 'stone_granite', displayName: 'Granite Stone', emoji: '🪨', category: 'raw_stone', tier: 1, rarity: 'common', stackable: true, basePrice: 4, description: 'Heavy granite stone from the surface quarries.' },
  { itemId: 'stone_marble', displayName: 'White Marble', emoji: '🏛️', category: 'raw_stone', tier: 2, rarity: 'uncommon', stackable: true, basePrice: 10, description: 'Smooth, dense marble stone.' },
  { itemId: 'coal', displayName: 'Lignite Coal', emoji: '⚫', category: 'raw_ore', tier: 1, rarity: 'common', stackable: true, basePrice: 6, description: 'Essential fuel for forging and smelting.' },
  { itemId: 'iron_ore', displayName: 'Raw Iron Ore', emoji: '🪨', category: 'raw_ore', tier: 2, rarity: 'uncommon', stackable: true, basePrice: 15, description: 'Unrefined iron ore chunk from deep veins.' },
  { itemId: 'gold_ore', displayName: 'Raw Gold Ore', emoji: '🪙', category: 'raw_ore', tier: 3, rarity: 'rare', stackable: true, basePrice: 35, description: 'Gleaming gold ore with high monetary value.' },
  { itemId: 'gem_vein', displayName: 'Uncut Gem Cluster', emoji: '💎', category: 'raw_ore', tier: 4, rarity: 'epic', stackable: true, basePrice: 75, description: 'Sparkling cluster of precious raw gemstones.' },

  // --- Refined Materials ---
  { itemId: 'plank_oak', displayName: 'Oak Plank', emoji: '🪵', category: 'refined_plank', tier: 1, rarity: 'common', stackable: true, basePrice: 12, description: 'Processed oak timber used in construction and tool crafting.' },
  { itemId: 'ingot_iron', displayName: 'Iron Ingot', emoji: '🔩', category: 'refined_ingot', tier: 2, rarity: 'uncommon', stackable: true, basePrice: 35, description: 'Smelted iron bar ready for weapon & tool smithing.' },
  { itemId: 'ingot_gold', displayName: 'Gold Ingot', emoji: '🧈', category: 'refined_ingot', tier: 3, rarity: 'rare', stackable: true, basePrice: 85, description: 'High-purity gold bar prized by merchants and jewelers.' },

  // --- Special / Rare Items ---
  { itemId: 'diamond', displayName: 'Refined Diamond', emoji: '💠', category: 'gem', tier: 5, rarity: 'legendary', stackable: true, basePrice: 250, description: 'Flawless diamond with supreme hardness.' },
  { itemId: 'magic_crystal', displayName: 'Magic Crystal', emoji: '🔮', category: 'special', tier: 4, rarity: 'epic', stackable: true, basePrice: 120, description: 'Pulsing arcane crystal used for mystical constructs.' },
  { itemId: 'brick_stone', displayName: 'Stone Bricks', emoji: '🧱', category: 'refined_stone', tier: 1, rarity: 'common', stackable: true, basePrice: 8, description: 'Chiseled stone bricks for construction.' },
  { itemId: 'potion_energy_small', displayName: 'Energy Brew', emoji: '🧪', category: 'consumable', tier: 1, rarity: 'common', stackable: true, basePrice: 25, description: 'Restores +25 energy points immediately.' },
  { itemId: 'food_miners_rations', displayName: "Miner's Rations", emoji: '🍞', category: 'consumable', tier: 2, rarity: 'uncommon', stackable: true, basePrice: 45, description: 'Restores +40 energy points immediately.' },
  { itemId: 'struct_chest_wood', displayName: 'Wooden Storage Chest', emoji: '📦', category: 'structure', tier: 1, rarity: 'common', stackable: true, basePrice: 50, description: 'Storage chest for voxel bases.' },
  { itemId: 'struct_pillar_stone', displayName: 'Stone Pillar', emoji: '🏛️', category: 'structure', tier: 1, rarity: 'common', stackable: true, basePrice: 35, description: 'Architectural pillar for voxel base construction.' },
  { itemId: 'struct_lantern_iron', displayName: 'Forge Lantern', emoji: '🏮', category: 'structure', tier: 2, rarity: 'uncommon', stackable: true, basePrice: 80, description: 'Cast-iron illumination lantern.' },

  // --- Tools (Axe) ---
  { itemId: 'tool_axe_wood', displayName: 'Wooden Axe', emoji: '🪓', category: 'tool', tier: 1, rarity: 'common', stackable: false, basePrice: 20, description: 'Basic wooden axe.', toolMetadata: { toolType: 'axe', baseDurability: 30, efficiencyMultiplier: 1.0 } },
  { itemId: 'tool_axe_stone', displayName: 'Stone Axe', emoji: '🪓', category: 'tool', tier: 2, rarity: 'uncommon', stackable: false, basePrice: 50, description: 'Sharpened stone axe.', toolMetadata: { toolType: 'axe', baseDurability: 60, efficiencyMultiplier: 1.25 } },
  { itemId: 'tool_axe_iron', displayName: 'Iron Axe', emoji: '🪓', category: 'tool', tier: 3, rarity: 'rare', stackable: false, basePrice: 150, description: 'Durable forged iron axe.', toolMetadata: { toolType: 'axe', baseDurability: 120, efficiencyMultiplier: 1.6 } },

  // --- Tools (Pickaxe & Rod) ---
  { itemId: 'tool_pickaxe_wood', displayName: 'Wooden Pickaxe', emoji: '⛏️', category: 'tool', tier: 1, rarity: 'common', stackable: false, basePrice: 20, description: 'Crude wooden pickaxe.', toolMetadata: { toolType: 'pickaxe', baseDurability: 30, efficiencyMultiplier: 1.0 } },
  { itemId: 'tool_pickaxe_stone', displayName: 'Stone Pickaxe', emoji: '⛏️', category: 'tool', tier: 2, rarity: 'uncommon', stackable: false, basePrice: 50, description: 'Solid stone pickaxe.', toolMetadata: { toolType: 'pickaxe', baseDurability: 60, efficiencyMultiplier: 1.25 } },
  { itemId: 'tool_pickaxe_iron', displayName: 'Iron Pickaxe', emoji: '⛏️', category: 'tool', tier: 3, rarity: 'rare', stackable: false, basePrice: 150, description: 'Heavy-duty forged iron pickaxe.', toolMetadata: { toolType: 'pickaxe', baseDurability: 120, efficiencyMultiplier: 1.6 } },
  { itemId: 'tool_rod_wood', displayName: 'Wooden Fishing Rod', emoji: '🎣', category: 'tool', tier: 1, rarity: 'common', stackable: false, basePrice: 35, description: 'Flexible fishing rod.', toolMetadata: { toolType: 'rod', baseDurability: 40, efficiencyMultiplier: 1.0 } }
];

export const SEED_RECIPES = [
  {
    recipeId: 'recipe_plank_oak',
    name: 'Craft Oak Planks',
    category: 'refining',
    outputItemId: 'plank_oak',
    outputQuantity: 2,
    requiredMaterials: [{ itemId: 'wood_oak', quantity: 2 }],
    requiredSkill: 'crafting',
    requiredLevel: 1,
    xpReward: 10,
    description: 'Process 2 Oak Wood into 2 Oak Planks.'
  },
  {
    recipeId: 'recipe_stone_brick',
    name: 'Craft Stone Bricks',
    category: 'refining',
    outputItemId: 'brick_stone',
    outputQuantity: 2,
    requiredMaterials: [{ itemId: 'stone_granite', quantity: 3 }],
    requiredSkill: 'crafting',
    requiredLevel: 1,
    xpReward: 10,
    description: 'Chisel 3 Granite Stone into 2 Stone Bricks.'
  },
  {
    recipeId: 'recipe_ingot_iron',
    name: 'Smelt Iron Ingot',
    category: 'refining',
    outputItemId: 'ingot_iron',
    outputQuantity: 1,
    requiredMaterials: [{ itemId: 'iron_ore', quantity: 2 }, { itemId: 'coal', quantity: 1 }],
    requiredSkill: 'crafting',
    requiredLevel: 2,
    xpReward: 25,
    description: 'Smelt 2 Iron Ores and 1 Coal into 1 Iron Ingot.'
  },
  {
    recipeId: 'recipe_ingot_gold',
    name: 'Smelt Gold Ingot',
    category: 'refining',
    outputItemId: 'ingot_gold',
    outputQuantity: 1,
    requiredMaterials: [{ itemId: 'gold_ore', quantity: 2 }, { itemId: 'coal', quantity: 2 }],
    requiredSkill: 'crafting',
    requiredLevel: 3,
    xpReward: 50,
    description: 'Smelt 2 Gold Ores and 2 Coal into 1 Gold Ingot.'
  },
  {
    recipeId: 'recipe_axe_stone',
    name: 'Forge Stone Axe',
    category: 'tool',
    outputItemId: 'tool_axe_stone',
    outputQuantity: 1,
    requiredMaterials: [{ itemId: 'stone_granite', quantity: 3 }, { itemId: 'plank_oak', quantity: 2 }],
    requiredSkill: 'crafting',
    requiredLevel: 1,
    xpReward: 30,
    description: 'Forge a Tier 2 Stone Axe with 60 durability.'
  },
  {
    recipeId: 'recipe_pickaxe_stone',
    name: 'Forge Stone Pickaxe',
    category: 'tool',
    outputItemId: 'tool_pickaxe_stone',
    outputQuantity: 1,
    requiredMaterials: [{ itemId: 'stone_granite', quantity: 3 }, { itemId: 'plank_oak', quantity: 2 }],
    requiredSkill: 'crafting',
    requiredLevel: 1,
    xpReward: 30,
    description: 'Forge a Tier 2 Stone Pickaxe with 60 durability.'
  },
  {
    recipeId: 'recipe_rod_wood',
    name: 'Craft Fishing Rod',
    category: 'tool',
    outputItemId: 'tool_rod_wood',
    outputQuantity: 1,
    requiredMaterials: [{ itemId: 'plank_oak', quantity: 2 }, { itemId: 'wood_willow', quantity: 2 }],
    requiredSkill: 'crafting',
    requiredLevel: 1,
    xpReward: 25,
    description: 'Craft a Wooden Fishing Rod with 40 durability.'
  },
  {
    recipeId: 'recipe_axe_iron',
    name: 'Forge Iron Axe',
    category: 'tool',
    outputItemId: 'tool_axe_iron',
    outputQuantity: 1,
    requiredMaterials: [{ itemId: 'ingot_iron', quantity: 3 }, { itemId: 'plank_oak', quantity: 2 }],
    requiredSkill: 'crafting',
    requiredLevel: 2,
    xpReward: 60,
    description: 'Forge a Tier 3 Iron Axe with 120 durability.'
  },
  {
    recipeId: 'recipe_pickaxe_iron',
    name: 'Forge Iron Pickaxe',
    category: 'tool',
    outputItemId: 'tool_pickaxe_iron',
    outputQuantity: 1,
    requiredMaterials: [{ itemId: 'ingot_iron', quantity: 3 }, { itemId: 'plank_oak', quantity: 2 }],
    requiredSkill: 'crafting',
    requiredLevel: 2,
    xpReward: 60,
    description: 'Forge a Tier 3 Iron Pickaxe with 120 durability.'
  }
];

export const SEED_NODES = [
  {
    nodeId: 'node_forest_oak',
    name: 'Lumberjack Forest',
    zone: 'Lumberjack Forest',
    skill: 'woodcutting',
    requiredSkillLevel: 1,
    requiredToolType: 'axe',
    requiredToolTier: 1,
    energyCost: 5,
    dropTable: [
      { itemId: 'wood_oak', minDrop: 2, maxDrop: 5, weight: 85 },
      { itemId: 'wood_willow', minDrop: 1, maxDrop: 2, weight: 15 }
    ],
    xpReward: 10,
    description: 'A dense, sunlit forest filled with sturdy oak and willow trees.'
  },
  {
    nodeId: 'node_quarry_granite',
    name: 'Stone Quarry',
    zone: 'Stone Quarry',
    skill: 'mining',
    requiredSkillLevel: 1,
    requiredToolType: 'pickaxe',
    requiredToolTier: 1,
    energyCost: 5,
    dropTable: [
      { itemId: 'stone_granite', minDrop: 2, maxDrop: 4, weight: 70 },
      { itemId: 'coal', minDrop: 1, maxDrop: 3, weight: 30 }
    ],
    xpReward: 10,
    description: 'An open pit quarry rich in granite blocks and coal deposits.'
  },
  {
    nodeId: 'node_mine_iron',
    name: 'Deep Iron Mines',
    zone: 'Deep Mines',
    skill: 'mining',
    requiredSkillLevel: 3,
    requiredToolType: 'pickaxe',
    requiredToolTier: 2,
    energyCost: 8,
    dropTable: [
      { itemId: 'iron_ore', minDrop: 1, maxDrop: 3, weight: 60 },
      { itemId: 'stone_marble', minDrop: 1, maxDrop: 3, weight: 30 },
      { itemId: 'gold_ore', minDrop: 1, maxDrop: 1, weight: 10 }
    ],
    xpReward: 25,
    description: 'Subterranean tunnels holding veins of iron ore and marble.'
  }
];

export const SEED_PETS = [
  {
    petId: 'pet_timber_wolf',
    name: 'Timber Wolf',
    emoji: '🐺',
    description: 'Loyal woodland companion that boosts woodcutting yield by 15%.',
    perkType: 'woodcutting_yield',
    perkValue: 0.15,
    rarity: 'rare',
    priceCoins: 500
  },
  {
    petId: 'pet_crystal_mole',
    name: 'Crystal Mole',
    emoji: '🦡',
    description: 'Subterranean digger that increases mining yield by 15%.',
    perkType: 'mining_yield',
    perkValue: 0.15,
    rarity: 'rare',
    priceCoins: 500
  },
  {
    petId: 'pet_river_otter',
    name: 'River Otter',
    emoji: '🦦',
    description: 'Energetic swimmer that accelerates player energy regeneration by 20%.',
    perkType: 'energy_regen',
    perkValue: 0.20,
    rarity: 'rare',
    priceCoins: 750
  },
  {
    petId: 'pet_solar_drake',
    name: 'Solar Drake',
    emoji: '🐲',
    description: 'Legendary miniature dragon granting +10% Critical Harvest chance.',
    perkType: 'critical_harvest',
    perkValue: 0.10,
    rarity: 'legendary',
    priceCoins: 1500
  }
];

export const SEED_QUESTS = [
  {
    questId: 'quest_first_steps',
    title: 'First Steps into Rane',
    category: 'story',
    description: 'Gather 10 pieces of Oak Wood to build your initial shelter.',
    requirements: [
      { type: 'gather_item', targetId: 'wood_oak', count: 10 }
    ],
    rewards: {
      coins: 50,
      playerXp: 100,
      items: [{ itemId: 'tool_axe_wood', quantity: 1 }]
    }
  },
  {
    questId: 'quest_quarry_worker',
    title: 'Quarry Master',
    category: 'daily',
    description: 'Mine 15 Granite Stones in the Stone Quarry.',
    requirements: [
      { type: 'gather_item', targetId: 'stone_granite', count: 15 }
    ],
    rewards: {
      coins: 80,
      playerXp: 120
    }
  }
];

/**
 * Seeds all static catalogs into MongoDB idempotently using upsert operations.
 */
export async function seedStaticCatalogs() {
  logger.info('--- Seeding Static Game Catalogs ---');

  // 1. Seed Items
  for (const item of SEED_ITEMS) {
    await Item.updateOne({ itemId: item.itemId }, { $set: item }, { upsert: true });
  }
  logger.info(`✅ Seeded ${SEED_ITEMS.length} Items.`);

  // 2. Seed Recipes
  for (const recipe of SEED_RECIPES) {
    await Recipe.updateOne({ recipeId: recipe.recipeId }, { $set: recipe }, { upsert: true });
  }
  logger.info(`✅ Seeded ${SEED_RECIPES.length} Recipes.`);

  // 3. Seed Resource Nodes
  for (const node of SEED_NODES) {
    await ResourceNode.updateOne({ nodeId: node.nodeId }, { $set: node }, { upsert: true });
  }
  logger.info(`✅ Seeded ${SEED_NODES.length} Resource Nodes.`);

  // 4. Seed Pets
  for (const pet of SEED_PETS) {
    await Pet.updateOne({ petId: pet.petId }, { $set: pet }, { upsert: true });
  }
  logger.info(`✅ Seeded ${SEED_PETS.length} Companion Pets.`);

  // 5. Seed Quests
  for (const quest of SEED_QUESTS) {
    await Quest.updateOne({ questId: quest.questId }, { $set: quest }, { upsert: true });
  }
  logger.info(`✅ Seeded ${SEED_QUESTS.length} Quests.`);

  logger.info('--- Static Catalogs Seeding Complete ---');
}

// Allow direct execution: node src/database/seedData.js
if (process.argv[1]?.endsWith('seedData.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedStaticCatalogs();
    } catch (err) {
      logger.error('Seeding failed:', err);
      process.exitCode = 1;
    } finally {
      await disconnectDatabase();
    }
  })();
}

export default seedStaticCatalogs;
