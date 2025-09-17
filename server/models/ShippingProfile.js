const mongoose = require('mongoose');

const shippingOptionSchema = new mongoose.Schema({
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
  countries: [String],
  estimatedDelivery: {
    min: Number,
    max: Number
  },
  carrier: {
    type: String,
    enum: ['royal_mail', 'dpd', 'ups', 'fedex', 'other'],
    default: 'royal_mail'
  },
  integrationData: {
    royalMail: {
      serviceCode: String,
      apiKey: String
    },
    dpd: {
      username: String,
      password: String,
      depotId: String
    }
  }
});

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
    type: Number,
    required: true,
    min: 1
  },
  shippingOptions: [shippingOptionSchema],
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
    coverage: Number
  },
  returnPolicy: {
    acceptsReturns: {
      type: Boolean,
      default: false
    },
    returnPeriod: Number,
    returnShippingPaidBy: {
      type: String,
      enum: ['seller', 'buyer'],
      default: 'buyer'
    }
  },
  internationalSettings: {
    allowedCountries: [String],
    customsDocumentation: {
      type: Boolean,
      default: false
    },
    harmonizedSystemCodes: Map
  }
}, {
  timestamps: true
});

// Indexes
shippingProfileSchema.index({ seller: 1, isDefault: 1 });

module.exports = mongoose.model('ShippingProfile', shippingProfileSchema);