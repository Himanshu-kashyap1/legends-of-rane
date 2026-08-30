import mongoose from 'mongoose';

/**
 * Resource Node Schema (Static Game Catalog)
 * Gathering zones: Lumberjack Forest, Stone Quarry, Deep Mines, etc.
 */
const DropTableEntrySchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  minDrop: {
    type: Number,
    required: true,
    min: 1
  },
  maxDrop: {
    type: Number,
    required: true,
    min: 1
  },
  weight: {
    type: Number,
    default: 100,
    min: 1
  }
}, { _id: false });

const ResourceNodeSchema = new mongoose.Schema({
  nodeId: {
    type: String,
    required: [true, 'nodeId is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  zone: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  skill: {
    type: String,
    required: true,
    enum: ['woodcutting', 'mining', 'fishing', 'exploration'],
    index: true
  },
  requiredSkillLevel: {
    type: Number,
    default: 1,
    min: 1
  },
  requiredToolType: {
    type: String,
    enum: ['axe', 'pickaxe', 'rod', 'none'],
    default: 'none'
  },
  requiredToolTier: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  energyCost: {
    type: Number,
    required: true,
    default: 5,
    min: 1
  },
  dropTable: {
    type: [DropTableEntrySchema],
    validate: [arr => arr.length > 0, 'Resource node must have at least one drop entry']
  },
  xpReward: {
    type: Number,
    default: 10,
    min: 1
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export const ResourceNode = mongoose.model('ResourceNode', ResourceNodeSchema);
export default ResourceNode;
