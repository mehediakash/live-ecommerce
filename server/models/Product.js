const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  stats: {
  views: {
    type: Number,
    default: 0
  },
  wishlists: {
    type: Number,
    default: 0
  },
  sales: {
    type: Number,
    default: 0
  },
  engagement: {  // Add this field
    type: Number,
    default: 0
  }
},
isTrending: {  // Add this field
  type: Boolean,
  default: false
},
trendingScore: {  // Add this field
  type: Number,
  default: 0
},
  description: {
    type: String,
    required: true
  },
  images: [{
    url: String,
    isPrimary: Boolean
  }],
  videos: [{
    url: String,
    thumbnail: String
  }],
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
  price: {
    type: Number,
    required: true
  },
  originalPrice: Number,
  costPrice: Number,
  condition: {
    type: String,
    enum: ['new', 'used', 'refurbished'],
    default: 'new'
  },
  variations: [{
    type: {
      type: String, // e.g., 'size', 'color'
      required: true
    },
    name: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    price: Number,
    quantity: Number,
    sku: String
  }],
  inventory: {
    totalQuantity: {
      type: Number,
      required: true
    },
    reservedQuantity: {
      type: Number,
      default: 0
    },
    soldQuantity: {
      type: Number,
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 5
    }
  },
  shipping: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    isFreeShipping: {
      type: Boolean,
      default: false
    },
    processingTime: {
      type: Number, // in days
      default: 1
    }
  },
  auction: {
    isAuction: {
      type: Boolean,
      default: false
    },
    startingBid: Number,
    currentBid: Number,
    reservePrice: Number,
    bidIncrement: {
      type: Number,
      default: 1
    },
    startTime: Date,
    endTime: Date,
    duration: Number, // in minutes
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended', 'cancelled'],
      default: 'scheduled'
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  buyItNow: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    price: Number
  },
  bundle: {
    isBundle: {
      type: Boolean,
      default: false
    },
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    discount: Number // percentage or fixed amount
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'sold', 'archived'],
    default: 'draft'
  },
  stats: {
    views: {
      type: Number,
      default: 0
    },
    wishlists: {
      type: Number,
      default: 0
    },
    sales: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

productSchema.index({ seller: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ 'auction.status': 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);