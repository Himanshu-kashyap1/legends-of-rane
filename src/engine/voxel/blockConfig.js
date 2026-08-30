/**
 * Centralized Voxel Block Catalog & 3D World Boundary Constraints
 */

export const WORLD_CONFIG = {
  MIN_X: -16,
  MAX_X: 16,
  MIN_Y: 0,
  MAX_Y: 24,
  MIN_Z: -16,
  MAX_Z: 16,
  MAX_BLOCKS_PER_BASE: 2000,
  GRID_SIZE: 32
};

export const BLOCK_CATEGORIES = {
  NATURE: 'Nature & Earth',
  BUILDING: 'Building & Stone',
  WOODS: 'Woods & Timber',
  MINERALS: 'Minerals & Ores',
  DECOR: 'Decor & Utility'
};

export const BLOCK_CATALOG = {
  // 1. Nature & Earth
  grass: {
    id: 'grass',
    name: 'Grass Block',
    category: BLOCK_CATEGORIES.NATURE,
    emoji: '🌿',
    color: '#4ade80',
    topColor: '#22c55e',
    sideColor: '#78350f',
    roughness: 0.8,
    metalness: 0.1
  },
  dirt: {
    id: 'dirt',
    name: 'Dirt Block',
    category: BLOCK_CATEGORIES.NATURE,
    emoji: '🟤',
    color: '#854d0e',
    roughness: 0.9,
    metalness: 0.0
  },
  sand: {
    id: 'sand',
    name: 'Desert Sand',
    category: BLOCK_CATEGORIES.NATURE,
    emoji: '🏖️',
    color: '#fde047',
    roughness: 0.9,
    metalness: 0.0
  },
  water: {
    id: 'water',
    name: 'Crystal Water',
    category: BLOCK_CATEGORIES.NATURE,
    emoji: '💧',
    color: '#38bdf8',
    opacity: 0.65,
    transparent: true,
    roughness: 0.1,
    metalness: 0.2
  },
  lava: {
    id: 'lava',
    name: 'Molten Lava',
    category: BLOCK_CATEGORIES.NATURE,
    emoji: '🌋',
    color: '#ea580c',
    emissive: '#f97316',
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.1
  },
  oak_leaves: {
    id: 'oak_leaves',
    name: 'Oak Leaves',
    category: BLOCK_CATEGORIES.NATURE,
    emoji: '🍃',
    color: '#15803d',
    opacity: 0.9,
    transparent: true,
    roughness: 0.7,
    metalness: 0.0
  },

  // 2. Building & Stone
  smooth_stone: {
    id: 'smooth_stone',
    name: 'Smooth Stone',
    category: BLOCK_CATEGORIES.BUILDING,
    emoji: '🪨',
    color: '#94a3b8',
    roughness: 0.6,
    metalness: 0.2
  },
  cobblestone: {
    id: 'cobblestone',
    name: 'Cobblestone',
    category: BLOCK_CATEGORIES.BUILDING,
    emoji: '🧱',
    color: '#64748b',
    roughness: 0.8,
    metalness: 0.1
  },
  stone_brick: {
    id: 'stone_brick',
    name: 'Stone Brick',
    category: BLOCK_CATEGORIES.BUILDING,
    emoji: '🏛️',
    color: '#cbd5e1',
    roughness: 0.5,
    metalness: 0.2
  },
  mossy_stone: {
    id: 'mossy_stone',
    name: 'Mossy Stone',
    category: BLOCK_CATEGORIES.BUILDING,
    emoji: '🪴',
    color: '#475569',
    roughness: 0.7,
    metalness: 0.1
  },
  obsidian: {
    id: 'obsidian',
    name: 'Void Obsidian',
    category: BLOCK_CATEGORIES.BUILDING,
    emoji: '🖤',
    color: '#1e1b4b',
    emissive: '#312e81',
    emissiveIntensity: 0.2,
    roughness: 0.2,
    metalness: 0.8
  },
  red_brick: {
    id: 'red_brick',
    name: 'Red Clay Brick',
    category: BLOCK_CATEGORIES.BUILDING,
    emoji: '🧱',
    color: '#b91c1c',
    roughness: 0.7,
    metalness: 0.1
  },
  wool_white: {
    id: 'wool_white',
    name: 'White Wool',
    category: BLOCK_CATEGORIES.BUILDING,
    emoji: '⚪',
    color: '#f8fafc',
    roughness: 0.9,
    metalness: 0.0
  },
  wool_red: {
    id: 'wool_red',
    name: 'Red Wool',
    category: BLOCK_CATEGORIES.BUILDING,
    emoji: '🔴',
    color: '#ef4444',
    roughness: 0.9,
    metalness: 0.0
  },
  wool_blue: {
    id: 'wool_blue',
    name: 'Blue Wool',
    category: BLOCK_CATEGORIES.BUILDING,
    emoji: '🔵',
    color: '#3b82f6',
    roughness: 0.9,
    metalness: 0.0
  },

  // 3. Woods & Timber
  wood_oak_plank: {
    id: 'wood_oak_plank',
    name: 'Oak Plank',
    category: BLOCK_CATEGORIES.WOODS,
    emoji: '🪵',
    color: '#d97706',
    roughness: 0.7,
    metalness: 0.0
  },
  wood_oak_log: {
    id: 'wood_oak_log',
    name: 'Oak Bark Log',
    category: BLOCK_CATEGORIES.WOODS,
    emoji: '🌳',
    color: '#92400e',
    roughness: 0.8,
    metalness: 0.0
  },
  wood_birch_plank: {
    id: 'wood_birch_plank',
    name: 'Birch Plank',
    category: BLOCK_CATEGORIES.WOODS,
    emoji: '🪵',
    color: '#fef08a',
    roughness: 0.6,
    metalness: 0.0
  },
  wood_birch_log: {
    id: 'wood_birch_log',
    name: 'Birch Log',
    category: BLOCK_CATEGORIES.WOODS,
    emoji: '🪵',
    color: '#f1f5f9',
    roughness: 0.7,
    metalness: 0.0
  },
  wood_dark_oak: {
    id: 'wood_dark_oak',
    name: 'Dark Oak Timber',
    category: BLOCK_CATEGORIES.WOODS,
    emoji: '🪵',
    color: '#451a03',
    roughness: 0.7,
    metalness: 0.1
  },

  // 4. Minerals & Ores
  ore_coal: {
    id: 'ore_coal',
    name: 'Coal Ore',
    category: BLOCK_CATEGORIES.MINERALS,
    emoji: '🪨',
    color: '#334155',
    roughness: 0.8,
    metalness: 0.2
  },
  ore_iron: {
    id: 'ore_iron',
    name: 'Iron Ore',
    category: BLOCK_CATEGORIES.MINERALS,
    emoji: '⚙️',
    color: '#e2e8f0',
    roughness: 0.4,
    metalness: 0.7
  },
  ore_gold: {
    id: 'ore_gold',
    name: 'Gold Ore',
    category: BLOCK_CATEGORIES.MINERALS,
    emoji: '🪙',
    color: '#fbbf24',
    emissive: '#d97706',
    emissiveIntensity: 0.3,
    roughness: 0.3,
    metalness: 0.8
  },
  ore_diamond: {
    id: 'ore_diamond',
    name: 'Diamond Ore',
    category: BLOCK_CATEGORIES.MINERALS,
    emoji: '💎',
    color: '#67e8f9',
    emissive: '#06b6d4',
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.9
  },
  ore_emerald: {
    id: 'ore_emerald',
    name: 'Emerald Ore',
    category: BLOCK_CATEGORIES.MINERALS,
    emoji: '🟢',
    color: '#34d399',
    emissive: '#059669',
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.8
  },
  crystal_magic: {
    id: 'crystal_magic',
    name: 'Arcane Crystal',
    category: BLOCK_CATEGORIES.MINERALS,
    emoji: '🔮',
    color: '#c084fc',
    emissive: '#a855f7',
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.9
  },

  // 5. Decor & Utility
  decor_bookshelf: {
    id: 'decor_bookshelf',
    name: 'Ancient Bookshelf',
    category: BLOCK_CATEGORIES.DECOR,
    emoji: '📚',
    color: '#78350f',
    roughness: 0.7,
    metalness: 0.1
  },
  decor_crafting_table: {
    id: 'decor_crafting_table',
    name: 'Crafting Table',
    category: BLOCK_CATEGORIES.DECOR,
    emoji: '🛠️',
    color: '#b45309',
    roughness: 0.6,
    metalness: 0.1
  },
  decor_tnt: {
    id: 'decor_tnt',
    name: 'Explosive TNT',
    category: BLOCK_CATEGORIES.DECOR,
    emoji: '🧨',
    color: '#ef4444',
    roughness: 0.5,
    metalness: 0.1
  },
  decor_lantern: {
    id: 'decor_lantern',
    name: 'Glowing Lantern',
    category: BLOCK_CATEGORIES.DECOR,
    emoji: '🏮',
    color: '#fbbf24',
    emissive: '#f59e0b',
    emissiveIntensity: 1.0,
    roughness: 0.2,
    metalness: 0.4
  },
  decor_glass: {
    id: 'decor_glass',
    name: 'Reinforced Glass',
    category: BLOCK_CATEGORIES.DECOR,
    emoji: '🪟',
    color: '#e0f2fe',
    opacity: 0.4,
    transparent: true,
    roughness: 0.1,
    metalness: 0.1
  }
};

