/**
 * Centralized Offline Structure Definitions & Production Rates
 */

export const OFFLINE_CONFIG = {
  MIN_ELAPSED_MS: 5 * 60 * 1000, // 5 minutes minimum
  MAX_SIMULATION_HOURS: 12,
  MAX_SIMULATION_MS: 12 * 60 * 60 * 1000 // 12 hours max cap
};

export const STRUCTURES = {
  structure_lumber_mill: {
    id: 'structure_lumber_mill',
    name: 'Royal Lumber Mill',
    emoji: '🪵',
    resourceId: 'wood_oak',
    ratePerHour: 4,
    description: 'Automated timber saws harvesting sturdy oak logs continuously.'
  },
  structure_quarry: {
    id: 'structure_quarry',
    name: 'Quarry Derrick',
    emoji: '🪨',
    resourceId: 'stone_granite',
    ratePerHour: 3,
    description: 'Steam winches and pulleys extracting granite stone blocks from the quarry.'
  },
  structure_gold_forge: {
    id: 'structure_gold_forge',
    name: 'Treasury Mint & Gold Forge',
    emoji: '🪙',
    resourceId: 'coins',
    ratePerHour: 10,
    description: 'Autonomous forges refining royal currency around the clock.'
  }
};

export default {
  OFFLINE_CONFIG,
  STRUCTURES
};
