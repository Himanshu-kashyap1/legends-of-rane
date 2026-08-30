/**
 * Comprehensive Hunting World & Monster Catalog Configurations
 */

export const HUNTING_BIOMES = {
  FOREST: {
    id: 'forest',
    name: 'Whispering Forest',
    emoji: '🌲',
    bounds: { minX: -80, maxX: -24, minZ: -80, maxZ: -24 },
    fogColor: '#064e3b',
    fogDensity: 0.015,
    ambientColor: '#a7f3d0',
    skyColor: '#022c22',
    groundBlock: 'grass',
    secondaryBlock: 'dirt',
    foliageBlock: 'wood_oak_log',
    monsters: ['forest_wolf', 'forest_goblin', 'ancient_treant']
  },
  QUARRY: {
    id: 'quarry',
    name: 'Ironfang Quarry',
    emoji: '🪨',
    bounds: { minX: 24, maxX: 80, minZ: -80, maxZ: -24 },
    fogColor: '#451a03',
    fogDensity: 0.018,
    ambientColor: '#fde68a',
    skyColor: '#292524',
    groundBlock: 'smooth_stone',
    secondaryBlock: 'deepslate',
    foliageBlock: 'stone_brick',
    monsters: ['stone_golem', 'cave_goblin', 'rock_beast']
  },
  CAVERNS: {
    id: 'caverns',
    name: 'Crystal Caverns',
    emoji: '💎',
    bounds: { minX: -80, maxX: -24, minZ: 24, maxZ: 80 },
    fogColor: '#1e1b4b',
    fogDensity: 0.02,
    ambientColor: '#c084fc',
    skyColor: '#0f172a',
    groundBlock: 'deepslate',
    secondaryBlock: 'smooth_stone',
    foliageBlock: 'holy_crystal',
    monsters: ['crystal_spider', 'cave_wraith', 'crystal_golem']
  },
  VOLCANO: {
    id: 'volcano',
    name: 'Ashen Volcano',
    emoji: '🔥',
    bounds: { minX: 24, maxX: 80, minZ: 24, maxZ: 80 },
    fogColor: '#7f1d1d',
    fogDensity: 0.022,
    ambientColor: '#fca5a5',
    skyColor: '#1c1917',
    groundBlock: 'bedrock',
    secondaryBlock: 'deepslate',
    foliageBlock: 'ore_gold',
    monsters: ['fire_imp', 'magma_beast', 'infernal_golem']
  },
  RUINS: {
    id: 'ruins',
    name: 'Ancient Ruins',
    emoji: '🌑',
    bounds: { minX: -24, maxX: 24, minZ: -24, maxZ: 24 },
    fogColor: '#0f172a',
    fogDensity: 0.012,
    ambientColor: '#fef08a',
    skyColor: '#020617',
    groundBlock: 'grass',
    secondaryBlock: 'stone_brick',
    foliageBlock: 'holy_crystal',
    monsters: ['skeleton_warrior', 'shadow_beast', 'ancient_guardian']
  }
};

