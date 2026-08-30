/**
 * Centralized Crafting Recipe Definitions & Categories
 */

export const RECIPE_CATEGORIES = {
  refining: {
    id: 'refining',
    name: 'Refined Materials',
    emoji: '🪵',
    description: 'Smelt raw ores and process lumber into essential crafting components.'
  },
  tools: {
    id: 'tools',
    name: 'Tools & Equipment',
    emoji: '🛠️',
    description: 'Forge sturdy axes, pickaxes, and rods for exploration and gathering.'
  },
  consumables: {
    id: 'consumables',
    name: 'Potions & Consumables',
    emoji: '🧪',
    description: 'Brew energy elixirs and field rations to replenish stamina.'
  },
  structures: {
    id: 'structures',
    name: 'Base Structures',
    emoji: '🧱',
    description: 'Construct architectural blocks, storage chests, and voxel decorations.'
  }
};

export const RECIPES = {
  // ==========================================
  // 1. REFINING & MATERIALS
  // ==========================================
  recipe_plank_oak: {
    recipeId: 'recipe_plank_oak',
    name: 'Oak Planks',
    category: 'refining',
    emoji: '🪵',
    description: 'Process raw oak timber into construction-grade wooden planks.',
    inputs: [{ itemId: 'wood_oak', quantity: 2 }],
    output: { itemId: 'plank_oak', quantity: 2 },
    coinCost: 0,
    minCraftingLevel: 1,
    xpReward: 10
  },
  recipe_stone_brick: {
    recipeId: 'recipe_stone_brick',
    name: 'Stone Bricks',
    category: 'refining',
    emoji: '🧱',
    description: 'Chisel heavy granite blocks into uniform building bricks.',
    inputs: [{ itemId: 'stone_granite', quantity: 3 }],
    output: { itemId: 'brick_stone', quantity: 2 },
    coinCost: 0,
    minCraftingLevel: 1,
    xpReward: 10
  },
  recipe_ingot_iron: {
    recipeId: 'recipe_ingot_iron',
    name: 'Iron Ingot',
    category: 'refining',
    emoji: '🔩',
    description: 'Smelt raw iron ore and coal into high-density iron ingots.',
    inputs: [
      { itemId: 'iron_ore', quantity: 2 },
      { itemId: 'coal', quantity: 1 }
    ],
    output: { itemId: 'ingot_iron', quantity: 1 },
    coinCost: 5,
    minCraftingLevel: 2,
    xpReward: 25
  },
  recipe_ingot_gold: {
    recipeId: 'recipe_ingot_gold',
    name: 'Gold Ingot',
    category: 'refining',
    emoji: '🧈',
    description: 'Refine glistening gold ore into pure gold bullion.',
    inputs: [
      { itemId: 'gold_ore', quantity: 2 },
      { itemId: 'coal', quantity: 2 }
    ],
    output: { itemId: 'ingot_gold', quantity: 1 },
    coinCost: 15,
    minCraftingLevel: 3,
    xpReward: 50
  },
  recipe_diamond_cut: {
    recipeId: 'recipe_diamond_cut',
    name: 'Cut Diamond',
    category: 'refining',
    emoji: '💠',
    description: 'Masterfully cut raw gem clusters into a brilliant flawless diamond.',
    inputs: [{ itemId: 'gem_vein', quantity: 2 }],
    output: { itemId: 'diamond', quantity: 1 },
    coinCost: 50,
    minCraftingLevel: 4,
    xpReward: 100
  },

  // ==========================================
  // 2. TOOLS & GEAR
  // ==========================================
  recipe_axe_stone: {
    recipeId: 'recipe_axe_stone',
    name: 'Stone Axe',
    category: 'tools',
    emoji: '🪓',
    description: 'Sharpened stone axe with Tier 2 efficiency (60 Durability).',
    inputs: [
      { itemId: 'stone_granite', quantity: 3 },
      { itemId: 'plank_oak', quantity: 2 }
    ],
    output: {
      itemId: 'tool_axe_stone',
      quantity: 1,
      isTool: true,
      toolType: 'axe',
      tier: 2,
      maxDurability: 60
    },
    coinCost: 25,
    minCraftingLevel: 1,
    xpReward: 30
  },
  recipe_pickaxe_stone: {
    recipeId: 'recipe_pickaxe_stone',
    name: 'Stone Pickaxe',
    category: 'tools',
    emoji: '⛏️',
    description: 'Reinforced stone pickaxe capable of mining Deep Mines (60 Durability).',
    inputs: [
      { itemId: 'stone_granite', quantity: 3 },
      { itemId: 'plank_oak', quantity: 2 }
    ],
    output: {
      itemId: 'tool_pickaxe_stone',
      quantity: 1,
      isTool: true,
      toolType: 'pickaxe',
      tier: 2,
      maxDurability: 60
    },
    coinCost: 25,
    minCraftingLevel: 1,
    xpReward: 30
  },
  recipe_rod_wood: {
    recipeId: 'recipe_rod_wood',
    name: 'Wooden Fishing Rod',
    category: 'tools',
    emoji: '🎣',
    description: 'Flexible willow and oak rod for freshwater and river angling (40 Durability).',
    inputs: [
      { itemId: 'plank_oak', quantity: 2 },
      { itemId: 'wood_willow', quantity: 2 }
    ],
    output: {
      itemId: 'tool_rod_wood',
      quantity: 1,
      isTool: true,
      toolType: 'rod',
      tier: 1,
      maxDurability: 40
    },
    coinCost: 20,
    minCraftingLevel: 1,
    xpReward: 25
  },
  recipe_axe_iron: {
    recipeId: 'recipe_axe_iron',
    name: 'Iron Axe',
    category: 'tools',
    emoji: '🪓',
    description: 'Heavy forged iron axe with high durability (120 Durability).',
    inputs: [
      { itemId: 'ingot_iron', quantity: 3 },
      { itemId: 'plank_oak', quantity: 2 }
    ],
    output: {
      itemId: 'tool_axe_iron',
      quantity: 1,
      isTool: true,
      toolType: 'axe',
      tier: 3,
      maxDurability: 120
    },
    coinCost: 75,
    minCraftingLevel: 2,
    xpReward: 60
  },
  recipe_pickaxe_iron: {
    recipeId: 'recipe_pickaxe_iron',
    name: 'Iron Pickaxe',
    category: 'tools',
    emoji: '⛏️',
    description: 'High-grade forged iron pickaxe for rapid mineral extraction (120 Durability).',
    inputs: [
      { itemId: 'ingot_iron', quantity: 3 },
      { itemId: 'plank_oak', quantity: 2 }
    ],
    output: {
      itemId: 'tool_pickaxe_iron',
      quantity: 1,
      isTool: true,
      toolType: 'pickaxe',
      tier: 3,
      maxDurability: 120
    },
    coinCost: 75,
    minCraftingLevel: 2,
    xpReward: 60
  },

  // ==========================================
  // 3. CONSUMABLES
  // ==========================================
  recipe_energy_brew: {
    recipeId: 'recipe_energy_brew',
    name: 'Energy Brew',
    category: 'consumables',
    emoji: '🧪',
    description: 'Invigorating herbal tonic that restores +25 Energy immediately.',
    inputs: [
      { itemId: 'wood_willow', quantity: 2 },
      { itemId: 'wood_oak', quantity: 1 }
    ],
    output: { itemId: 'potion_energy_small', quantity: 1 },
    coinCost: 10,
    minCraftingLevel: 1,
    xpReward: 15
  },
  recipe_miners_snack: {
    recipeId: 'recipe_miners_snack',
    name: "Miner's Rations",
    category: 'consumables',
    emoji: '🍞',
    description: 'Hardy packed meal sustaining deep expeditions (+40 Energy).',
    inputs: [
      { itemId: 'plank_oak', quantity: 2 },
      { itemId: 'coal', quantity: 1 }
    ],
    output: { itemId: 'food_miners_rations', quantity: 1 },
    coinCost: 20,
    minCraftingLevel: 2,
    xpReward: 30
  },

  // ==========================================
  // 4. STRUCTURES & BUILDING
  // ==========================================
  recipe_wooden_chest: {
    recipeId: 'recipe_wooden_chest',
    name: 'Wooden Storage Chest',
    category: 'structures',
    emoji: '📦',
    description: 'Reinforced timber chest for organizing base materials and items.',
    inputs: [{ itemId: 'plank_oak', quantity: 6 }],
    output: { itemId: 'struct_chest_wood', quantity: 1 },
    coinCost: 15,
    minCraftingLevel: 1,
    xpReward: 25
  },
  recipe_stone_pillar: {
    recipeId: 'recipe_stone_pillar',
    name: 'Stone Pillar',
    category: 'structures',
    emoji: '🏛️',
    description: 'Stately stone pillar used as architectural foundation for voxel bases.',
    inputs: [{ itemId: 'brick_stone', quantity: 4 }],
    output: { itemId: 'struct_pillar_stone', quantity: 1 },
    coinCost: 10,
    minCraftingLevel: 1,
    xpReward: 20
  },
  recipe_forge_lantern: {
    recipeId: 'recipe_forge_lantern',
    name: 'Forge Lantern',
    category: 'structures',
    emoji: '🏮',
    description: 'Illuminating cast-iron lantern fueled by coal for night exploration.',
    inputs: [
      { itemId: 'ingot_iron', quantity: 2 },
      { itemId: 'coal', quantity: 1 }
    ],
    output: { itemId: 'struct_lantern_iron', quantity: 1 },
    coinCost: 25,
    minCraftingLevel: 2,
    xpReward: 40
  }
};

/**
 * Gets all recipes grouped by category.
 * @param {string} categoryId
 * @returns {Array<Object>}
 */
export function getRecipesByCategory(categoryId) {
  return Object.values(RECIPES).filter(r => r.category === categoryId);
}

export default {
  RECIPE_CATEGORIES,
  RECIPES,
  getRecipesByCategory
};
