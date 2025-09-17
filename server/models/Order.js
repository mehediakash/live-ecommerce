const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },shippingProfile: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ShippingProfile'
},
shippingOption: {
  type: Map,
  of: mongoose.Schema.Types.Mixed
},
fulfillment: {
  trackingNumber: String,
  carrier: String,
  labelUrl: String,
  shippedAt: Date,
  estimatedDelivery: Date,
  actualDelivery: Date,
  insurance: {
    isInsured: Boolean,
    insuranceCost: Number,
    insuredValue: Number
  }
},
specialInstructions: String,
rushOrder: {
  isRush: Boolean,
  rushFee: Number,
  promisedDate: Date
},
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    variation: {
      type: String,
      default: null
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  payment: {
    method: {
      type: String,
      enum: ['card', 'paypal', 'bank_transfer'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  shipping: {
    carrier: {
      type: String,
      enum: ['royal_mail', 'dpd', 'ups', 'fedex', 'other'],
      default: 'royal_mail'
    },
    trackingNumber: String,
    cost: {
      type: Number,
      default: 0
    },
    estimatedDelivery: Date,
    shippedAt: Date,
    deliveredAt: Date
  },
  tax: {
  rate: Number,
  amount: Number,
  country: String,
  region: String,
  vatNumber: String
},
international: {
  isInternational: Boolean,
  customsValue: Number,
  harmonizedSystemCode: String,
  customsDescription: String
},
export: {
  isExport: Boolean,
  exportLicense: String,
  certificateNumber: String
}
,
  discount: {
    code: String,
    amount: Number
  },
  notes: String,
  cancellationReason: String,
  returnReason: String,
  refundAmount: Number,
  dispute: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    reason: String,
    status: {
      type: String,
      enum: ['open', 'in_review', 'resolved'],
      default: 'open'
    },
    resolution: String
  }
}, {
  timestamps: true
});

orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ seller: 1, status: 1 });
orderSchema.index({ orderId: 1 });

module.exports = mongoose.model('Order', orderSchema);