/**
 * Returns all blocks grouped by category.
 * @returns {Record<string, Array<Object>>}
 */
export function getBlocksByCategory() {
  const grouped = {};
  for (const cat of Object.values(BLOCK_CATEGORIES)) {
    grouped[cat] = [];
  }
  for (const block of Object.values(BLOCK_CATALOG)) {
    if (grouped[block.category]) {
      grouped[block.category].push(block);
    }
  }
  return grouped;
}

/**
 * Validates a single block definition.
 * @param {string} blockType
 * @returns {boolean}
 */
export function isValidBlockType(blockType) {
  if (!blockType || typeof blockType !== 'string') return false;
  return Boolean(BLOCK_CATALOG[blockType.toLowerCase().trim()]);
}

/**
 * Validates coordinate bounding box constraints.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {boolean}
 */
export function areCoordinatesValid(x, y, z) {
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return false;
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) return false;
  return (
    x >= WORLD_CONFIG.MIN_X && x <= WORLD_CONFIG.MAX_X &&
    y >= WORLD_CONFIG.MIN_Y && y <= WORLD_CONFIG.MAX_Y &&
    z >= WORLD_CONFIG.MIN_Z && z <= WORLD_CONFIG.MAX_Z
  );
}

export default {
  WORLD_CONFIG,
  BLOCK_CATEGORIES,
  BLOCK_CATALOG,
  getBlocksByCategory,
  isValidBlockType,
  areCoordinatesValid
};
