import mongoose from 'mongoose';

/**
 * Pet Definition Schema (Static Game Catalog)
 * Companion pets and their passive perks.
 */
const PetSchema = new mongoose.Schema({
  petId: {
    type: String,
    required: [true, 'petId is required'],
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
  emoji: {
    type: String,
    default: '🐾'
  },
  description: {
    type: String,
    default: ''
  },
  perkType: {
    type: String,
    required: true,
    enum: [
      'woodcutting_xp',
      'woodcutting_yield',
      'mining_yield',
      'lucky_gem',
      'fishing_yield',
      'all_gathering_yield',
      'energy_regen',
      'critical_harvest',
      'crafting_discount'
    ],
    index: true
  },
  perkValue: {
    type: Number,
    required: true,
    default: 0.1 // 0.10 = +10% bonus
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'rare'
  },
  priceCoins: {
    type: Number,
    default: 500,
    min: 0
  }
}, {
  timestamps: true
});

export const Pet = mongoose.model('Pet', PetSchema);
export default Pet;
