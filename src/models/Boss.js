import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Group Colossus Raid Boss Schema
 * Manages shared boss HP, attacks, and proportional contribution per Telegram Group.
 */
const BossParticipantSchema = new mongoose.Schema({
  telegramId: { type: String, required: true },
  username: { type: String, default: '' },
  firstName: { type: String, default: '' },
  damageDealt: { type: Number, default: 0, min: 0 },
  attackCount: { type: Number, default: 0, min: 0 },
  lastAttackAt: { type: Date, default: Date.now }
}, { _id: false });

const BossSchema = new mongoose.Schema({
  bossInstanceId: {
    type: String,
    required: true,
    unique: true,
    default: () => `boss_${crypto.randomUUID().slice(0, 10)}`
  },
  chatId: {
    type: String,
    required: [true, 'chatId is required for group boss'],
    index: true
  },
  bossId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  emoji: {
    type: String,
    default: '🗿'
  },
  currentHp: {
    type: Number,
    required: true,
    min: [0, 'Boss HP cannot be negative']
  },
  maxHp: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['active', 'defeated', 'expired'],
    default: 'active',
    index: true
  },
  participants: {
    type: [BossParticipantSchema],
    default: []
  },
  totalDamageDealt: {
    type: Number,
    default: 0,
    min: 0
  },
  rewardsDistributed: {
    type: Boolean,
    default: false
  },
  spawnedAt: {
    type: Date,
    default: Date.now
  },
  defeatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

BossSchema.index({ chatId: 1, status: 1 });

export const Boss = mongoose.model('Boss', BossSchema);
export default Boss;
