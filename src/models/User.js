import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Skill Sub-Schema
 */
const SkillProgressSchema = new mongoose.Schema({
  level: { type: Number, default: 1, min: 1 },
  xp: { type: Number, default: 0, min: 0 }
}, { _id: false });

/**
 * Stackable Inventory Item Sub-Schema
 */
const InventoryItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
    default: 0
  }
}, { _id: false });

/**
 * Unique Tool Instance Sub-Schema
 * Ensures every crafted tool maintains independent durability and instance identity.
 */
const ToolInstanceSchema = new mongoose.Schema({
  instanceId: {
    type: String,
    required: true,
    default: () => `tool_${crypto.randomUUID().slice(0, 8)}`
  },
  toolId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  toolType: {
    type: String,
    required: true,
    enum: ['axe', 'pickaxe', 'rod']
  },
  tier: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  durability: {
    type: Number,
    required: true,
    min: [0, 'Durability cannot be negative']
  },
  maxDurability: {
    type: Number,
    required: true,
    min: [1, 'Max durability must be at least 1']
  },
  equipped: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/**
 * Player Companion Pet Sub-Schema
 */
const OwnedPetSchema = new mongoose.Schema({
  petId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  happiness: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  obtainedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/**
 * Player Quest Progress Sub-Schema
 */
const PlayerQuestProgressSchema = new mongoose.Schema({
  targetId: { type: String, required: true },
  current: { type: Number, default: 0, min: 0 },
  required: { type: Number, required: true, min: 1 }
}, { _id: false });

const PlayerQuestSchema = new mongoose.Schema({
  questId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'claimed'],
    default: 'active'
  },
  progress: [PlayerQuestProgressSchema],
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

/**
 * Main Player / User Schema
 */
const UserSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: [true, 'telegramId is required'],
    unique: true,
    trim: true,
    index: true
  },
  username: {
    type: String,
    trim: true,
    default: ''
  },
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  coins: {
    type: Number,
    default: 100,
    min: [0, 'Coins cannot be negative']
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  xp: {
    type: Number,
    default: 0,
    min: 0
  },
  title: {
    type: String,
    default: 'Novice Adventurer',
    trim: true
  },
  unlockedTitles: {
    type: [String],
    default: ['Novice Adventurer']
  },
  energy: {
    current: {
      type: Number,
      default: 100,
      min: [0, 'Energy cannot be negative']
    },
    max: {
      type: Number,
      default: 100,
      min: 10
    },
    lastRegen: {
      type: Date,
      default: Date.now
    }
  },
  skills: {
    woodcutting: { type: SkillProgressSchema, default: () => ({ level: 1, xp: 0 }) },
    mining: { type: SkillProgressSchema, default: () => ({ level: 1, xp: 0 }) },
    crafting: { type: SkillProgressSchema, default: () => ({ level: 1, xp: 0 }) },
    fishing: { type: SkillProgressSchema, default: () => ({ level: 1, xp: 0 }) },
    exploration: { type: SkillProgressSchema, default: () => ({ level: 1, xp: 0 }) }
  },
  inventory: {
    type: [InventoryItemSchema],
    default: []
  },
  tools: {
    type: [ToolInstanceSchema],
    default: []
  },
  equippedTools: {
    axeInstanceId: { type: String, default: null },
    pickaxeInstanceId: { type: String, default: null },
    rodInstanceId: { type: String, default: null }
  },
  pets: {
    type: [OwnedPetSchema],
    default: []
  },
  activePet: {
    type: String,
    default: null
  },
  quests: {
    type: [PlayerQuestSchema],
    default: []
  },
  gifting: {
    dailySentCount: { type: Number, default: 0, min: 0 },
    lastGiftDate: { type: String, default: '' } // YYYY-MM-DD
  },
  offline: {
    lastLogoutAt: { type: Date, default: Date.now },
    unclaimedCoins: { type: Number, default: 0, min: 0 },
    unclaimedResources: [InventoryItemSchema]
  },
  statistics: {
    gatheredCount: { type: Number, default: 0, min: 0 },
    craftedCount: { type: Number, default: 0, min: 0 },
    bossDamageDealt: { type: Number, default: 0, min: 0 },
    marketTradesCompleted: { type: Number, default: 0, min: 0 },
    giftsSent: { type: Number, default: 0, min: 0 },
    giftsReceived: { type: Number, default: 0, min: 0 },
    blocksPlaced: { type: Number, default: 0, min: 0 },
    blocksBroken: { type: Number, default: 0, min: 0 }
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for leaderboards and fast queries
UserSchema.index({ level: -1, xp: -1 });
UserSchema.index({ coins: -1 });
UserSchema.index({ 'skills.woodcutting.level': -1 });
UserSchema.index({ 'skills.mining.level': -1 });
UserSchema.index({ 'skills.crafting.level': -1 });

export const User = mongoose.model('User', UserSchema);
export default User;
