import mongoose from 'mongoose';

/**
 * Recipe Definition Schema (Static Game Catalog)
 * Blacksmith & crafting recipes.
 */
const RecipeMaterialSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Material quantity must be at least 1']
  }
}, { _id: false });

const RecipeSchema = new mongoose.Schema({
  recipeId: {
    type: String,
    required: [true, 'recipeId is required'],
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
  category: {
    type: String,
    enum: ['tool', 'refining', 'special'],
    required: true,
    index: true
  },
  outputItemId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  outputQuantity: {
    type: Number,
    default: 1,
    min: 1
  },
  requiredMaterials: {
    type: [RecipeMaterialSchema],
    validate: [arr => arr.length > 0, 'Recipe must have at least one required material']
  },
  requiredSkill: {
    type: String,
    enum: ['crafting', 'woodcutting', 'mining', 'fishing', 'exploration'],
    default: 'crafting'
  },
  requiredLevel: {
    type: Number,
    default: 1,
    min: 1
  },
  craftTimeMs: {
    type: Number,
    default: 0
  },
  xpReward: {
    type: Number,
    default: 15,
    min: 0
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export const Recipe = mongoose.model('Recipe', RecipeSchema);
export default Recipe;
