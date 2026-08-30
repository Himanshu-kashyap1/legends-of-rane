import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Market Order Schema (Player Marketplace with Escrow)
 */
const MarketOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `ord_${crypto.randomUUID().slice(0, 10)}`
  },
  sellerId: {
    type: String,
    required: [true, 'sellerId is required'],
    index: true
  },
  sellerName: {
    type: String,
    default: 'Unknown Trader'
  },
  itemId: {
    type: String,
    required: [true, 'itemId is required'],
    trim: true,
    lowercase: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  pricePerUnit: {
    type: Number,
    required: true,
    min: [1, 'Price per unit must be at least 1']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [1, 'Total price must be at least 1']
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled', 'expired'],
    default: 'active',
    index: true
  },
  buyerId: {
    type: String,
    default: null,
    index: true
  },
  buyerName: {
    type: String,
    default: null
  },
  escrowHeld: {
    type: Boolean,
    default: true
  },
  soldAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h expiration
    index: true
  }
}, {
  timestamps: true
});

// Composite index for browsing active listings by item
MarketOrderSchema.index({ status: 1, itemId: 1, pricePerUnit: 1 });
MarketOrderSchema.index({ sellerId: 1, status: 1 });

export const MarketOrder = mongoose.model('MarketOrder', MarketOrderSchema);
export default MarketOrder;
