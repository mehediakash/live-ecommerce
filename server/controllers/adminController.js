const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Stream = require('../models/Stream');
const Analytics = require('../models/Analytics');
const Category = require('../models/Category');
const catchAsync = require('../utils/catchAsync');

// User Management
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, role, status, search } = req.query;
  
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(filter)
    .select('email profile role status createdAt')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.getUserDetails = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .populate('wishlist', 'name price images')
    .populate('orders', 'orderId totalAmount status createdAt');

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.updateUserStatus = catchAsync(async (req, res, next) => {
  const { status, reason } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { 
      status,
      ...(reason && { statusReason: reason })
    },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// Seller Management
exports.getSellerApplications = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;
  
  const filter = { 
    role: 'seller',
    'sellerProfile.businessVerification.status': status || 'pending'
  };

  const sellers = await User.find(filter)
    .select('email profile sellerProfile createdAt')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: sellers.length,
    data: {
      sellers,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.approveSeller = catchAsync(async (req, res, next) => {
  const { taxPercentage, fees } = req.body;

  const seller = await User.findByIdAndUpdate(
    req.params.id,
    { 
      'sellerProfile.businessVerification.status': 'verified',
      'sellerProfile.isApproved': true,
      'sellerProfile.taxPercentage': taxPercentage || 0,
      'sellerProfile.platformFees': fees || 0
    },
    { new: true, runValidators: true }
  );

  if (!seller) {
    return res.status(404).json({
      status: 'error',
      message: 'Seller not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      seller
    }
  });
});

// Content Moderation
exports.getFlaggedContent = catchAsync(async (req, res, next) => {
  const { type, page = 1, limit = 20 } = req.query;
  
  let model;
  let filter = { isFlagged: true };

  switch (type) {
    case 'product':
      model = Product;
      break;
    case 'stream':
      model = Stream;
      filter = { 'analytics.flagged': true };
      break;
    case 'comment':
      // Assuming you have a Comment model
      model = require('../models/Comment');
      break;
    default:
      return res.status(400).json({
        status: 'error',
        message: 'Invalid content type'
      });
  }

  const content = await model.find(filter)
    .populate('seller', 'profile firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await model.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: content.length,
    data: {
      content,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.resolveFlaggedContent = catchAsync(async (req, res, next) => {
  const { type, action, reason } = req.body;
  
  let model;
  let update;

  switch (type) {
    case 'product':
      model = Product;
      update = action === 'approve' ? 
        { isFlagged: false, status: 'active' } : 
        { isFlagged: false, status: 'rejected', rejectionReason: reason };
      break;
    case 'stream':
      model = Stream;
      update = action === 'approve' ? 
        { 'analytics.flagged': false } : 
        { status: 'cancelled', cancellationReason: reason };
      break;
    default:
      return res.status(400).json({
        status: 'error',
        message: 'Invalid content type'
      });
  }

  const content = await model.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true }
  );

  if (!content) {
    return res.status(404).json({
      status: 'error',
      message: 'Content not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      content
    }
  });
});

// Analytics and Reporting
exports.getPlatformAnalytics = catchAsync(async (req, res, next) => {
  const { period = 'monthly', startDate, endDate } = req.query;
  
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.date = { 
      $gte: new Date(startDate), 
      $lte: new Date(endDate) 
    };
  } else {
    // Default to last 30 days
    dateFilter.date = { 
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
    };
  }

  dateFilter.period = period;

  const analytics = await Analytics.find(dateFilter).sort({ date: 1 });

  // Calculate totals
  const totals = analytics.reduce((acc, curr) => ({
    revenue: acc.revenue + (curr.metrics.revenue.total || 0),
    orders: acc.orders + (curr.metrics.orders.total || 0),
    users: acc.users + (curr.metrics.users.new || 0),
    products: acc.products + (curr.metrics.products.new || 0)
  }), { revenue: 0, orders: 0, users: 0, products: 0 });

  res.status(200).json({
    status: 'success',
    data: {
      analytics,
      totals,
      timeframe: {
        start: dateFilter.date.$gte,
        end: dateFilter.date.$lte || new Date()
      }
    }
  });
});

exports.getFinancialReports = catchAsync(async (req, res, next) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;
  
  const matchStage = {
    'payment.status': 'completed',
    createdAt: {
      $gte: new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
      $lte: new Date(endDate || Date.now())
    }
  };

  const groupStage = {
    _id: {
      $dateToString: {
        format: groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m',
        date: '$createdAt'
      }
    },
    totalRevenue: { $sum: '$totalAmount' },
    totalOrders: { $sum: 1 },
    platformFees: { $sum: { $multiply: ['$totalAmount', 0.05] } }, // 5% platform fee
    averageOrderValue: { $avg: '$totalAmount' }
  };

  const financialReport = await Order.aggregate([
    { $match: matchStage },
    { $group: groupStage },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      report: financialReport,
      timeframe: {
        start: matchStage.createdAt.$gte,
        end: matchStage.createdAt.$lte
      }
    }
  });
});

// System Settings
exports.updatePlatformSettings = catchAsync(async (req, res, next) => {
  const { feeStructure, taxSettings, notificationSettings } = req.body;

  // In a real application, you would save these to a dedicated settings collection
  // For now, we'll just return the updated settings

  res.status(200).json({
    status: 'success',
    data: {
      settings: {
        feeStructure: feeStructure || { platformFee: 0.05, processingFee: 0.029 },
        taxSettings: taxSettings || { defaultTaxRate: 0.2 },
        notificationSettings: notificationSettings || { emailNotifications: true, pushNotifications: true }
      },
      updatedAt: new Date()
    }
  });
});