export const MONSTER_CATALOG = {
  // 🌲 Whispering Forest
  forest_wolf: {
    id: 'forest_wolf',
    name: 'Forest Wolf',
    biome: 'forest',
    level: 1,
    maxHp: 60,
    attackPower: 8,
    defense: 2,
    speed: 0.065,
    attackRange: 2.2,
    detectRange: 12,
    xpReward: 25,
    coinReward: [15, 30],
    color: '#64748b',
    eyeColor: '#ef4444',
    scale: 0.8,
    drops: [
      { itemId: 'wood_oak', chance: 0.8, min: 1, max: 3 }
    ]
  },
  forest_goblin: {
    id: 'forest_goblin',
    name: 'Goblin Scout',
    biome: 'forest',
    level: 2,
    maxHp: 90,
    attackPower: 12,
    defense: 4,
    speed: 0.075,
    attackRange: 2.0,
    detectRange: 14,
    xpReward: 40,
    coinReward: [25, 50],
    color: '#22c55e',
    eyeColor: '#fbbf24',
    scale: 0.7,
    drops: [
      { itemId: 'wood_oak', chance: 0.9, min: 2, max: 4 }
    ]
  },
  ancient_treant: {
    id: 'ancient_treant',
    name: 'Ancient Treant',
    biome: 'forest',
    level: 4,
    maxHp: 180,
    attackPower: 20,
    defense: 8,
    speed: 0.035,
    attackRange: 3.0,
    detectRange: 10,
    xpReward: 80,
    coinReward: [60, 110],
    color: '#78350f',
    eyeColor: '#4ade80',
    scale: 1.4,
    drops: [
      { itemId: 'wood_oak', chance: 1.0, min: 5, max: 10 }
    ]
  },

  // 🪨 Ironfang Quarry
  stone_golem: {
    id: 'stone_golem',
    name: 'Stone Golem',
    biome: 'quarry',
    level: 3,
    maxHp: 150,
    attackPower: 16,
    defense: 10,
    speed: 0.04,
    attackRange: 2.5,
    detectRange: 11,
    xpReward: 65,
    coinReward: [45, 80],
    color: '#94a3b8',
    eyeColor: '#38bdf8',
    scale: 1.2,
    drops: [
      { itemId: 'stone_granite', chance: 0.85, min: 2, max: 5 }
    ]
  },
  cave_goblin: {
    id: 'cave_goblin',
    name: 'Cave Goblin Miner',
    biome: 'quarry',
    level: 4,
    maxHp: 130,
    attackPower: 18,
    defense: 6,
    speed: 0.07,
    attackRange: 2.0,
    detectRange: 13,
    xpReward: 75,
    coinReward: [55, 95],
    color: '#475569',
    eyeColor: '#f97316',
    scale: 0.75,
    drops: [
      { itemId: 'ore_iron', chance: 0.6, min: 1, max: 2 },
      { itemId: 'stone_granite', chance: 0.9, min: 2, max: 4 }
    ]
  },
  rock_beast: {
    id: 'rock_beast',
    name: 'Ironhide Rock Beast',
    biome: 'quarry',
    level: 6,
    maxHp: 260,
    attackPower: 26,
    defense: 14,
    speed: 0.05,
    attackRange: 2.8,
    detectRange: 12,
    xpReward: 130,
    coinReward: [90, 160],
    color: '#334155',
    eyeColor: '#eab308',
    scale: 1.3,
    drops: [
      { itemId: 'ore_iron', chance: 0.8, min: 2, max: 4 },
      { itemId: 'stone_granite', chance: 1.0, min: 4, max: 8 }
    ]
  },

  // 💎 Crystal Caverns
  crystal_spider: {
    id: 'crystal_spider',
    name: 'Crystal Spider',
    biome: 'caverns',
    level: 5,
    maxHp: 170,
    attackPower: 24,
    defense: 8,
    speed: 0.085,
    attackRange: 2.2,
    detectRange: 14,
    xpReward: 110,
    coinReward: [80, 140],
    color: '#818cf8',
    eyeColor: '#c084fc',
    scale: 0.9,
    drops: [
      { itemId: 'gem_amethyst', chance: 0.4, min: 1, max: 1 },
      { itemId: 'stone_granite', chance: 0.8, min: 3, max: 6 }
    ]
  },
  cave_wraith: {
    id: 'cave_wraith',
    name: 'Cavern Wraith',
    biome: 'caverns',
    level: 7,
    maxHp: 240,
    attackPower: 32,
    defense: 12,
    speed: 0.075,
    attackRange: 2.5,
    detectRange: 15,
    xpReward: 170,
    coinReward: [120, 210],
    color: '#6366f1',
    eyeColor: '#a855f7',
    scale: 1.1,
    drops: [
      { itemId: 'ore_gold', chance: 0.6, min: 1, max: 2 },
      { itemId: 'gem_amethyst', chance: 0.5, min: 1, max: 2 }
    ]
  },
  crystal_golem: {
    id: 'crystal_golem',
    name: 'Diamond Crystal Golem',
    biome: 'caverns',
    level: 9,
    maxHp: 380,
    attackPower: 42,
    defense: 20,
    speed: 0.045,
    attackRange: 3.0,
    detectRange: 12,
    xpReward: 250,
    coinReward: [180, 320],
    color: '#38bdf8',
    eyeColor: '#f43f5e',
    scale: 1.5,
    drops: [
      { itemId: 'gem_diamond', chance: 0.35, min: 1, max: 1 },
      { itemId: 'ore_gold', chance: 0.8, min: 2, max: 4 }
    ]
  },

  // 🔥 Ashen Volcano
  fire_imp: {
    id: 'fire_imp',
    name: 'Fire Imp',
    biome: 'volcano',
    level: 8,
    maxHp: 220,
    attackPower: 36,
    defense: 10,
    speed: 0.09,
    attackRange: 2.2,
    detectRange: 16,
    xpReward: 210,
    coinReward: [160, 280],
    color: '#ea580c',
    eyeColor: '#fde047',
    scale: 0.7,
    drops: [
      { itemId: 'ore_gold', chance: 0.7, min: 1, max: 3 }
    ]
  },
  magma_beast: {
    id: 'magma_beast',
    name: 'Magma Beast',
    biome: 'volcano',
    level: 10,
    maxHp: 360,
    attackPower: 48,
    defense: 18,
    speed: 0.06,
    attackRange: 2.8,
    detectRange: 14,
    xpReward: 320,
    coinReward: [240, 420],
    color: '#dc2626',
    eyeColor: '#fbbf24',
    scale: 1.3,
    drops: [
      { itemId: 'gem_ruby', chance: 0.45, min: 1, max: 2 },
      { itemId: 'ore_gold', chance: 0.85, min: 2, max: 5 }
    ]
  },
  infernal_golem: {
    id: 'infernal_golem',
    name: 'Infernal Obsidian Titan',
    biome: 'volcano',
    level: 12,
    maxHp: 520,
    attackPower: 60,
    defense: 25,
    speed: 0.04,
    attackRange: 3.2,
    detectRange: 13,
    xpReward: 460,
    coinReward: [350, 600],
    color: '#18181b',
    eyeColor: '#ef4444',
    scale: 1.6,
    drops: [
      { itemId: 'gem_diamond', chance: 0.5, min: 1, max: 2 },
      { itemId: 'gem_ruby', chance: 0.8, min: 2, max: 3 }
    ]
  },

  // 🌑 Ancient Ruins
  skeleton_warrior: {
    id: 'skeleton_warrior',
    name: 'Ruins Skeleton Warrior',
    biome: 'ruins',
    level: 10,
    maxHp: 320,
    attackPower: 45,
    defense: 16,
    speed: 0.07,
    attackRange: 2.4,
    detectRange: 15,
    xpReward: 300,
    coinReward: [220, 380],
    color: '#e2e8f0',
    eyeColor: '#38bdf8',
    scale: 1.0,
    drops: [
      { itemId: 'ore_iron', chance: 0.9, min: 3, max: 6 },
      { itemId: 'stone_granite', chance: 1.0, min: 5, max: 10 }
    ]
  },
  shadow_beast: {
    id: 'shadow_beast',
    name: 'Void Shadow Beast',
    biome: 'ruins',
    level: 13,
    maxHp: 480,
    attackPower: 58,
    defense: 22,
    speed: 0.085,
    attackRange: 2.8,
    detectRange: 16,
    xpReward: 480,
    coinReward: [380, 650],
    color: '#020617',
    eyeColor: '#a855f7',
    scale: 1.35,
    drops: [
      { itemId: 'gem_diamond', chance: 0.6, min: 1, max: 2 },
      { itemId: 'gem_amethyst', chance: 0.9, min: 2, max: 4 }
    ]
  },
  ancient_guardian: {
    id: 'ancient_guardian',
    name: 'Sanctuary Ancient Guardian',
    biome: 'ruins',
    level: 15,
    maxHp: 750,
    attackPower: 75,
    defense: 30,
    speed: 0.05,
    attackRange: 3.5,
    detectRange: 18,
    xpReward: 700,
    coinReward: [550, 950],
    color: '#facc15',
    eyeColor: '#fef08a',
    scale: 1.8,
    drops: [
      { itemId: 'gem_diamond', chance: 0.8, min: 2, max: 3 },
      { itemId: 'gem_ruby', chance: 0.8, min: 2, max: 3 },
      { itemId: 'ore_gold', chance: 1.0, min: 5, max: 10 }
    ]
  }
};

