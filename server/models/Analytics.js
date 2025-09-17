const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  metrics: {
    users: {
      total: Number,
      new: Number,
      active: Number,
      sellers: Number,
      buyers: Number
    },
    revenue: {
      total: Number,
      fromSales: Number,
      fromFees: Number,
      averageOrderValue: Number
    },
    orders: {
      total: Number,
      completed: Number,
      cancelled: Number,
      refunded: Number
    },
    products: {
      total: Number,
      new: Number,
      sold: Number
    },
    streams: {
      total: Number,
      live: Number,
      completed: Number,
      averageViewers: Number
    },
    engagement: {
      pageViews: Number,
      sessionDuration: Number,
      bounceRate: Number
    }
  },
  platform: {
    feePercentage: Number,
    totalFees: Number,
    payoutAmount: Number
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
analyticsSchema.index({ date: 1, period: 1 });

// Static method to get analytics for a date range
analyticsSchema.statics.getDateRangeAnalytics = function(startDate, endDate, period = 'daily') {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    period: period
  }).sort({ date: 1 });
};

module.exports = mongoose.model('Analytics', analyticsSchema);