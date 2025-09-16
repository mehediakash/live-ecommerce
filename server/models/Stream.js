const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  tags: [String],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ivsChannelArn: {
    type: String,
    required: true
  },
  ivsPlaybackUrl: String,
  ivsStreamKey: String,
  streamKey: String, // For internal use
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  scheduledStart: {
    type: Date,
    required: true
  },
  actualStart: Date,
  actualEnd: Date,
  duration: Number, // in minutes
  viewers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date
  }],
  peakViewers: {
    type: Number,
    default: 0
  },
  totalViewers: {
    type: Number,
    default: 0
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  currentProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  coHosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isChatEnabled: {
    type: Boolean,
    default: true
  },
  isRecording: {
    type: Boolean,
    default: false
  },
  analytics: {
    avgViewTime: Number,
    engagementRate: Number,
    clickThroughRate: Number
  }
}, {
  timestamps: true
});

streamSchema.index({ seller: 1, status: 1 });
streamSchema.index({ scheduledStart: 1 });
streamSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('Stream', streamSchema);