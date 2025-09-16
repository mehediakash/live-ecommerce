const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  images: [String],
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpful: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  helpfulCount: {
    type: Number,
    default: 0
  },
  response: {
    comment: String,
    respondedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

reviewSchema.index({ product: 1, buyer: 1 }, { unique: true });
reviewSchema.index({ seller: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);