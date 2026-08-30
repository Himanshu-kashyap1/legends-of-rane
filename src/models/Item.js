import mongoose from 'mongoose';

/**
 * Item Definition Schema (Static Game Catalog)
 * Central catalog of all items in Legends of Rane.
 */
const ItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: [true, 'itemId is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  displayName: {
    type: String,
    required: [true, 'displayName is required'],
    trim: true
  },
  emoji: {
    type: String,
    default: '📦'
  },
  category: {
    type: String,
    required: true,
    enum: [
      'raw_wood',
      'raw_stone',
      'raw_ore',
      'refined_plank',
      'refined_ingot',
      'gem',
      'tool',
      'special'
    ],
    index: true
  },
  tier: {
    type: Number,
    default: 1,
    min: 1,
    max: 5 // 1: Wood, 2: Stone, 3: Iron, 4: Gold, 5: Diamond
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  stackable: {
    type: Boolean,
    default: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: [0, 'basePrice cannot be negative'],
    default: 10
  },
  description: {
    type: String,
    default: ''
  },
  toolMetadata: {
    toolType: {
      type: String,
      enum: ['axe', 'pickaxe', 'rod', null],
      default: null
    },
    baseDurability: {
      type: Number,
      default: null
    },
    efficiencyMultiplier: {
      type: Number,
      default: 1.0
    }
  }
}, {
  timestamps: true
});

export const Item = mongoose.model('Item', ItemSchema);
export default Item;
