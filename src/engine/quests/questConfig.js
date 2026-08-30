/**
 * Centralized Quest Definitions & Catalog
 */

export const QUEST_CATEGORIES = {
  story: {
    id: 'story',
    name: 'Story Quests',
    emoji: '📜',
    description: 'Follow the ancient epic of Rane, unlock tools, and level up your character.'
  },
  daily: {
    id: 'daily',
    name: 'Daily Bounties',
    emoji: '☀️',
    description: 'Refreshed every UTC day. Complete gathering and crafting bounties for coins & XP.'
  }
};

export const QUESTS = {
  // ==========================================
  // 1. STORY QUESTS
  // ==========================================
  quest_story_first_steps: {
    questId: 'quest_story_first_steps',
    title: 'First Steps into Rane',
    category: 'story',
    emoji: '🪵',
    order: 1,
    description: 'Gather 10 pieces of Oak Wood from Lumberjack Forest to establish your camp.',
    requirements: [
      { type: 'gather_item', targetId: 'wood_oak', count: 10 }
    ],
    rewards: {
      coins: 50,
      playerXp: 100,
      items: [{ itemId: 'wood_oak', quantity: 5 }]
    }
  },
  quest_story_planks: {
    questId: 'quest_story_planks',
    title: 'Master of Timber',
    category: 'story',
    emoji: '🪵',
    order: 2,
    description: 'Process raw lumber into 4 Oak Planks in the Blacksmith Workshop.',
    requirements: [
      { type: 'craft_item', targetId: 'plank_oak', count: 4 }
    ],
    rewards: {
      coins: 80,
      playerXp: 150,
      items: [{ itemId: 'stone_granite', quantity: 10 }]
    }
  },
  quest_story_quarry: {
    questId: 'quest_story_quarry',
    title: 'Stone Age Excavator',
    category: 'story',
    emoji: '⛏️',
    order: 3,
    description: 'Mine 15 Granite Stones from the Stone Quarry to strengthen base foundations.',
    requirements: [
      { type: 'gather_item', targetId: 'stone_granite', count: 15 }
    ],
    rewards: {
      coins: 120,
      playerXp: 200,
      items: [{ itemId: 'coal', quantity: 5 }]
    }
  },
  quest_story_smelter: {
    questId: 'quest_story_smelter',
    title: 'The Royal Smelter',
    category: 'story',
    emoji: '🔩',
    order: 4,
    description: 'Smelt 2 Iron Ingots using Raw Iron Ore and Coal in the Workshop.',
    requirements: [
      { type: 'craft_item', targetId: 'ingot_iron', count: 2 }
    ],
    rewards: {
      coins: 200,
      playerXp: 300,
      items: [{ itemId: 'ingot_gold', quantity: 1 }]
    }
  },

  // ==========================================
  // 2. DAILY BOUNTIES
  // ==========================================
  quest_daily_woodcutter: {
    questId: 'quest_daily_woodcutter',
    title: 'Daily Lumber Duty',
    category: 'daily',
    emoji: '🪓',
    description: 'Harvest 15 Oak Wood from the forest to supply the kingdom with fuel.',
    requirements: [
      { type: 'gather_item', targetId: 'wood_oak', count: 15 }
    ],
    rewards: {
      coins: 40,
      playerXp: 80,
      items: []
    }
  },
  quest_daily_miner: {
    questId: 'quest_daily_miner',
    title: 'Quarry Work Order',
    category: 'daily',
    emoji: '🪨',
    description: 'Mine 10 Granite Stones from the Stone Quarry.',
    requirements: [
      { type: 'gather_item', targetId: 'stone_granite', count: 10 }
    ],
    rewards: {
      coins: 40,
      playerXp: 80,
      items: []
    }
  },
  quest_daily_refiner: {
    questId: 'quest_daily_refiner',
    title: 'Daily Carpenter Craft',
    category: 'daily',
    emoji: '🔨',
    description: 'Craft 4 Oak Planks at the Workshop crafting table.',
    requirements: [
      { type: 'craft_item', targetId: 'plank_oak', count: 4 }
    ],
    rewards: {
      coins: 50,
      playerXp: 100,
      items: []
    }
  }
};

/**
 * Gets all quests in a given category.
 * @param {'story'|'daily'} category
 * @returns {Array<Object>}
 */
export function getQuestsByCategory(category) {
  return Object.values(QUESTS).filter(q => q.category === category);
}

export default {
  QUEST_CATEGORIES,
  QUESTS,
  getQuestsByCategory
};
