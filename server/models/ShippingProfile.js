const mongoose = require('mongoose');

const shippingProfileSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  processingTime: {
    type: Number, // in days
    required: true,
    min: 1
  },
  shippingOptions: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['standard', 'expedited', 'overnight', 'international'],
      required: true
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    freeShippingThreshold: Number,
    countries: [String], // for international shipping
    estimatedDelivery: {
      min: Number, // in days
      max: Number  // in days
    }
  }],
  packaging: {
    weightUnit: {
      type: String,
      enum: ['g', 'kg', 'oz', 'lb'],
      default: 'g'
    },
    dimensionsUnit: {
      type: String,
      enum: ['cm', 'in'],
      default: 'cm'
    },
    defaultPackage: {
      length: Number,
      width: Number,
      height: Number,
      weight: Number
    }
  },
  insurance: {
    isAvailable: {
      type: Boolean,
      default: false
    },
    cost: Number,
    coverage: Number // percentage of item value
  },
  returnPolicy: {
    acceptsReturns: {
      type: Boolean,
      default: false
    },
    returnPeriod: Number, // in days
    returnShippingPaidBy: {
      type: String,
      enum: ['seller', 'buyer'],
      default: 'buyer'
    }
  }
}, {
  timestamps: true
});

shippingProfileSchema.index({ seller: 1, isDefault: 1 });

module.exports = mongoose.model('ShippingProfile', shippingProfileSchema);