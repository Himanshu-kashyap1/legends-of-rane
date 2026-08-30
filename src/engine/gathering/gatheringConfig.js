/**
 * Central Gathering Configuration, Zones & Resource Node Definitions
 */

export const ENERGY_CONFIG = {
  DEFAULT_MAX_ENERGY: 100,
  REGEN_INTERVAL_MS: 60 * 1000, // 1 minute per energy point
  REGEN_PER_INTERVAL: 1
};

export const CRITICAL_CONFIG = {
  BASE_CHANCE: 0.10, // 10% chance
  YIELD_MULTIPLIER: 2
};

export const GATHERING_ZONES = {
  zone_forest: {
    zoneId: 'zone_forest',
    name: 'Lumberjack Forest',
    emoji: '🌲',
    description: 'A dense, sunlit woodland filled with sturdy oaks and weeping willows.',
    nodes: ['node_forest_oak', 'node_forest_willow']
  },
  zone_quarry: {
    zoneId: 'zone_quarry',
    name: 'Stone Quarry',
    emoji: '⛏️',
    description: 'An open pit quarry rich in heavy granite blocks and smooth marble.',
    nodes: ['node_quarry_granite', 'node_quarry_marble']
  },
  zone_mines: {
    zoneId: 'zone_mines',
    name: 'Deep Mines',
    emoji: '💎',
    description: 'Subterranean tunnels holding veins of iron ore, gold, and gems.',
    nodes: ['node_mine_iron', 'node_mine_gold']
  }
};

export const RESOURCE_NODES = {
  // --- Forest Nodes ---
  node_forest_oak: {
    nodeId: 'node_forest_oak',
    zoneId: 'zone_forest',
    name: 'Oak Timber Grove',
    emoji: '🪵',
    description: 'A grove of towering oak trees with thick, sturdy bark.',
    skill: 'woodcutting',
    requiredToolType: 'axe',
    requiredToolTier: 1,
    energyCost: 5,
    xpReward: 10,
    dropTable: [
      { itemId: 'wood_oak', minQuantity: 2, maxQuantity: 5, weight: 80 },
      { itemId: 'wood_ancient', minQuantity: 1, maxQuantity: 2, weight: 20 }
    ]
  },
  node_forest_willow: {
    nodeId: 'node_forest_willow',
    zoneId: 'zone_forest',
    name: 'Weeping Willow Bank',
    emoji: '🎋',
    description: 'A riverside bank with flexible willow branches.',
    skill: 'woodcutting',
    requiredToolType: 'axe',
    requiredToolTier: 1,
    energyCost: 6,
    xpReward: 15,
    dropTable: [
      { itemId: 'wood_willow', minQuantity: 2, maxQuantity: 4, weight: 80 },
      { itemId: 'wood_ancient', minQuantity: 1, maxQuantity: 2, weight: 20 }
    ]
  },

  // --- Quarry Nodes ---
  node_quarry_granite: {
    nodeId: 'node_quarry_granite',
    zoneId: 'zone_quarry',
    name: 'Granite Surface Pit',
    emoji: '🪨',
    description: 'A massive open granite deposit interspersed with coal seams.',
    skill: 'mining',
    requiredToolType: 'pickaxe',
    requiredToolTier: 1,
    energyCost: 5,
    xpReward: 10,
    dropTable: [
      { itemId: 'stone_granite', minQuantity: 2, maxQuantity: 5, weight: 70 },
      { itemId: 'coal', minQuantity: 1, maxQuantity: 3, weight: 30 }
    ]
  },
  node_quarry_marble: {
    nodeId: 'node_quarry_marble',
    zoneId: 'zone_quarry',
    name: 'White Marble Cliff',
    emoji: '🏛️',
    description: 'A sheer cliff of polished white marble stone.',
    skill: 'mining',
    requiredToolType: 'pickaxe',
    requiredToolTier: 1,
    energyCost: 6,
    xpReward: 15,
    dropTable: [
      { itemId: 'stone_marble', minQuantity: 2, maxQuantity: 4, weight: 75 },
      { itemId: 'stone_granite', minQuantity: 1, maxQuantity: 2, weight: 25 }
    ]
  },

  // --- Mine Nodes ---
  node_mine_iron: {
    nodeId: 'node_mine_iron',
    zoneId: 'zone_mines',
    name: 'Deep Iron Vein',
    emoji: '🔩',
    description: 'High-density iron ore embedded in the deepest cavern walls.',
    skill: 'mining',
    requiredToolType: 'pickaxe',
    requiredToolTier: 2, // Stone Pickaxe or higher
    energyCost: 8,
    xpReward: 25,
    dropTable: [
      { itemId: 'iron_ore', minQuantity: 1, maxQuantity: 4, weight: 60 },
      { itemId: 'coal', minQuantity: 2, maxQuantity: 4, weight: 40 }
    ]
  },
  node_mine_gold: {
    nodeId: 'node_mine_gold',
    zoneId: 'zone_mines',
    name: 'Abyssal Gold & Gems',
    emoji: '🪙',
    description: 'Rare glimmering gold veins and uncut precious gemstones.',
    skill: 'mining',
    requiredToolType: 'pickaxe',
    requiredToolTier: 2, // Stone Pickaxe or higher
    energyCost: 10,
    xpReward: 35,
    dropTable: [
      { itemId: 'gold_ore', minQuantity: 1, maxQuantity: 2, weight: 70 },
      { itemId: 'gem_vein', minQuantity: 1, maxQuantity: 1, weight: 30 }
    ]
  }
};

export default {
  ENERGY_CONFIG,
  CRITICAL_CONFIG,
  GATHERING_ZONES,
  RESOURCE_NODES
};
