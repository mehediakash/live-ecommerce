const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  streamPreferences: {
  quality: {
    type: String,
    enum: ['auto', '360p', '480p', '720p', '1080p', '4k'],
    default: 'auto'
  },
  latency: {
    type: String,
    enum: ['normal', 'low', 'ultra-low'],
    default: 'normal'
  },
  autoplay: {
    type: Boolean,
    default: true
  },
  notifications: {
    newStreams: {
      type: Boolean,
      default: true
    },
    streamStarting: {
      type: Boolean,
      default: true
    },
    announcements: {
      type: Boolean,
      default: true
    }
  }
},
social: {
  shareAutoPost: {
    type: Boolean,
    default: false
  },
  defaultShareMessage: String,
  connectedAccounts: [{
    platform: {
      type: String,
      enum: ['facebook', 'twitter', 'youtube', 'twitch']
    },
    username: String,
    connectedAt: Date,
    accessToken: String,
    refreshToken: String
  }]
},
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    sparse: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  profile: {
    firstName: String,
    lastName: String,
    bio: String,
    avatar: String,
    preferences: [String]
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  role: {
    type: String,
    enum: ['user', 'seller', 'admin'],
    default: 'user'
  },
  sellerProfile: {
    businessName: String,
    businessVerification: {
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
      },
      documents: [{
        type: { type: String },
        url: String,
        verified: Boolean
      }]
    },
    bankAccount: {
      accountNumber: String,
      routingNumber: String,
      bankName: String
    },
    categories: [String],
    performance: {
      rating: { type: Number, default: 0 },
      totalSales: { type: Number, default: 0 },
      totalStreams: { type: Number, default: 0 }
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    taxPercentage: {
  type: Number,
  default: 0
},
platformFees: {
  type: Number,
  default: 0
},
performanceMetrics: {
  totalSales: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  responseTime: { type: Number, default: 0 }, // in hours
  fulfillmentRate: { type: Number, default: 0 } // percentage
}
  },
  shippingAddresses: [{
    name: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    isDefault: Boolean
  }],
  paymentMethods: [{
    type: { type: String, enum: ['card'] },
    stripePaymentMethodId: String,
    last4: String,
    brand: String,
    expMonth: Number,
    expYear: Number,
    isDefault: Boolean
  }],
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  privacySettings: {
    showOnlineStatus: { type: Boolean, default: true },
    allowMessages: { type: Boolean, default: true }
  },training: {
  completedModules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingModule'
  }],
  certificates: [{
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingModule'
    },
    certificateId: String,
    issueDate: Date,
    score: Number
  }],
  badges: [{
    type: String,
    enum: ['beginner', 'intermediate', 'expert', 'top_seller', 'stream_pro']
  }]
}
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', userSchema);