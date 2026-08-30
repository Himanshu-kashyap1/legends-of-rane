import mongoose from 'mongoose';

/**
 * Single voxel block coordinate schema with schema-level validation bounds.
 */
const VoxelBlockSchema = new mongoose.Schema({
  x: {
    type: Number,
    required: true,
    min: [-24, 'X coordinate cannot be less than -24'],
    max: [24, 'X coordinate cannot exceed 24']
  },
  y: {
    type: Number,
    required: true,
    min: [-8, 'Y coordinate cannot be less than -8'],
    max: [32, 'Y coordinate cannot exceed 32']
  },
  z: {
    type: Number,
    required: true,
    min: [-24, 'Z coordinate cannot be less than -24'],
    max: [24, 'Z coordinate cannot exceed 24']
  },
  blockType: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  placedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/**
 * Player 3D Voxel Base Schema
 */
const BaseSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: 'My Sanctuary',
    trim: true,
    maxlength: 32
  },
  gridSize: {
    type: Number,
    default: 24
  },
  blocks: {
    type: [VoxelBlockSchema],
    default: []
  },
  blockCount: {
    type: Number,
    default: 0
  },
  lastSavedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Automatically update blockCount on save
BaseSchema.pre('save', function(next) {
  if (Array.isArray(this.blocks)) {
    this.blockCount = this.blocks.length;
  }
  next();
});

export const Base = mongoose.model('Base', BaseSchema);
export default Base;
