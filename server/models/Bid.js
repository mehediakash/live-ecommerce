const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream'
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  isAutoBid: {
    type: Boolean,
    default: false
  },
  maxAutoBid: Number,
  isWinner: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'outbid', 'won', 'cancelled'],
    default: 'active'
  },
  outbidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

bidSchema.index({ product: 1, buyer: 1 });
bidSchema.index({ product: 1, amount: -1 });
bidSchema.index({ buyer: 1, status: 1 });

module.exports = mongoose.model('Bid', bidSchema);