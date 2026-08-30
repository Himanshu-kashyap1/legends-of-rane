import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Boss Raid Participant Sub-Schema
 */
const RaidParticipantSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    default: ''
  },
  damageDealt: {
    type: Number,
    default: 0,
    min: 0
  },
  attackCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastAttackedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/**
 * Group Colossus Boss Raid Schema
 */
const BossRaidSchema = new mongoose.Schema({
  bossInstanceId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `raid_${crypto.randomUUID().slice(0, 10)}`
  },
  chatId: {
    type: String,
    required: [true, 'chatId is required'],
    index: true
  },
  chatTitle: {
    type: String,
    default: ''
  },
  bossId: {
    type: String,
    required: true,
    default: 'colossus_titan'
  },
  name: {
    type: String,
    required: true,
    default: 'Ancient Obsidian Colossus'
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  currentHp: {
    type: Number,
    required: true,
    min: [0, 'Boss HP cannot be negative']
  },
  maxHp: {
    type: Number,
    required: true,
    min: [1, 'Boss max HP must be positive']
  },
  status: {
    type: String,
    enum: ['active', 'defeated', 'escaped'],
    default: 'active',
    index: true
  },
  participants: {
    type: [RaidParticipantSchema],
    default: []
  },
  rewardsDistributed: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endsAt: {
    type: Date,
    default: () => new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours window
  },
  defeatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

BossRaidSchema.index({ chatId: 1, status: 1 });

export const BossRaid = mongoose.model('BossRaid', BossRaidSchema);
export default BossRaid;
