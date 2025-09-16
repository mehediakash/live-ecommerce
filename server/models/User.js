const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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