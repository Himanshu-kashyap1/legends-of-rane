/**
 * Centralized Title Definitions & Unlock Requirements
 */

export const TITLES = [
  {
    id: 'title_novice',
    name: 'Novice Adventurer',
    emoji: '🌱',
    description: 'A newly arrived wanderer in the realm of Rane.',
    requirement: { type: 'player_level', level: 1 }
  },
  {
    id: 'title_timber_initiate',
    name: 'Timber Initiate',
    emoji: '🪓',
    description: 'An aspiring woodcutter learning the grains of ancient trees.',
    requirement: { type: 'skill_level', skill: 'woodcutting', level: 3 }
  },
  {
    id: 'title_forest_lumberjack',
    name: 'Forest Lumberjack',
    emoji: '🌲',
    description: 'A seasoned master of the deep woodlands and ancient groves.',
    requirement: { type: 'skill_level', skill: 'woodcutting', level: 10 }
  },
  {
    id: 'title_quarry_excavator',
    name: 'Quarry Excavator',
    emoji: '⛏️',
    description: 'A sturdy digger cracking granite and marble slabs.',
    requirement: { type: 'skill_level', skill: 'mining', level: 3 }
  },
  {
    id: 'title_deep_delver',
    name: 'Deep Earth Delver',
    emoji: '💎',
    description: 'An intrepid miner extracting gold and rare gemstones from the abyss.',
    requirement: { type: 'skill_level', skill: 'mining', level: 10 }
  },
  {
    id: 'title_apprentice_crafter',
    name: 'Apprentice Crafter',
    emoji: '🔨',
    description: 'A diligent builder crafting fine planks and foundational tools.',
    requirement: { type: 'skill_level', skill: 'crafting', level: 3 }
  },
  {
    id: 'title_grand_arch_smith',
    name: 'Grand Arch-Smith',
    emoji: '⚒️',
    description: 'A legendary blacksmith who shapes hardened metals and diamond gear.',
    requirement: { type: 'skill_level', skill: 'crafting', level: 10 }
  },
  {
    id: 'title_angler_rane',
    name: 'Angler of Rane',
    emoji: '🎣',
    description: 'A patient fisher casting lines into rushing rivers and tranquil lakes.',
    requirement: { type: 'skill_level', skill: 'fishing', level: 3 }
  },
  {
    id: 'title_master_tides',
    name: 'Master of the Tides',
    emoji: '🌊',
    description: 'A master angler who commands deep ocean waters.',
    requirement: { type: 'skill_level', skill: 'fishing', level: 10 }
  },
  {
    id: 'title_realm_voyager',
    name: 'Realm Voyager',
    emoji: '🧭',
    description: 'A fearless explorer charting unseen lands across Rane.',
    requirement: { type: 'skill_level', skill: 'exploration', level: 5 }
  },
  {
    id: 'title_lord_of_rane',
    name: 'Lord of Rane',
    emoji: '👑',
    description: 'A legendary hero whose prestige and mastery govern the realm.',
    requirement: { type: 'player_level', level: 20 }
  }
];

/**
 * Checks which titles a player is eligible for.
 * @param {Object} user
 * @returns {Array<string>} Array of title names
 */
export function checkEligibleTitles(user) {
  if (!user) return ['Novice Adventurer'];
  const eligible = [];

  for (const title of TITLES) {
    if (title.requirement.type === 'player_level') {
      if ((user.level || 1) >= title.requirement.level) {
        eligible.push(title.name);
      }
    } else if (title.requirement.type === 'skill_level') {
      const skillLevel = user.skills?.[title.requirement.skill]?.level || 1;
      if (skillLevel >= title.requirement.level) {
        eligible.push(title.name);
      }
    }
  }

  if (eligible.length === 0) {
    eligible.push('Novice Adventurer');
  }

  return eligible;
}

export default {
  TITLES,
  checkEligibleTitles
};
