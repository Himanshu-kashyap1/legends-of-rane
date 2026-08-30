import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Gift Record Schema (Audit log & anti-exploit tracking)
 */
const GiftRecordSchema = new mongoose.Schema({
  giftId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `gift_${crypto.randomUUID().slice(0, 10)}`
  },
  senderId: {
    type: String,
    required: [true, 'senderId is required'],
    index: true
  },
  senderUsername: {
    type: String,
    default: ''
  },
  recipientId: {
    type: String,
    required: [true, 'recipientId is required'],
    index: true
  },
  recipientUsername: {
    type: String,
    default: ''
  },
  itemId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Gift quantity must be at least 1']
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Composite index for daily gifting limits and audits
GiftRecordSchema.index({ senderId: 1, sentAt: -1 });

export const GiftRecord = mongoose.model('GiftRecord', GiftRecordSchema);
export default GiftRecord;