export const WEAPON_PROGRESSION = {
  wpn_wood_blade: {
    id: 'wpn_wood_blade',
    tier: 1,
    name: 'Wood Training Blade',
    emoji: '🗡️',
    attack: 18,
    color: '#854d0e',
    glowColor: null,
    cost: [], // Starter weapon
    levelRequired: 1
  },
  wpn_stone_scythe: {
    id: 'wpn_stone_scythe',
    tier: 2,
    name: 'Granite Cleaver',
    emoji: '🪓',
    attack: 35,
    color: '#64748b',
    glowColor: '#94a3b8',
    cost: [
      { itemId: 'wood_oak', quantity: 20 },
      { itemId: 'stone_granite', quantity: 15 }
    ],
    levelRequired: 2
  },
  wpn_iron_greatsword: {
    id: 'wpn_iron_greatsword',
    tier: 3,
    name: 'Iron Forged Greatsword',
    emoji: '⚔️',
    attack: 65,
    color: '#cbd5e1',
    glowColor: '#38bdf8',
    cost: [
      { itemId: 'ore_iron', quantity: 15 },
      { itemId: 'wood_oak', quantity: 30 }
    ],
    levelRequired: 4
  },
  wpn_gold_claymore: {
    id: 'wpn_gold_claymore',
    tier: 4,
    name: 'Gilded Sunblade',
    emoji: '✨',
    attack: 110,
    color: '#facc15',
    glowColor: '#fef08a',
    cost: [
      { itemId: 'ore_gold', quantity: 12 },
      { itemId: 'gem_amethyst', quantity: 2 }
    ],
    levelRequired: 7
  },
  wpn_diamond_excalibur: {
    id: 'wpn_diamond_excalibur',
    tier: 5,
    name: 'Diamond Crystal Excalibur',
    emoji: '💎',
    attack: 175,
    color: '#38bdf8',
    glowColor: '#67e8f9',
    cost: [
      { itemId: 'gem_diamond', quantity: 4 },
      { itemId: 'ore_gold', quantity: 15 }
    ],
    levelRequired: 10
  },
  wpn_celestial_edge: {
    id: 'wpn_celestial_edge',
    tier: 6,
    name: 'Celestial God-Slayer Edge',
    emoji: '🌌',
    attack: 260,
    color: '#a855f7',
    glowColor: '#f0abfc',
    cost: [
      { itemId: 'gem_diamond', quantity: 8 },
      { itemId: 'gem_ruby', quantity: 6 },
      { itemId: 'ore_gold', quantity: 25 }
    ],
    levelRequired: 13
  }
};

export default {
  HUNTING_BIOMES,
  MONSTER_CATALOG,
  WEAPON_PROGRESSION
};
