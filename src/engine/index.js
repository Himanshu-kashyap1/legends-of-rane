export {
  executeGatherAction
} from './gathering/gatheringEngine.js';

export {
  GATHERING_ZONES,
  RESOURCE_NODES,
  ENERGY_CONFIG,
  CRITICAL_CONFIG
} from './gathering/gatheringConfig.js';

export {
  selectWeightedLoot,
  calculateQuantity,
  rollCritical
} from './gathering/lootRng.js';

export {
  calculateCurrentEnergy
} from './gathering/energyCalculator.js';

export {
  TOOL_TIERS,
  DURABILITY_STATUS_THRESHOLDS,
  TOOL_REPAIR_COSTS,
  TOOL_UPGRADE_COSTS,
  getDurabilityStatus
} from './economy/toolConfig.js';

export {
  getToolDetails,
  executeRepairTool,
  executeUpgradeTool,
  hasRequiredMaterials,
  deductMaterials
} from './economy/toolService.js';

export {
  RECIPE_CATEGORIES,
  RECIPES,
  getRecipesByCategory
} from './economy/recipeConfig.js';

export {
  validateCrafting,
  executeCraftRecipe
} from './economy/craftingEngine.js';

export {
  createMarketListing,
  cancelMarketListing,
  purchaseMarketListing,
  browseMarketListings,
  getPlayerActiveListings
} from './economy/marketEngine.js';

export {
  MIN_GIFT_LEVEL,
  MAX_DAILY_GIFTS,
  checkDailyGifts,
  resolveRecipient,
  validateGift,
  executeGiftTransfer
} from './social/giftingEngine.js';

export {
  QUEST_CATEGORIES,
  QUESTS,
  getQuestsByCategory
} from './quests/questConfig.js';

export {
  ensurePlayerQuests,
  trackQuestProgress,
  claimQuestReward
} from './quests/questEngine.js';

export {
  PET_CONFIG,
  PETS,
  getPetDefinition
} from './pets/petConfig.js';

export {
  adoptPet,
  equipPet,
  feedPet,
  getActivePetBuff,
  decayActivePetHappiness
} from './pets/petEngine.js';

export {
  TITLES,
  checkEligibleTitles
} from './progression/titleConfig.js';

export {
  VALID_SKILLS,
  getRequiredPlayerXp,
  getRequiredSkillXp,
  calculateProgressPercent,
  addPlayerXp,
  addSkillXp,
  syncTitles
} from './progression/progressionEngine.js';

export {
  OFFLINE_CONFIG,
  STRUCTURES
} from './offline/structureConfig.js';

export {
  calculateOfflineEarnings,
  claimOfflineRewards
} from './offline/offlineEngine.js';

export {
  BOSS_COMBAT_CONFIG,
  BOSS_CATALOG,
  getBossDefinition
} from './combat/bossConfig.js';

export {
  spawnOrGetGroupBoss,
  calculatePlayerAttackDamage,
  executeBossAttack,
  distributeBossRewards
} from './combat/bossEngine.js';

export {
  WORLD_CONFIG,
  BLOCK_CATEGORIES,
  BLOCK_CATALOG,
  getBlocksByCategory,
  isValidBlockType,
  areCoordinatesValid
} from './voxel/blockConfig.js';

export {
  getDefaultStarterBlocks,
  loadPlayerBase,
  savePlayerBase,
  placeBlock,
  destroyBlock,
  clearPlayerBase
} from './voxel/baseEngine.js';

export default {
  gathering: './gathering/gatheringEngine.js',
  economy: './economy/toolService.js',
  crafting: './economy/craftingEngine.js',
  market: './economy/marketEngine.js',
  social: './social/giftingEngine.js',
  quests: './quests/questEngine.js',
  pets: './pets/petEngine.js',
  progression: './progression/progressionEngine.js',
  offline: './offline/offlineEngine.js',
  combat: './combat/bossEngine.js',
  voxel: './voxel/baseEngine.js'
};
