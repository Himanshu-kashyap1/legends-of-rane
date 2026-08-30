import mongoose from 'mongoose';

/**
 * Quest Definition Schema (Static Game Catalog)
 * Story, daily, and mastery quests.
 */
const QuestRequirementSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['gather_item', 'reach_skill_level', 'craft_item', 'defeat_boss', 'trade_market']
  },
  targetId: {
    type: String,
    required: true,
    trim: true
  },
  count: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const QuestRewardItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const QuestSchema = new mongoose.Schema({
  questId: {
    type: String,
    required: [true, 'questId is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['daily', 'story', 'challenge'],
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  requirements: {
    type: [QuestRequirementSchema],
    validate: [arr => arr.length > 0, 'Quest must have at least one requirement']
  },
  rewards: {
    coins: {
      type: Number,
      default: 0,
      min: 0
    },
    playerXp: {
      type: Number,
      default: 0,
      min: 0
    },
    items: {
      type: [QuestRewardItemSchema],
      default: []
    },
    unlockedTitle: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true
});

export const Quest = mongoose.model('Quest', QuestSchema);
export default Quest;
